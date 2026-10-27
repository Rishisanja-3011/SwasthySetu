import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Type, Sparkles, AlertCircle, ArrowLeft, FastForward, Globe,
} from 'lucide-react';
import { patientApi } from '../services/patientApi';
import { usePatient } from '../context/PatientContext';
import TypewriterGuidance from '../components/TypewriterGuidance';
import './SymptomIntakeScreen.css';

const LANGUAGES = [
  { code: 'gu', speechCode: 'gu-IN', name: 'Gujarati (ગુજરાતી)', sample: 'મને ત્રણ દિવસથી ખૂબ જ કમજોરી લાગે છે અને ચક્કર પણ આવે છે.' },
  { code: 'hi', speechCode: 'hi-IN', name: 'Hindi (हिंदी)', sample: 'मुझे दो दिन से हल्का बुखार और शरीर में दर्द है।' },
  { code: 'mr', speechCode: 'mr-IN', name: 'Marathi (मराठी)', sample: 'मला कालपासून ताप आणि अंगदुखी होत आहे.' },
  { code: 'en', speechCode: 'en-IN', name: 'English', sample: 'I have had weakness and dizziness for the past 3 days.' },
];

export function SymptomIntakeScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateActiveEncounter } = usePatient();
  const doctor = location.state?.doctor;
  const visitType = location.state?.visitType || 'NEW';
  const doctorAccessGranted = location.state?.doctorAccessGranted || false;

  const [inputMode, setInputMode] = useState('voice');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [micDenied, setMicDenied] = useState(false);
  const [speechUnavailable, setSpeechUnavailable] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const recordingSessionRef = useRef(0);
  const pendingMicrophoneRef = useRef(false);

  useEffect(() => {
    if (!doctor) navigate('/');
  }, [doctor, navigate]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return undefined;
    }
    const interval = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && recordingSeconds >= 120) handleStopVoice();
  }, [isRecording, recordingSeconds]);

  useEffect(() => () => {
    recordingSessionRef.current += 1;
    pendingMicrophoneRef.current = false;
    recognitionRef.current?.stop?.();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  if (!doctor) return null;

  const handleStartVoice = async () => {
    if (isRecording || isStopping || isStructuring || pendingMicrophoneRef.current) return;
    const session = ++recordingSessionRef.current;
    const isCurrentSession = () => session === recordingSessionRef.current;
    const audioChunks = [];
    pendingMicrophoneRef.current = true;
    setErrorMessage('');
    setMicDenied(false);
    setSpeechUnavailable(false);
    setTranscript('');
    setInterimTranscript('');
    setAudioBlob(null);
    setIsRecording(true);

    try {
      if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission may resolve after Stop, mode change, or navigation away.
        if (!isCurrentSession()) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data?.size) audioChunks.push(event.data);
        };
        recorder.onstop = () => {
          const type = recorder.mimeType || 'audio/webm';
          stream.getTracks().forEach((track) => track.stop());
          if (!isCurrentSession()) return;
          const blob = new Blob(audioChunks, { type });
          setAudioBlob(blob.size ? blob : null);
          setIsStopping(false);
          recorderRef.current = null;
          if (streamRef.current === stream) streamRef.current = null;
        };
        recorder.start();
      }
    } catch (error) {
      if (!isCurrentSession()) return;
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setMicDenied(true);
      setErrorMessage('Microphone access was not available. If browser speech recognition works, you can still submit its transcript or switch to text.');
    }
    if (!isCurrentSession()) return;
    pendingMicrophoneRef.current = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = selectedLanguage.speechCode;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          if (!isCurrentSession()) return;
          let finalText = '';
          let interimText = '';
          for (let index = 0; index < event.results.length; index += 1) {
            if (event.results[index].isFinal) finalText += event.results[index][0].transcript;
            else interimText += event.results[index][0].transcript;
          }
          setTranscript(finalText);
          setInterimTranscript(interimText);
        };
        recognition.onerror = (event) => {
          if (!isCurrentSession()) return;
          if (event.error === 'not-allowed') setMicDenied(true);
          if (event.error !== 'aborted') setSpeechUnavailable(true);
        };
        recognition.onend = () => {
          if (!isCurrentSession()) return;
          recognitionRef.current = null;
          if (!recorderRef.current) setIsRecording(false);
        };
        recognitionRef.current = recognition;
        recognition.start();
      } catch (error) {
        recognitionRef.current = null;
        setSpeechUnavailable(true);
      }
    } else {
      setSpeechUnavailable(true);
    }
    if (!recorderRef.current && !recognitionRef.current) {
      setIsRecording(false);
      setErrorMessage('Voice capture is unavailable in this browser. Please use Text Input to continue.');
    }
  };

  const handleStopVoice = () => {
    if (pendingMicrophoneRef.current) {
      recordingSessionRef.current += 1;
      pendingMicrophoneRef.current = false;
    }
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    setIsStopping(Boolean(recorder && recorder.state === 'recording'));
    if (recorder?.state === 'recording') recorder.stop();
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRecording(false);
  };

  const handleModeChange = (mode) => {
    if (isStopping || isStructuring) return;
    if (isRecording) handleStopVoice();
    setInputMode(mode);
    setErrorMessage('');
  };

  const getEncounter = async () => patientApi.createEncounter({ doctor, visitType });

  const handleProcessIntake = async () => {
    if (isRecording || isStopping || isStructuring) return;
    const text = inputMode === 'text' ? textInput : transcript;
    if (inputMode === 'text' && !text.trim()) {
      setErrorMessage('Please type your original statement before continuing.');
      return;
    }
    if (inputMode === 'voice' && !text.trim() && !audioBlob?.size) {
      setErrorMessage('Please record or transcribe your statement before continuing.');
      return;
    }

    setErrorMessage('');
    setIsStructuring(true);
    try {
      const encounter = await getEncounter();
      const intake = inputMode === 'text'
        ? await patientApi.processTextIntake({ encounterId: encounter.id, language: selectedLanguage.code, text })
        : await patientApi.processVoiceIntake({
          encounterId: encounter.id,
          language: selectedLanguage.code,
          browserTranscript: text,
          transcriptReliable: Boolean(text.trim()),
          audioBlob,
        });
      navigate('/intake-review', {
        state: {
          doctor,
          visitType,
          doctorAccessGranted,
          encounter,
          inputMode: inputMode.toUpperCase(),
          intake,
        },
      });
    } catch (error) {
      setErrorMessage(error.message || 'We could not prepare this intake. Nothing was submitted to the doctor.');
    } finally {
      setIsStructuring(false);
    }
  };

  const handleSkipForRevisiting = async () => {
    setErrorMessage('');
    setIsStructuring(true);
    try {
      const encounter = await getEncounter();
      const intake = await patientApi.prepareSkippedIntake({ encounterId: encounter.id });
      const confirmed = await patientApi.confirmIntake({ encounterId: encounter.id, inputMode: 'SKIPPED', structuredData: intake.structured_data });
      updateActiveEncounter({ ...encounter, ...confirmed.encounter, intake: confirmed.intake });
      navigate('/waiting', { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'We could not join the waiting room. Please try again.');
    } finally {
      setIsStructuring(false);
    }
  };

  return (
    <div className="fade-in page-centered-container symptom-intake" style={{ maxWidth: 720, padding: '8px 0' }}>
      <button onClick={() => navigate('/visit-type', { state: { doctor } })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="page-heading intake-heading" style={{ textAlign: 'center', marginBottom: 20 }}>
        <span className="page-eyebrow">Your voice. Your words. Your care.</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
          <span className="status-pill active" style={{ fontSize: '0.7rem' }}>{visitType === 'NEW' ? 'Mandatory Intake' : 'Optional Intake'}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontFamily: 'var(--font-mono)' }}>{doctor.name}</span>
        </div>
        <h2 style={{ fontSize: '1.45rem', color: 'var(--navy-900)', marginBottom: 4 }}>Describe Your Symptoms</h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
          Speak or type naturally. Your original statement is kept unchanged, then you review every normalized field before submission.
        </p>
      </div>

      <div className="intake-mode-switch" role="group" aria-label="Symptom input method">
        {[
          ['voice', <Mic size={18} />, 'Voice Input'],
          ['text', <Type size={18} />, 'Text Input'],
        ].map(([mode, icon, label]) => (
          <button key={mode} type="button" aria-pressed={inputMode === mode} disabled={isStopping || isStructuring} onClick={() => handleModeChange(mode)}>
            {icon} {label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Globe size={14} /> Preferred language (a recognition hint, not a restriction)
        </label>
        <div className="intake-languages" role="group" aria-label="Preferred recognition language">
          {LANGUAGES.map((language) => (
            <button key={language.code} type="button" aria-pressed={selectedLanguage.code === language.code} disabled={isRecording || isStopping || isStructuring} onClick={() => setSelectedLanguage(language)}>
              {language.name}
            </button>
          ))}
        </div>
      </div>

      {inputMode === 'voice' ? (
        <div>
          <div className={`v-card intake-voice-card ${isRecording ? 'is-recording' : ''}`}>
            <button type="button" className="intake-mic-button" aria-label={isRecording ? 'Stop recording symptoms' : 'Start recording symptoms'} onClick={isRecording ? handleStopVoice : handleStartVoice} disabled={isStructuring || isStopping}>
              {isRecording ? <MicOff size={40} /> : <Mic size={42} />}
            </button>
            <h4 role="status" style={{ fontSize: '1.1rem', color: 'var(--navy-900)', marginBottom: 4 }}>{isRecording ? `Recording (${recordingSeconds}s)...` : isStopping ? 'Finishing recording…' : 'Tap to Speak Symptoms'}</h4>
            {isRecording && <div className="intake-wave" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <span key={index} style={{ animationDelay: `${index * .12}s` }} />)}</div>}
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', maxWidth: 430, margin: '0 auto' }}>
               {isRecording ? 'Tap again when finished. The server will use the browser transcript when reliable, otherwise it will transcribe the audio.' : <><span>Example: “{selectedLanguage.sample}”</span><span className="typewriter-guidance-container"><TypewriterGuidance active /></span></>}
            </p>
            {(micDenied || speechUnavailable) && <div style={{ marginTop: 14, color: '#9a3412', fontSize: '0.8rem' }}><AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Browser support is limited; a recorded audio file can still use server transcription when configured.</div>}
            {audioBlob?.size > 0 && !isRecording && !isStopping && <p className="intake-recording-ready" role="status">Audio captured. Ready for your review.</p>}
          </div>
          {(transcript || interimTranscript) && <div className="v-card" style={{ padding: 16, marginBottom: 20, backgroundColor: 'var(--slate-50)' }}><span className="provenance-tag patient">{transcript ? 'PATIENT_SPOKEN_TRANSCRIPT' : 'TRANSCRIPT_IN_PROGRESS'}</span><p style={{ fontSize: '0.94rem', color: 'var(--navy-900)', fontStyle: 'italic', lineHeight: 1.5, marginTop: 8 }}>&quot;{transcript || interimTranscript}&quot;</p>{!transcript && <p style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: 7 }}>Only final browser speech segments are submitted as a transcript.</p>}</div>}
          <button type="button" className="btn btn-primary btn-block btn-lg" disabled={isStructuring || isRecording || isStopping || (!transcript.trim() && !audioBlob?.size)} onClick={handleProcessIntake}>
            <Sparkles size={18} /> {isStructuring ? 'Preparing review...' : 'Review Structured Intake'}
          </button>
        </div>
      ) : (
        <div>
          <div className="v-card" style={{ padding: 18, marginBottom: 20 }}>
            <label htmlFor="original-statement" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy-900)', display: 'block', marginBottom: 8 }}>Your original statement</label>
            <textarea id="original-statement" rows={5} value={textInput} disabled={isStructuring} onChange={(event) => setTextInput(event.target.value)} placeholder="Describe what you are experiencing, in any supported language..." style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-medium)', fontFamily: 'var(--font-sans)', fontSize: '0.94rem', lineHeight: 1.5, resize: 'vertical' }} />
          </div>
          <button type="button" className="btn btn-primary btn-block btn-lg" disabled={isStructuring || isStopping || !textInput.trim()} onClick={handleProcessIntake}><Sparkles size={18} /> {isStructuring ? 'Preparing review...' : 'Structure & Review Symptoms'}</button>
        </div>
      )}

      {errorMessage && <div role="alert" style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '0.84rem' }}><AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{errorMessage}</div>}

      {visitType === 'REVISITING' && <div style={{ textAlign: 'center', marginTop: 18, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}><p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: 8 }}>No new symptoms to report?</p><button type="button" className="btn btn-secondary btn-block" disabled={isStructuring} onClick={handleSkipForRevisiting}><FastForward size={16} /> Skip intake and join queue</button></div>}
    </div>
  );
}
