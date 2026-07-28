// Campus Wall — Profanity Filter
// Hardcoded list for MVP. Admin-editable in a future phase.
// Uses word-boundary matching for English; substring matching for transliterated Hindi.

'use strict';

// ── English profanity ─────────────────────────────────────────────────────────
const ENGLISH_WORDS = [
  'fuck', 'fucker', 'fucking', 'fucked', 'fucks',
  'shit', 'shitty', 'bullshit',
  'bitch', 'bitches', 'bitchy',
  'asshole', 'arsehole',
  'bastard', 'bastards',
  'cunt', 'cunts',
  'dick', 'dicks', 'dickhead',
  'pussy', 'pussies',
  'whore', 'whores',
  'slut', 'sluts',
  'nigger', 'nigga',
  'faggot', 'fag',
  'retard', 'retarded',
  'rape', 'rapist',
  'motherfucker', 'mf',
];

// ── Hindi (transliterated) — substring match ──────────────────────────────────
// These appear mid-sentence in Hindi text so \b boundaries don't help
const HINDI_SUBSTRINGS = [
  'chutiya', 'chutiye', 'chutiyon',
  'madarchod', 'maaderchod', 'mc',
  'bhenchod', 'behenchod', 'bc',
  'gaand', 'gand',
  'randi', 'randii',
  'harami', 'haraami',
  'kamina', 'kameena',
  'saala', 'sala',
  'bhosdike', 'bhosdiwale',
  'lund', 'lavda',
  'chod', 'chodna',
  'maderchod',
];

// Build English regex (word boundary on both sides)
const englishRegex = new RegExp(
  `\\b(${ENGLISH_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

/**
 * Returns true if the text contains a flagged word.
 * @param {string} text
 * @returns {boolean}
 */
function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  if (englishRegex.test(lower)) return true;
  return HINDI_SUBSTRINGS.some(w => lower.includes(w));
}

/**
 * Returns the first matched word, or null.
 * Useful for logging moderation events.
 * @param {string} text
 * @returns {string|null}
 */
function getMatchedWord(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  const engMatch = lower.match(englishRegex);
  if (engMatch) return engMatch[0];
  const hindiMatch = HINDI_SUBSTRINGS.find(w => lower.includes(w));
  return hindiMatch || null;
}

module.exports = { containsProfanity, getMatchedWord };
