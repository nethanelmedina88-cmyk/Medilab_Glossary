window.SL = window.SL || {};
SL.eligibleTerms = function (glossary, maps) {
  return glossary.filter(function (e) {
    return !e.aliasOf && !/^\s*ראה:/.test(e.definition) && e.definition && e.definition.length >= 20;
  });
};
// Deterministic pseudo-random from a seed so tests are reproducible (no Math.random).
function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

/* High-quality distractors (psychometric rubric):
   - plausible: same topic as the answer (common confusions) when possible
   - homogeneous: closest in length to the correct option (no length cue)
   - mutually exclusive: never a synonym, never the same normalized text
   `lenKey` = 'definition' (pick-definition) or 'hebrew' (pick-term). */
SL.pickDistractors = function (pool, term, maps, n, lenKey, rand) {
  rand = rand || Math.random; lenKey = lenKey || 'definition';
  var ban = {}; SL.synonymsOf(term.hebrew, maps).concat([term.hebrew]).forEach(function (h) { ban[h] = 1; });
  var correct = SL.normalize(term[lenKey] || '');
  var cand = pool.filter(function (e) {
    return !ban[e.hebrew] && e.definition && e.definition.length >= 20 && !e.aliasOf && SL.normalize(e[lenKey] || '') !== correct;
  });
  var same = cand.filter(function (e) { return term.topic && e.topic === term.topic; });
  var base = same.length >= n ? same : cand;
  var target = (term[lenKey] || '').length;
  base = base.slice().sort(function (a, b) { return Math.abs((a[lenKey] || '').length - target) - Math.abs((b[lenKey] || '').length - target); });
  var win = base.slice(0, Math.max(n * 4, n));               // closest-by-length window
  win = win.slice().sort(function () { return rand() - 0.5; }); // randomize within the plausible window
  return win.slice(0, n);
};

// the definition shown in a question is the reworded paraphrase (comprehension, not verbatim recall)
SL.defText = function (e) { return (e && e.paraphrase) ? e.paraphrase : (e ? e.definition : ''); };
SL.generateItem = function (pool, maps, kind, seed) {
  var rand = rng((seed || 0) + 1);
  var term = pick(pool, rand);
  var lenKey = kind === 'pick-definition' ? 'paraphrase' : 'hebrew';
  var distractors = SL.pickDistractors(pool, term, maps, 2, lenKey, rand);
  var options;
  if (kind === 'pick-definition') {
    options = [{ text: SL.defText(term), correct: true, sourceHebrew: term.hebrew }]
      .concat(distractors.map(function (d) { return { text: SL.defText(d), correct: false, sourceHebrew: d.hebrew }; }));
  } else { // pick-term
    options = [{ text: term.hebrew, correct: true, sourceHebrew: term.hebrew }]
      .concat(distractors.map(function (d) { return { text: d.hebrew, correct: false, sourceHebrew: d.hebrew }; }));
  }
  options = options.sort(function () { return rand() - 0.5; });
  return { kind: kind, term: term, prompt: kind === 'pick-definition' ? term.hebrew : SL.defText(term), options: options };
};
SL.checkAnswer = function (item, response, maps) {
  var accepted = [item.term.hebrew].concat(SL.synonymsOf(item.term.hebrew, maps)).map(SL.normalize);
  return accepted.indexOf(SL.normalize(response)) !== -1;
};
