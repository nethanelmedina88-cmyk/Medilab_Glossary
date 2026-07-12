// admin/grant.js — grant / renew / revoke a SHLIFIM paid entitlement.
//
// Usage:
//   node grant.js <email> [months]     grant/renew (months: 1=חודש, 12=שנה, 0/ריק=ללא הגבלה)
//   node grant.js <email> revoke       remove the entitlement (back to free/registered)
//   node grant.js <email>              show the current entitlement status
//
// Setup (once): see admin/README.md — run `npm install` in this folder and put the
// Firebase service-account key at admin/service-account.json.

var path = require('path');

var admin;
try { admin = require('firebase-admin'); }
catch (e) { console.error('❌ חסר firebase-admin. הרץ קודם בתוך תיקיית admin:  npm install'); process.exit(1); }

var email = process.argv[2];
var arg = process.argv[3];
if (!email) {
  console.error('שימוש:\n  node grant.js <email> [months]   (1=חודש, 12=שנה, ריק=ללא הגבלה)\n  node grant.js <email> revoke     (ביטול)\n  node grant.js <email>            (בדיקת סטטוס)');
  process.exit(1);
}

var KEY = path.join(__dirname, 'service-account.json');
var serviceAccount;
try { serviceAccount = require(KEY); }
catch (e) { console.error('❌ חסר קובץ המפתח admin/service-account.json — ראה admin/README.md'); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
var auth = admin.auth();
var db = admin.firestore();

function fmt(ts) {
  if (!ts) return 'ללא הגבלה (קבוע)';
  var d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('he-IL') + (d.getTime() < Date.now() ? '  ⚠️ פג תוקף' : '');
}

(async function () {
  var user;
  try { user = await auth.getUserByEmail(email); }
  catch (e) { console.error('❌ לא נמצא משתמש עם המייל: ' + email + '\n   (ודא שהתלמיד התחבר עם Google באפליקציה לפחות פעם אחת.)'); process.exit(1); }

  var ref = db.collection('entitlements').doc(user.uid);

  // status only
  if (arg === undefined) {
    var snap = await ref.get();
    if (!snap.exists) { console.log('ℹ️ אין מנוי פעיל ל-' + email + ' (UID ' + user.uid + ')'); }
    else { var d = snap.data(); console.log('✅ מנוי קיים ל-' + email + '\n   בתוקף עד: ' + fmt(d.until)); }
    process.exit(0);
  }

  // revoke
  if (arg === 'revoke') {
    await ref.delete();
    console.log('🗑️ המנוי בוטל עבור ' + email + ' (UID ' + user.uid + ')');
    process.exit(0);
  }

  // grant / renew
  var months = parseInt(arg || '0', 10);
  if (isNaN(months) || months < 0) { console.error('❌ מספר חודשים לא תקין: ' + arg); process.exit(1); }

  var doc = { season: '2026', grantedAt: admin.firestore.FieldValue.serverTimestamp(), source: 'manual', email: email };
  var untilText = 'ללא הגבלה (קבוע)';
  if (months > 0) {
    var until = new Date();
    until.setMonth(until.getMonth() + months);
    doc.until = admin.firestore.Timestamp.fromDate(until);
    untilText = until.toLocaleDateString('he-IL');
  }

  await ref.set(doc, { merge: true });
  console.log('✅ ניתנה גישה בתשלום:\n   מייל : ' + email + '\n   UID  : ' + user.uid + '\n   בתוקף עד: ' + untilText);
  process.exit(0);
})().catch(function (e) { console.error('שגיאה: ' + (e.message || e)); process.exit(1); });
