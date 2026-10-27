const mongoose = require('mongoose');

// Replaced/removed drafts stay out of patient records and the active worklist.
// Keep the previous extraction, corrections and immutable PDF reference together.
const reportRevisionSchema = new mongoose.Schema({
  report_id: { type: mongoose.Schema.Types.ObjectId, ref: 'DiagnosticReport', required: true },
  lab_access_grant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LabAccessGrant', required: true },
  laboratory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  workflow_revision: { type: Number, required: true },
  action: { type: String, enum: ['REPLACED', 'REMOVED'], required: true },
  archived_by: { type: String, required: true },
  archived_at: { type: Date, default: Date.now },
  report: { type: mongoose.Schema.Types.Mixed, required: true },
  original_file: { type: mongoose.Schema.Types.Mixed, default: null },
  observations: { type: [mongoose.Schema.Types.Mixed], default: [] },
});

reportRevisionSchema.index({ report_id: 1, workflow_revision: 1 }, { unique: true });
reportRevisionSchema.index({ laboratory_id: 1, lab_access_grant_id: 1 });

module.exports = mongoose.model('ReportRevision', reportRevisionSchema);
