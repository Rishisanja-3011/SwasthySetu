const express = require('express');
const mongoose = require('mongoose');
const {
  LabAccessGrant, DiagnosticOrder, DiagnosticReport, LabObservation, AuditEvent, ReportFile,
  Encounter, Notification, ReportRevision,
} = require('../models');
const { requireLabOperator, enforceActiveLabGrant } = require('../middleware/labAccess');
const {
  decodeOriginalPdf, storeOriginalPdf, originalFilePath, removeOriginalPdf, downloadOriginalPdf,
} = require('../services/reportFiles');
const extractionRunner = require('../services/extractionRunner');

const router = express.Router();
router.use(requireLabOperator);

function fail(status, code) {
  const error = new Error(code);
  error.status = status;
  throw error;
}

function handle(action) {
  return async (req, res) => {
    try {
      await action(req, res);
    } catch (error) {
      if (!error.status) console.error('Laboratory workflow error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: error.status ? error.message : 'LAB_WORKFLOW_FAILED',
      });
    }
  };
}

for (const name of ['reportId', 'observationId', 'resourceId']) {
  router.param(name, (req, res, next, value) => {
    if (!mongoose.isValidObjectId(value)) {
      return res.status(404).json({ success: false, error: 'RESOURCE_NOT_FOUND' });
    }
    return next();
  });
}

// Date of birth OR age is the fourth identity attribute, never a profile dump.
function identity(patient) {
  if (!patient) return null;
  return {
    name: patient.name,
    ...(patient.date_of_birth ? { date_of_birth: patient.date_of_birth } : { age: patient.age }),
    gender: patient.gender,
    phone: patient.phone,
  };
}

function orderSummary(order) {
  if (!order) return null;
  return {
    _id: order._id,
    order_id: order._id,
    test_type: order.test_type,
    clinical_notes: order.clinical_notes,
    ordering_doctor: order.doctor_id?.name || '',
  };
}

function reportSummary(report, active = false) {
  const source = report.extraction_source && typeof report.extraction_source === 'object'
    ? { ...report.extraction_source, path: undefined }
    : report.extraction_source;
  return {
    _id: report._id,
    lab_access_grant_id: report.lab_access_grant_id,
    test_type: report.test_type,
    status: report.status,
    workflow_revision: report.workflow_revision || 0,
    created_at: report.created_at,
    published_at: report.published_at,
    extraction_review_required: report.extraction_review_required,
    publish_blocking_reasons: report.publish_blocking_reasons || [],
    extraction_source: source,
    extraction_coverage: report.extraction_coverage,
    extraction_validation: report.extraction_validation,
    extraction_patient_context: report.extraction_patient_context,
    extraction_identity_check: report.extraction_identity_check,
    ...(active ? { original_file_name: report.original_file_name, report_hash: report.report_hash } : {}),
  };
}

function extractionObservation(test, source) {
  const reference = test.reference_parsed || {};
  const value = Number(test.value);
  const confidence = Number(
    test.extraction_confidence
      ?? source?.ocr_confidence
      ?? 1,
  );
  const reviewReasons = Array.isArray(test.review_reasons) ? test.review_reasons : [];
  const status = ['HIGH', 'LOW', 'NORMAL'].includes(test.status) ? test.status : null;
  return {
    test_name_original: test.raw_name || test.canonical_name || 'Unknown test',
    test_name_normalized: test.canonical_name || test.raw_name || 'Unknown test',
    value,
    unit: test.unit || null,
    reference_low: reference.parsed ? Number(reference.min) : null,
    reference_high: reference.parsed ? Number(reference.max) : null,
    flag: status,
    extraction_confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    validation_status: test.needs_review ? 'NEEDS_REVIEW' : 'OK',
    review_reason: reviewReasons.length ? reviewReasons.join('; ') : null,
  };
}

function extractionReportStatus(extraction) {
  const validation = extraction.validation || {};
  const tests = Array.isArray(extraction.tests) ? extraction.tests : [];
  const coverage = extraction.coverage || {};
  const hasReview = Boolean(extraction.review_required)
    || tests.some((test) => test.needs_review)
    || validation.status !== 'VALID'
    || coverage.status !== 'COMPLETE'
    || extraction.publish_blocking_reasons?.length > 0
    || !tests.length;
  return hasReview ? 'NEEDS_REVIEW' : 'PROCESSING';
}

function reportReviewBlockers(report, observations = []) {
  const blockers = [];
  const persistedBlockers = Array.isArray(report.publish_blocking_reasons)
    ? report.publish_blocking_reasons.filter((reason) => !['OBSERVATION_REVIEW_REQUIRED', 'NO_OBSERVATIONS'].includes(reason))
    : [];
  blockers.push(...persistedBlockers);
  const validationStatus = report.extraction_validation?.status || 'MISSING';
  const coverageStatus = report.extraction_coverage?.status || 'MISSING';
  if (validationStatus !== 'VALID') blockers.push(`EXTRACTION_VALIDATION_${validationStatus}`);
  if (coverageStatus !== 'COMPLETE') blockers.push(`EXTRACTION_COVERAGE_${coverageStatus}`);
  if (report.extraction_coverage?.duplicate_markers?.length) blockers.push('DUPLICATE_MARKERS');
  if (!observations.length) blockers.push('NO_OBSERVATIONS');
  if (observations.some((item) => item.validation_status === 'NEEDS_REVIEW')) blockers.push('OBSERVATION_REVIEW_REQUIRED');
  return blockers;
}

function audit(req, report, action, details = {}) {
  return {
    actor_type: 'LABORATORY', actor_id: String(req.laboratory._id),
    action, resource_type: 'DiagnosticReport', resource_id: String(report._id),
    patient_id: report.patient_id, outcome: 'SUCCESS', details,
  };
}

async function activeReport(req, reportId, session = null) {
  const report = await DiagnosticReport.findOne({
    _id: reportId, laboratory_id: req.laboratory._id,
  }).session(session);
  if (!report) fail(404, 'REPORT_NOT_FOUND');
  if (report.status === 'PUBLISHED') fail(403, 'BOUNDED_ACCESS_EXPIRED');
  if (!report.lab_access_grant_id) fail(403, 'REPORT_GRANT_LINK_REQUIRED');
  const grant = await LabAccessGrant.findOne({
    _id: report.lab_access_grant_id,
    laboratory_id: req.laboratory._id,
    patient_id: report.patient_id,
    status: 'ACTIVE',
    published_report_id: null,
  }).populate('patient_id').session(session);
  if (!grant) fail(403, 'BOUNDED_ACCESS_EXPIRED');
  if (grant.report_id && String(grant.report_id) !== String(report._id)) fail(409, 'REPORT_GRANT_MISMATCH');
  return { report, grant };
}

function checkRevision(req, report) {
  if (!Number.isInteger(req.body.workflow_revision) || req.body.workflow_revision < 0) fail(400, 'REPORT_REVISION_REQUIRED');
  if (req.body.workflow_revision !== (report.workflow_revision || 0)) fail(409, 'REPORT_CHANGED');
}

async function archiveReport(req, report, action, session) {
  const file = await ReportFile.findOne({ report_id: report._id }).session(session);
  const observations = await LabObservation.find({ report_id: report._id }).session(session);
  const [revision] = await ReportRevision.create([{
    report_id: report._id,
    lab_access_grant_id: report.lab_access_grant_id,
    laboratory_id: report.laboratory_id,
    patient_id: report.patient_id,
    workflow_revision: report.workflow_revision || 0,
    action,
    archived_by: req.auth.sub,
    report: report.toObject(),
    original_file: file?.toObject() || null,
    observations: observations.map((item) => item.toObject()),
  }], { session });
  return revision;
}

async function prepareReportUpload(req, reportId, retainFailure = false, expectedPatient = null) {
  let original;
  try { original = decodeOriginalPdf(req.body); } catch (error) { fail(400, error.message); }
  const metadata = await storeOriginalPdf(reportId, original);
  let extraction;
  try {
    extraction = await extractionRunner.runExtraction(originalFilePath(metadata));
    if (!extraction || typeof extraction !== 'object' || Array.isArray(extraction)) throw new Error('INVALID_EXTRACTION');
  } catch (error) {
    const code = ['EXTRACTION_RUNTIME_UNAVAILABLE', 'EXTRACTION_TIMEOUT'].includes(error.code)
      ? error.code : 'REPORT_EXTRACTION_FAILED';
    if (!retainFailure) {
      await removeOriginalPdf(metadata);
      fail(code === 'EXTRACTION_RUNTIME_UNAVAILABLE' ? 503 : code === 'EXTRACTION_TIMEOUT' ? 504 : 422, code);
    }
    extraction = {
      tests: [], validation: { status: 'ERROR' }, coverage: { status: 'INCOMPLETE' },
      review_required: true, publish_blocking_reasons: [code],
    };
  }
  const tests = Array.isArray(extraction.tests) ? extraction.tests : [];
  const observations = tests.filter((test) => test && test.value != null && test.value !== '' && Number.isFinite(Number(test.value)))
    .map((test) => extractionObservation(test, extraction.source));
  const identityCheck = reportIdentityCheck(extraction.patient, expectedPatient);
  const extractionBlockers = Array.isArray(extraction.publish_blocking_reasons)
    ? extraction.publish_blocking_reasons
    : [];
  const publishBlockingReasons = [...new Set([
    ...extractionBlockers,
    ...(identityCheck.mismatches.length ? ['PATIENT_IDENTITY_MISMATCH'] : []),
  ])];
  const statusExtraction = { ...extraction, publish_blocking_reasons: publishBlockingReasons };
  const status = observations.length && observations.length === tests.length
    ? extractionReportStatus(statusExtraction)
    : 'NEEDS_REVIEW';
  return {
    metadata, observations,
    fields: {
      status, report_hash: original.sha256, original_file_name: original.filename,
      report_source_type: 'LAB_UPLOADED_ORIGINAL', raw_text_content: extraction.raw_text || '',
      extraction_source: extraction.source || null, extraction_patient_context: extraction.patient || null,
      extraction_identity_check: identityCheck,
      extraction_coverage: extraction.coverage || null, extraction_validation: extraction.validation || null,
      extraction_warnings: [
        ...(Array.isArray(extraction.source?.warnings) ? extraction.source.warnings : []),
        ...(Array.isArray(extraction.validation?.issues) ? extraction.validation.issues.map((issue) => issue.message).filter(Boolean) : []),
        ...(identityCheck.mismatches.length ? ['Report patient identity does not match the active visit.'] : []),
      ],
      publish_blocking_reasons: publishBlockingReasons,
      extraction_review_required: status === 'NEEDS_REVIEW', extraction_completed_at: new Date(),
    },
  };
}

function normalizedIdentityText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizedPatientIdentifier(value) {
  return String(value || '').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizedGender(value) {
  const normalized = normalizedIdentityText(value);
  return { m: 'male', male: 'male', f: 'female', female: 'female' }[normalized] || normalized;
}

function reportIdentityCheck(extractedPatient, expectedPatient) {
  const extracted = extractedPatient && typeof extractedPatient === 'object' ? extractedPatient : {};
  const expected = expectedPatient && typeof expectedPatient === 'object' ? expectedPatient : {};
  const mismatches = [];
  let comparedFields = 0;

  const compare = (field, observed, expectedValue, normalize) => {
    if (observed === null || observed === undefined || observed === ''
      || expectedValue === null || expectedValue === undefined || expectedValue === '') return;
    comparedFields += 1;
    if (normalize(observed) !== normalize(expectedValue)) {
      const mismatch = { field, observed: String(observed) };
      // The platform Patient ID is not one of the four identity fields shared
      // with a laboratory. Keep the comparison server-side without returning
      // the expected platform identifier to the lab UI.
      if (field !== 'patient_identifier') mismatch.expected = String(expectedValue);
      mismatches.push(mismatch);
    }
  };

  compare('name', extracted.name, expected.name, normalizedIdentityText);
  compare(
    'patient_identifier',
    extracted.patient_identifier || extracted.identifier,
    expected.patient_identifier,
    normalizedPatientIdentifier,
  );
  compare('gender', extracted.sex || extracted.gender, expected.gender, normalizedGender);

  const extractedAge = extracted.age_unit === 'years' ? extracted.age_value : extracted.age;
  compare('age', extractedAge, expected.age, (value) => String(Number(value)));

  return {
    status: mismatches.length ? 'MISMATCH' : comparedFields ? 'MATCHED' : 'NOT_REPORTED',
    mismatches,
  };
}

router.get('/list', handle(async (req, res) => {
  const lab = req.laboratory;
  res.json({ success: true, laboratories: [{
    _id: lab._id, name: lab.name, qr_code_id: lab.qr_code_id,
    location: lab.location, contact_phone: lab.contact_phone,
  }] });
}));

router.get('/staff', (req, res) => res.json({
  success: true,
  staff: [{ id: req.auth.sub, name: req.laboratory.name, role: 'Laboratory operator' }],
}));

router.get('/dashboard/:labId', handle(async (req, res) => {
  if (req.params.labId !== String(req.laboratory._id)) fail(403, 'LABORATORY_OWNERSHIP_REQUIRED');
  const [grants, reports] = await Promise.all([
    LabAccessGrant.find({ laboratory_id: req.laboratory._id })
      .populate('patient_id', 'name date_of_birth age gender phone')
      .populate({ path: 'diagnostic_order_id', populate: { path: 'doctor_id', select: 'name' } })
      .sort({ _id: -1 }),
    DiagnosticReport.find({ laboratory_id: req.laboratory._id }).sort({ created_at: -1 }),
  ]);
  const reportsByGrant = new Map(reports.map((report) => [String(report.lab_access_grant_id), report]));
  const activeReportIds = new Set();
  const worklist = grants.map((grant) => {
    const report = reportsByGrant.get(String(grant._id));
    const active = grant.status === 'ACTIVE' && !grant.published_report_id && report?.status !== 'PUBLISHED';
    if (active && report && String(report.patient_id) === String(grant.patient_id?._id)) activeReportIds.add(String(report._id));
    return {
      grant_id: grant._id, grant_status: active ? 'ACTIVE' : 'EXPIRED',
      granted_at: grant.granted_at || grant._id.getTimestamp(),
      patient: active ? identity(grant.patient_id) : null,
      diagnostic_order: active ? orderSummary(grant.diagnostic_order_id) : null,
      report_id: report?._id || grant.published_report_id,
      published_report: grant.published_report_id ? { _id: grant.published_report_id } : null,
    };
  });
  res.json({
    success: true, worklist,
    metrics: {
      activeGrantsCount: worklist.filter((grant) => grant.grant_status === 'ACTIVE').length,
      pendingVisitsCount: worklist.filter((grant) => grant.grant_status === 'ACTIVE' && !grant.report_id).length,
      processingCount: reports.filter((report) => ['UPLOADED', 'PROCESSING'].includes(report.status)).length,
      needsReviewCount: reports.filter((report) => report.status === 'NEEDS_REVIEW').length,
      publishedCount: reports.filter((report) => report.status === 'PUBLISHED').length,
    },
    reports: reports.map((report) => reportSummary(report, activeReportIds.has(String(report._id)))),
  });
}));

router.post('/simulate-patient-grant', (req, res) => res.status(410).json({ success: false, error: 'SIMULATION_DISABLED' }));
router.get('/patient-view/:reportId', (req, res) => res.status(410).json({ success: false, error: 'USE_AUTHENTICATED_PATIENT_WORKFLOW' }));

router.get('/grant/:grantId/patient-identity', enforceActiveLabGrant, handle(async (req, res) => {
  const grant = req.labGrant;
  await AuditEvent.create({
    actor_type: 'LABORATORY', actor_id: String(req.laboratory._id),
    action: 'VIEW_PATIENT_IDENTITY_FIELDS', resource_type: 'LabAccessGrant',
    resource_id: String(grant._id), patient_id: grant.patient_id._id,
    outcome: 'SUCCESS', details: { fields_exposed: Object.keys(identity(grant.patient_id)) },
  });
  res.json({ success: true, grant_status: 'ACTIVE', identity: identity(grant.patient_id), order: orderSummary(grant.diagnostic_order_id) });
}));

router.post(['/upload-report', '/generate-report'], enforceActiveLabGrant, handle(async (req, res) => {
  const grant = req.labGrant;
  if (await DiagnosticReport.exists({ lab_access_grant_id: grant._id })) fail(409, 'REPORT_ALREADY_UPLOADED');
  if (grant.diagnostic_order_id && (String(grant.diagnostic_order_id.patient_id) !== String(grant.patient_id._id)
    || grant.diagnostic_order_id.status !== 'ORDERED')) fail(409, 'INVALID_DIAGNOSTIC_ORDER');
  const reportId = new mongoose.Types.ObjectId();
  const { metadata, observations, fields } = await prepareReportUpload(req, reportId, true, grant.patient_id);
  let report;
  let persistedObservations = [];
  try {
    await mongoose.connection.transaction(async (session) => {
      // Writing the grant serializes upload/publication attempts for this visit.
      const active = await LabAccessGrant.findOneAndUpdate({
        _id: grant._id, laboratory_id: req.laboratory._id, status: 'ACTIVE', published_report_id: null,
        report_id: null,
      }, { $set: { report_id: reportId } }, { new: true, session });
      if (!active) fail(409, 'GRANT_CHANGED');
      [report] = await DiagnosticReport.create([{
        _id: reportId, patient_id: grant.patient_id._id, laboratory_id: req.laboratory._id,
        lab_access_grant_id: grant._id, diagnostic_order_id: grant.diagnostic_order_id?._id || null,
         ...fields, test_type: grant.diagnostic_order_id?.test_type || 'CBC',
       }], { session });
        await ReportFile.create([metadata], { session });
        if (observations.length) {
          persistedObservations = await LabObservation.create(observations.map((observation) => ({
            ...observation,
            report_id: report._id,
          })), { session, ordered: true });
        }
        await AuditEvent.create([audit(req, report, 'LAB_REPORT_UPLOADED')], { session, ordered: true });
       await AuditEvent.create([audit(req, report, 'LAB_REPORT_EXTRACTED', {
         input_type: fields.extraction_source?.input_type,
         tests_detected: fields.extraction_validation?.tests_detected || observations.length,
         observations_created: observations.length,
         report_status: fields.status,
        })], { session, ordered: true });
    });
  } catch (error) {
    await removeOriginalPdf(metadata);
    if (error.code === 11000) fail(409, 'REPORT_ALREADY_UPLOADED');
    throw error;
  }
  res.status(201).json({
    success: true,
    report: reportSummary(report, true),
    observations: persistedObservations,
    extraction_pending: false,
    needs_review: fields.status === 'NEEDS_REVIEW',
    extraction: {
      source: { ...fields.extraction_source, path: undefined },
      patient: fields.extraction_patient_context,
      coverage: fields.extraction_coverage,
      validation: fields.extraction_validation,
      review_required: fields.extraction_review_required,
      publish_blocking_reasons: fields.publish_blocking_reasons,
    },
  });
}));

router.post('/report/:reportId/replace', handle(async (req, res) => {
  const initial = await activeReport(req, req.params.reportId);
  checkRevision(req, initial.report);
  const { metadata, observations, fields } = await prepareReportUpload(req, initial.report._id, false, initial.grant.patient_id);
  let updatedReport;
  let persistedObservations = [];
  try {
    await mongoose.connection.transaction(async (session) => {
      const { report } = await activeReport(req, req.params.reportId, session);
      checkRevision(req, report);
      const revision = await archiveReport(req, report, 'REPLACED', session);
      // Updating the same report serializes replacement, edits and publication,
      // and preserves the unique grant link without an index migration.
      report.set(fields);
      report.workflow_revision = (report.workflow_revision || 0) + 1;
      await report.save({ session });
      await ReportFile.updateOne({ report_id: report._id }, { $set: { ...metadata, uploaded_at: new Date() } }, { session, upsert: true, runValidators: true });
      await LabObservation.deleteMany({ report_id: report._id }, { session });
      persistedObservations = observations.length ? await LabObservation.create(observations.map((item) => ({ ...item, report_id: report._id })), { session, ordered: true }) : [];
      await AuditEvent.create([audit(req, report, 'LAB_REPORT_REPLACED', {
        archived_revision_id: String(revision._id), workflow_revision: report.workflow_revision,
        report_status: report.status,
      })], { session });
      updatedReport = report;
    });
  } catch (error) {
    await removeOriginalPdf(metadata);
    throw error;
  }
  res.json({ success: true, report: reportSummary(updatedReport, true), observations: persistedObservations, needs_review: updatedReport.status === 'NEEDS_REVIEW' });
}));

router.delete('/report/:reportId', handle(async (req, res) => {
  await mongoose.connection.transaction(async (session) => {
    const { report, grant } = await activeReport(req, req.params.reportId, session);
    checkRevision(req, report);
    const revision = await archiveReport(req, report, 'REMOVED', session);
    await DiagnosticReport.deleteOne({ _id: report._id }, { session });
    await LabObservation.deleteMany({ report_id: report._id }, { session });
    await ReportFile.deleteOne({ report_id: report._id }, { session });
    grant.report_id = null;
    await grant.save({ session });
    await AuditEvent.create([audit(req, report, 'LAB_REPORT_REMOVED', {
      archived_revision_id: String(revision._id),
    })], { session });
  });
  res.json({ success: true });
}));

router.get('/report/:reportId', handle(async (req, res) => {
  const { report } = await activeReport(req, req.params.reportId);
  const observations = await LabObservation.find({ report_id: report._id });
  res.json({ success: true, report: reportSummary(report, true), observations });
}));

router.get('/report/:reportId/raw', handle(async (req, res) => {
  const { report } = await activeReport(req, req.params.reportId);
  res.json({ success: true, ...reportSummary(report, true), raw_text_content: report.raw_text_content });
}));

router.get('/report/:reportId/original', handle(async (req, res) => {
  const { report } = await activeReport(req, req.params.reportId);
  const file = await ReportFile.findOne({ report_id: report._id });
  if (!file) fail(404, 'ORIGINAL_REPORT_FILE_NOT_FOUND');
  downloadOriginalPdf(res, file);
}));

router.put('/observation/:observationId', handle(async (req, res) => {
  const found = await LabObservation.findById(req.params.observationId);
  if (!found) fail(404, 'OBSERVATION_NOT_FOUND');
  const reason = typeof req.body.edit_reason === 'string' ? req.body.edit_reason.trim() : '';
  if (!reason) fail(400, 'EDIT_REASON_REQUIRED');
  let observation;
  let reportStatus;
  let unresolvedCount;
  let updatedReport;
  await mongoose.connection.transaction(async (session) => {
    const { report } = await activeReport(req, found.report_id, session);
    if (!['PROCESSING', 'NEEDS_REVIEW'].includes(report.status)) fail(409, 'EXTRACTION_PENDING');
    observation = await LabObservation.findById(found._id).session(session);
    if (!observation) fail(409, 'REPORT_CHANGED');
    for (const field of ['value', 'reference_low', 'reference_high']) {
      if (req.body[field] !== undefined) {
        const value = req.body[field];
        if (!(field !== 'value' && value === null) && (typeof value !== 'number' || !Number.isFinite(value))) fail(400, 'INVALID_OBSERVATION_VALUE');
        observation[field] = value;
      }
    }
    if (req.body.unit !== undefined) {
      if (typeof req.body.unit !== 'string' || !req.body.unit.trim()) fail(400, 'OBSERVATION_UNIT_REQUIRED');
      observation.unit = req.body.unit.trim();
    }
    if (observation.reference_low !== null && observation.reference_high !== null && observation.reference_low > observation.reference_high) fail(400, 'INVALID_REFERENCE_RANGE');
    if (!observation.unit) fail(400, 'OBSERVATION_UNIT_REQUIRED');
    // Missing ranges stay null; confirmation never fabricates reference values.
    observation.flag = observation.reference_low === null || observation.reference_high === null ? null
      : observation.value < observation.reference_low ? 'LOW' : observation.value > observation.reference_high ? 'HIGH' : 'NORMAL';
    observation.manually_edited = true;
    observation.validation_status = 'OK';
    observation.review_reason = null;
    await observation.save({ session });
    unresolvedCount = await LabObservation.countDocuments({ report_id: report._id, validation_status: { $ne: 'OK' } }).session(session);
    const remainingObservations = await LabObservation.find({
      report_id: report._id,
    }).session(session);
    const remainingBlockers = reportReviewBlockers(report, remainingObservations);
    report.status = remainingBlockers.length ? 'NEEDS_REVIEW' : 'PROCESSING';
    report.extraction_review_required = remainingBlockers.length > 0;
    report.publish_blocking_reasons = remainingBlockers;
    report.workflow_revision += 1;
    await report.save({ session });
    reportStatus = report.status;
    updatedReport = report;
    await AuditEvent.create([audit(req, report, 'LAB_OBSERVATION_MANUAL_CORRECTION', {
      observation_id: String(observation._id), edit_reason: reason,
    })], { session, ordered: true });
  });
  res.json({
    success: true,
    observation,
    report: reportSummary(updatedReport, true),
    report_status: reportStatus,
    unresolved_count: unresolvedCount,
    extraction_review_required: updatedReport.extraction_review_required,
    publish_blocking_reasons: updatedReport.publish_blocking_reasons || [],
  });
}));

router.post('/report/:reportId/publish', handle(async (req, res) => {
  let published;
  await mongoose.connection.transaction(async (session) => {
    const { report, grant } = await activeReport(req, req.params.reportId, session);
    if (req.body.workflow_revision !== undefined) checkRevision(req, report);
    if (req.body.grant_id && String(req.body.grant_id) !== String(grant._id)) fail(403, 'REPORT_GRANT_MISMATCH');
    if (!['PROCESSING', 'NEEDS_REVIEW'].includes(report.status)) fail(409, 'EXTRACTION_PENDING');
    if (report.extraction_review_required || report.publish_blocking_reasons?.length
      || report.extraction_validation?.status !== 'VALID'
      || report.extraction_coverage?.status !== 'COMPLETE') {
      fail(409, 'EXTRACTION_REVIEW_REQUIRED');
    }
    const observations = await LabObservation.find({ report_id: report._id }).session(session);
    if (!observations.length || observations.some((item) => item.validation_status !== 'OK' || !Number.isFinite(item.value))) fail(409, 'PUBLICATION_BLOCKED');
    const file = await ReportFile.findOne({ report_id: report._id }).session(session);
    if (!file) fail(409, 'ORIGINAL_REPORT_FILE_REQUIRED');
    report.status = 'PUBLISHED';
    report.published_at = new Date();
    report.workflow_revision += 1;
    await report.save({ session });
    grant.status = 'EXPIRED';
    grant.published_report_id = report._id;
    await grant.save({ session });
    if (report.diagnostic_order_id) {
      const result = await DiagnosticOrder.updateOne({ _id: report.diagnostic_order_id, patient_id: report.patient_id, status: 'ORDERED' }, { $set: { status: 'COMPLETED' } }, { session });
      if (result.modifiedCount !== 1) fail(409, 'DIAGNOSTIC_ORDER_NOT_AVAILABLE');
    }
    const diagnosticOrder = report.diagnostic_order_id
      ? await DiagnosticOrder.findOne({
        _id: report.diagnostic_order_id,
        patient_id: report.patient_id,
      }).session(session)
      : null;
    const encounter = diagnosticOrder?.encounter_id
      ? await Encounter.findOne({
        _id: diagnosticOrder.encounter_id,
        patient_id: report.patient_id,
      }).session(session)
      : null;
    await Notification.create([{
      // Published reports notify the patient only. Doctors use the live queue.
      doctor_id: null,
      encounter_id: encounter?._id || null,
      patient_id: report.patient_id,
      type: 'REPORT_PUBLISHED',
      title: `${report.test_type || 'Diagnostic'} report published`,
      message: `Your ${report.test_type || 'diagnostic'} report from ${req.laboratory.name || 'the laboratory'} is now available to view in your patient records.`,
      visit_type: encounter?.visit_type || null,
      diagnostic_order_id: diagnosticOrder?._id || report.diagnostic_order_id || null,
      report_id: report._id,
      lab_access_grant_id: grant._id,
    }], { session, ordered: true });
    await AuditEvent.create([
      audit(req, report, 'PUBLISH_CBC_REPORT', { sign_off_notes: typeof req.body.sign_off_notes === 'string' ? req.body.sign_off_notes.trim() : '' }),
      { actor_type: 'SYSTEM', actor_id: 'BOUNDED_ACCESS_GUARD', action: 'EXPIRE_LAB_ACCESS_GRANT', resource_type: 'LabAccessGrant', resource_id: String(grant._id), patient_id: report.patient_id, outcome: 'EXPIRED', details: { published_report_id: String(report._id) } },
    ], { session, ordered: true });
    published = reportSummary(report);
  });
  res.json({ success: true, report: published, grant_status: 'EXPIRED', access_expired: true });
}));

router.get('/audit-events/:resourceId', handle(async (req, res) => {
  const { report } = await activeReport(req, req.params.resourceId);
  const events = await AuditEvent.find({ resource_type: 'DiagnosticReport', resource_id: String(report._id), actor_type: 'LABORATORY', actor_id: String(req.laboratory._id) }).sort({ timestamp: -1 });
  res.json({ success: true, events });
}));

module.exports = router;
