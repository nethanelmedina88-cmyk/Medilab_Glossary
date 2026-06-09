T.suite('quiz', function () {
  var maps = SL.buildAliasMaps(window.GLOSSARY);
  var pool = SL.eligibleTerms(window.GLOSSARY, maps);

  T.test('eligible pool excludes alias stubs and ראה: defs', function () {
    T.ok(pool.length > 400);
    T.notOk(pool.some(function (e) { return e.aliasOf || /^\s*ראה:/.test(e.definition); }));
  });

  T.test('generateItem(pick-definition) has exactly one correct + >=2 distractors, no synonym leaks', function () {
    for (var n = 0; n < 50; n++) {
      var item = SL.generateItem(pool, maps, 'pick-definition', n);
      var correct = item.options.filter(function (o) { return o.correct; });
      T.eq(correct.length, 1);
      T.ok(item.options.length >= 3);
      var ansSyn = SL.synonymsOf(item.term.hebrew, maps).concat([item.term.hebrew]);
      item.options.filter(function (o) { return !o.correct; }).forEach(function (o) {
        T.notOk(ansSyn.indexOf(o.sourceHebrew) !== -1, 'distractor is a synonym of answer');
      });
    }
  });

  T.test('checkAnswer(type-answer) accepts a synonym', function () {
    var withSyn = pool.filter(function (e) { return SL.synonymsOf(e.hebrew, maps).length; })[0];
    T.ok(withSyn, 'expected at least one eligible term with synonyms (test must not vacuously pass)');
    var item = { kind: 'type-answer', term: withSyn };
    var syn = SL.synonymsOf(withSyn.hebrew, maps)[0];
    T.ok(SL.checkAnswer(item, syn, maps));
    T.ok(SL.checkAnswer(item, withSyn.hebrew, maps));
    T.notOk(SL.checkAnswer(item, 'תשובה שגויה לגמרי', maps));
  });
});
