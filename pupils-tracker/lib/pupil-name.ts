// Shorten a pupil's full name for writing into the Excel lesson plan (to save
// space) — e.g. "HO MING JIA" -> "Ming Jia", "JAYDEN KHO YU ZHE" -> "Jayden".
// Rule: drop the family name, keep the given/personal name, in Title Case.
//  - Malaysian-Chinese names put the surname FIRST; if the first word is a known
//    surname we keep the rest (the given name).
//  - Otherwise the name starts with a personal/English name — keep just that.
//  - Malay/Indian patronymics (bin/binti/a-l/a-p/anak) keep the name before the
//    marker.
// The app's own screens keep the full names; this only affects the Excel output.

// Common Malaysian-Chinese romanized surnames (lowercase). Generous on purpose so
// surname-first names are detected; personal/English first names fall through.
const SURNAMES = new Set([
  "aw", "boon", "chai", "cham", "chan", "chang", "chay", "cheah", "chee", "chen",
  "cheng", "cheong", "cheow", "chew", "chia", "chiew", "chin", "ching", "chong",
  "choo", "choong", "chow", "chu", "chua", "chuah", "chuang", "chui", "chun",
  "ee", "eng", "fong", "foo", "fung", "gan", "goh", "gooi", "han", "heng", "ho",
  "hoo", "hong", "hor", "hsu", "hu", "hui", "kang", "kaur", "keay", "kee", "keh",
  "keong", "ker", "kerk", "khaw", "khoo", "kho", "khor", "khu", "koh", "kok",
  "kong", "koo", "kua", "kuan", "kuek", "kwan", "kwok", "lai", "lam", "lau",
  "law", "lay", "lee", "leong", "leung", "lew", "liew", "lim", "lin", "ling",
  "loh", "lok", "loo", "looi", "loong", "louis", "low", "lu", "lue", "lui", "ma",
  "mah", "mok", "nah", "neo", "ng", "ngo", "ngoi", "nyon", "ong", "ooi", "ow",
  "pan", "pang", "pao", "pee", "phang", "phee", "poh", "pow", "quek", "seah",
  "see", "seng", "seow", "sha", "si", "sia", "sim", "sin", "sng", "so", "soh",
  "soo", "soon", "sze", "tai", "tam", "tan", "tang", "tay", "teah", "tee", "teh",
  "ten", "teng", "teo", "teoh", "tew", "tham", "thum", "tia", "tiew", "tio",
  "tiu", "toh", "tong", "tsai", "tye", "voon", "wang", "wee", "wong", "woo",
  "wu", "yan", "yang", "yap", "yau", "yee", "yeo", "yeoh", "yew", "yong", "yoon",
  "yuen",
]);

const MARKER = /^(bin|binti|bt|anak|a\/l|a\/p|al|ap|a\.l\.?|a\.p\.?)$/i;

function titleCase(word: string): string {
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word;
}

export function shortenName(full: string): string {
  const raw = (full || "").trim().replace(/\s+/g, " ");
  if (!raw) return raw;
  const words = raw.split(" ");

  // A real bin/binti/anak/a-l/a-p marker is always followed by a father's
  // name; require a word after it so a Chinese given name ending in "Bin"
  // (e.g. "LUCIUS LIN EE BIN") isn't mistaken for the Malay patronymic.
  const markerIdx = words.findIndex(
    (w, i) => i > 0 && i < words.length - 1 && MARKER.test(w)
  );
  let kept: string[];
  if (markerIdx > 0) {
    // Malay/Indian: keep the given name before bin/binti/a-l/a-p/anak.
    kept = words.slice(0, markerIdx);
  } else if (words.length === 1) {
    kept = words;
  } else if (SURNAMES.has(words[0].toLowerCase())) {
    // Surname-first Chinese name: drop the surname, keep the given name.
    kept = words.slice(1);
  } else {
    // Personal/English name first: keep just that.
    kept = [words[0]];
  }
  return kept.map(titleCase).join(" ");
}
