// SHLIFIM topic taxonomy — adopted from the original shlifim.html (teacher's division).
// 21 topics in book order, each with emoji + color theme (primary/accent/bg). The `topic`
// field on each glossary term holds one of these `key` values (exact strings).
window.TOPICS = [
  { key: 'מאפייני חיים',                     label: 'מאפייני חיים',        emoji: '🧬', group: 'cell',    primary: '#1B6FA8', accent: '#3FA9D6', bg: '#E8F4F8' },
  { key: 'מעבר חומרים  דרך קרום תא',         label: 'מעבר חומרים',         emoji: '⇄',  group: 'cell',    primary: '#1B6FA8', accent: '#3FA9D6', bg: '#E8F4F8' },
  { key: 'חלבונים ואנזימים',                 label: 'חלבונים ואנזימים',    emoji: '⚗️', group: 'cell',    primary: '#8B5A2B', accent: '#D4A574', bg: '#F5E8D4' },
  { key: 'פוטוסינתזה  ונשימה תאית',          label: 'פוטוסינתזה ונשימה',   emoji: '🌱', group: 'cell',    primary: '#3F8C3F', accent: '#5CB85C', bg: '#E0F0DA' },
  { key: 'החומר התורשתי',                    label: 'חומר תורשתי',         emoji: '🧬', group: 'genetics', primary: '#7B3F8C', accent: '#9B59B6', bg: '#EBDEF0' },
  { key: 'מיטוזה ומיוזה',                    label: 'מיטוזה ומיוזה',       emoji: '✂️', group: 'genetics', primary: '#7B3F8C', accent: '#9B59B6', bg: '#EBDEF0' },
  { key: "מדנ''א לחלבון",                    label: 'מ-DNA לחלבון',        emoji: '➜',  group: 'genetics', primary: '#7B3F8C', accent: '#9B59B6', bg: '#EBDEF0' },
  { key: 'תורשה מנדלית',                     label: 'תורשה מנדלית',        emoji: '👨‍👩‍👧', group: 'genetics', primary: '#7B3F8C', accent: '#9B59B6', bg: '#EBDEF0' },
  { key: 'מבוא לגוף האדם',                   label: 'מבוא לגוף האדם',      emoji: '🧍', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת העיכול',                     label: 'מערכת העיכול',        emoji: '🍽️', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת הנשימה',                     label: 'מערכת הנשימה',        emoji: '🫁', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת הובלה',                      label: 'מערכת הובלה',         emoji: '❤️', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת החיסון',                     label: 'מערכת החיסון',        emoji: '🛡️', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת העצבים',                     label: 'מערכת העצבים',        emoji: '🧠', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת ההפרשה הפנימית',             label: 'הפרשה פנימית',        emoji: '⚡', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת ההפרשה',                     label: 'מערכת ההפרשה',        emoji: '💧', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'מערכת הרבייה',                     label: 'מערכת הרבייה',        emoji: '👶', group: 'body',    primary: '#C44747', accent: '#F47A6E', bg: '#FCE4E0' },
  { key: 'אקולוגיה',                         label: 'אקולוגיה',            emoji: '🌍', group: 'eco',     primary: '#3F8C3F', accent: '#5CB85C', bg: '#E0F0DA' },
  { key: 'מיקרוביולוגיה',                    label: 'מיקרוביולוגיה',       emoji: '🦠', group: 'micro',   primary: '#B8860B', accent: '#F4B942', bg: '#FFF8DC' },
  { key: 'פיזיולוגיה השוואתית',              label: 'פיזיולוגיה השוואתית', emoji: '🐠', group: 'comp',    primary: '#2E86AB', accent: '#5DADE2', bg: '#D6EAF8' },
  { key: 'בקרה על ביטוי גנים והנדסה גנטית',  label: 'הנדסה גנטית',         emoji: '🔬', group: 'genetics', primary: '#7B3F8C', accent: '#9B59B6', bg: '#EBDEF0' }
];
window.TOPIC_BY_KEY = {};
window.TOPICS.forEach(function (t) { window.TOPIC_BY_KEY[t.key] = t; });
