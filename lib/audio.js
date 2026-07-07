/* SHLIFIM audio — pure helpers to map term names to pre-generated MP3 files.
   No side effects; safe to load in tests and in the app. */
window.SLAudio = (function () {
  function pad4(n) { return ('000' + n).slice(-4); }

  // Assign a stable tNNNN filename to each UNIQUE hebrew term, in array order.
  // Skip ראה: cross-reference stubs (their canonical term carries the audio).
  function buildManifest(glossary) {
    var manifest = {};
    var list = [];
    var next = 1;
    (glossary || []).forEach(function (e) {
      var heb = e && e.hebrew;
      if (!heb) return;
      if (/^\s*ראה:/.test(e.definition || '')) return;
      if (manifest[heb]) return;                 // already assigned (dedupe)
      var file = 'audio/t' + pad4(next) + '.mp3';
      manifest[heb] = file;
      list.push({ hebrew: heb, file: file });
      next++;
    });
    return { manifest: manifest, list: list };
  }

  return { buildManifest: buildManifest, pad4: pad4 };
})();
