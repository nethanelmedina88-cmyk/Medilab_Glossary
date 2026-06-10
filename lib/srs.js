/* SHLIFIM spaced repetition — SM-2-lite. State per term:
   { ease, interval(days), reps, due(ms) }. Grades: 0=again 1=hard 2=good 3=easy.
   Attached to window.SL. Times use Date.now() (browser runtime). */
window.SL = window.SL || {};
SL.srsRate = function (state, grade, now) {
  now = now || Date.now();
  var s = state ? { ease: state.ease, interval: state.interval, reps: state.reps } : { ease: 2.5, interval: 0, reps: 0 };
  if (grade <= 0) { // again — relearn in ~10 min
    s.reps = 0; s.interval = 0; s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now + 10 * 60 * 1000;
    return s;
  }
  s.reps = (s.reps || 0) + 1;
  // ease adjust (SM-2): q=grade+2 (so good=4, easy=5, hard=3)
  var q = grade + 2;
  s.ease = Math.max(1.3, s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  if (s.reps === 1) s.interval = grade === 1 ? 1 : 1;
  else if (s.reps === 2) s.interval = grade === 1 ? 3 : 4;
  else s.interval = Math.max(1, Math.round((state && state.interval ? state.interval : 1) * (grade === 1 ? 1.2 : s.ease)));
  if (grade === 3) s.interval = Math.round(s.interval * 1.3); // easy bonus
  s.due = now + s.interval * 24 * 60 * 60 * 1000;
  return s;
};
SL.srsDue = function (state, now) { now = now || Date.now(); return !state || !state.due || state.due <= now; };
// queue: due-with-state first (most overdue), then brand-new terms; capped at max
SL.srsQueue = function (terms, srsMap, max, now) {
  now = now || Date.now(); max = max || 20;
  var due = [], fresh = [];
  terms.forEach(function (e) {
    var st = srsMap[e.hebrew];
    if (st && st.due) { if (st.due <= now) due.push({ e: e, due: st.due }); }
    else fresh.push(e);
  });
  due.sort(function (a, b) { return a.due - b.due; });
  var out = due.map(function (x) { return x.e; });
  for (var i = 0; i < fresh.length && out.length < max; i++) out.push(fresh[i]);
  return out.slice(0, max);
};
SL.srsDueCount = function (terms, srsMap, now) {
  now = now || Date.now(); var n = 0;
  terms.forEach(function (e) { var st = srsMap[e.hebrew]; if (!st || !st.due || st.due <= now) n++; });
  return n;
};
