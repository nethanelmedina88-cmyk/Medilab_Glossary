# כלי ניהול מנויים — SHLIFIM

כלי מקומי (רץ במחשב שלך בלבד) שמעניק/מחדש/מבטל מנוי בתשלום ללקוח, בשורה אחת —
במקום ללחוץ ידנית ב-Firebase Console.

## התקנה (פעם אחת)

1. התקן את החבילות. פתח טרמינל בתיקייה הזו (`admin/`) והרץ:

   ```
   npm install
   ```

2. הורד את "מפתח השירות" מ-Firebase:
   - היכנס ל-`https://console.firebase.google.com` → הפרויקט `shlifim-medilab`.
   - לחץ על גלגל השיניים (למעלה משמאל) → **Project settings**.
   - לשונית **Service accounts** → כפתור **Generate new private key** → **Generate key**.
   - יורד קובץ JSON. שמור אותו בתיקייה הזו בשם **בדיוק**: `service-account.json`
     (הנתיב המלא: `admin/service-account.json`).

   ⚠️ **הקובץ הזה סודי!** הוא כבר מוגן ב-`.gitignore` ולא יעלה לאינטרנט. אל תשלח אותו לאף אחד.

## שימוש

מתוך תיקיית `admin/`:

```
node grant.js <email> [months]
```

דוגמאות:

| פקודה | מה היא עושה |
|-------|-------------|
| `node grant.js dani@gmail.com 1`  | מנוי חודשי — גישה לחודש |
| `node grant.js dani@gmail.com 12` | מנוי שנתי — גישה לשנה |
| `node grant.js dani@gmail.com`    | בדיקת סטטוס — עד מתי המנוי בתוקף |
| `node grant.js dani@gmail.com 0`  | גישה קבועה, בלי תפוגה |
| `node grant.js dani@gmail.com revoke` | ביטול המנוי |

הכלי מוצא את המשתמש לפי המייל, מחשב את תאריך התפוגה, וכותב את ההרשאה. חידוש = פשוט
הרץ שוב עם מספר חודשים חדש.

**תנאי:** הלקוח חייב להתחבר עם Google באפליקציה לפחות פעם אחת לפני שאפשר להעניק לו גישה
(אחרת אין לו עדיין חשבון במערכת).
