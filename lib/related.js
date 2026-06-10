/* SHLIFIM related-terms graph — auto-derived (no manual edges).
   Edge sources: (a) a term whose name appears in another term's definition,
   (b) the reverse, (c) same-topic siblings as filler. Attached to window.SL. */
window.SL = window.SL || {};
SL.buildRelated = function (glossary) {
  // canonical, real-definition terms only
  var terms = glossary.filter(function (e) { return !e.aliasOf && !/^\s*ראה:/.test(e.definition || ''); });
  var byHeb = {}; terms.forEach(function (e) { byHeb[e.hebrew] = e; });
  // precompute normalized name + definition; only names length>=4 are matchable (avoids noise like "תא")
  var info = terms.map(function (e) {
    return { e: e, nname: SL.normalize(e.hebrew), ndef: SL.normalize(e.definition) };
  });
  var mentions = {};   // hebrew -> set of hebrew it mentions
  var mentionedBy = {}; // hebrew -> set of hebrew that mention it
  terms.forEach(function (e) { mentions[e.hebrew] = {}; mentionedBy[e.hebrew] = {}; });
  for (var i = 0; i < info.length; i++) {
    var d = info[i];
    for (var j = 0; j < info.length; j++) {
      if (i === j) continue;
      var t = info[j];
      if (t.nname.length >= 4 && d.ndef.indexOf(t.nname) !== -1) {
        mentions[d.e.hebrew][t.e.hebrew] = 1;
        mentionedBy[t.e.hebrew][d.e.hebrew] = 1;
      }
    }
  }
  // topic buckets for sibling filler
  var byTopic = {}; terms.forEach(function (e) { if (e.topic) { (byTopic[e.topic] = byTopic[e.topic] || []).push(e.hebrew); } });
  var related = {};
  terms.forEach(function (e) {
    var seen = {}, out = [];
    function add(h) { if (h && h !== e.hebrew && byHeb[h] && !seen[h]) { seen[h] = 1; out.push(h); } }
    Object.keys(mentions[e.hebrew]).forEach(add);        // strongest: this term references them
    Object.keys(mentionedBy[e.hebrew]).forEach(add);     // they reference this term
    if (out.length < 6 && e.topic && byTopic[e.topic]) { // fill with topic siblings
      byTopic[e.topic].forEach(function (h) { if (out.length < 6) add(h); });
    }
    related[e.hebrew] = out.slice(0, 8);
  });
  return { related: related, byHeb: byHeb };
};
