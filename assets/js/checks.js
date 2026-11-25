/* Tutee Connect · NZ: checks that typed details look real (shared by the counselling form, the shortlist box and
   Tutee AI's callback flow). The server (netlify/functions/enquiry.mjs) repeats the same rules, since a browser
   check can always be bypassed. Each function returns '' when the value is fine, or the message to show. */
(() => {
  const letters = s => (String(s).match(/[A-Za-zÀ-ɏ]/g) || []).join('');
  const PLACEHOLDER = /^(test|testing|tester|name|full ?name|my ?name|abc|abcd|abcde|xyz|asdf\w*|qwert\w*|zxcv\w*|fake|user|admin|none|nil|null|na|n ?a|no ?name|unknown|anonymous|sample|demo|dummy|hello|hi|ok|okay|student|xxx+|aaa+)$/i;
  // runs of keys typed along a keyboard row (or the alphabet) that don't occur in real names or subjects
  const MASH = /qwer|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm|yuio|uiop|tyui|rtyu|abcd|bcde|cdef|wxyz|lkjh|hgfd|fdsa|rewq|poiu|mnbv|vcxz/;
  // keyboard mashing or nonsense, judged word by word: one letter repeated, a keyboard run, five consonants in a
  // row, or no vowel in a word of 4+ letters (short all-capitals words such as MBBS, PGDM or BTECH are fine)
  function gibberish(s) {
    const w = letters(s).toLowerCase();
    if (!w || /^(.)\1+$/.test(w)) return true;
    return String(s).split(/[^A-Za-zÀ-ɏ]+/).filter(Boolean).some(word => {
      const lw = word.toLowerCase();
      if (/(.)\1{3,}/.test(lw) || MASH.test(lw)) return true;
      if (word === word.toUpperCase() && word.length <= 6) return false;   // an acronym
      return (lw.length >= 4 && !/[aeiouyà-ÿ]/.test(lw)) || /[bcdfghjklmnpqrstvwxz]{5,}/.test(lw);
    });
  }
  function nameIssue(v) {
    const s = String(v || '').trim().replace(/\s+/g, ' ');
    if (letters(s).length < 2) return 'Please enter your full name.';
    if (s.length > 80) return 'That name is too long. Please enter just your full name.';
    if (/\d/.test(s)) return 'Names can’t contain numbers.';
    if (/[^A-Za-zÀ-ɏ .'\-]/.test(s)) return 'Please use letters only (spaces, dots, hyphens and apostrophes are fine).';
    if (PLACEHOLDER.test(s) || gibberish(s)) return 'This doesn’t look like a real name. Please enter your full name.';
    return '';
  }
  // the optional course: blank is fine; otherwise a real subject, not a placeholder or keyboard mash
  function courseIssue(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    if (s.length > 120) return 'Please keep the course name short.';
    if (letters(s).length < 2) return 'Please enter a subject, e.g. Data Science, or leave this blank.';
    if (/[^A-Za-zÀ-ɏ0-9 &,.'()\/+\-–]/.test(s)) return 'Please use letters only, e.g. Data Science.';
    if (PLACEHOLDER.test(s) || gibberish(s)) return 'This doesn’t look like a course. Pick one from the list, or leave it blank if you’re not sure.';
    return '';
  }
  window.TCChecks = { nameIssue, courseIssue, gibberish, letters };
})();
