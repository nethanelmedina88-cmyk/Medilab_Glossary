# אפיון: הקראה קולית למושגי שליפים (ElevenLabs "ליאם")

**תאריך:** 2026-07-05
**סטטוס:** מאושר לתכנון ביצוע

## מטרה

להוסיף כפתור הקראה 🔊 ליד כל מושג באפליקציית שליפים. בלחיצה נשמע הקול "ליאם" (ElevenLabs)
מקריא את **שם המושג** בעברית. עוזר לתלמידים בהגייה נכונה של מונחים ביולוגיים.

## החלטות שנסגרו (בסיעור מוחות)

| נושא | החלטה |
|------|--------|
| קול | **ליאם** — Energetic, Social Media Creator (`voice_id: TX3LPaxmHKxFdv7VOQHJ`) |
| מודל | **eleven_v3** — המודל היחיד שתומך בעברית (`language: he`) |
| תוכן מוקרא | **שם המושג בלבד** (שדה `hebrew`), ללא ההגדרה |
| שיטה | **הפקה מראש** (pre-generated static MP3), לא קריאת API חיה |
| היקף | כל 465 המושגים = **4,392 תווים** → נכנס במכסה החינמית (10,000/חודש), מנה אחת, $0 |

### למה הפקה מראש ולא API חי
האפליקציה היא PWA ציבורי (אתר + Google Play). קריאת API חיה מהלקוח הייתה חושפת את מפתח
ה-API בקוד צד-לקוח (גניבה/בזבוז קרדיטים) ועולה כסף על כל השמעה. הפקה מראש: המפתח לא נחשף,
אין עלות שוטפת, ועובד אופליין (קריטי ל-PWA).

## מצב קיים (ממצא מהקוד — קריטי)

**כבר קיים פיצ'ר הקראה מלא.** `window.SLSpeak(text)` ב-`app/sound.js` משתמש ב-Web Speech API
של הדפדפן (`speechSynthesis`, `he-IL`) — הקול הרובוטי. יש לו 4 קריאות ב-`app/app-v2.jsx`:

| שורה | מסך | קריאה נוכחית | מה מקריא |
|------|------|--------------|-----------|
| 183 | כרטיס מילון | `Speak(t.hebrew + '. ' + def)` | מושג + הגדרה |
| 259 | כרטיסייה | `Speak(flip?card.definition:card.hebrew)` | מושג/הגדרה לפי צד |
| 305 | מבחון | `Speak(...prompt/term...)` | שאלה/מושג |
| 425 | חלון מושג | `Speak(t.hebrew)` | מושג בלבד |

לכן המשימה היא **שדרוג הקיים**, לא הוספת כפתור. הכפתורים 🔊 כבר במקום.

## ארכיטקטורה — 4 רכיבים מבודדים

### 1. הפקת השמע (בסשן, דרך ElevenLabs MCP)
- עוברים על 465 המושגים ב-`window.GLOSSARY`, לפי סדר המערך מקצים מזהה יציב `t0001`…`t0465`.
- לכל שם מושג (שדה `hebrew` בלבד) מפיקים MP3 דרך `text_to_speech` (voice_id של ליאם
  `TX3LPaxmHKxFdv7VOQHJ`, model `eleven_v3`, language `he`).
- שומרים ל-`audio/tNNNN.mp3`.
- **דלג-אם-קיים:** אם קובץ יעד כבר קיים, לא מפיקים שוב (הרצה חוזרת/מנות בטוחה).
- מכיוון שהמפתח חי בהקשר ה-MCP, ההפקה מתבצעת דרך כלי ה-MCP בסשן (לא CLI חיצוני).
  `scripts/audio-manifest.ps1` מייצר את המפ מהמיפוי (סעיף 3) לאחר שהקבצים קיימים.

### 2. `audio/` — קבצי השמע
- 465 קבצי MP3, `t0001.mp3`…`t0465.mp3`. ~3–5MB סה"כ (כל אחד ~5–15KB).
- שמות קבצים **ASCII בלבד** — מונע בעיות קידוד URL ב-GitHub Pages.

### 3. `audio/manifest.js` — מיפוי מושג→קובץ
- אובייקט JS גלובלי: `window.AUDIO_MANIFEST = { "פוטוסינתזה": "audio/t0421.mp3", ... }`.
- **מפתח = שם המושג בעברית** (שדה `hebrew`) — יציב לסינון/מיון (לא תלוי אינדקס בזמן ריצה).
- **ערך = נתיב קובץ ASCII יחסי**.
- נטען ב-`index.html` כ-`<script>` רגיל **לפני** `app/sound.js`.

### 4. שדרוג `SLSpeak` — `app/sound.js`
המנוע היחיד שמשתנה. לוגיקה חדשה, שומרת תאימות לאחור מלאה:

```
SLSpeak(text):
  file = window.AUDIO_MANIFEST && window.AUDIO_MANIFEST[String(text).trim()]
  if file:
     עצור השמעה קודמת (audioEl.pause) + speechSynthesis.cancel()
     נגן <audio src=file>;  אם onerror → נפילה ל-browserSpeak(text)
  else:
     browserSpeak(text)   // בדיוק הקוד הקיים של speechSynthesis
```

- `browserSpeak` = הגוף הנוכחי של `SLSpeak` (speechSynthesis), מופרד לפונקציה פנימית.
- אלמנט `<audio>` יחיד ומשותף (module-scoped), נמנע מחפיפות.
- **שינוי call-site יחיד:** שורה 183 ב-`app-v2.jsx` מ-`Speak(t.hebrew + '. ' + def)`
  ל-`Speak(t.hebrew)` — כדי שכרטיס המילון יקריא שם-מושג (מותאם למפ → ליאם).
  שאר 3 הקריאות **ללא שינוי** (הגדרות/שאלות → נפילה לקול הדפדפן, כמו היום).

### Service Worker — `service-worker.js`
- ה-fetch handler הקיים כבר מטפל ב-mp3 בענף ה-cache-first ("everything else",
  ~שורה 75): נשמר אוטומטית אחרי השמעה ראשונה → אופליין עובד. **אין צורך בלוגיקה חדשה.**
- מעלים `CACHE_NAME` מ-`shlifim-v25` ל-`shlifim-v26` כדי לפרוס את הקוד החדש.
- **לא** מוסיפים 465 קבצים ל-`FILES_TO_CACHE` (היה מנפח התקנה) — cache-on-demand בלבד.

## זרימת נתונים

```
window.GLOSSARY ──(הפקה בסשן)──▶ ElevenLabs MCP (ליאם, v3, he)
                                        │
                                        ▼
                          audio/tNNNN.mp3  +  audio/manifest.js
                                        │  (זמן ריצה)
index.html טוען manifest.js → sound.js → app-v2.js
                                        ▼
Speak(t.hebrew) → AUDIO_MANIFEST["..."] קיים? → <audio> ליאם 🎧
                                        └ לא קיים? → speechSynthesis (דפדפן) 🔊
                                        ▼
              Service Worker (cache-first) שומר את ה-mp3 → אופליין להבא
```

## טיפול בתקלות

- **אין ערך במפ** (הגדרה/שאלה) → נפילה לקול הדפדפן. התנהגות זהה להיום, אפס נסיגה.
- **כשל טעינת ה-mp3** (`audio.onerror`) → נפילה מיידית ל-`browserSpeak(text)`.
- **דפדפן ללא `speechSynthesis` וללא mp3** → הפונקציה יוצאת בשקט (כמו היום).

## בדיקה (דרך Preview MCP)

1. `AUDIO_MANIFEST` נטען ומכיל מפתח למושג ידוע (פוטוסינתזה → נתיב mp3 תקין).
2. לחיצה על 🔊 בכרטיס מילון יוצרת/מנגנת `<audio>` עם `src` הנכון (בדיקת DOM eval) —
   ולא מפעילה `speechSynthesis` (המושג במפ).
3. לחיצה על 🔊 בכרטיסייה **הפוכה** (הגדרה, לא במפ) → נופל ל-`speechSynthesis`
   (בדיקה: לא נוצר `<audio>` חדש; הקוד עובר לענף הדפדפן).
4. מושג ללא ערך במפ → נפילה חלקה, אין שגיאת קונסול.
5. אימות SW: בקשת ה-mp3 נכנסת למטמון (`shlifim-v26`) אחרי השמעה.

## הערות ביצוע (מהזיכרון — [[shlifim-redesign]])

- **קומפילציה:** `app-v2.jsx` הוא המקור; חובה לקמפל ידנית ל-`app/app-v2.js` (אין Node).
  שיטה: זמנית להוסיף בחזרה את `@babel/standalone@7` + מטפל `__save` ב-`scripts/serve.ps1`,
  לקמפל בדפדפן (`Babel.transform` + `fetch POST`), ואז לשחזר את שניהם. פרגמה `/* @jsxRuntime classic */`
  חייבת להישאר בראש הקובץ.
- **נתיב הפרויקט:** `C:\Users\Medina\OneDrive\Desktop\Medilab_Glossary` (OneDrive עלול להיות לא נגיש
  ל-shell לסירוגין; להשתמש ב-Read/Edit ו-`git -C`).
- **בדיקות:** אין Node; רצות דרך `tests/index.html` + `scripts/serve.ps1` (HttpListener :8770) + Preview MCP.
- **סקריפטי PS עם עברית:** לשמור UTF-8 **עם BOM** אחרת PS 5.1 שובר תווי עברית.
- **פריסה:** commit → push → PR; אחרי מיזוג יש לוודא שה-SW החדש נפרס (network-first לקוד).

## מחוץ להיקף (YAGNI)

- הקראת ההגדרה/הפירוש (רק שם המושג בשלב זה).
- Fallback ל-`speechSynthesis` של הדפדפן.
- הקראה במבחון.
- הפקה חיה / קונפיגורציית קול למשתמש.
