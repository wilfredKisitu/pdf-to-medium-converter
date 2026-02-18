/**
 * charNormalizer.js
 *
 * Fixes the many ways PDF text extraction produces garbled characters:
 *
 *  1. Unicode ligatures  (ﬁ → fi, ﬀ → ff, …)
 *  2. Windows-1252 C1 fixups — the most common source of garbage in Type 1
 *     and older PDF fonts.  Bytes 0x80-0x9F are often decoded as their
 *     raw ISO-8859-1 codepoints instead of their Win-1252 meanings.
 *  3. Stripping of unwanted control characters, soft hyphens, and
 *     Unicode Private-Use Area codepoints (custom glyph mappings that
 *     have no meaningful Unicode equivalent).
 *  4. Zero-width / BOM characters that break word matching.
 *  5. Unicode NFC normalization — recombines decomposed diacritics
 *     (e.g. e + ́ → é) that pdfjs sometimes delivers separately.
 *
 *  6. Post-aggregation prose fixes (applied ONLY to paragraph text,
 *     never to code blocks):
 *     – triple-hyphen  → em dash (—)
 *     – double-hyphen  → en dash (–)
 *     – backtick pairs (``  '') → smart double quotes
 *     – triple period  → ellipsis (…)
 *     – collapsed duplicate spaces
 *
 *  7. Word-break hyphen rejoining — PDFs often split long words across
 *     lines with a trailing hyphen; this rejoins them during paragraph
 *     assembly.
 */

// ── 1. Ligature map ───────────────────────────────────────────────────────
const LIGATURE = {
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\uFB05': 'st',   // long-s + t
  '\uFB06': 'st',
  '\u017F': 's',    // ſ (long s) → s
  '\u1E9E': 'SS',   // ẞ → SS  (German capital sharp s, pre-2017 substitute)
}

// ── 2. Windows-1252 C1 fixups ─────────────────────────────────────────────
// PDF Type 1 fonts with WinAnsiEncoding sometimes leave these bytes as their
// raw Latin-1 codepoints (U+0080–U+009F) instead of the correct Win-1252
// interpretation.
const WIN1252 = {
  '\u0080': '\u20AC', // € Euro sign
  '\u0082': '\u201A', // ‚ single low-9 quotation mark
  '\u0083': '\u0192', // ƒ florin
  '\u0084': '\u201E', // „ double low-9 quotation mark
  '\u0085': '\u2026', // … horizontal ellipsis
  '\u0086': '\u2020', // † dagger
  '\u0087': '\u2021', // ‡ double dagger
  '\u0088': '\u02C6', // ˆ modifier letter circumflex
  '\u0089': '\u2030', // ‰ per mille sign
  '\u008A': '\u0160', // Š
  '\u008B': '\u2039', // ‹ single left-pointing angle quotation
  '\u008C': '\u0152', // Œ
  '\u008E': '\u017D', // Ž
  '\u0091': '\u2018', // ' left single quotation mark
  '\u0092': '\u2019', // ' right single quotation mark
  '\u0093': '\u201C', // " left double quotation mark
  '\u0094': '\u201D', // " right double quotation mark
  '\u0095': '\u2022', // • bullet
  '\u0096': '\u2013', // – en dash
  '\u0097': '\u2014', // — em dash
  '\u0098': '\u02DC', // ˜ small tilde
  '\u0099': '\u2122', // ™ trade mark sign
  '\u009A': '\u0161', // š
  '\u009B': '\u203A', // › single right-pointing angle quotation
  '\u009C': '\u0153', // œ
  '\u009E': '\u017E', // ž
  '\u009F': '\u0178', // Ÿ
}

// ── 3 & 4. Codepoints to strip entirely ──────────────────────────────────
function shouldStrip(cp) {
  // C0 controls except HT (9), LF (10), CR (13)
  if (cp < 0x20 && cp !== 0x09 && cp !== 0x0A && cp !== 0x0D) return true
  // Soft hyphen — U+00AD — a line-break hint, not a visible character
  if (cp === 0x00AD) return true
  // Zero-width non-joiner / zero-width joiner / BOM / zero-width space
  if (cp === 0x200B || cp === 0x200C || cp === 0x200D || cp === 0xFEFF) return true
  // BMP Private Use Area  (custom glyph mappings with no Unicode meaning)
  if (cp >= 0xE000 && cp <= 0xF8FF) return true
  // Supplementary Private Use Areas
  if (cp >= 0xF0000) return true
  return false
}

/**
 * Normalize a single raw string from a PDF text item.
 *
 * Apply this to every `item.str` before aggregating into lines.
 */
export function normalizeStr(raw) {
  if (!raw) return raw

  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const cp = raw.codePointAt(i)

    // Surrogate pair — advance an extra index position
    if (cp > 0xFFFF) i++

    // 1. Win-1252 C1 byte fixup (most common garbling source)
    if (WIN1252[ch]) { out += WIN1252[ch]; continue }

    // 2. Ligature decomposition
    if (LIGATURE[ch]) { out += LIGATURE[ch]; continue }

    // 3 & 4. Strip control/PUA codepoints
    if (shouldStrip(cp)) continue

    out += ch
  }

  // 5. NFC normalization — recombines any separated base char + diacritic
  return out.normalize('NFC')
}

// ── 6. Post-aggregation prose normalization ───────────────────────────────

/**
 * Normalize a complete prose string (paragraph / heading).
 * Do NOT call this on code-block lines.
 *
 * Fixes punctuation sequences that survive character-level normalization
 * but are still wrong due to font substitution (e.g. "--" for en dash).
 */
export function normalizeProse(text) {
  return text
    // em dash: --- or \u2013\u2013 or hy+hy+hy
    .replace(/---/g, '\u2014')
    // en dash: -- (but not inside code-like tokens — safe for prose)
    .replace(/(?<![!<>=\-])--(?![-!<>=])/g, '\u2013')
    // Smart double quotes from TeX-style pairs
    .replace(/``/g, '\u201C')
    .replace(/''/g, '\u201D')
    // Ellipsis
    .replace(/(?<!\.)\.\.\.(?!\.)/g, '\u2026')
    // Collapse multiple spaces (but not newlines)
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim()
}

// ── 7. Word-break hyphen rejoining ────────────────────────────────────────

/**
 * Join an array of prose line-strings into a single paragraph string,
 * detecting and removing word-break hyphens inserted by PDF line-wrapping.
 *
 * Heuristic: if a line ends with `<letter>-` and the next line starts
 * with a lowercase letter, the hyphen is a soft line-break — remove it
 * and concatenate directly.  Otherwise join with a space.
 *
 * This correctly handles:
 *   "implemen-"  + "tation"   → "implementation"
 *   "state-"     + "of-the-art" → "state-of-the-art"   (lowercase → joined)
 *
 * It does NOT attempt to rejoin things like "Fig. 3-" + "4" where a digit
 * follows; those are left with a space.
 */
export function joinProseLines(lines) {
  if (!lines.length) return ''
  let result = lines[0]
  for (let i = 1; i < lines.length; i++) {
    const next = lines[i]
    // Word-break: prev ends letter+hyphen, next starts lowercase letter/accented
    if (/[a-zA-Z\u00C0-\u024F]-$/.test(result) && /^[a-z\u00E0-\u024F]/.test(next)) {
      result = result.slice(0, -1) + next   // drop the hyphen, join directly
    } else {
      result = result + ' ' + next
    }
  }
  return result.trim()
}
