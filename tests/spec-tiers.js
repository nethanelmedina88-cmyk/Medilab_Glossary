T.suite('tiers', function () {
  var TIER = SL.TIER;
  var NOW = 1000000000000; // fixed 'now' in ms

  T.test('tierOf: no user -> free', function () {
    T.eq(SL.tierOf(null, null, NOW), TIER.FREE);
  });
  T.test('tierOf: signed in, no entitlement -> registered', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, null, NOW), TIER.REGISTERED);
  });
  T.test('tierOf: signed in, entitlement without until -> paid', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, { season: '2026' }, NOW), TIER.PAID);
  });
  T.test('tierOf: signed in, entitlement until in the future -> paid', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, { until: NOW + 1000 }, NOW), TIER.PAID);
  });
  T.test('tierOf: signed in, entitlement expired -> registered', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, { until: NOW - 1000 }, NOW), TIER.REGISTERED);
  });

  T.test('entitlementValid: null -> false', function () { T.eq(SL.entitlementValid(null, NOW), false); });
  T.test('entitlementValid: no until -> true', function () { T.eq(SL.entitlementValid({}, NOW), true); });
  T.test('entitlementValid: future until -> true', function () { T.eq(SL.entitlementValid({ until: NOW + 1 }, NOW), true); });
  T.test('entitlementValid: past until -> false', function () { T.eq(SL.entitlementValid({ until: NOW - 1 }, NOW), false); });
  T.test('entitlementValid: present-but-unparseable until -> false (fail closed)', function () {
    T.eq(SL.entitlementValid({ until: 'not-a-date' }, NOW), false);
  });

  T.test('canAccess: glossary is free', function () { T.eq(SL.canAccess('glossary', TIER.FREE), true); });
  T.test('canAccess: audio needs registered', function () {
    T.eq(SL.canAccess('audio', TIER.FREE), false);
    T.eq(SL.canAccess('audio', TIER.REGISTERED), true);
  });
  T.test('canAccess: crossword needs paid', function () {
    T.eq(SL.canAccess('crossword', TIER.REGISTERED), false);
    T.eq(SL.canAccess('crossword', TIER.PAID), true);
  });
  T.test('canAccess: unknown feature defaults open', function () {
    T.eq(SL.canAccess('nonexistent', TIER.FREE), true);
  });
});
