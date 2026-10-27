import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Type,
  Sparkles,
  Volume2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FastForward,
  Globe,
  CheckCircle2,
} from 'lucide-react';

const REGIONAL_LANGUAGES = [
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)', sample: 'મને ત્રણ દિવસથી ખૂબ જ કમજોરી લાગે છે અને ચક્કર પણ આવે છે.' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)', sample: 'मुझे दो दिन से हल्का बुखार और शरीर में दर्द है।' },
  { code: 'mr-IN', name: 'Marathi (मराठी)', sample: 'मला कालपासून ताप आणि अंगदुखी होत आहे.' },
  { code: 'en-IN', name: 'English', sample: 'I have had continuous fatigue and mild dizziness for the past 3 days.' },
];

export function SymptomIntakeScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const doctor = location.state?.doctor;
  const visitType = location.state?.visitType || 'NEW'; // 'NEW' or 'REVISITING'
  const doctorAccessGranted = location.state?.doctorAccessGranted || false;

  if (!doctor) {
    navigate('/');
    return null;
  }

  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [selectedLang, setSelectedLang] = useState(REGIONAL_LANGUAGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [micDenied, setMicDenied] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);

  // Timer for recording
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartVoice = () => {
    setMicDenied(false);
    setIsRecording(true);
    setTranscript('');

    // Check Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = selectedLang.code;
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition warning:', e.error);
          if (e.error === 'not-allowed') {
            setMicDenied(true);
            setIsRecording(false);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('Web speech initialization error:', err);
      }
    }

    // Realistic audio recording simulation
    setTimeout(() => {
      setTranscript(selectedLang.sample);
      setIsRecording(false);
    }, 3500);
  };

  const handleStopVoice = () => {
    setIsRecording(false);
    if (!transcript) {
      setTranscript(selectedLang.sample);
    }
  };

  const handleProcessIntake = (rawContent, mode) => {
    if (!rawContent.trim() && mode !== 'skipped') return;
    setIsStructuring(true);

    // AI Structuring Simulation
    setTimeout(() => {
      let structured = {
        chief_complaint: 'Weakness',
        duration: '3 days',
        symptoms: ['Dizziness', 'Mild fatigue'],
        confidence: 0.94,
      };

      const lower = rawContent.toLowerCase();
      if (lower.includes('bukhar') || lower.includes('fever') || lower.includes('તાપ')) {
        structured = {
          chief_complaint: 'Fever',
          duration: '2 days',
          symptoms: ['Body ache', 'Chills'],
          confidence: 0.96,
        };
      } else if (lower.includes('cough') || lower.includes('khansi') || lower.includes('ખાંસી')) {
        structured = {
          chief_complaint: 'Cough',
          duration: '4 days',
          symptoms: ['Sore throat', 'Chest tightness'],
          confidence: 0.92,
        };
      }

      setIsStructuring(false);
      navigate('/intake-review', {
        state: {
          doctor,
          visitType,
          doctorAccessGranted,
          inputMode: mode,
          rawTranscript: rawContent,
          structuredData: structured,
        },
      });
    }, 1200);
  };

  const handleSkipForRevisiting = () => {
    navigate('/intake-review', {
      state: {
        doctor,
        visitType: 'REVISITING',
        doctorAccessGranted: true,
        inputMode: 'skipped',
        rawTranscript: 'Intake skipped by returning patient.',
        structuredData: {
          chief_complaint: 'Follow-up Consultation',
          duration: 'Ongoing',
          symptoms: ['General Review'],
          confidence: 1.0,
        },
      },
    });
  };

  return (
    <div className="fade-in page-centered-container" style={{ maxWidth: 700, padding: '8px 0' }}>
      <button
        onClick={() => navigate('/visit-type', { state: { doctor } })}
        className="btn btn-secondary"
        style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: 16 }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
          <span className="status-pill active" style={{ fontSize: '0.7rem' }}>
            {visitType === 'NEW' ? 'Mandatory Intake' : 'Optional Intake'}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontFamily: 'var(--font-mono)' }}>
            Dr. Mehta
          </span>
        </div>
        <h2 style={{ fontSize: '1.45rem', color: 'var(--navy-900)', marginBottom: 4 }}>
          Describe Your Symptoms
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
          Speak in your mother tongue or type. SwasthSetu converts this into structured info for the doctor.
        </p>
      </div>

      {/* Mode Switcher Tabs (Voice vs Text) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        backgroundColor: 'var(--slate-100)',
        padding: 4,
        borderRadius: 12,
        marginBottom: 20,
      }}>
        <button
          type="button"
          onClick={() => setInputMode('voice')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            backgroundColor: inputMode === 'voice' ? '#ffffff' : 'transparent',
            color: inputMode === 'voice' ? 'var(--teal-700)' : 'var(--slate-600)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: inputMode === 'voice' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Mic size={18} />
          Voice Input
        </button>

        <button
          type="button"
          onClick={() => setInputMode('text')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            backgroundColor: inputMode === 'text' ? '#ffffff' : 'transparent',
            color: inputMode === 'text' ? 'var(--blue-700)' : 'var(--slate-600)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: inputMode === 'text' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Type size={18} />
          Text Input
        </button>
      </div>

      {/* VOICE MODE */}
      {inputMode === 'voice' && (
        <div>
          {/* Language Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Globe size={14} /> Select Spoken Language:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {REGIONAL_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    border: selectedLang.code === lang.code ? '2px solid var(--teal-500)' : '1px solid var(--border-medium)',
                    backgroundColor: selectedLang.code === lang.code ? 'var(--teal-50)' : '#ffffff',
                    color: selectedLang.code === lang.code ? 'var(--teal-900)' : 'var(--slate-700)',
                    fontWeight: selectedLang.code === lang.code ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Microphone Box */}
          <div className="v-card" style={{
            textAlign: 'center',
            padding: '28px 20px',
            marginBottom: 20,
            border: isRecording ? '2px solid var(--teal-500)' : '1px solid var(--border-subtle)',
          }}>
            <button
              type="button"
              onClick={isRecording ? handleStopVoice : handleStartVoice}
              disabled={isStructuring}
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                backgroundColor: isRecording ? '#dc2626' : 'var(--teal-500)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRecording ? '0 0 24px rgba(220, 38, 38, 0.4)' : 'var(--shadow-glow)',
                animation: isRecording ? 'radarPing 1.6s infinite ease' : 'none',
                transition: 'all 0.2s ease',
                marginBottom: 14,
              }}
            >
              {isRecording ? <MicOff size={40} /> : <Mic size={42} />}
            </button>

            <h4 style={{ fontSize: '1.1rem', color: 'var(--navy-900)', marginBottom: 4 }}>
              {isRecording ? `Recording (${recordingSeconds}s)...` : 'Tap to Speak Symptoms'}
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', maxWidth: 360, margin: '0 auto' }}>
              {isRecording
                ? 'Speaking naturally in your regional language. Tap button again when done.'
                : `Say: "${selectedLang.sample}"`}
            </p>

            {/* Mic Denied Alert (Section 15) */}
            {micDenied && (
              <div style={{
                marginTop: 16,
                padding: '12px 14px',
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 10,
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c2410c', fontWeight: 700, fontSize: '0.86rem', marginBottom: 4 }}>
                  <AlertCircle size={16} /> Microphone Access Denied
                </div>
                <p style={{ fontSize: '0.8rem', color: '#9a3412', marginBottom: 8 }}>
                  We couldn't access your microphone. You can describe your symptoms by typing instead.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setInputMode('text')}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <Type size={14} /> Switch to Text Input
                </button>
              </div>
            )}
          </div>

          {/* Transcript Preview Box */}
          {transcript && (
            <div className="v-card" style={{ padding: 16, marginBottom: 20, backgroundColor: 'var(--slate-50)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="provenance-tag patient">PATIENT_REPORTED • TRANSCRIPT</span>
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: '0.76rem', cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>
              <p style={{ fontSize: '0.94rem', color: 'var(--navy-900)', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{transcript}"
              </p>
            </div>
          )}

          {transcript && (
            <button
              type="button"
              className="btn btn-primary btn-block btn-lg"
              disabled={isStructuring}
              onClick={() => handleProcessIntake(transcript, 'voice')}
              style={{ marginBottom: 12 }}
            >
              {isStructuring ? (
                <>Structuring Intake...</>
              ) : (
                <>
                  <Sparkles size={18} /> Review Structured Intake
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* TEXT MODE */}
      {inputMode === 'text' && (
        <div>
          <div className="v-card" style={{ padding: 18, marginBottom: 20 }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy-900)', display: 'block', marginBottom: 8 }}>
              Type your symptoms:
            </label>
            <textarea
              rows={4}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. I have had weakness and dizziness for 3 days..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--border-medium)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.94rem',
                lineHeight: 1.5,
                resize: 'vertical',
                marginBottom: 12,
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                onClick={() => setTextInput('I have had severe weakness and dizziness for the past 3 days.')}
              >
                Sample 1 (Weakness 3d)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                onClick={() => setTextInput('Fever and severe body ache since yesterday evening.')}
              >
                Sample 2 (Fever)
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            disabled={isStructuring || !textInput.trim()}
            onClick={() => handleProcessIntake(textInput, 'text')}
            style={{ marginBottom: 12 }}
          >
            {isStructuring ? (
              <>Structuring Intake...</>
            ) : (
              <>
                <Sparkles size={18} /> Structure & Review Symptoms
              </>
            )}
          </button>
        </div>
      )}

      {/* Optional Skip Action (If REVISITING visit type) */}
      {visitType === 'REVISITING' && (
        <div style={{ textAlign: 'center', marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: 8 }}>
            Visiting Dr. Mehta for a follow-up without new symptoms?
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleSkipForRevisiting}
          >
            <FastForward size={16} /> Skip Intake & Join Queue Directly
          </button>
        </div>
      )}
    </div>
  );
}
