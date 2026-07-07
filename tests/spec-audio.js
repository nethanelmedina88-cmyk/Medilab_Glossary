T.suite('audio-manifest', function () {
  var G = window.GLOSSARY;
  var built = window.SLAudio.buildManifest(G);
  var man = built.manifest;

  T.test('buildManifest returns an object keyed by hebrew term', function () {
    T.ok(man && typeof man === 'object', 'manifest is an object');
    var first = G[0].hebrew;
    T.ok(man[first], first + ' should have an audio file');
  });

  T.test('every filename is ASCII tNNNN.mp3 under audio/', function () {
    Object.keys(man).forEach(function (k) {
      T.ok(/^audio\/t\d{4}\.mp3$/.test(man[k]), 'bad path for ' + k + ': ' + man[k]);
    });
  });

  T.test('filenames are unique (1:1 term to file)', function () {
    var vals = Object.keys(man).map(function (k) { return man[k]; });
    var uniq = {}; vals.forEach(function (v) { uniq[v] = 1; });
    T.eq(Object.keys(uniq).length, vals.length, 'duplicate filenames exist');
  });

  T.test('covers every unique hebrew term, skips ראה: stubs', function () {
    var expected = {};
    G.forEach(function (e) {
      if (e.hebrew && !/^\s*ראה:/.test(e.definition || '')) expected[e.hebrew] = 1;
    });
    T.eq(Object.keys(man).length, Object.keys(expected).length, 'term coverage mismatch');
  });

  T.test('deterministic — same input yields identical mapping', function () {
    var again = window.SLAudio.buildManifest(G).manifest;
    T.eq(again, man);
  });
});
