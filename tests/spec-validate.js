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

T.suite('subjects-taxonomy', function () {
  var S = window.SUBJECTS;
  var valid = {};
  S.core.concat(S.depth).forEach(function (s) { valid[s.name] = s.subtopics.slice(); });
  T.test('every term has a subject from the 6', function () {
    window.GLOSSARY.forEach(function (t) { T.ok(valid.hasOwnProperty(t.subject), t.hebrew + ' subject=' + t.subject); });
  });
  T.test('every subtopic belongs to its subject', function () {
    window.GLOSSARY.forEach(function (t) {
      if (t.subtopic) T.ok(valid[t.subject].indexOf(t.subtopic) !== -1, t.hebrew + ' bad subtopic "' + t.subtopic + '"');
    });
  });
  T.test('subjectAlso (when present) is one of the 6', function () {
    window.GLOSSARY.forEach(function (t) { if (t.subjectAlso) T.ok(valid.hasOwnProperty(t.subjectAlso), t.hebrew + ' also=' + t.subjectAlso); });
  });
  T.test('the four depth/ecology subjects carry no subtopic', function () {
    var noSub = ['אקולוגיה', 'מיקרוביולוגיה', 'פיזיולוגיה השוואתית', 'הנדסה גנטית'];
    window.GLOSSARY.forEach(function (t) {
      if (noSub.indexOf(t.subject) !== -1) T.ok(!t.subtopic, t.hebrew + ' should have no subtopic');
    });
  });
});
