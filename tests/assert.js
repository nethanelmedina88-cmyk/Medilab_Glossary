// Minimal browser test runner. Results land on window.__RESULTS__.
(function () {
  var results = { total: 0, passed: 0, failed: 0, suites: {}, failures: [] };
  var current = '(root)';

  function suite(name, fn) { current = name; results.suites[name] = { passed: 0, failed: 0 }; fn(); }
  function test(name, fn) {
    results.total++;
    try { fn(); results.passed++; results.suites[current].passed++; }
    catch (e) {
      results.failed++; results.suites[current].failed++;
      results.failures.push({ suite: current, test: name, message: e.message });
    }
  }
  function eq(actual, expected, msg) {
    var a = JSON.stringify(actual), b = JSON.stringify(expected);
    if (a !== b) throw new Error((msg || '') + ' expected ' + b + ' got ' + a);
  }
  function ok(cond, msg) { if (!cond) throw new Error(msg || 'expected truthy'); }
  function notOk(cond, msg) { if (cond) throw new Error(msg || 'expected falsy'); }

  window.__RESULTS__ = results;
  window.T = { suite: suite, test: test, eq: eq, ok: ok, notOk: notOk };
})();
