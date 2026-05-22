# MediLab — מנוע חיפוש מושגים בביולוגיה

מנוע חיפוש של 465 מושגים בביולוגיה לתלמידי תיכון הניגשים לבגרות, בסגנון Doodle.

## כיצד להעלות ל-GitHub Pages

1. צרו ריפוזיטורי חדש ב-GitHub (לדוגמה: `bio-glossary`).
2. העלו אליו את כל הקבצים שבתיקייה הזו (כולם באותה רמה — לא בתת-תיקיות).
3. לכו ל-**Settings → Pages**.
4. תחת **Source** בחרו את הענף `main` ותיקייה `/ (root)`. לחצו **Save**.
5. אחרי דקה-שתיים האתר יהיה זמין בכתובת `https://<username>.github.io/<repo-name>/`.

## רשימת הקבצים

- `index.html` — נקודת הכניסה לאתר
- `styles.css` — עיצוב
- `app.jsx` — אפליקציית React (חיפוש, פילטר, מועדפים, פלאש-קארדס, מצב לילה)
- `doodles.jsx` — איורי הדודלים
- `glossary.js` — מסד הנתונים (465 מושגים)
- `logo.jpg`, `portrait.jpg`, `book-glossary.png`, `book-research.png`, `book-questions.png` — תמונות

## פיתוח מקומי

אין צורך ב-build. רק לפתוח את `index.html` בדפדפן.
(אם הדפדפן חוסם קבצי JSX מקומיים, הריצו שרת מקומי: `python -m http.server` בתיקייה.)
