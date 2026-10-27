const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const express = require('express');

// Run against a local replica set with TEST_MONGO_URI. Every run creates and
// drops its own uniquely named database, never the application's database.
test('report recovery preserves originals, isolates review items and enforces publication boundaries', {
  skip: !process.env.TEST_MONGO_URI,
}, async (t) => {
  assert.match(process.env.TEST_MONGO_URI, /^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//);
  const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'swasthsetu-report-test-'));
  process.env.REPORT_STORAGE_ROOT = storage;
  const models = require('../src/models');
  const runner = require('../src/services/extractionRunner');
  const { issueToken } = require('../src/security/tokens');
  const labRouter = require('../src/routes/labRoutes');
  const patientRouter = require('../src/routes/patientRoutes');
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: `report_recovery_test_${new mongoose.Types.ObjectId()}` });
  t.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await fs.rm(storage, { recursive: true, force: true });
  });
  await Promise.all(Object.values(models).map((model) => model.init()));
  const userId = new mongoose.Types.ObjectId();
  const patientUserId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const laboratory = await models.Laboratory.create({ user_id: userId, name: 'Test Laboratory', qr_code_id: 'LAB-TEST' });
  await models.Laboratory.create({ user_id: otherUserId, name: 'Other Laboratory', qr_code_id: 'LAB-OTHER' });
  const patient = await models.Patient.create({ user_id: patientUserId, name: 'Synthetic Patient', age: 30, gender: 'Female', phone: '+919900009999', patient_identifier: 'PT-TEST' });
  const grant = await models.LabAccessGrant.create({ laboratory_id: laboratory._id, patient_id: patient._id });
  const app = express();
  app.use(express.json());
  app.use('/api/lab', labRouter);
  app.use('/api/patient', patientRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const request = async (route, method = 'GET', body, subject = userId, role = 'LABORATORY') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${route}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${issueToken({ subject, role })}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };
  const pdf = (name) => ({ file_name: `${name}.pdf`, file_mime_type: 'application/pdf', file_base64: Buffer.from(`%PDF-1.4\n${name}\n%%EOF`).toString('base64') });
  let extraction = {
    patient: { name: 'Demo Kabir Shah', patient_identifier: 'PXDEMO005', age: 56, age_value: 56, age_unit: 'years', sex: 'male' },
    tests: [], validation: { status: 'PARTIAL' }, coverage: { status: 'INCOMPLETE' }, review_required: true, publish_blocking_reasons: ['COVERAGE_INCOMPLETE'],
  };
  t.mock.method(runner, 'runExtraction', async () => {
    if (extraction instanceof Error) throw extraction;
    return extraction;
  });
  const upload = await request('lab/upload-report', 'POST', { ...pdf('incomplete'), grant_id: grant.id });
  assert.equal(upload.status, 201);
  assert.equal(upload.data.report.status, 'NEEDS_REVIEW');
  assert.ok(upload.data.report.publish_blocking_reasons.includes('PATIENT_IDENTITY_MISMATCH'));
  assert.equal(upload.data.report.extraction_identity_check.status, 'MISMATCH');
  assert.equal(
    upload.data.report.extraction_identity_check.mismatches.some((item) => item.field === 'patient_identifier' && 'expected' in item),
    false,
  );
  const reportId = upload.data.report._id;
  const original = await models.ReportFile.findOne({ report_id: reportId });
  let dashboard = await request(`lab/dashboard/${laboratory.id}`);
  assert.equal(dashboard.data.metrics.pendingVisitsCount, 0);
  assert.equal(dashboard.data.metrics.needsReviewCount, 1);
  assert.equal((await request('patient/reports', 'GET', undefined, patientUserId, 'PATIENT')).data.reports.length, 0);
  assert.equal((await request(`patient/reports/${reportId}`, 'GET', undefined, patientUserId, 'PATIENT')).status, 404);

  const replaceBody = { ...pdf('corrected'), workflow_revision: 0 };
  assert.equal((await request(`lab/report/${reportId}/replace`, 'POST', replaceBody, otherUserId)).status, 404);
  assert.equal((await request(`lab/report/${reportId}`, 'DELETE', { workflow_revision: 0 }, otherUserId)).status, 404);
  assert.equal((await request(`lab/report/${reportId}/replace`, 'POST', { ...replaceBody, workflow_revision: 99 })).status, 409);
  extraction = Object.assign(new Error('unavailable'), { code: 'EXTRACTION_RUNTIME_UNAVAILABLE' });
  assert.equal((await request(`lab/report/${reportId}/replace`, 'POST', replaceBody)).status, 503);
  assert.equal(await models.ReportRevision.countDocuments(), 0);
  assert.deepEqual(await fs.readdir(storage), [original.storage_key]);
  assert.equal((await models.DiagnosticReport.findById(reportId)).report_hash, original.sha256);

  // Another incomplete PDF remains in Needs Review and archives its predecessor.
  extraction = { tests: [], validation: { status: 'PARTIAL' }, coverage: { status: 'INCOMPLETE' }, review_required: true };
  const stillReview = await request(`lab/report/${reportId}/replace`, 'POST', replaceBody);
  assert.equal(stillReview.status, 200);
  assert.equal(stillReview.data.report.status, 'NEEDS_REVIEW');
  assert.equal(stillReview.data.report.workflow_revision, 1);
  assert.equal((await request(`lab/report/${reportId}/publish`, 'POST', { workflow_revision: 1 })).status, 409);
  extraction = {
    patient: { name: 'Synthetic Patient', patient_identifier: 'PT-TEST', age: 30, age_value: 30, age_unit: 'years', sex: 'female' },
    tests: [{ raw_name: 'Hemoglobin', canonical_name: 'Hemoglobin', value: 13, unit: 'g/dL', reference_parsed: { parsed: true, min: 12, max: 16 }, status: 'NORMAL', needs_review: false }],
    validation: { status: 'VALID' }, coverage: { status: 'COMPLETE' }, review_required: false,
  };
  const replaced = await request(`lab/report/${reportId}/replace`, 'POST', { ...replaceBody, workflow_revision: 1 });
  assert.equal(replaced.status, 200);
  assert.equal(replaced.data.report.status, 'PROCESSING');
  assert.equal(replaced.data.observations.length, 1);
  assert.equal(replaced.data.report.workflow_revision, 2);
  assert.equal(replaced.data.report.extraction_identity_check.status, 'MATCHED');
  assert.equal(replaced.data.report.publish_blocking_reasons.includes('PATIENT_IDENTITY_MISMATCH'), false);
  assert.equal(await models.DiagnosticReport.countDocuments({ lab_access_grant_id: grant._id }), 1);
  assert.equal(await models.ReportRevision.countDocuments({ report_id: reportId }), 2);
  assert.equal(await models.Notification.countDocuments(), 0);
  const archived = await models.ReportRevision.findOne({ report_id: reportId, workflow_revision: 0 });
  assert.equal(archived.original_file.sha256, original.sha256);
  assert.match(await fs.readFile(path.join(storage, archived.original_file.storage_key), 'utf8'), /incomplete/);
  dashboard = await request(`lab/dashboard/${laboratory.id}`);
  assert.equal(dashboard.data.metrics.needsReviewCount, 0);
  assert.equal(dashboard.data.metrics.processingCount, 1);

  const published = await request(`lab/report/${reportId}/publish`, 'POST', { workflow_revision: 2 });
  assert.equal(published.status, 200);
  assert.equal((await models.LabAccessGrant.findById(grant._id)).status, 'EXPIRED');
  const patientReports = await request('patient/reports', 'GET', undefined, patientUserId, 'PATIENT');
  assert.equal(patientReports.data.reports.length, 1);
  assert.equal(patientReports.data.reports[0].original_file_name, 'corrected.pdf');
  assert.equal((await request(`lab/report/${reportId}/replace`, 'POST', { ...replaceBody, workflow_revision: 3 })).status, 403);
  assert.equal((await request(`lab/report/${reportId}`, 'DELETE', { workflow_revision: 3 })).status, 403);

  // A pipeline error on a first upload is recoverable from Needs Review.
  const nextGrant = await models.LabAccessGrant.create({ laboratory_id: laboratory._id, patient_id: patient._id });
  extraction = Object.assign(new Error('timeout'), { code: 'EXTRACTION_TIMEOUT' });
  const failedUpload = await request('lab/upload-report', 'POST', { ...pdf('failed-extraction'), grant_id: nextGrant.id });
  assert.equal(failedUpload.status, 201);
  assert.equal(failedUpload.data.report.status, 'NEEDS_REVIEW');
  const failedReportId = failedUpload.data.report._id;
  assert.deepEqual(failedUpload.data.report.publish_blocking_reasons, ['EXTRACTION_TIMEOUT']);
  const failedFile = await models.ReportFile.findOne({ report_id: failedReportId });
  extraction = { tests: [], validation: { status: 'PARTIAL' }, coverage: { status: 'INCOMPLETE' }, review_required: true };
  const filesBefore = (await fs.readdir(storage)).sort();
  const auditFailure = t.mock.method(models.AuditEvent, 'create', async () => { throw Object.assign(new Error('SIMULATED_STORAGE_FAILURE'), { status: 503 }); });
  const rolledBack = await request(`lab/report/${failedReportId}/replace`, 'POST', { ...pdf('retry'), workflow_revision: 0 });
  assert.equal(rolledBack.status, 503);
  auditFailure.mock.restore();
  assert.deepEqual((await fs.readdir(storage)).sort(), filesBefore);
  assert.equal((await models.ReportFile.findOne({ report_id: failedReportId })).sha256, failedFile.sha256);
  assert.equal((await models.DiagnosticReport.findById(failedReportId)).workflow_revision, 0);
  assert.equal(await models.ReportRevision.countDocuments({ report_id: failedReportId }), 0);

  const removed = await request(`lab/report/${failedReportId}`, 'DELETE', { workflow_revision: 0 });
  assert.equal(removed.status, 200);
  assert.equal(await models.DiagnosticReport.findById(failedReportId), null);
  assert.equal((await models.LabAccessGrant.findById(nextGrant._id)).report_id, null);
  assert.equal((await models.LabAccessGrant.findById(nextGrant._id)).status, 'ACTIVE');
  assert.equal(await models.ReportFile.findOne({ report_id: failedReportId }), null);
  assert.equal((await models.ReportRevision.findOne({ report_id: failedReportId })).action, 'REMOVED');
  assert.match(await fs.readFile(path.join(storage, failedFile.storage_key), 'utf8'), /failed-extraction/);
  dashboard = await request(`lab/dashboard/${laboratory.id}`);
  assert.equal(dashboard.data.metrics.needsReviewCount, 0);
  assert.equal(dashboard.data.metrics.pendingVisitsCount, 1);
  const uploadedAgain = await request('lab/upload-report', 'POST', { ...pdf('fresh-upload'), grant_id: nextGrant.id });
  assert.equal(uploadedAgain.status, 201);
  assert.notEqual(uploadedAgain.data.report._id, failedReportId);
  assert.equal(String((await models.LabAccessGrant.findById(nextGrant._id)).report_id), uploadedAgain.data.report._id);
});
