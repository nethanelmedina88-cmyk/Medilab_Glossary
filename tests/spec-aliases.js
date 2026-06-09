T.suite('alias-data', function () {
  var G = window.GLOSSARY;
  var byHeb = {}; G.forEach(function (e) { byHeb[e.hebrew] = e; });
  T.test('every aliasOf resolves to a real entry', function () {
    G.filter(function (e) { return e.aliasOf; }).forEach(function (e) { T.ok(byHeb[e.aliasOf], e.hebrew + ' -> ' + e.aliasOf); });
  });
  T.test('the 9 ראה: stubs are aliases', function () {
    var stubs = G.filter(function (e) { return /^\s*ראה:/.test(e.definition); });
    stubs.forEach(function (e) { T.ok(e.aliasOf, e.hebrew + ' should have aliasOf'); });
  });
  T.test('disambiguated pair NOT linked as synonyms', function () {
    var a = byHeb['גורם מגביל (אנזימים)'] || byHeb['גורם מגביל (אקולוגיה)'];
    if (a) T.notOk((a.synonyms || []).some(function (s) { return /גורם מגביל/.test(s); }));
  });
});

T.suite('aliases-lib', function () {
  var maps = SL.buildAliasMaps(window.GLOSSARY);
  var byHeb = {}; window.GLOSSARY.forEach(function (e) { byHeb[e.hebrew] = e; });
  T.test('resolveEntry returns canonical definition for an alias stub', function () {
    var stub = window.GLOSSARY.filter(function (e) { return e.aliasOf; })[0];
    var resolved = SL.resolveEntry(stub.hebrew, maps);
    T.eq(resolved.hebrew, stub.aliasOf);
    T.ok(!/^\s*ראה:/.test(resolved.definition));
  });
  T.test('synonymsOf is symmetric', function () {
    var withSyn = window.GLOSSARY.filter(function (e) { return e.synonyms && e.synonyms.length; })[0];
    var s = SL.synonymsOf(withSyn.hebrew, maps);
    T.ok(s.indexOf(withSyn.synonyms[0]) !== -1);
    T.ok(SL.synonymsOf(withSyn.synonyms[0], maps).indexOf(withSyn.hebrew) !== -1);
  });
  T.test('isAlias flags stubs only', function () {
    var stub = window.GLOSSARY.filter(function (e) { return e.aliasOf; })[0];
    T.ok(SL.isAlias(stub.hebrew, maps));
    T.notOk(SL.isAlias(stub.aliasOf, maps));
  });
});
