T.suite('normalize', function () {
  T.test('strips nikud', function () { T.eq(SL.normalize('פּוֹטוֹסינתֵזה'), SL.normalize('פוטוסינתזה')); });
  T.test('strips quotes/punct and lowercases', function () { T.eq(SL.normalize('DNA־פולימראז (I)'), 'dnaפולימראז i'); });
  T.test('collapses whitespace and trims', function () { T.eq(SL.normalize('  תא   רבייה '), 'תא רבייה'); });
  T.test('null-safe', function () { T.eq(SL.normalize(null), ''); });
});
