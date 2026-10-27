import React, { useId, useState } from 'react';
import { AlertTriangle, FileUp, Trash2 } from 'lucide-react';

function reasonLabel(reason) {
  const labels = {
    PATIENT_IDENTITY_MISMATCH: 'The report belongs to a different patient.',
    OBSERVATION_REVIEW_REQUIRED: 'One or more observations still need verification.',
    EXTRACTION_VALIDATION_PARTIAL: 'The extracted report has incomplete validation.',
    EXTRACTION_COVERAGE_INCOMPLETE: 'The report does not contain the complete ordered panel.',
    EXTRACTION_TIMEOUT: 'Report extraction timed out.',
    EXTRACTION_RUNTIME_UNAVAILABLE: 'The extraction service was unavailable.',
    REPORT_EXTRACTION_FAILED: 'The report could not be extracted safely.',
  };
  return labels[reason] || String(reason || 'Report review is required.')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

export default function ReportRecoveryActions({ onReplace, onRemove, reasons = [], busy }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const inputId = useId();

  const replace = async (event) => {
    event.preventDefault();
    if (!file || busy) return;
    setError('');
    const result = await onReplace({ fileName: file.name, rawFile: file, replace: true });
    if (!result?.success) setError(result?.error || 'Could not replace the report. Please try again.');
    else setFile(null);
  };

  const chooseFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setError('');
    if (nextFile && nextFile.type !== 'application/pdf' && !nextFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      setError('Choose a PDF report so the laboratory extraction checks can run.');
      return;
    }
    setFile(nextFile);
  };

  const remove = async () => {
    if (!window.confirm('Remove this unpublished report and return the visit to Patient Visits? The current PDF and extraction will be archived.')) return;
    setError('');
    const result = await onRemove();
    if (!result?.success) setError(result?.error || 'Could not remove the report. Please try again.');
  };

  return (
    <section className="report-recovery-card" aria-label="Resolve report issue">
      <div className="report-recovery-header">
        <span className="report-recovery-icon"><AlertTriangle size={19} /></span>
        <div>
          <h3>Action required before publication</h3>
          <p>Resolve the issue below by uploading the correct PDF, or remove this draft and start the visit again.</p>
        </div>
      </div>

      <div className="report-recovery-reasons">
        <span>Detected during report checks</span>
        <ul>
          {(reasons.length ? reasons : ['REPORT_REVIEW_REQUIRED']).map((reason) => (
            <li key={reason}>{reasonLabel(reason)}</li>
          ))}
        </ul>
      </div>

      <form onSubmit={replace} className="report-recovery-form">
        <input id={inputId} type="file" accept=".pdf,application/pdf" aria-label="Corrected report PDF" disabled={busy}
          onChange={chooseFile} className="report-recovery-input" />
        <label htmlFor={inputId} className="report-file-picker">
          <FileUp size={17} />
          <span>Choose corrected PDF</span>
        </label>
        <div className={`report-selected-file${file ? ' has-file' : ''}`}>
          {file ? file.name : 'No corrected PDF selected'}
        </div>
        <div className="report-recovery-actions">
          <button type="submit" className="btn-clinical primary" disabled={!file || busy}>
            <FileUp size={16} /> {busy ? 'Checking PDF…' : 'Replace & Recheck'}
          </button>
          <button type="button" className="btn-clinical btn-danger" disabled={busy} onClick={remove}>
            <Trash2 size={16} /> Remove Draft
          </button>
        </div>
      </form>
      <p className="report-recovery-footnote">The previous PDF and review history remain archived. Published reports cannot be replaced or removed.</p>
      {error && <p role="alert" className="report-recovery-error">{error}</p>}
    </section>
  );
}
