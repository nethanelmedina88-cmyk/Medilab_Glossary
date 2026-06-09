window.SL = window.SL || {};
SL.eligibleTerms = function (glossary, maps) {
  return glossary.filter(function (e) {
    return !e.aliasOf && !/^\s*ראה:/.test(e.definition) && e.definition && e.definition.length >= 20;
  });
};
// Deterministic pseudo-random from a seed so tests are reproducible (no Math.random).
function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

SL.generateItem = function (pool, maps, kind, seed) {
  var rand = rng((seed || 0) + 1);
  var term = pick(pool, rand);
  var banned = {}; SL.synonymsOf(term.hebrew, maps).concat([term.hebrew]).forEach(function (h) { banned[h] = 1; });
  var distractors = pool.filter(function (e) { return !banned[e.hebrew]; });
  // shuffle distractors deterministically, take 2
  distractors = distractors.slice().sort(function () { return rand() - 0.5; }).slice(0, 2);
  var options;
  if (kind === 'pick-definition') {
    options = [{ text: term.definition, correct: true, sourceHebrew: term.hebrew }]
      .concat(distractors.map(function (d) { return { text: d.definition, correct: false, sourceHebrew: d.hebrew }; }));
  } else { // pick-term
    options = [{ text: term.hebrew, correct: true, sourceHebrew: term.hebrew }]
      .concat(distractors.map(function (d) { return { text: d.hebrew, correct: false, sourceHebrew: d.hebrew }; }));
  }
  options = options.sort(function () { return rand() - 0.5; });
  return { kind: kind, term: term, prompt: kind === 'pick-definition' ? term.hebrew : term.definition, options: options };
};
SL.checkAnswer = function (item, response, maps) {
  var accepted = [item.term.hebrew].concat(SL.synonymsOf(item.term.hebrew, maps)).map(SL.normalize);
  return accepted.indexOf(SL.normalize(response)) !== -1;
};
