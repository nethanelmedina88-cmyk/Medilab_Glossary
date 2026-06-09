T.suite('validate', function () {
  var maps = SL.buildAliasMaps(window.GLOSSARY);
  var report = SL.validateGlossary(window.GLOSSARY, maps);
  T.test('returns a report object', function () { T.ok(report && report.errors && report.warnings); });
  T.test('no errors on current data (subject checks are warnings until Plan 2)', function () {
    T.eq(report.errors, []);
  });
  T.test('detects a missing required field', function () {
    var bad = window.GLOSSARY.slice(0, 2).concat([{ hebrew: '', english: 'x', definition: 'y', letter: 'א' }]);
    var r2 = SL.validateGlossary(bad, SL.buildAliasMaps(bad));
    T.ok(r2.errors.length >= 1);
  });
});
