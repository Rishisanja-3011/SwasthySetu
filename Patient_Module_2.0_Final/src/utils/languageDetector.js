/**
 * SwasthSetu - Automatic Spoken and Typed Language Identification
 * 
 * Supports Gujarati (gu-IN), Hindi (hi-IN), Marathi (mr-IN), and English (en-IN).
 * Uses Unicode script boundary analysis and regional morpho-syntactic markers
 * to deterministically identify the spoken or typed language without fake or hardcoded values.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)', script: 'Gujarati' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)', script: 'Devanagari' },
  { code: 'mr-IN', name: 'Marathi (मराठी)', script: 'Devanagari' },
  { code: 'en-IN', name: 'English', script: 'Latin' },
];

const MARATHI_DISTINCT_WORDS = [
  'मला', 'आहे', 'आहेत', 'होत', 'होते', 'त्रास', 'अंगदुखी', 'नाही',
  'वाटत', 'खूप', 'कालपासून', 'दिवसांपासून', 'डोकेदुखी', 'थकवा', 'कणकण', 'झाला', 'झाली'
];

const HINDI_DISTINCT_WORDS = [
  'मुझे', 'है', 'हैं', 'दर्द', 'बुखार', 'कमजोरी', 'रहा', 'रही',
  'दिन', 'से', 'हो', 'था', 'थी', 'और', 'सिरदर्द', 'थकावट', 'चक्कर'
];

const GUJARATI_ROMAN_PATTERNS = [
  'mane', 'tame', 'divas', 'kamjori', 'chakkar', 'aave', 'chhe', 'nathi', 'maru', 'taav'
];

const MARATHI_ROMAN_PATTERNS = [
  'mala', 'aahe', 'aahet', 'hot', 'hote', 'tras', 'angdukhi', 'kalpasun', 'thakva'
];

const HINDI_ROMAN_PATTERNS = [
  'mujhe', 'bukhar', 'dard', 'hai', 'hain', 'din', 'se', 'ho raha', 'ho rahi', 'tha', 'thi', 'kamzori'
];

/**
 * Deterministically identify language from text string.
 * Returns language descriptor object or null if text is empty/unrecognizable.
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Gujarati Unicode block (U+0A80 - U+0AFF)
  const gujaratiChars = (trimmed.match(/[\u0A80-\u0AFF]/g) || []).length;

  // 2. Devanagari Unicode block (U+0900 - U+097F) - used by Hindi and Marathi
  const devanagariChars = (trimmed.match(/[\u0900-\u097F]/g) || []).length;

  // 3. Latin characters (A-Z, a-z)
  const latinChars = (trimmed.match(/[a-zA-Z]/g) || []).length;

  const total = gujaratiChars + devanagariChars + latinChars;
  if (total === 0) return null;

  // Pure Latin / Romanized text
  if (latinChars > 0 && latinChars > gujaratiChars && latinChars > devanagariChars) {
    const lower = trimmed.toLowerCase();
    if (GUJARATI_ROMAN_PATTERNS.some((p) => lower.includes(p))) {
      return SUPPORTED_LANGUAGES[0]; // Gujarati
    }
    if (MARATHI_ROMAN_PATTERNS.some((p) => lower.includes(p))) {
      return SUPPORTED_LANGUAGES[2]; // Marathi
    }
    if (HINDI_ROMAN_PATTERNS.some((p) => lower.includes(p))) {
      return SUPPORTED_LANGUAGES[1]; // Hindi
    }
    return SUPPORTED_LANGUAGES[3]; // English
  }

  // Gujarati script detected
  if (gujaratiChars > 0 && gujaratiChars >= devanagariChars) {
    return SUPPORTED_LANGUAGES[0]; // Gujarati
  }

  // Devanagari script detected: differentiate Marathi vs Hindi
  if (devanagariChars > 0) {
    // Check Marathi specific character 'ळ' (\u0933)
    if (trimmed.includes('\u0933')) {
      return SUPPORTED_LANGUAGES[2]; // Marathi
    }
    // Check Marathi distinct words
    const isMarathi = MARATHI_DISTINCT_WORDS.some((word) => trimmed.includes(word));
    if (isMarathi) {
      return SUPPORTED_LANGUAGES[2]; // Marathi
    }

    // Check Hindi distinct words
    const isHindi = HINDI_DISTINCT_WORDS.some((word) => trimmed.includes(word));
    if (isHindi) {
      return SUPPORTED_LANGUAGES[1]; // Hindi
    }

    // Default Devanagari fallback: Hindi
    return SUPPORTED_LANGUAGES[1]; // Hindi
  }

  return null;
}

/**
 * Determine best initial recognition language based on system/browser settings or session.
 */
export function getInitialRecognitionLanguage() {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('swasthsetu_detected_lang');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.code) return parsed.code;
      }
    } catch (e) {}

    const navLangs = navigator.languages || [navigator.language || ''];
    for (const lang of navLangs) {
      const lower = lang.toLowerCase();
      if (lower.startsWith('gu')) return 'gu-IN';
      if (lower.startsWith('hi')) return 'hi-IN';
      if (lower.startsWith('mr')) return 'mr-IN';
      if (lower.startsWith('en')) return 'en-IN';
    }
  }

  // Default regional language for SwasthSetu clinics (Gujarat clinic context)
  return 'gu-IN';
}
