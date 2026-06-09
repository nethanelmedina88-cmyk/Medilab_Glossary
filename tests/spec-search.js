T.suite('search', function () {
  var index = SL.buildSearchIndex(window.GLOSSARY);
  T.test('finds by hebrew prefix, nikud-insensitive', function () {
    var hits = SL.search(index, 'אוסמ');
    T.ok(hits.length >= 1);
    T.ok(hits.some(function (e) { return e.hebrew.indexOf('אוסמוזה') !== -1; }));
  });
  T.test('finds by english', function () {
    var hits = SL.search(index, 'osmosis');
    T.ok(hits.some(function (e) { return /Osmosis/i.test(e.english); }));
  });
  T.test('title matches rank before definition matches', function () {
    var hits = SL.search(index, 'אנזים');
    var titleIdx = hits.findIndex(function (e) { return SL.normalize(e.hebrew).indexOf('אנזים') !== -1; });
    T.ok(titleIdx === 0);
  });
  T.test('empty query returns all', function () { T.eq(SL.search(index, '').length, window.GLOSSARY.length); });
});
