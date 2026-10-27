import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit3, ShieldCheck, AlertTriangle } from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { patientApi } from '../services/patientApi';

const EMPTY = '— Not stated —';
const listText = (value) => (Array.isArray(value) ? value.join(', ') : '');
const parseList = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const show = (value) => (Array.isArray(value) ? (value.length ? value.join(', ') : EMPTY) : (String(value || '').trim() || EMPTY));

function Field({ label, value }) {
  return <div><div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div><div style={{ fontSize: '0.86rem', color: value === EMPTY ? 'var(--slate-400)' : 'var(--navy-900)', lineHeight: 1.45 }}>{show(value)}</div></div>;
}

export function IntakeReviewScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateActiveEncounter } = usePatient();
  const doctor = location.state?.doctor;
  const encounter = location.state?.encounter;
  const visitType = location.state?.visitType || 'NEW';
  const inputMode = location.state?.inputMode || 'TEXT';
  const intake = location.state?.intake;
  const structuredRoot = intake?.structured_data || intake || {};
  const initialClinical = structuredRoot.clinical_intake || {};
  const transcript = intake?.transcript || structuredRoot.transcript?.text || '';
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    chief_complaint: initialClinical.chief_complaint || '',
    duration: initialClinical.duration || '',
    symptoms: listText(initialClinical.symptoms),
    negative_symptoms: listText(initialClinical.negative_symptoms),
    possible_symptom_categories: listText(initialClinical.possible_symptom_categories),
    relevant_history: listText(initialClinical.relevant_history),
    medications: listText(initialClinical.medications),
    allergies: listText(initialClinical.allergies),
    allergy_status: initialClinical.allergy_status || 'UNKNOWN',
    urgency: initialClinical.urgency || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!doctor || !encounter || !intake) navigate('/');
  }, [doctor, encounter, intake, navigate]);

  const hasClinicalInformation = useMemo(() => Boolean(
    form.chief_complaint.trim() || form.duration.trim() || parseList(form.symptoms).length
      || parseList(form.negative_symptoms).length || parseList(form.relevant_history).length
      || parseList(form.medications).length || parseList(form.allergies).length
      || form.allergy_status === 'NONE_REPORTED' || form.urgency,
  ), [form]);

  if (!doctor || !encounter || !intake) return null;

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const clinicalData = {
    chief_complaint: form.chief_complaint.trim(),
    duration: form.duration.trim(),
    symptoms: parseList(form.symptoms),
    negative_symptoms: parseList(form.negative_symptoms),
    possible_symptom_categories: parseList(form.possible_symptom_categories),
    relevant_history: parseList(form.relevant_history),
    medications: parseList(form.medications),
    allergies: parseList(form.allergies),
    allergy_status: form.allergy_status,
    urgency: form.urgency,
  };

  const handleConfirm = async () => {
    if (visitType === 'NEW' && !hasClinicalInformation) {
      setErrorMessage('No explicit clinical information was extracted. Please correct the fields or describe your symptoms again; an empty intake cannot be submitted.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    try {
      const confirmed = await patientApi.confirmIntake({ encounterId: encounter.id, inputMode, structuredData: { clinical_intake: clinicalData } });
      updateActiveEncounter({ ...encounter, ...confirmed.encounter, intake: confirmed.intake });
      navigate('/waiting', { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'The intake could not be confirmed. Nothing was submitted to the doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const confidence = structuredRoot.confidence || {};
  const provenance = structuredRoot.provenance || {};
  const confidenceRows = [
    ['Overall', confidence.overall], ['Transcription', confidence.transcription], ['Language', confidence.language],
    ['Chief complaint', confidence.chief_complaint], ['Symptoms', confidence.symptoms], ['Duration', confidence.duration],
    ['Categories', confidence.category], ['Allergies', confidence.allergies], ['Urgency', confidence.urgency],
  ];

  return (
    <div className="fade-in page-centered-container" style={{ maxWidth: 1040, padding: '8px 0' }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: 16 }}><ArrowLeft size={14} /> Back</button>
      <div className="page-heading" style={{ textAlign: 'center', marginBottom: 22 }}>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--teal-700)', backgroundColor: 'var(--teal-50)', padding: '4px 12px', borderRadius: 20, display: 'inline-block', marginBottom: 8 }}>Patient review required</span>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--navy-900)', marginBottom: 4 }}>Review Your Clinical Intake</h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>Verify the English normalized fields before they reach <strong>{doctor.name}</strong>. Missing information is intentionally left blank.</p>
      </div>

      <div className="intake-review-grid">
        <div>
          <div className="v-card" style={{ padding: 18, marginBottom: 16, borderLeft: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}><strong>Original statement</strong><span className="provenance-tag patient">{structuredRoot.transcript?.source || 'PATIENT_REPORTED'}</span></div>
            <div style={{ padding: '14px 16px', minHeight: 100, borderRadius: 9, backgroundColor: '#f8fafc', border: '1px dashed var(--slate-300)', fontSize: '0.92rem', lineHeight: 1.55, fontStyle: transcript ? 'italic' : 'normal' }}>{transcript ? `“${transcript}”` : EMPTY}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <Field label="Input language" value={structuredRoot.selected_language || intake.language} />
              <Field label="Detected language" value={structuredRoot.detected_language || intake.detected_language} />
              <Field label="Language match" value={structuredRoot.language_match === null || structuredRoot.language_match === undefined ? '' : (structuredRoot.language_match ? 'Yes' : 'No')} />
              <Field label="Input mode" value={inputMode} />
              <Field label="Transcript source" value={structuredRoot.transcript?.source || intake.transcription_source} />
              <Field label="Pipeline" value={structuredRoot.pipeline_version || intake.pipeline_version} />
            </div>
          </div>
          <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--slate-600)', lineHeight: 1.45 }}><ShieldCheck size={18} color="var(--teal-600)" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />The doctor receives this original statement and the confirmed structure. Raw audio is never part of the doctor response.</div>
        </div>

        <div className="v-card" style={{ padding: 20, border: '2px solid var(--teal-300)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}><div><span className="provenance-tag ai">STRUCTURED CLINICAL INTAKE</span><div style={{ fontSize: '0.76rem', color: 'var(--slate-500)', marginTop: 6 }}>Generated conservatively from explicitly stated information.</div></div><button type="button" className="btn btn-secondary" onClick={() => setIsEditing((value) => !value)} style={{ padding: '4px 10px', fontSize: '0.78rem' }}><Edit3 size={14} />{isEditing ? 'Done' : 'Edit fields'}</button></div>
          {structuredRoot.extraction_status === 'REVIEW_REQUIRED' && <div role="alert" style={{ padding: '10px 12px', marginBottom: 14, borderRadius: 8, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '0.8rem' }}><AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />No supported explicit clinical fact was recognized. Review is required and a new consultation cannot submit an empty structure.</div>}
          {!isEditing ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
            <Field label="Chief complaint" value={form.chief_complaint} /><Field label="Duration" value={form.duration} /><Field label="Symptoms" value={parseList(form.symptoms)} /><Field label="Negative symptoms" value={parseList(form.negative_symptoms)} /><Field label="Possible symptom categories" value={parseList(form.possible_symptom_categories)} /><Field label="Relevant history" value={parseList(form.relevant_history)} /><Field label="Medications" value={parseList(form.medications)} /><Field label="Allergies" value={parseList(form.allergies)} /><Field label="Allergy status" value={form.allergy_status} /><Field label="Urgency flag" value={form.urgency} />
          </div> : <div style={{ display: 'grid', gap: 11 }}>
            <label>Chief complaint<input value={form.chief_complaint} onChange={(event) => setField('chief_complaint', event.target.value)} /></label>
            <label>Duration<input value={form.duration} onChange={(event) => setField('duration', event.target.value)} /></label>
            {['symptoms', 'negative_symptoms', 'possible_symptom_categories', 'relevant_history', 'medications', 'allergies'].map((field) => <label key={field}>{field.replaceAll('_', ' ')}<input value={form[field]} onChange={(event) => setField(field, event.target.value)} placeholder="Comma separated; leave blank if not stated" /></label>)}
            <label>Allergy status<select value={form.allergy_status} onChange={(event) => setField('allergy_status', event.target.value)}><option value="UNKNOWN">Unknown / not stated</option><option value="NONE_REPORTED">No known allergies reported</option><option value="REPORTED">Allergy reported</option></select></label>
            <label>Urgency flag<select value={form.urgency} onChange={(event) => setField('urgency', event.target.value)}><option value="">Not stated</option><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option><option value="EMERGENCY">Emergency language flagged</option></select></label>
          </div>}

          <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--slate-100)' }}><strong style={{ fontSize: '0.78rem' }}>Confidence</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{confidenceRows.map(([label, value]) => <span key={label} style={{ padding: '3px 7px', borderRadius: 5, backgroundColor: 'var(--slate-50)', color: 'var(--slate-600)', fontSize: '0.7rem' }}>{label}: {Number.isFinite(Number(value)) && Number(value) > 0 ? `${Math.round(Number(value) * 100)}%` : EMPTY}</span>)}</div><div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', marginTop: 8 }}>Provenance: original {provenance.original_text || EMPTY}; language {provenance.detected_language || EMPTY}; fields {provenance.structured_fields || EMPTY}.</div></div>
        </div>
      </div>

      {errorMessage && <div role="alert" style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '0.84rem' }}><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{errorMessage}</div>}
      <button type="button" className="btn btn-primary btn-block btn-lg" disabled={submitting || (visitType === 'NEW' && !hasClinicalInformation)} onClick={handleConfirm} style={{ marginTop: 18 }}><CheckCircle2 size={20} />{submitting ? 'Confirming intake...' : 'Confirm & Join Doctor Queue'}</button>
      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--slate-500)', lineHeight: 1.4, marginTop: 10 }}>Only after confirmation will this intake appear in the doctor queue. It does not diagnose or infer a condition.</p>
    </div>
  );
}
