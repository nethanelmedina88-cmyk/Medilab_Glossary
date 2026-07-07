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

T.suite('slspeak-routing', function () {
  // Fake Audio: records src into a SHARED global read at play() time, so a cached
  // audioEl (SLSpeak reuses one element) still reports into the current test's object.
  function withFakes(manifest, fn) {
    var realAudio = window.Audio, realManifest = window.AUDIO_MANIFEST, realBrowser = window.SLSpeakBrowser;
    window.__PLAYED = { src: null };
    var browserCalls = [];
    window.Audio = function () { return { pause: function(){}, play: function(){ window.__PLAYED.src = this._src; return { catch: function(){} }; }, set src(v){ this._src = v; }, get src(){ return this._src; } }; };
    window.AUDIO_MANIFEST = manifest;
    window.SLSpeakBrowser = function (t) { browserCalls.push(t); };
    try { fn(window.__PLAYED, browserCalls); }
    finally { window.Audio = realAudio; window.AUDIO_MANIFEST = realManifest; window.SLSpeakBrowser = realBrowser; }
  }

  T.test('known term → plays mp3, no browser fallback', function () {
    withFakes({ 'פוטוסינתזה': 'audio/t0001.mp3' }, function (played, browserCalls) {
      window.SLSpeak('פוטוסינתזה');
      T.eq(played.src, 'audio/t0001.mp3');
      T.eq(browserCalls.length, 0);
    });
  });

  T.test('unknown text (definition) → browser fallback, no mp3', function () {
    withFakes({ 'פוטוסינתזה': 'audio/t0001.mp3' }, function (played, browserCalls) {
      window.SLSpeak('תהליך ארוך שאין לו קובץ');
      T.eq(played.src, null);
      T.eq(browserCalls.length, 1);
    });
  });

  T.test('trims whitespace before lookup', function () {
    withFakes({ 'תא': 'audio/t0002.mp3' }, function (played) {
      window.SLSpeak('  תא  ');
      T.eq(played.src, 'audio/t0002.mp3');
    });
  });
});
