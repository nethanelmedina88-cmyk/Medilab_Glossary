/* SHLIFIM achievements — 32 badges. Each check(m) reads a metrics snapshot:
   m = { studied, hard, dayStreak, maxDayStreak, answered, correct, accuracy,
         quizzes, perfect, topicsCompleted, topicDone:{key:bool}, usedDark } */
window.ACHIEVEMENTS = [
  { id:'first',     emoji:'🌱', title:'צעד ראשון',        desc:'סימנת מושג ראשון כנלמד',           check:m=>m.studied>=1 },
  { id:'ten',       emoji:'🔟', title:'עשירייה',          desc:'10 מושגים שנלמדו',                  check:m=>m.studied>=10 },
  { id:'quarter',   emoji:'📗', title:'רבע הדרך',         desc:'25 מושגים שנלמדו',                  check:m=>m.studied>=25 },
  { id:'fifty',     emoji:'🏅', title:'חמישים!',          desc:'50 מושגים שנלמדו',                  check:m=>m.studied>=50 },
  { id:'hundred',   emoji:'💯', title:'מאה מושגים',       desc:'100 מושגים שנלמדו',                 check:m=>m.studied>=100 },
  { id:'twohundred',emoji:'🚀', title:'מאתיים',           desc:'200 מושגים שנלמדו',                 check:m=>m.studied>=200 },
  { id:'threehundred',emoji:'🌟',title:'שלוש מאות',       desc:'300 מושגים שנלמדו',                 check:m=>m.studied>=300 },
  { id:'all',       emoji:'👑', title:'מלך המושגים',      desc:'כל 465 המושגים!',                   check:m=>m.studied>=465 },

  { id:'streak2',   emoji:'🔥', title:'יומיים ברצף',      desc:'נכנסת יומיים רצופים',               check:m=>m.dayStreak>=2 },
  { id:'streak3',   emoji:'🔥', title:'שלושה ימים',       desc:'3 ימים רצופים',                     check:m=>m.dayStreak>=3 },
  { id:'streak7',   emoji:'📅', title:'שבוע שלם',         desc:'7 ימים רצופים',                     check:m=>m.dayStreak>=7 },
  { id:'streak14',  emoji:'🗓️', title:'שבועיים',          desc:'14 ימים רצופים',                    check:m=>m.dayStreak>=14 },
  { id:'streak30',  emoji:'🏆', title:'חודש מלא!',        desc:'30 ימים רצופים',                    check:m=>m.dayStreak>=30 },

  { id:'firstquiz', emoji:'✅', title:'המבחון הראשון',    desc:'סיימת מבחון ראשון',                 check:m=>m.quizzes>=1 },
  { id:'q50',       emoji:'🎯', title:'50 שאלות',         desc:'ענית על 50 שאלות',                  check:m=>m.answered>=50 },
  { id:'q200',      emoji:'🎯', title:'200 שאלות',        desc:'ענית על 200 שאלות',                 check:m=>m.answered>=200 },
  { id:'perfect1',  emoji:'🌈', title:'מבחון מושלם',      desc:'100% במבחון',                       check:m=>m.perfect>=1 },
  { id:'perfect5',  emoji:'💎', title:'5 מושלמים',        desc:'5 מבחנים מושלמים',                  check:m=>m.perfect>=5 },
  { id:'acc80',     emoji:'🧠', title:'דייקנות 80%',      desc:'80%+ על 20 שאלות',                  check:m=>m.answered>=20 && m.accuracy>=0.8 },
  { id:'acc95',     emoji:'🦉', title:'דייקן-על',         desc:'95%+ על 50 שאלות',                  check:m=>m.answered>=50 && m.accuracy>=0.95 },

  { id:'topic1',    emoji:'🧩', title:'נושא ראשון',       desc:'השלמת נושא שלם',                    check:m=>m.topicsCompleted>=1 },
  { id:'topic5',    emoji:'🗂️', title:'5 נושאים',         desc:'השלמת 5 נושאים',                    check:m=>m.topicsCompleted>=5 },
  { id:'topic10',   emoji:'📚', title:'10 נושאים',        desc:'השלמת 10 נושאים',                   check:m=>m.topicsCompleted>=10 },
  { id:'topicall',  emoji:'🌍', title:'כל הנושאים!',      desc:'השלמת את כל 21 הנושאים',            check:m=>m.topicsCompleted>=21 },

  { id:'mcell',     emoji:'🧬', title:'מאסטר מאפייני חיים',desc:'נושא מאפייני חיים הושלם',          check:m=>!!m.topicDone['מאפייני חיים'] },
  { id:'mgen',      emoji:'🧪', title:'מאסטר תורשה',      desc:'תורשה מנדלית הושלם',                check:m=>!!m.topicDone['תורשה מנדלית'] },
  { id:'mheart',    emoji:'❤️', title:'מאסטר ההובלה',     desc:'מערכת ההובלה הושלמה',               check:m=>!!m.topicDone['מערכת הובלה'] },
  { id:'meco',      emoji:'🌱', title:'אקולוג',           desc:'אקולוגיה הושלמה',                   check:m=>!!m.topicDone['אקולוגיה'] },
  { id:'mmicro',    emoji:'🦠', title:'מיקרוביולוג',      desc:'מיקרוביולוגיה הושלמה',              check:m=>!!m.topicDone['מיקרוביולוגיה'] },

  { id:'pin1',      emoji:'📌', title:'מיקוד',            desc:'סימנת מושג לחזרה',                  check:m=>m.hard>=1 },
  { id:'pin5',      emoji:'📍', title:'רשימת חזרה',       desc:'5 מושגים לחזרה',                    check:m=>m.hard>=5 },
  { id:'nightowl',  emoji:'🌙', title:'ינשוף לילה',       desc:'למדת במצב לילה',                    check:m=>!!m.usedDark }
];
