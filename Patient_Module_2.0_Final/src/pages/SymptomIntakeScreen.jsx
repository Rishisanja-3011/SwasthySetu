import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Type,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FastForward,
} from 'lucide-react';
import { patientApi } from '../services/patientApi';
import { SymptomIntakeScreenSkeleton, SymptomStructuringSkeleton } from '../components/Skeleton';
import { TypewriterGuidance } from '../components/TypewriterGuidance';
import {
  detectLanguage,
  getInitialRecognitionLanguage,
  SUPPORTED_LANGUAGES,
} from '../utils/languageDetector';

export function SymptomIntakeScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const doctor = location.state?.doctor || patientApi.getSessionDoctor();
  const visitType = location.state?.visitType || sessionStorage.getItem('swasthsetu_visit_type') || 'NEW';
  const doctorAccessGranted = location.state?.doctorAccessGranted !== undefined
    ? location.state.doctorAccessGranted
    : (sessionStorage.getItem('swasthsetu_access_granted') === 'true');

  useEffect(() => {
    if (doctor) patientApi.saveSessionDoctor(doctor);
    sessionStorage.setItem('swasthsetu_visit_type', visitType);
    sessionStorage.setItem('swasthsetu_access_granted', String(doctorAccessGranted));
  }, [doctor, visitType, doctorAccessGranted]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [detectedLang, setDetectedLang] = useState(() => {
    try {
      const stored = sessionStorage.getItem('swasthsetu_detected_lang');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [micDenied, setMicDenied] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setIsInitialLoading(false);
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

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

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        // Automatic language initialization using system preferences / previous detection
        const initialLangCode = detectedLang?.code || getInitialRecognitionLanguage();
        recognition.lang = initialLangCode;
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          // Real-time automatic language identification on spoken words
          const detected = detectLanguage(currentTranscript);
          if (detected) {
            setDetectedLang(detected);
            try {
              sessionStorage.setItem('swasthsetu_detected_lang', JSON.stringify(detected));
            } catch (e) {}
          }
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

    // Graceful fallback when Speech Recognition API is unavailable or blocked
    setIsRecording(false);
    setMicDenied(true);
  };

  const handleStopVoice = () => {
    setIsRecording(false);
  };

  const handleProcessIntake = (rawContent, mode) => {
    if (!rawContent.trim() && mode !== 'skipped') return;
    setIsStructuring(true);

    const detected = detectLanguage(rawContent) || detectedLang;

    // AI Structuring Simulation
    setTimeout(() => {
      let structured = {
        chief_complaint: 'Weakness',
        duration: '3 days',
        symptoms: ['Dizziness', 'Mild fatigue'],
        confidence: 0.94,
      };

      const lower = rawContent.toLowerCase();
      // Multilingual symptom detection across Gujarati, Hindi, Marathi, and English
      if (
        lower.includes('bukhar') || lower.includes('fever') ||
        rawContent.includes('તાવ') || rawContent.includes('ताप') ||
        lower.includes('badan dard') || rawContent.includes('अंगदुखी')
      ) {
        structured = {
          chief_complaint: 'Fever',
          duration: '2 days',
          symptoms: ['Body ache', 'Chills'],
          confidence: 0.96,
        };
      } else if (
        lower.includes('cough') || lower.includes('khansi') ||
        rawContent.includes('ખાંસી') || rawContent.includes('खोकला') ||
        lower.includes('khokla') || rawContent.includes('गळा')
      ) {
        structured = {
          chief_complaint: 'Cough',
          duration: '4 days',
          symptoms: ['Sore throat', 'Chest tightness'],
          confidence: 0.92,
        };
      } else if (
        rawContent.includes('કમજોરી') || rawContent.includes('कमजोरी') ||
        rawContent.includes('थकवा') || lower.includes('fatigue') || lower.includes('weakness')
      ) {
        structured = {
          chief_complaint: 'Weakness',
          duration: '3 days',
          symptoms: ['Dizziness', 'Mild fatigue'],
          confidence: 0.94,
        };
      }

      setIsStructuring(false);
      const pendingPayload = {
        doctor,
        visitType,
        doctorAccessGranted,
        inputMode: mode,
        rawTranscript: rawContent,
        detectedLanguage: detected || null,
        structuredData: {
          ...structured,
          detected_language: detected?.name || 'Auto-detected',
          language_code: detected?.code || 'auto',
        },
      };
      patientApi.savePendingIntake(pendingPayload);

      navigate('/intake-review', {
        state: pendingPayload,
      });
    }, 1200);
  };

  const handleSkipForRevisiting = () => {
    const skipPayload = {
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
    };
    patientApi.savePendingIntake(skipPayload);

    navigate('/intake-review', {
      state: skipPayload,
    });
  };

  if (isInitialLoading) {
    return <SymptomIntakeScreenSkeleton />;
  }

  return (
    <div className="skeleton-content-fade page-centered-container" style={{ maxWidth: 720, padding: '8px 0' }}>
      <button
        onClick={() => navigate('/visit-type', { state: { doctor } })}
        className="btn btn-secondary"
        style={{ padding: '8px 16px', fontSize: '0.82rem', marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <span className="status-pill active" style={{ fontSize: '0.72rem' }}>
            {visitType === 'NEW' ? 'Mandatory Intake' : 'Optional Intake'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-text)', fontFamily: 'var(--font-mono)' }}>
            Dr. Mehta • Cabin 2
          </span>
        </div>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--main-text)', marginBottom: 6 }}>
          Describe Your Symptoms
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-text)' }}>
          Speak in your mother tongue or type below. SwasthSetu organizes this clearly for the doctor.
        </p>
      </div>

      {/* Medical Teal Segmented Mode Switcher */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        backgroundColor: 'var(--surface-inset, #E2EFF3)',
        padding: 5,
        borderRadius: 'var(--radius-full)',
        marginBottom: 24,
        border: '1px solid var(--border-subtle)',
      }}>
        <button
          type="button"
          onClick={() => setInputMode('voice')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: inputMode === 'voice' ? '#FFFFFF' : 'transparent',
            color: inputMode === 'voice' ? 'var(--deep-indigo)' : 'var(--muted-text)',
            boxShadow: inputMode === 'voice' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.16s ease',
          }}
        >
          <Mic size={18} color={inputMode === 'voice' ? 'var(--healthcare-teal)' : 'currentColor'} />
          <span>Voice Recording</span>
        </button>

        <button
          type="button"
          onClick={() => setInputMode('text')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: inputMode === 'text' ? '#FFFFFF' : 'transparent',
            color: inputMode === 'text' ? 'var(--deep-indigo)' : 'var(--muted-text)',
            boxShadow: inputMode === 'text' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.16s ease',
          }}
        >
          <Type size={18} />
          <span>Text Input</span>
        </button>
      </div>


      {/* INPUT MODE: VOICE */}
      {inputMode === 'voice' && (
        <div className="v-card" style={{
          padding: 28,
          textAlign: 'center',
          marginBottom: 24,
          border: '1.5px solid var(--lavender-200)',
        }}>
          {/* Microphone Animation Button - Teal Accent for Voice */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={isRecording ? handleStopVoice : handleStartVoice}
              disabled={isStructuring}
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: 'none',
                background: isRecording
                  ? 'linear-gradient(135deg, var(--status-danger-text) 0%, #B91C1C 100%)'
                  : 'linear-gradient(135deg, var(--healthcare-teal) 0%, #007a62 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                cursor: 'pointer',
                boxShadow: isRecording
                  ? '0 0 28px rgba(220, 38, 38, 0.4)'
                  : '0 8px 24px rgba(0, 155, 125, 0.35)',
                animation: isRecording ? 'micRecordingPulse 1.8s infinite' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isRecording ? <MicOff size={42} /> : <Mic size={42} />}
            </button>
          </div>

          {isRecording ? (
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-text)',
                padding: '4px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.84rem',
                fontWeight: 700,
                marginBottom: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-danger-text)', animation: 'pulseGlow 1s infinite' }} />
                <span>
                  Listening • {detectedLang ? `Auto-detected: ${detectedLang.name}` : 'Auto-detecting language...'} • 00:0{recordingSeconds}s
                </span>
              </div>

              {/* Animated Soundwave Visualizer while recording */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 26, margin: '8px 0 12px 0' }}>
                {[0.2, 0.5, 0.9, 0.3, 0.8, 0.4, 0.7].map((delay, idx) => (
                  <span
                    key={idx}
                    style={{
                      width: 4,
                      height: 14,
                      backgroundColor: 'var(--status-danger-text)',
                      borderRadius: 3,
                      animation: `waveBar 0.9s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>

              <p style={{ fontSize: '0.86rem', color: 'var(--muted-text)' }}>
                Please speak clearly into your device microphone...
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(0, 155, 125, 0.08)',
                color: 'var(--healthcare-teal)',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: 8,
              }}>
                ● Speech Recognition Ready (Auto-Detects Gujarati, Hindi, Marathi, English)
              </div>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--main-text)', marginBottom: 4 }}>
                {transcript ? 'Intake Recorded' : 'Tap to Start Speaking'}
              </h4>
              <p
                className="typewriter-guidance-container"
                style={{ fontSize: '0.86rem', color: 'var(--muted-text)', maxWidth: 440, margin: '0 auto' }}
              >
                {transcript ? (
                  'Review the transcript below or tap microphone to re-record.'
                ) : (
                  <TypewriterGuidance isActive={!isRecording && !transcript && inputMode === 'voice'} />
                )}
              </p>
            </div>
          )}

          {/* Transcript Box */}
          {transcript && (
            <div style={{
              marginTop: 20,
              textAlign: 'left',
              backgroundColor: 'var(--surface-inset, #E2EFF3)',
              border: '1.5px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--deep-indigo)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Spoken Transcript:
                </span>
                {detectedLang && (
                  <span className="status-pill active" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                    Language: {detectedLang.name}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.94rem', color: 'var(--main-text)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                "{transcript}"
              </p>
            </div>
          )}

          {micDenied && (
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              color: 'var(--status-danger-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertCircle size={16} />
              <span>Microphone permission was denied. Switched to sample text intake.</span>
            </div>
          )}
        </div>
      )}

      {/* INPUT MODE: TEXT */}
      {inputMode === 'text' && (
        <div className="v-card" style={{
          padding: 24,
          marginBottom: 24,
          border: '1.5px solid var(--lavender-200)',
        }}>
          <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--main-text)', display: 'block', marginBottom: 8 }}>
            Type your chief complaints & symptoms:
          </label>
          <textarea
            rows={5}
            placeholder="Type your chief complaints in Gujarati, Hindi, Marathi, or English (e.g. મને ત્રણ દિવસથી કમજોરી છે / मुझे दो दिन से बुखार है / मला ताप आहे / Continuous fatigue for 3 days)..."
            value={textInput}
            onChange={(e) => {
              setTextInput(e.target.value);
              const detected = detectLanguage(e.target.value);
              if (detected) setDetectedLang(detected);
            }}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-medium)',
              fontSize: '0.94rem',
              lineHeight: 1.5,
              outlineColor: 'var(--lavender)',
              resize: 'vertical',
              fontFamily: 'var(--font-sans)',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.78rem', color: 'var(--muted-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Auto-detects Gujarati, Hindi, Marathi, and English</span>
              {detectedLang && textInput.trim() && (
                <span className="status-pill active" style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
                  {detectedLang.name}
                </span>
              )}
            </div>
            <span>{textInput.length} chars</span>
          </div>
        </div>
      )}

      {/* Dynamic Skeleton Placeholder during AI Structuring */}
      {isStructuring && (
        <div style={{ marginBottom: 18 }} className="fade-in">
          <SymptomStructuringSkeleton />
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={() => handleProcessIntake(inputMode === 'voice' ? transcript : textInput, inputMode)}
          disabled={isStructuring || (inputMode === 'voice' && !transcript.trim()) || (inputMode === 'text' && !textInput.trim())}
        >
          {isStructuring ? (
            <>
              <Sparkles size={18} className="animate-spin" />
              <span>Structuring symptoms with clinical AI...</span>
            </>
          ) : (
            <>
              <ArrowRight size={18} />
              <span>Review Structured Symptoms</span>
            </>
          )}
        </button>

        {visitType === 'REVISITING' && (
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleSkipForRevisiting}
          >
            <FastForward size={16} /> Skip Symptom Intake (Follow-up Checkup Only)
          </button>
        )}
      </div>
    </div>
  );
}
