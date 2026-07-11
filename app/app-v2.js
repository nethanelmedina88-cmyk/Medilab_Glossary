/* @jsxRuntime classic */
/* ^ keep classic JSX (React.createElement) — we load React via global <script>, not as a module,
   so the automatic runtime's `import "react/jsx-runtime"` would crash the in-browser Babel build. */
/* SHLIFIM v2 — Modern + Brand Spark. Logic: window.SL. Data: window.GLOSSARY/TOPICS. Auth/sync: Firebase. */
const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} = React;
const GLOSSARY = window.GLOSSARY || [];
const TOPICS = window.TOPICS || [];
const TBK = window.TOPIC_BY_KEY || {};
const ACH = window.ACHIEVEMENTS || [];
const Snd = window.SLSound || {
  success() {},
  wrong() {},
  ding() {},
  pop() {},
  fanfare() {},
  setMuted() {},
  isMuted() {
    return false;
  }
};
const Speak = window.SLSpeak || function () {};
const maps = SL.buildAliasMaps(GLOSSARY);
const searchIndex = SL.buildSearchIndex(GLOSSARY);
const HEB = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
const TOTAL = GLOSSARY.length;
const topicTotals = function () {
  const m = {};
  GLOSSARY.forEach(t => {
    if (t.topic) m[t.topic] = (m[t.topic] || 0) + 1;
  });
  return m;
}();
const topicOf = function () {
  const m = {};
  GLOSSARY.forEach(t => {
    m[t.hebrew] = t.topic;
  });
  return m;
}();
function metrics(studied, favorites, stats) {
  const done = {};
  studied.forEach(h => {
    const tk = topicOf[h];
    if (tk) done[tk] = (done[tk] || 0) + 1;
  });
  const topicDone = {};
  let tc = 0;
  TOPICS.forEach(t => {
    const tot = topicTotals[t.key] || 0;
    const d = done[t.key] || 0;
    const c = tot > 0 && d >= tot;
    topicDone[t.key] = c;
    if (c) tc++;
  });
  const answered = stats.answered || 0,
    correct = stats.correct || 0;
  return {
    studied: studied.length,
    hard: favorites.length,
    dayStreak: stats.dayStreak || 0,
    maxDayStreak: stats.maxDayStreak || 0,
    answered,
    correct,
    accuracy: answered ? correct / answered : 0,
    quizzes: stats.quizzes || 0,
    perfect: stats.perfect || 0,
    topicsCompleted: tc,
    topicDone,
    usedDark: !!stats.usedDark,
    cwSolved: stats.cwSolved || 0
  };
}
const earnedIds = m => ACH.filter(a => {
  try {
    return a.check(m);
  } catch (e) {
    return false;
  }
}).map(a => a.id);
const uniq = arr => Array.from(new Set(arr));
const fmtSec = s => Math.floor(s / 60) + ':' + ('0' + Math.round(s) % 60).slice(-2);
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '') || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
const IS_STANDALONE = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
// merge cloud stats into local WITHOUT clobbering progress: counters only grow, and the
// most-recently-visited side keeps its day-streak (local mount may have advanced today's).
function mergeStats(local, cloud) {
  local = local || {};
  if (!cloud) return local;
  const out = {
    ...local,
    ...cloud
  };
  ['answered', 'correct', 'quizzes', 'perfect', 'maxDayStreak'].forEach(k => {
    out[k] = Math.max(local[k] || 0, cloud[k] || 0);
  });
  out.usedDark = !!(local.usedDark || cloud.usedDark);
  const ll = local.lastVisit || '',
    cl = cloud.lastVisit || '';
  if (ll >= cl) {
    out.lastVisit = ll || cl;
    out.dayStreak = local.dayStreak || cloud.dayStreak || 0;
  } else {
    out.lastVisit = cl;
    out.dayStreak = cloud.dayStreak || 0;
  }
  out.maxDayStreak = Math.max(out.maxDayStreak || 0, out.dayStreak || 0);
  return out;
}

/* ---------- Firebase ---------- */
const FB_CONFIG = {
  apiKey: "AIzaSyCffeHkYj2rY6odXD2MZbmArGNjh-nxuGA",
  authDomain: "shlifim-medilab.firebaseapp.com",
  projectId: "shlifim-medilab",
  storageBucket: "shlifim-medilab.firebasestorage.app",
  messagingSenderId: "378600944240",
  appId: "1:378600944240:web:eb8815afb165fb4d28fab5",
  measurementId: "G-HM38FMZ72X"
};
let auth = null,
  db = null,
  googleProvider = null;
try {
  if (window.firebase) {
    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }
} catch (e) {
  console.warn('firebase', e);
}
function useLocal(key, init) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s != null ? JSON.parse(s) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v]);
  return [v, setV];
}
function highlight(text, q) {
  if (!q) return text;
  const i = (text || '').toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return /*#__PURE__*/React.createElement(React.Fragment, null, text.slice(0, i), /*#__PURE__*/React.createElement("mark", {
    className: "hl"
  }, text.slice(i, i + q.length)), text.slice(i + q.length));
}

/* icons — Twemoji (CC-BY 4.0) supplied via window.MLICONS (app/mlicons.js) */
const mlic = k => /*#__PURE__*/React.createElement("span", {
  className: "mlic",
  dangerouslySetInnerHTML: {
    __html: (window.MLICONS || {})[k] || ''
  }
});
const IcCards = () => mlic('cards');
const IcQuiz = () => mlic('quiz');
const IcList = () => mlic('book');
const IcInfo = () => mlic('flask');
const IcGrid = () => mlic('grid');
const TopicIcon = ({
  tp
}) => tp && tp.svg ? /*#__PURE__*/React.createElement("span", {
  className: "tpi",
  dangerouslySetInnerHTML: {
    __html: tp.svg
  }
}) : null;
const IcSpeaker = () => mlic('speaker');
const IcPin = () => mlic('pin');
function TopicTag({
  topicKey
}) {
  const tp = TBK[topicKey];
  if (!tp) return null;
  return /*#__PURE__*/React.createElement("span", {
    className: "subj",
    style: {
      background: 'transparent',
      border: '1px solid ' + tp.accent,
      color: 'var(--text-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: tp.accent,
      display: 'inline-block',
      marginInlineEnd: 3
    }
  }), /*#__PURE__*/React.createElement(TopicIcon, {
    tp: tp
  }), " ", tp.label);
}
function TopicChips({
  value,
  onPick
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, /*#__PURE__*/React.createElement("button", {
    className: `chip ${!value ? 'on' : ''}`,
    onClick: () => onPick('')
  }, "\u05D4\u05DB\u05DC"), TOPICS.map(t => {
    const on = value === t.key;
    return /*#__PURE__*/React.createElement("button", {
      key: t.key,
      className: "chip",
      onClick: () => onPick(on ? '' : t.key),
      style: on ? {
        background: t.primary,
        color: '#fff',
        borderColor: t.primary
      } : undefined
    }, /*#__PURE__*/React.createElement(TopicIcon, {
      tp: t
    }), " ", t.label);
  }));
}
function Confetti() {
  const cols = ['#3FA9D6', '#5CB85C', '#F0654F', '#F9D85C', '#9B59B6'];
  const p = [];
  for (let i = 0; i < 42; i++) {
    p.push(/*#__PURE__*/React.createElement("i", {
      key: i,
      style: {
        left: Math.random() * 100 + '%',
        background: cols[i % cols.length],
        animationDuration: 1 + Math.random() * 1.1 + 's',
        animationDelay: Math.random() * 0.3 + 's'
      }
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "confetti"
  }, p);
}

/* ---------- PWA INSTALL ---------- */
function useInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onBIP = e => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const mm = window.matchMedia && window.matchMedia('(display-mode: standalone)');
  const isStandalone = mm && mm.matches || window.navigator.standalone === true;
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  const promptInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch (e) {}
    setDeferred(null);
  };
  return {
    canInstall: !!deferred,
    isIOS,
    isStandalone,
    installed,
    promptInstall
  };
}
// instructions overlay shared by the home banner and the About button
function InstallSheets({
  sheet,
  onClose
}) {
  if (!sheet) return null;
  const ua = navigator.userAgent || '';
  const isFirefox = /firefox|fxios/i.test(ua);
  const isAndroid = /android/i.test(ua);
  return /*#__PURE__*/React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-card ios-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "od-x",
    onClick: onClose,
    "aria-label": "\u05E1\u05D2\u05D5\u05E8"
  }, "\xD7"), /*#__PURE__*/React.createElement("img", {
    src: "icon-192.png",
    alt: "",
    style: {
      width: 54,
      height: 54,
      borderRadius: 14
    }
  }), sheet === 'ios' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u05D4\u05EA\u05E7\u05E0\u05D4 \u05DC-iPhone / iPad"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "\u05D4\u05E7\u05D9\u05E9\u05D5 \u05E2\u05DC \u05DB\u05E4\u05EA\u05D5\u05E8 \u05D4\u05E9\u05D9\u05EA\u05D5\u05E3 ", /*#__PURE__*/React.createElement("b", null, "\u2B06\uFE0F"), " \u05D1\u05EA\u05D7\u05EA\u05D9\u05EA \u05D4\u05D3\u05E4\u05D3\u05E4\u05DF (Safari)"), /*#__PURE__*/React.createElement("li", null, "\u05D2\u05DC\u05DC\u05D5 \u05D5\u05D1\u05D7\u05E8\u05D5 ", /*#__PURE__*/React.createElement("b", null, "\u05D4\u05D5\u05E1\u05E3 \u05DC\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA"), " (Add to Home Screen)"), /*#__PURE__*/React.createElement("li", null, "\u05D4\u05E7\u05D9\u05E9\u05D5 ", /*#__PURE__*/React.createElement("b", null, "\u05D4\u05D5\u05E1\u05E3"), " \u2014 \u05D5\u05D4\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF \u05E9\u05DC \u05E9\u05DC\u05D9\u05E4\u05D9\u05DD \u05D9\u05D5\u05E4\u05D9\u05E2 \u05D1\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA \uD83C\uDF89"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u05D4\u05EA\u05E7\u05E0\u05EA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4"), isFirefox ? /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Firefox \u05D1\u05DE\u05D7\u05E9\u05D1"), " \u05D0\u05D9\u05E0\u05D5 \u05EA\u05D5\u05DE\u05DA \u05D1\u05D4\u05EA\u05E7\u05E0\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA."), /*#__PURE__*/React.createElement("li", null, "\u05DC\u05D4\u05EA\u05E7\u05E0\u05D4 \u05DE\u05DC\u05D0\u05D4 \u2014 \u05E4\u05EA\u05D7\u05D5 \u05D0\u05EA \u05D4\u05D0\u05EA\u05E8 \u05D1-", /*#__PURE__*/React.createElement("b", null, "Google Chrome"), " \u05D0\u05D5 \u05D1-", /*#__PURE__*/React.createElement("b", null, "Microsoft Edge"), ", \u05D5\u05DB\u05D0\u05DF \u05D9\u05D5\u05E4\u05D9\u05E2 \u05DB\u05E4\u05EA\u05D5\u05E8 \u05D4\u05EA\u05E7\u05E0\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9."), /*#__PURE__*/React.createElement("li", null, "\u05D1-Firefox \u05D1\u05D8\u05DC\u05E4\u05D5\u05DF: \u05EA\u05E4\u05E8\u05D9\u05D8 ", /*#__PURE__*/React.createElement("b", null, "\u22EE"), " \u2190 ", /*#__PURE__*/React.createElement("b", null, "\u05D4\u05EA\u05E7\u05DF"), " / ", /*#__PURE__*/React.createElement("b", null, "\u05D4\u05D5\u05E1\u05E4\u05D4 \u05DC\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA"), ".")) : /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "\u05E4\u05EA\u05D7\u05D5 \u05D0\u05EA \u05EA\u05E4\u05E8\u05D9\u05D8 \u05D4\u05D3\u05E4\u05D3\u05E4\u05DF (", isAndroid ? '⋮ בפינה העליונה' : '⋮ או ☰ בפינה', ")."), /*#__PURE__*/React.createElement("li", null, "\u05D1\u05D7\u05E8\u05D5 ", /*#__PURE__*/React.createElement("b", null, isAndroid ? 'התקנת אפליקציה / הוספה למסך הבית' : 'התקן את שליפים… (Install app)'), "."), /*#__PURE__*/React.createElement("li", null, "\u05D0\u05E9\u05E8\u05D5 \u2014 \u05D5\u05D4\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF \u05D9\u05EA\u05D5\u05D5\u05E1\u05E3 \u05DC\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA / \u05DC\u05E9\u05D5\u05DC\u05D7\u05DF \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4 \uD83C\uDF89")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--text-3)',
      margin: '4px 0 12px'
    }
  }, "\u05D0\u05E4\u05E9\u05E8 \u05EA\u05DE\u05D9\u05D3 \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D0\u05EA\u05E8 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05D1\u05D3\u05E4\u05D3\u05E4\u05DF, \u05D1\u05DC\u05D9 \u05DC\u05D4\u05EA\u05E7\u05D9\u05DF.")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-accent",
    style: {
      width: '100%'
    },
    onClick: onClose
  }, "\u05D4\u05D1\u05E0\u05EA\u05D9")));
}
// shared click behaviour: native prompt if available, else iOS / manual instructions
function useInstallAction() {
  const inst = useInstall();
  const [sheet, setSheet] = useState('');
  const act = async () => {
    if (inst.canInstall) {
      await inst.promptInstall();
    } else if (inst.isIOS) {
      setSheet('ios');
    } else {
      setSheet('manual');
    }
  };
  return {
    ...inst,
    sheet,
    setSheet,
    act
  };
}
// dismissible banner at the top of the glossary
function InstallCard() {
  const {
    isStandalone,
    installed,
    sheet,
    setSheet,
    act
  } = useInstallAction();
  const [dismissed, setDismissed] = useLocal('ml-install-x', false);
  if (installed || isStandalone || dismissed) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "install-card"
  }, /*#__PURE__*/React.createElement("img", {
    className: "install-icon",
    src: "icon-192.png",
    alt: "",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "install-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u05D4\u05EA\u05E7\u05D9\u05E0\u05D5 \u05D0\u05EA \u05E9\u05DC\u05D9\u05E4\u05D9\u05DD"), /*#__PURE__*/React.createElement("span", null, "\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05D1\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA \u2014 \u05E2\u05D5\u05D1\u05D3\u05EA \u05D2\u05DD \u05DC\u05D0 \u05DE\u05E7\u05D5\u05D5\u05DF")), /*#__PURE__*/React.createElement("button", {
    className: "install-go",
    onClick: act
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "17",
    height: "17",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11l5 5 5-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 20h14"
  })), "\u05D4\u05EA\u05E7\u05E0\u05D4"), /*#__PURE__*/React.createElement("button", {
    className: "install-close",
    onClick: () => setDismissed(true),
    "aria-label": "\u05E1\u05D2\u05D5\u05E8"
  }, "\xD7")), /*#__PURE__*/React.createElement(InstallSheets, {
    sheet: sheet,
    onClose: () => setSheet('')
  }));
}
// permanent button for the About page
function InstallButton() {
  const {
    isStandalone,
    installed,
    sheet,
    setSheet,
    act
  } = useInstallAction();
  if (installed || isStandalone) return /*#__PURE__*/React.createElement("div", {
    className: "install-done"
  }, "\u2713 \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DB\u05D1\u05E8 \u05DE\u05D5\u05EA\u05E7\u05E0\u05EA \u05D0\u05E6\u05DC\u05DA");
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-pri install-btn-about",
    onClick: act
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "18",
    height: "18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11l5 5 5-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 20h14"
  })), "\u05D4\u05EA\u05E7\u05E0\u05EA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4"), /*#__PURE__*/React.createElement(InstallSheets, {
    sheet: sheet,
    onClose: () => setSheet('')
  }));
}

/* ---------- HEADER / NAV ---------- */
function Header({
  pinCount,
  dark,
  setDark,
  user,
  onProfile,
  onReview,
  onLogo
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "hdr"
  }, /*#__PURE__*/React.createElement("div", {
    className: "logo-wrap",
    onClick: onLogo,
    style: {
      cursor: 'pointer'
    },
    title: "\u05D0\u05D5\u05D3\u05D5\u05EA",
    role: "button",
    "aria-label": "\u05D0\u05D5\u05D3\u05D5\u05EA"
  }, /*#__PURE__*/React.createElement("img", {
    className: "logo-mark",
    src: "logo.jpg",
    alt: "MediLab"
  }), /*#__PURE__*/React.createElement("span", {
    className: "bub b1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "bub b2"
  }), /*#__PURE__*/React.createElement("span", {
    className: "bub b3"
  })), /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("b", null, "\u05E9\u05DC\u05D9\u05E4\u05D9\u05DD"), /*#__PURE__*/React.createElement("span", null, "\u05E0\u05EA\u05E0\u05D0\u05DC \u05D9\u05D5\u05D7\u05D0\u05D9 \u05DE\u05D3\u05D9\u05E0\u05D4")), /*#__PURE__*/React.createElement("div", {
    className: "hdr-spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "streak",
    onClick: onReview,
    title: "\u05DE\u05D5\u05E9\u05D2\u05D9\u05DD \u05DC\u05D7\u05D6\u05E8\u05D4",
    style: pinCount ? {
      color: 'var(--coral-700)',
      borderColor: 'var(--coral-500)'
    } : undefined
  }, /*#__PURE__*/React.createElement(IcPin, null), " ", pinCount || 0), /*#__PURE__*/React.createElement("button", {
    className: "icon-toggle",
    onClick: () => setDark(d => !d),
    "aria-label": "\u05DE\u05E6\u05D1 \u05DB\u05D4\u05D4"
  }, dark ? '☀️' : '🌙'), /*#__PURE__*/React.createElement("button", {
    className: "avatar",
    onClick: onProfile,
    "aria-label": "\u05D0\u05D6\u05D5\u05E8 \u05D0\u05D9\u05E9\u05D9"
  }, user && user.photoURL ? /*#__PURE__*/React.createElement("img", {
    src: user.photoURL,
    referrerPolicy: "no-referrer",
    alt: ""
  }) : '👤'));
}
function Nav({
  mode,
  setMode
}) {
  const T = [['glossary', 'מילון', IcList, 'g'], ['flashcards', 'כרטיסיות', IcCards, 'f'], ['quiz', 'מבחון', IcQuiz, 'q'], ['crossword', 'תשבץ', IcGrid, 'x'], ['about', 'אודות', IcInfo, 'g']];
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, T.map(([m, label, Ic, c]) => /*#__PURE__*/React.createElement("button", {
    key: m,
    className: `tab ${c} ${mode === m ? 'on' : ''}`,
    onClick: () => setMode(m)
  }, /*#__PURE__*/React.createElement(Ic, null), label, /*#__PURE__*/React.createElement("div", {
    className: "pipe"
  }))));
}

/* ---------- GLOSSARY ---------- */
function TermCard({
  t,
  q,
  fav,
  studied,
  onFav,
  onStudied,
  onOpenTerm
}) {
  const [open, setOpen] = useState(false);
  const isAlias = !!t.aliasOf;
  const canon = isAlias ? SL.resolveEntry(t.hebrew, maps) : t;
  const def = canon ? canon.definition : t.definition;
  const long = (def || '').length > 170;
  const shown = long && !open ? def.slice(0, 170) + '…' : def;
  return /*#__PURE__*/React.createElement("article", {
    className: `card ${studied ? 'studied' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: `term ${onOpenTerm ? 'link' : ''}`,
    onClick: onOpenTerm ? function () {
      onOpenTerm(t.hebrew);
    } : undefined
  }, highlight(t.hebrew, q)), t.english && /*#__PURE__*/React.createElement("div", {
    className: "en"
  }, t.english)), /*#__PURE__*/React.createElement("div", {
    className: "acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ibtn",
    onClick: () => Speak(t.hebrew),
    title: "\u05D4\u05E7\u05E8\u05D0\u05D4",
    "aria-label": "\u05D4\u05E7\u05E8\u05D0\u05D4"
  }, /*#__PURE__*/React.createElement(IcSpeaker, null)), /*#__PURE__*/React.createElement("button", {
    className: `ibtn ${fav ? 'pin' : ''}`,
    onClick: onFav,
    title: fav ? 'הסר מרשימת החזרה' : 'סמן כמושג לחזרה (קשה לזכור)',
    "aria-label": "\u05DC\u05D7\u05D6\u05E8\u05D4"
  }, /*#__PURE__*/React.createElement("span", {
    className: fav ? '' : 'pin-off'
  }, /*#__PURE__*/React.createElement(IcPin, null))), /*#__PURE__*/React.createElement("button", {
    className: `ibtn ${studied ? 'done' : ''}`,
    onClick: () => {
      if (!studied) Snd.ding();
      onStudied();
    },
    title: studied ? 'בטל נלמד' : 'סמן כנלמד',
    "aria-label": "\u05E0\u05DC\u05DE\u05D3"
  }, studied ? '✓' : '○'))), t.topic && /*#__PURE__*/React.createElement(TopicTag, {
    topicKey: t.topic
  }), isAlias && canon && /*#__PURE__*/React.createElement("div", {
    className: "alias-note"
  }, "\u05E8\u05D0\u05D5: ", /*#__PURE__*/React.createElement("b", null, t.aliasOf)), /*#__PURE__*/React.createElement("p", {
    className: "def"
  }, highlight(shown, q)), long && /*#__PURE__*/React.createElement("button", {
    className: "more",
    onClick: () => setOpen(o => !o)
  }, open ? 'הצג פחות' : 'קרא עוד'));
}
function Glossary({
  favorites,
  studied,
  toggleFav,
  toggleStudied,
  initialTopic,
  onOpenTerm
}) {
  const [q, setQ] = useState('');
  const [letter, setLetter] = useState('');
  const [topic, setTopic] = useState(initialTopic || '');
  const letterCounts = useMemo(() => {
    const c = {};
    GLOSSARY.forEach(t => c[t.letter] = (c[t.letter] || 0) + 1);
    return c;
  }, []);
  const results = useMemo(() => {
    let items = SL.search(searchIndex, q);
    if (letter) items = items.filter(t => t.letter === letter);
    if (topic) items = items.filter(t => t.topic === topic);
    return items;
  }, [q, letter, topic]);
  const tp = topic ? TBK[topic] : null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("h1", null, "\u05DE\u05D9\u05DC\u05D5\u05DF \u05DE\u05D5\u05E9\u05D2\u05D9\u05DD"), /*#__PURE__*/React.createElement("p", null, TOTAL, " \u05DE\u05D5\u05E9\u05D2\u05D9\u05DD \xB7 \u05D7\u05D9\u05E4\u05D5\u05E9, \u05E1\u05D9\u05E0\u05D5\u05DF \u05DC\u05E4\u05D9 \u05D0\u05D5\u05EA \u05D5\u05E0\u05D5\u05E9\u05D0")), /*#__PURE__*/React.createElement(InstallCard, null), /*#__PURE__*/React.createElement("div", {
    className: "search"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD0D"), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u05D7\u05E4\u05E9\u05D5 \u05DE\u05D5\u05E9\u05D2\u2026 (\u05D0\u05D5\u05E1\u05DE\u05D5\u05D6\u05D4, PCR, \u05D0\u05E7\u05E1\u05D5\u05DF)"
  }), q && /*#__PURE__*/React.createElement("button", {
    className: "x",
    onClick: () => setQ(''),
    "aria-label": "\u05E0\u05E7\u05D4"
  }, "\xD7")), /*#__PURE__*/React.createElement(TopicChips, {
    value: topic,
    onPick: setTopic
  }), /*#__PURE__*/React.createElement("div", {
    className: "letters"
  }, /*#__PURE__*/React.createElement("button", {
    className: `let ${!letter ? 'on' : ''}`,
    style: {
      width: 'auto',
      padding: '0 10px'
    },
    onClick: () => setLetter('')
  }, "\u05D4\u05DB\u05DC"), HEB.map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    className: `let ${letter === l ? 'on' : ''}`,
    disabled: !letterCounts[l],
    onClick: () => setLetter(letter === l ? '' : l)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, tp ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopicIcon, {
    tp: tp
  }), " ", tp.label, " \xB7 ") : '', results.length, " \u05DE\u05D5\u05E9\u05D2\u05D9\u05DD"), results.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 46
    }
  }, "\uD83D\uDD2C"), /*#__PURE__*/React.createElement("h3", null, "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA"), /*#__PURE__*/React.createElement("p", null, "\u05E0\u05E1\u05D5 \u05DE\u05D5\u05E9\u05D2 \u05D0\u05D7\u05E8 \u05D0\u05D5 \u05E0\u05E7\u05D5 \u05D0\u05EA \u05D4\u05E1\u05D9\u05E0\u05D5\u05DF.")) : results.map(t => /*#__PURE__*/React.createElement(TermCard, {
    key: t.hebrew + t.letter,
    t: t,
    q: q.trim(),
    fav: favorites.includes(t.hebrew),
    studied: studied.includes(t.hebrew),
    onFav: () => toggleFav(t.hebrew),
    onStudied: () => toggleStudied(t.hebrew),
    onOpenTerm: onOpenTerm
  })));
}

/* ---------- REVIEW LIST (pinned terms) ---------- */
function ReviewList({
  favorites,
  studied,
  toggleFav,
  toggleStudied,
  goQuiz,
  onOpenTerm
}) {
  const items = GLOSSARY.filter(t => favorites.includes(t.hebrew));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("h1", null, /*#__PURE__*/React.createElement(IcPin, null), " \u05DE\u05D5\u05E9\u05D2\u05D9\u05DD \u05DC\u05D7\u05D6\u05E8\u05D4"), /*#__PURE__*/React.createElement("p", null, items.length, " \u05DE\u05D5\u05E9\u05D2\u05D9\u05DD \u05E9\u05E1\u05D9\u05DE\u05E0\u05EA \u05DC\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05D4\u05DD")), items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pin-lg"
  }, /*#__PURE__*/React.createElement(IcPin, null)), /*#__PURE__*/React.createElement("h3", null, "\u05D4\u05E8\u05E9\u05D9\u05DE\u05D4 \u05E8\u05D9\u05E7\u05D4"), /*#__PURE__*/React.createElement("p", null, "\u05E1\u05DE\u05E0\u05D5 \u05DE\u05D5\u05E9\u05D2 \u05D1-\uD83D\uDCCC (\u05D1\u05DE\u05D9\u05DC\u05D5\u05DF \u05D0\u05D5 \u05D1\u05DB\u05E8\u05D8\u05D9\u05E1\u05D9\u05D5\u05EA) \u05DB\u05D3\u05D9 \u05DC\u05D0\u05E1\u05D5\u05E3 \u05D0\u05D5\u05EA\u05D5 \u05DC\u05DB\u05D0\u05DF, \u05D5\u05DC\u05D4\u05D9\u05D1\u05D7\u05DF \u05E8\u05E7 \u05E2\u05DC \u05DE\u05D4 \u05E9\u05E7\u05E9\u05D4 \u05DC\u05DB\u05DD.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-accent",
    style: {
      width: '100%',
      marginBottom: 14
    },
    onClick: goQuiz
  }, "\uD83C\uDFAF \u05D1\u05D7\u05E0\u05D5 \u05D0\u05D5\u05EA\u05D9 \u05E2\u05DC \u05D4\u05DE\u05D5\u05E9\u05D2\u05D9\u05DD \u05D4\u05D0\u05DC\u05D4 \u2190"), items.map(t => /*#__PURE__*/React.createElement(TermCard, {
    key: t.hebrew + t.letter,
    t: t,
    q: "",
    fav: true,
    studied: studied.includes(t.hebrew),
    onFav: () => toggleFav(t.hebrew),
    onStudied: () => toggleStudied(t.hebrew),
    onOpenTerm: onOpenTerm
  }))));
}

/* ---------- FLASHCARDS ---------- */
function Flashcards({
  favorites,
  studied,
  toggleFav,
  toggleStudied,
  onKnow
}) {
  const [deck, setDeck] = useState('all');
  const [topic, setTopic] = useState('');
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const cards = useMemo(() => {
    let items = GLOSSARY.filter(t => !t.aliasOf && !/^\s*ראה:/.test(t.definition));
    if (topic) items = items.filter(t => t.topic === topic);
    if (deck === 'unstudied') items = items.filter(t => !studied.includes(t.hebrew));
    if (deck === 'review') items = items.filter(t => favorites.includes(t.hebrew));
    return items;
  }, [deck, topic, studied, favorites]);
  useEffect(() => {
    setI(0);
    setFlip(false);
  }, [deck, topic]);
  const card = cards[i];
  const next = useCallback(() => {
    setFlip(false);
    setI(x => (x + 1) % Math.max(1, cards.length));
  }, [cards.length]);
  const prev = useCallback(() => {
    setFlip(false);
    setI(x => (x - 1 + cards.length) % Math.max(1, cards.length));
  }, [cards.length]);
  useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') next();
      if (e.key === 'ArrowRight') prev();
      if (e.key === ' ') {
        e.preventDefault();
        setFlip(f => !f);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [next, prev]);
  const tref = useRef(null);
  const onTouchEnd = e => {
    if (tref.current == null) return;
    const dx = e.changedTouches[0].clientX - tref.current;
    if (Math.abs(dx) > 50) {
      dx < 0 ? next() : prev();
    }
    tref.current = null;
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("h1", null, "\u05DB\u05E8\u05D8\u05D9\u05E1\u05D9\u05D5\u05EA"), /*#__PURE__*/React.createElement("p", null, "\u05DC\u05D9\u05DE\u05D5\u05D3 \u05E4\u05E2\u05D9\u05DC \xB7 \u05D4\u05E7\u05D9\u05E9\u05D5 \u05DC\u05D4\u05E4\u05D9\u05DB\u05D4, \u05D4\u05D7\u05DC\u05D9\u05E7\u05D5 \u05DC\u05DE\u05E2\u05D1\u05E8")), /*#__PURE__*/React.createElement("div", {
    className: "deck"
  }, /*#__PURE__*/React.createElement("button", {
    className: `chip ${deck === 'all' ? 'on' : ''}`,
    onClick: () => setDeck('all')
  }, "\u05D4\u05DB\u05DC"), /*#__PURE__*/React.createElement("button", {
    className: `chip ${deck === 'unstudied' ? 'on' : ''}`,
    onClick: () => setDeck('unstudied')
  }, "\u05DC\u05D0 \u05E0\u05DC\u05DE\u05D3\u05D5"), /*#__PURE__*/React.createElement("button", {
    className: `chip ${deck === 'review' ? 'on' : ''}`,
    onClick: () => setDeck('review')
  }, /*#__PURE__*/React.createElement(IcPin, null), " \u05DC\u05D7\u05D6\u05E8\u05D4")), /*#__PURE__*/React.createElement(TopicChips, {
    value: topic,
    onPick: setTopic
  }), cards.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 46
    }
  }, "\uD83C\uDFB4"), /*#__PURE__*/React.createElement("h3", null, "\u05D0\u05D9\u05DF \u05DB\u05E8\u05D8\u05D9\u05E1\u05D9\u05D5\u05EA \u05D1\u05E2\u05E8\u05D9\u05DE\u05D4 \u05D4\u05D6\u05D5")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "prog"
  }, /*#__PURE__*/React.createElement("span", null, i + 1, " / ", cards.length), /*#__PURE__*/React.createElement("div", {
    className: "bar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: `${(i + 1) / cards.length * 100}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: `fc ${flip ? 'flip' : ''}`,
    onClick: () => setFlip(f => !f),
    onTouchStart: e => tref.current = e.touches[0].clientX,
    onTouchEnd: onTouchEnd
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-face"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-badge"
  }, card.letter), /*#__PURE__*/React.createElement("div", {
    className: "fc-term"
  }, card.hebrew), card.english && /*#__PURE__*/React.createElement("div", {
    className: "fc-en"
  }, card.english), card.topic && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(TopicTag, {
    topicKey: card.topic
  })), /*#__PURE__*/React.createElement("div", {
    className: "fc-hint"
  }, "\u21BB \u05D4\u05E7\u05D9\u05E9\u05D5 \u05DC\u05EA\u05E9\u05D5\u05D1\u05D4")), /*#__PURE__*/React.createElement("div", {
    className: "fc-face fc-back"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-def"
  }, card.definition), /*#__PURE__*/React.createElement("div", {
    className: "fc-hint"
  }, "\u21BB \u05D4\u05E7\u05D9\u05E9\u05D5 \u05DC\u05D7\u05D6\u05E8\u05D4")))), /*#__PURE__*/React.createElement("div", {
    className: "fc-ctrl"
  }, /*#__PURE__*/React.createElement("button", {
    className: "fc-nav",
    onClick: prev,
    "aria-label": "\u05D4\u05E7\u05D5\u05D3\u05DD"
  }, "\u2192"), /*#__PURE__*/React.createElement("button", {
    className: "fc-nav",
    onClick: () => Speak(flip ? card.definition : card.hebrew),
    "aria-label": "\u05D4\u05E7\u05E8\u05D0\u05D4",
    title: "\u05D4\u05E7\u05E8\u05D0\u05D4"
  }, /*#__PURE__*/React.createElement(IcSpeaker, null)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-accent",
    style: {
      flex: 1
    },
    onClick: () => studied.includes(card.hebrew) ? toggleStudied(card.hebrew) : onKnow(card.hebrew)
  }, studied.includes(card.hebrew) ? '✓ נלמד' : 'אני יודע — בדקו אותי'), /*#__PURE__*/React.createElement("button", {
    className: "fc-nav",
    style: favorites.includes(card.hebrew) ? {
      color: '#fff',
      background: 'var(--coral-500)',
      borderColor: 'var(--coral-700)'
    } : undefined,
    onClick: () => toggleFav(card.hebrew),
    "aria-label": "\u05DC\u05D7\u05D6\u05E8\u05D4",
    title: "\u05DE\u05D5\u05E9\u05D2 \u05DC\u05D7\u05D6\u05E8\u05D4"
  }, /*#__PURE__*/React.createElement(IcPin, null)), /*#__PURE__*/React.createElement("button", {
    className: "fc-nav",
    onClick: next,
    "aria-label": "\u05D4\u05D1\u05D0"
  }, "\u2190"))));
}

/* ---------- QUIZ ---------- */
function buildQuiz(pool, n) {
  const kinds = ['pick-definition', 'pick-term', 'type-answer'];
  const items = [];
  const used = {};
  let g = 0;
  while (items.length < n && g < n * 25) {
    g++;
    const kind = kinds[items.length % 3];
    if (kind === 'type-answer') {
      const t = pool[Math.floor(Math.random() * pool.length)];
      if (used[t.hebrew]) continue;
      used[t.hebrew] = 1;
      items.push({
        kind,
        term: t,
        prompt: SL.defText(t),
        options: []
      });
    } else {
      const it = SL.generateItem(pool, maps, kind, Math.floor(Math.random() * 1e6));
      if (used[it.term.hebrew]) continue;
      used[it.term.hebrew] = 1;
      items.push(it);
    }
  }
  return items;
}
function Quiz({
  studied,
  toggleStudied,
  favorites,
  recordAnswer,
  recordQuiz,
  fireConfetti
}) {
  const [topic, setTopic] = useState('');
  const [len, setLen] = useState(10);
  const [hardOnly, setHardOnly] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [qi, setQi] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [spark, setSpark] = useState(false);
  const pool = useMemo(() => {
    let p = SL.eligibleTerms(GLOSSARY, maps);
    if (topic) p = p.filter(t => t.topic === topic);
    if (hardOnly) p = p.filter(t => favorites.includes(t.hebrew));
    return p;
  }, [topic, hardOnly, favorites]);
  const start = () => {
    setQuiz(buildQuiz(pool, Math.min(len, pool.length)));
    setQi(0);
    setAnswered(false);
    setChosen(null);
    setTyped('');
    setScore(0);
  };
  const item = quiz && quiz[qi];
  const grade = ok => {
    recordAnswer(ok);
    if (ok) {
      setScore(s => s + 1);
      setSpark(true);
      setTimeout(() => setSpark(false), 700);
      Snd.success();
      if (!studied.includes(item.term.hebrew)) toggleStudied(item.term.hebrew);
    } else {
      Snd.wrong();
    }
  };
  const answerMC = opt => {
    if (answered) return;
    setChosen(opt);
    setAnswered(true);
    grade(opt.correct);
  };
  const answerType = () => {
    if (answered) return;
    const ok = SL.checkAnswer(item, typed, maps);
    setAnswered(true);
    setChosen({
      correct: ok
    });
    grade(ok);
  };
  const nextQ = () => {
    if (qi + 1 >= quiz.length) {
      recordQuiz(score, quiz.length);
      if (score === quiz.length && quiz.length > 0) {
        fireConfetti();
        Snd.fanfare();
      }
      setQi(quiz.length);
      return;
    }
    setQi(qi + 1);
    setAnswered(false);
    setChosen(null);
    setTyped('');
  };
  if (!quiz) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("h1", null, "\u05DE\u05D1\u05D7\u05D5\u05DF"), /*#__PURE__*/React.createElement("p", null, "\u05D1\u05D7\u05D9\u05E8\u05D4 \u05DE\u05E8\u05D5\u05D1\u05D4 \xB7 \u05D4\u05E9\u05DC\u05DE\u05EA \u05DE\u05D5\u05E9\u05D2 \xB7 \u05D1\u05D3\u05D9\u05E7\u05D4 \u05E2\u05E6\u05DE\u05D9\u05EA")), /*#__PURE__*/React.createElement("div", {
    className: "setup"
  }, /*#__PURE__*/React.createElement("h2", null, "\u05D1\u05D7\u05E8\u05D5 \u05E0\u05D5\u05E9\u05D0"), /*#__PURE__*/React.createElement(TopicChips, {
    value: topic,
    onPick: setTopic
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '12px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: `chip ${hardOnly ? 'on' : ''}`,
    onClick: () => setHardOnly(h => !h),
    style: hardOnly ? {
      background: 'var(--coral-500)',
      color: '#fff',
      borderColor: 'var(--coral-700)'
    } : undefined
  }, /*#__PURE__*/React.createElement(IcPin, null), " \u05DE\u05D5\u05E9\u05D2\u05D9\u05DD \u05DC\u05D7\u05D6\u05E8\u05D4 \u05D1\u05DC\u05D1\u05D3 (", favorites.length, ")")), /*#__PURE__*/React.createElement("h2", null, "\u05DE\u05E1\u05E4\u05E8 \u05E9\u05D0\u05DC\u05D5\u05EA"), /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, [5, 10, 15, 20].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    className: `chip ${len === n ? 'on' : ''}`,
    onClick: () => setLen(n)
  }, n))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-accent",
    style: {
      width: '100%'
    },
    onClick: start,
    disabled: pool.length < 3
  }, pool.length < 3 ? 'מעט מדי מושגים בסינון הזה' : `התחילו מבחון (${pool.length} מושגים) ←`)));
  if (qi >= quiz.length) {
    const pct = Math.round(score / quiz.length * 100);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "hero"
    }, /*#__PURE__*/React.createElement("h1", null, "\u05E1\u05D9\u05D9\u05DE\u05EA\u05DD!")), /*#__PURE__*/React.createElement("div", {
      className: "result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "big"
    }, score, "/", quiz.length), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--text-2)',
        marginTop: 6
      }
    }, pct, "% \u05D4\u05E6\u05DC\u05D7\u05D4 ", pct >= 80 ? '🎉 מצוין!' : pct >= 60 ? '👍 כל הכבוד' : '💪 שווה חזרה'), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginTop: 18
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-accent",
      style: {
        flex: 1
      },
      onClick: start
    }, "\u05DE\u05D1\u05D7\u05D5\u05DF \u05E0\u05D5\u05E1\u05E3"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        flex: 1
      },
      onClick: () => setQuiz(null)
    }, "\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E0\u05D5\u05E9\u05D0"))));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, spark && /*#__PURE__*/React.createElement("div", {
    className: "spark-pop"
  }, "\u2728"), /*#__PURE__*/React.createElement("div", {
    className: "q-top"
  }, /*#__PURE__*/React.createElement("span", null, "\u05E9\u05D0\u05DC\u05D4 ", qi + 1, " / ", quiz.length), /*#__PURE__*/React.createElement("div", {
    className: "bar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: `${qi / quiz.length * 100}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "q-score"
  }, score, " \u2713")), /*#__PURE__*/React.createElement("span", {
    className: "q-kind"
  }, item.kind === 'pick-definition' ? 'בחרו את ההגדרה הנכונה' : item.kind === 'pick-term' ? 'בחרו את המושג הנכון' : 'הקלידו את המושג'), /*#__PURE__*/React.createElement("div", {
    className: "q-q"
  }, item.kind === 'pick-definition' ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u05DE\u05D4\u05D9 ", /*#__PURE__*/React.createElement("span", {
    className: "hl"
  }, item.term.hebrew), "?") : item.prompt), /*#__PURE__*/React.createElement("button", {
    className: "chip",
    onClick: () => Speak(item.kind === 'pick-definition' ? item.term.hebrew : item.prompt),
    style: {
      marginBottom: 10
    },
    "aria-label": "\u05D4\u05E7\u05E8\u05D0\u05D4"
  }, /*#__PURE__*/React.createElement(IcSpeaker, null), " \u05D4\u05E7\u05E8\u05D0\u05D4"), item.kind === 'type-answer' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "q-type-in"
  }, /*#__PURE__*/React.createElement("input", {
    value: typed,
    onChange: e => setTyped(e.target.value),
    disabled: answered,
    placeholder: "\u05D4\u05E7\u05DC\u05D9\u05D3\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D5\u05E9\u05D2\u2026",
    onKeyDown: e => e.key === 'Enter' && answerType()
  }), !answered && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-accent",
    onClick: answerType
  }, "\u05D1\u05D3\u05D9\u05E7\u05D4")), answered && (chosen.correct ? /*#__PURE__*/React.createElement("div", {
    className: "fb ok"
  }, "\uD83C\uDF89 \u05E0\u05DB\u05D5\u05DF! ", item.term.hebrew) : /*#__PURE__*/React.createElement("div", {
    className: "fb no"
  }, "\u2717 \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4: ", item.term.hebrew))) : item.options.map((o, idx) => {
    let cls = 'opt';
    if (answered) {
      if (o.correct) cls += ' correct';else if (chosen === o) cls += ' wrong';
    }
    return /*#__PURE__*/React.createElement("button", {
      key: idx,
      className: cls,
      onClick: () => answerMC(o),
      disabled: answered
    }, /*#__PURE__*/React.createElement("span", {
      className: "mk"
    }, answered && o.correct ? '✓' : String.fromCharCode(1488 + idx)), /*#__PURE__*/React.createElement("span", null, o.text));
  }), answered && item.kind !== 'type-answer' && (chosen && chosen.correct ? /*#__PURE__*/React.createElement("div", {
    className: "fb ok"
  }, "\uD83C\uDF89 \u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!") : /*#__PURE__*/React.createElement("div", {
    className: "fb no"
  }, "\u05D4\u05EA\u05E9\u05D5\u05D1\u05D4 \u05D4\u05E0\u05DB\u05D5\u05E0\u05D4 \u05DE\u05E1\u05D5\u05DE\u05E0\u05EA \u05D1\u05D9\u05E8\u05D5\u05E7")), answered && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-accent",
    style: {
      width: '100%',
      marginTop: 12
    },
    onClick: nextQ
  }, qi + 1 >= quiz.length ? 'לתוצאות ←' : 'לשאלה הבאה ←'));
}

/* ---------- ABOUT ---------- */
const WA = 'https://wa.me/972524295838';
/* ---------- CROSSWORD (embedded game) ---------- */
function Crossword({
  dark
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "cw-wrap"
  }, /*#__PURE__*/React.createElement("iframe", {
    key: dark ? 'd' : 'l',
    title: "\u05EA\u05E9\u05D1\u05E5 \u05D1\u05D9\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4",
    className: "cw-frame",
    src: "crossword.html?embed=1&dark=" + (dark ? 1 : 0)
  }));
}
function About() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("h1", null, "\u05D0\u05D5\u05D3\u05D5\u05EA"), /*#__PURE__*/React.createElement("p", null, "\u05E0\u05EA\u05E0\u05D0\u05DC \u05D9\u05D5\u05D7\u05D0\u05D9 \u05DE\u05D3\u05D9\u05E0\u05D4 \xB7 \u05DE\u05D5\u05E8\u05D4 \u05DC\u05D1\u05D9\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 \u05D5\u05DC\u05D1\u05D9\u05D5\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4")), /*#__PURE__*/React.createElement("div", {
    className: "about-hero"
  }, /*#__PURE__*/React.createElement("img", {
    className: "portrait",
    src: "portrait.jpg",
    alt: "\u05E0\u05EA\u05E0\u05D0\u05DC \u05DE\u05D3\u05D9\u05E0\u05D4"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "about-kicker"
  }, "\u05E9\u05D9\u05E2\u05D5\u05E8\u05D9\u05DD \u05E4\u05E8\u05D8\u05D9\u05D9\u05DD \xB7 5 \u05D9\u05D7\u05F4\u05DC \xB7 \u05D1\u05D9\u05D5\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 10 \u05D9\u05D7\u05F4\u05DC"), /*#__PURE__*/React.createElement("div", {
    className: "about-name"
  }, "\u05E0\u05E2\u05D9\u05DD \u05DC\u05D4\u05DB\u05D9\u05E8 \u2014 \u05E0\u05EA\u05E0\u05D0\u05DC \uD83D\uDC4B"))), /*#__PURE__*/React.createElement("p", {
    className: "about-body"
  }, "\u05DE\u05D5\u05E8\u05D4 \u05DC\u05D1\u05D9\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 \u05D5\u05DC\u05D1\u05D9\u05D5\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 \u05E2\u05DD ", /*#__PURE__*/React.createElement("b", null, "10 \u05E9\u05E0\u05D5\u05EA \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05D1\u05EA\u05D9\u05DB\u05D5\u05DF"), ", \u05DE\u05D2\u05D9\u05E9 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD \u05DC\u05D1\u05D2\u05E8\u05D5\u05EA \u05D1\u05D1\u05D9\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 (5 \u05D9\u05D7\u05F4\u05DC) \u05D5\u05D1\u05D1\u05D9\u05D5\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 (10 \u05D9\u05D7\u05F4\u05DC)."), /*#__PURE__*/React.createElement("p", {
    className: "about-body"
  }, /*#__PURE__*/React.createElement("b", null, "\u05DE\u05E2\u05D1\u05D9\u05E8 \u05E9\u05D9\u05E2\u05D5\u05E8\u05D9\u05DD \u05E4\u05E8\u05D8\u05D9\u05D9\u05DD \u2014 \u05D9\u05D7\u05D9\u05D3\u05E0\u05D9\u05D9\u05DD (\u05D0\u05D7\u05D3-\u05E2\u05DC-\u05D0\u05D7\u05D3) \u05D5\u05D1\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA"), ", \u05D1\u05D6\u05D5\u05DD \u05D0\u05D5 \u05E4\u05E8\u05D5\u05E0\u05D8\u05DC\u05D9 \u05D1\u05DE\u05E8\u05DB\u05D6 \u05DC\u05DE\u05D9\u05D3\u05D4. \u05DC\u05D9\u05D5\u05D5\u05D9 \u05D0\u05D9\u05E9\u05D9, \u05DE\u05D5\u05EA\u05D0\u05DD \u05DC\u05E8\u05DE\u05D4 \u05D5\u05DC\u05E7\u05E6\u05D1 \u05E9\u05DC \u05DB\u05DC \u05EA\u05DC\u05DE\u05D9\u05D3 \u2014 \u05E2\u05D3 \u05D4\u05D1\u05D2\u05E8\u05D5\u05EA. \uD83D\uDCC8"), /*#__PURE__*/React.createElement("div", {
    className: "quote"
  }, "\u05F4\u05D0\u05E0\u05D9 \u05DE\u05D0\u05DE\u05D9\u05DF \u05E9\u05DC\u05DB\u05DC \u05EA\u05DC\u05DE\u05D9\u05D3 \u05D9\u05E9 \u05D3\u05E8\u05DA \u05DE\u05E9\u05DC\u05D5 \u05DC\u05D4\u05D1\u05D9\u05DF, \u05D5\u05D4\u05EA\u05E4\u05E7\u05D9\u05D3 \u05E9\u05DC\u05D9 \u05D4\u05D5\u05D0 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05D5\u05EA\u05D4.\u05F4"), /*#__PURE__*/React.createElement("div", {
    className: "stat-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, "10"), /*#__PURE__*/React.createElement("span", null, "\u05E9\u05E0\u05D5\u05EA \u05D4\u05D5\u05E8\u05D0\u05D4")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, "1,600+"), /*#__PURE__*/React.createElement("span", null, "\u05E9\u05D0\u05DC\u05D5\u05EA \u05D1\u05D2\u05E8\u05D5\u05EA")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, "3"), /*#__PURE__*/React.createElement("span", null, "\u05E1\u05E4\u05E8\u05D9 \u05E2\u05D6\u05E8"))), /*#__PURE__*/React.createElement("div", {
    className: "degrees"
  }, /*#__PURE__*/React.createElement("div", {
    className: "degree"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "B.Sc"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u05EA\u05D5\u05D0\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF \u05D1\u05D1\u05D9\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4"), /*#__PURE__*/React.createElement("span", null, "\u05D0\u05D5\u05E0\u05D9\u05D1\u05E8\u05E1\u05D9\u05D8\u05EA \u05D7\u05D9\u05E4\u05D4"))), /*#__PURE__*/React.createElement("div", {
    className: "degree"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "M.Teach"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u05EA\u05D5\u05D0\u05E8 \u05E9\u05E0\u05D9 \u05D1\u05D4\u05D5\u05E8\u05D0\u05EA \u05D4\u05DE\u05D3\u05E2\u05D9\u05DD"), /*#__PURE__*/React.createElement("span", null, "\u05DE\u05DB\u05DC\u05DC\u05EA \u05D0\u05D5\u05E8\u05E0\u05D9\u05DD"))), /*#__PURE__*/React.createElement("div", {
    className: "degree"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "M.Sc"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u05EA\u05D5\u05D0\u05E8 \u05E9\u05E0\u05D9 \u05D1\u05D1\u05D9\u05D5\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4"), /*#__PURE__*/React.createElement("span", null, "\u05DE\u05DB\u05D5\u05DF \u05D5\u05D9\u05E6\u05DE\u05DF \u05DC\u05DE\u05D3\u05E2")))), /*#__PURE__*/React.createElement("h2", {
    className: "sec-title"
  }, "\u05E9\u05DC\u05D5\u05E9\u05EA \u05D4\u05E1\u05E4\u05E8\u05D9\u05DD \u05E9\u05DB\u05EA\u05D1\u05EA\u05D9 \uD83D\uDCDA"), /*#__PURE__*/React.createElement("p", {
    className: "sec-sub"
  }, "\u05DE\u05D5\u05EA\u05D0\u05DE\u05D9\u05DD \u05DC\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05D4\u05DC\u05D9\u05DE\u05D5\u05D3\u05D9\u05DD \u05EA\u05E9\u05E4\u05F4\u05D5 \xB7 \u05DE\u05E0\u05D5\u05E7\u05D3\u05D9\u05DD, \u05DE\u05D0\u05D5\u05D9\u05E8\u05D9\u05DD, \u05E0\u05D2\u05D9\u05E9\u05D9\u05DD"), /*#__PURE__*/React.createElement("div", {
    className: "books"
  }, /*#__PURE__*/React.createElement("a", {
    className: "book",
    href: WA,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("img", {
    src: "book-questions.png",
    alt: "\u05E1\u05E4\u05E8 \u05D4\u05E9\u05D0\u05DC\u05D5\u05EA"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "\u05DE\u05D4\u05D3\u05D5\u05E8\u05D4 II"), /*#__PURE__*/React.createElement("h4", null, "\u05E1\u05E4\u05E8 \u05D4\u05E9\u05D0\u05DC\u05D5\u05EA"), /*#__PURE__*/React.createElement("p", null, "1,674 \u05E9\u05D0\u05DC\u05D5\u05EA \u05D1\u05D2\u05E8\u05D5\u05EA \u05D1\u05E0\u05D5\u05E9\u05D0\u05D9 \u05D4\u05DC\u05D9\u05D1\u05D4 \u05D5\u05D4\u05D4\u05E2\u05DE\u05E7\u05D4."), /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, "\u20AA149"))), /*#__PURE__*/React.createElement("a", {
    className: "book",
    href: WA,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("img", {
    src: "book-research.png",
    alt: "\u05E7\u05D8\u05E2\u05D9 \u05DE\u05D7\u05E7\u05E8"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "\u05E4\u05D5\u05E8\u05DE\u05D8 \u05D1\u05D2\u05E8\u05D5\u05EA"), /*#__PURE__*/React.createElement("h4", null, "\u05E7\u05D8\u05E2\u05D9 \u05DE\u05D7\u05E7\u05E8"), /*#__PURE__*/React.createElement("p", null, "50 \u05E7\u05D8\u05E2\u05D9 \u05DE\u05D7\u05E7\u05E8 \u05E2\u05DD \u05E9\u05D0\u05DC\u05D5\u05EA, \u05D4\u05E6\u05E2\u05D5\u05EA \u05E4\u05EA\u05E8\u05D5\u05DF \u05D5\u05D4\u05E1\u05D1\u05E8\u05D9\u05DD."), /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, "\u20AA95"))), /*#__PURE__*/React.createElement("a", {
    className: "book",
    href: WA,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("img", {
    src: "book-glossary.png",
    alt: "\u05DE\u05D5\u05E0\u05D7\u05D5\u05DF"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "\u05EA\u05E9\u05E4\u05F4\u05D5 \xB7 2026"), /*#__PURE__*/React.createElement("h4", null, "\u05DE\u05D5\u05E0\u05D7\u05D5\u05DF"), /*#__PURE__*/React.createElement("p", null, "\u05DE\u05D9\u05DC\u05D5\u05DF \u05DE\u05D5\u05D3\u05E4\u05E1 \u05E9\u05DC 452 \u05DE\u05D5\u05E9\u05D2\u05D9\u05DD, \u05DE\u05E0\u05D5\u05E7\u05D3 \u05D5\u05DE\u05D0\u05D5\u05D9\u05E8."), /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, "\u20AA69")))), /*#__PURE__*/React.createElement("div", {
    className: "bundle"
  }, /*#__PURE__*/React.createElement("h4", null, "\u05E9\u05DC\u05D5\u05E9\u05EA \u05D4\u05E1\u05E4\u05E8\u05D9\u05DD \u05D9\u05D7\u05D3 \uD83C\uDF81"), /*#__PURE__*/React.createElement("p", null, "\u05DB\u05DC \u05D4\u05D0\u05E8\u05D2\u05D6 \u05DC\u05D1\u05D2\u05E8\u05D5\u05EA"), /*#__PURE__*/React.createElement("div", {
    className: "prices"
  }, /*#__PURE__*/React.createElement("span", {
    className: "old"
  }, "\u20AA313"), /*#__PURE__*/React.createElement("span", {
    className: "new"
  }, "\u20AA249"), /*#__PURE__*/React.createElement("span", {
    className: "save"
  }, "\u05D7\u05D5\u05E1\u05DB\u05D9\u05DD \u20AA64")), /*#__PURE__*/React.createElement("a", {
    href: WA,
    target: "_blank",
    rel: "noopener"
  }, "\u05DC\u05E8\u05DB\u05D9\u05E9\u05EA \u05D4\u05D7\u05D1\u05D9\u05DC\u05D4 \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "install-about"
  }, /*#__PURE__*/React.createElement("img", {
    src: "icon-192.png",
    alt: "",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "\u05D4\u05EA\u05E7\u05D9\u05E0\u05D5 \u05D0\u05EA \u05E9\u05DC\u05D9\u05E4\u05D9\u05DD \u05DC\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA"), /*#__PURE__*/React.createElement("p", null, "\u05D2\u05D9\u05E9\u05D4 \u05DE\u05D4\u05D9\u05E8\u05D4 \u05DB\u05DE\u05D5 \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D0\u05DE\u05D9\u05EA\u05D9\u05EA \u2014 \u05E2\u05D5\u05D1\u05D3\u05EA \u05D2\u05DD \u05DC\u05DC\u05D0 \u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8.")), /*#__PURE__*/React.createElement(InstallButton, null)), /*#__PURE__*/React.createElement("h2", {
    className: "sec-title"
  }, "\u05D3\u05D1\u05E8\u05D5 \u05D0\u05D9\u05EA\u05D9 \uD83D\uDCE9"), /*#__PURE__*/React.createElement("div", {
    className: "contact"
  }, /*#__PURE__*/React.createElement("a", {
    href: WA,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, "\uD83D\uDCAC"), " WhatsApp"), /*#__PURE__*/React.createElement("a", {
    href: "tel:+972524295838"
  }, /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, "\uD83D\uDCDE"), " 052-429-5838"), /*#__PURE__*/React.createElement("a", {
    href: "https://instagram.com/bio_bagrut",
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, "\uD83D\uDCF7"), " @bio_bagrut"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:biomedilab88@gmail.com"
  }, /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, "\u2709\uFE0F"), " \u05DE\u05D9\u05D9\u05DC")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "btn btn-ghost",
    href: "https://nethanelmedina88-cmyk.github.io/Bio_MediLab/",
    target: "_blank",
    rel: "noopener",
    style: {
      textDecoration: 'none'
    }
  }, "\u05DC\u05D0\u05EA\u05E8 \u05D4\u05DE\u05DC\u05D0 \u2190")), /*#__PURE__*/React.createElement("p", {
    className: "credit"
  }, "\u05D0\u05D9\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD: ", /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/jdecked/twemoji",
    target: "_blank",
    rel: "noopener"
  }, "Twemoji"), " \xB7 \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF CC-BY 4.0"));
}

/* ---------- PROFILE / STATS / ACHIEVEMENTS ---------- */
function Ring({
  pct,
  color
}) {
  const r = 34,
    c = 2 * Math.PI * r,
    off = c * (1 - pct / 100);
  return /*#__PURE__*/React.createElement("svg", {
    width: "84",
    height: "84",
    viewBox: "0 0 84 84",
    className: "ring"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "42",
    cy: "42",
    r: r,
    fill: "none",
    stroke: "var(--surface-2)",
    strokeWidth: "9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "42",
    cy: "42",
    r: r,
    fill: "none",
    stroke: color,
    strokeWidth: "9",
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: off,
    transform: "rotate(-90 42 42)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "42",
    y: "48",
    textAnchor: "middle",
    fontFamily: "Secular One",
    fontWeight: "800",
    fontSize: "20",
    fill: "var(--text)"
  }, pct, "%"));
}
function Profile({
  user,
  studied,
  favorites,
  stats,
  sync,
  signIn,
  signOut,
  onTopic,
  muted,
  toggleSound
}) {
  const m = metrics(studied, favorites, stats);
  const earned = earnedIds(m);
  const earnedSet = {};
  earned.forEach(id => earnedSet[id] = 1);
  const pct = Math.round(m.studied / TOTAL * 100);
  const acc = Math.round(m.accuracy * 100);
  const perTopic = TOPICS.map(t => ({
    t,
    total: topicTotals[t.key] || 0,
    done: studied.filter(h => topicOf[h] === t.key).length
  })).filter(x => x.total > 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("h1", null, "\u05D0\u05D6\u05D5\u05E8 \u05D0\u05D9\u05E9\u05D9")), /*#__PURE__*/React.createElement("div", {
    className: "prof-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }, user && user.photoURL ? /*#__PURE__*/React.createElement("img", {
    src: user.photoURL,
    referrerPolicy: "no-referrer",
    alt: ""
  }) : '👤'), user ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "prof-name"
  }, user.displayName || 'תלמיד/ה'), /*#__PURE__*/React.createElement("div", {
    className: "prof-email"
  }, user.email), sync && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sync-pill"
  }, sync === 'syncing' ? 'מסנכרן…' : sync === 'synced' ? '✓ מסונכרן' : 'שגיאת סנכרון')), /*#__PURE__*/React.createElement("button", {
    className: "signout",
    onClick: signOut
  }, "\u05D4\u05EA\u05E0\u05EA\u05E7")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "prof-name"
  }, "\u05DC\u05D9\u05DE\u05D5\u05D3 \u05DB\u05D0\u05D5\u05E8\u05D7"), /*#__PURE__*/React.createElement("div", {
    className: "sync-note"
  }, "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5 \u05E2\u05DD Google \u05DB\u05D3\u05D9 \u05DC\u05E1\u05E0\u05DB\u05E8\u05DF \u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA, \u05D4\u05D9\u05E9\u05D2\u05D9\u05DD \u05D5\u05E1\u05D8\u05D8\u05D9\u05E1\u05D8\u05D9\u05E7\u05D4 \u05D1\u05D9\u05DF \u05DB\u05DC \u05D4\u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DD."), /*#__PURE__*/React.createElement("button", {
    className: "google-btn",
    style: {
      marginTop: 12
    },
    onClick: signIn
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 48 48"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "#4285F4",
    d: "M45 24c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.8 45 31 45 24z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#34A853",
    d: "M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#FBBC05",
    d: "M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17 2 20.4 2 24s1 7 2.5 9.9l7.3-5.7z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#EA4335",
    d: "M24 11.5c3.2 0 6 1.1 8.3 3.2l6.2-6.2C34.9 5 29.9 3 24 3 15.4 3 8.1 7.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"
  })), "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05E2\u05DD Google"))), /*#__PURE__*/React.createElement("div", {
    className: "prof-card",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      textAlign: 'right',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement(IcSpeaker, null), " \u05E6\u05DC\u05D9\u05DC\u05D9 \u05DE\u05E9\u05D5\u05D1"), /*#__PURE__*/React.createElement("button", {
    className: "chip",
    onClick: toggleSound,
    style: muted ? undefined : {
      background: 'var(--green-500)',
      color: '#fff',
      borderColor: 'var(--green-700)'
    }
  }, muted ? 'כבוי 🔇' : 'דלוק 🔊')), /*#__PURE__*/React.createElement("div", {
    className: "ring-wrap"
  }, /*#__PURE__*/React.createElement(Ring, {
    pct: pct,
    color: "#3FA9D6"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mini-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, m.studied), /*#__PURE__*/React.createElement("span", null, "\u05E0\u05DC\u05DE\u05D3\u05D5 / ", TOTAL)), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, m.hard), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(IcPin, null), " \u05DC\u05D7\u05D6\u05E8\u05D4")))), /*#__PURE__*/React.createElement("div", {
    className: "perf"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, acc, "%"), /*#__PURE__*/React.createElement("span", null, "\u05D3\u05D9\u05D9\u05E7\u05E0\u05D5\u05EA \u05D1\u05DE\u05D1\u05D7\u05E0\u05D9\u05DD")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, m.answered), /*#__PURE__*/React.createElement("span", null, "\u05E9\u05D0\u05DC\u05D5\u05EA \u05E0\u05E2\u05E0\u05D5")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, m.quizzes), /*#__PURE__*/React.createElement("span", null, "\u05DE\u05D1\u05D7\u05E0\u05D9\u05DD")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, m.perfect), /*#__PURE__*/React.createElement("span", null, "\u05DE\u05D1\u05D7\u05E0\u05D9\u05DD \u05DE\u05D5\u05E9\u05DC\u05DE\u05D9\u05DD")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, m.dayStreak), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD25 \u05D9\u05DE\u05D9\u05DD \u05D1\u05E8\u05E6\u05E3")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, m.maxDayStreak), /*#__PURE__*/React.createElement("span", null, "\u05E9\u05D9\u05D0 \u05E8\u05E6\u05E3")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, stats.cwSolved || 0), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4",
    width: "16",
    height: "16",
    rx: "2.4",
    fill: "#E4D6F3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16",
    stroke: "#fff",
    strokeWidth: "1.6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "4.5",
    width: "4.3",
    height: "4.3",
    rx: "1",
    fill: "#7B4FB0"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15.2",
    y: "15.2",
    width: "4.3",
    height: "4.3",
    rx: "1",
    fill: "#7B4FB0"
  })), " \u05EA\u05E9\u05D1\u05E6\u05D9\u05DD \u05E9\u05E0\u05E4\u05EA\u05E8\u05D5")), stats.cwBest != null && stats.cwBest < 99999 && /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("b", null, fmtSec(stats.cwBest)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "13.5",
    r: "7.5",
    stroke: "#3FA9D6",
    strokeWidth: "1.9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9.5v4l2.4 1.5",
    stroke: "#3FA9D6",
    strokeWidth: "1.9",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.8 3.2h4.4",
    stroke: "#3FA9D6",
    strokeWidth: "1.9",
    strokeLinecap: "round"
  })), " \u05E9\u05D9\u05D0 \u05EA\u05E9\u05D1\u05E5"))), /*#__PURE__*/React.createElement("h2", {
    className: "sec-title"
  }, "\u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA \u05DC\u05E4\u05D9 \u05E0\u05D5\u05E9\u05D0"), /*#__PURE__*/React.createElement("p", {
    className: "sec-sub"
  }, "\u05D4\u05E7\u05D9\u05E9\u05D5 \u05E2\u05DC \u05E0\u05D5\u05E9\u05D0 \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05DB\u05DC \u05D4\u05DE\u05D5\u05E9\u05D2\u05D9\u05DD \u05E9\u05DC\u05D5"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, perTopic.map(({
    t,
    total,
    done
  }) => {
    const p = Math.round(done / total * 100);
    return /*#__PURE__*/React.createElement("div", {
      className: "topic-prog click",
      key: t.key,
      onClick: () => onTopic(t.key)
    }, /*#__PURE__*/React.createElement("div", {
      className: "lab"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(TopicIcon, {
      tp: t
    }), " ", t.label, " \u203A"), /*#__PURE__*/React.createElement("span", null, done, "/", total)), /*#__PURE__*/React.createElement("div", {
      className: "tbar"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: p + '%',
        background: t.primary
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "ach-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u05D4\u05D9\u05E9\u05D2\u05D9\u05DD \uD83C\uDFC6"), /*#__PURE__*/React.createElement("span", {
    className: "cnt"
  }, earned.length, "/", ACH.length)), /*#__PURE__*/React.createElement("div", {
    className: "ach-grid"
  }, ACH.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: `ach ${earnedSet[a.id] ? 'on' : ''}`,
    title: a.desc
  }, /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, a.emoji), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, a.title)))));
}

/* ---------- TERM QUESTION (active recall on a single term) ---------- */
function TermQuiz({
  hebrew,
  onClose,
  onResult
}) {
  const t = maps.byHeb[hebrew];
  const [sel, setSel] = useState(null);
  const done = useRef(false);
  useEffect(() => {
    const k = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const ct = t && (t.aliasOf ? SL.resolveEntry(t.hebrew, maps) || t : t);
  const def = ct && SL.defText(ct);
  const opts = useMemo(() => {
    if (!ct) return [];
    const dis = SL.pickDistractors(GLOSSARY, ct, maps, 2, 'paraphrase');
    return [{
      text: def,
      correct: true
    }].concat(dis.map(d => ({
      text: SL.defText(d),
      correct: false
    }))).sort(() => Math.random() - 0.5);
  }, [hebrew]); // eslint-disable-line
  if (!t) return null;
  const answer = o => {
    if (sel) return;
    setSel(o);
    o.correct ? Snd.success() : Snd.wrong();
    if (!done.current) {
      done.current = true;
      if (onResult) onResult(o.correct);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-card",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "od-x",
    onClick: onClose,
    "aria-label": "\u05E1\u05D2\u05D5\u05E8"
  }, "\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "od-term"
  }, t.hebrew, " ", /*#__PURE__*/React.createElement("button", {
    className: "ibtn",
    style: {
      display: 'inline-flex',
      width: 34,
      height: 34,
      verticalAlign: 'middle'
    },
    onClick: () => Speak(t.hebrew),
    "aria-label": "\u05D4\u05E7\u05E8\u05D0\u05D4"
  }, /*#__PURE__*/React.createElement(IcSpeaker, null))), t.english && /*#__PURE__*/React.createElement("div", {
    className: "en"
  }, t.english), t.topic && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(TopicTag, {
    topicKey: t.topic
  })), /*#__PURE__*/React.createElement("div", {
    className: "od-sec"
  }, "\u05DE\u05D4\u05D9 ", /*#__PURE__*/React.createElement("b", null, t.hebrew), "? \u05D1\u05D7\u05E8\u05D5 \u05D0\u05EA \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4 \u05D4\u05E0\u05DB\u05D5\u05E0\u05D4:"), opts.map((o, i) => {
    let cls = 'opt';
    if (sel) {
      if (o.correct) cls += ' correct';else if (sel === o) cls += ' wrong';
    }
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      className: cls,
      disabled: !!sel,
      onClick: () => answer(o)
    }, /*#__PURE__*/React.createElement("span", {
      className: "mk"
    }, sel && o.correct ? '✓' : String.fromCharCode(1488 + i)), /*#__PURE__*/React.createElement("span", null, o.text));
  }), sel && /*#__PURE__*/React.createElement("div", {
    className: `fb ${sel.correct ? 'ok' : 'no'}`
  }, sel.correct ? '🎉 כל הכבוד! ידעת את המושג' : 'אל דאגה — ההגדרה הנכונה מסומנת בירוק'), sel && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-accent",
    style: {
      width: '100%',
      marginTop: 12
    },
    onClick: onClose
  }, "\u05E1\u05D2\u05D9\u05E8\u05D4")));
}

/* ---------- APP ---------- */
function App() {
  const [mode, setMode] = useState('glossary');
  const [glossaryTopic, setGlossaryTopic] = useState('');
  const changeMode = m => {
    if (m === 'glossary') setGlossaryTopic('');
    setMode(m);
  };
  const openTopic = key => {
    setGlossaryTopic(key);
    setMode('glossary');
  };
  const [dark, setDark] = useLocal('ml-dark', false);
  const [favorites, setFav] = useLocal('ml-favorites', []);
  const [studied, setStudied] = useLocal('ml-studied', []);
  const [stats, setStats] = useLocal('ml-stats', {});
  const [achieved, setAchieved] = useLocal('ml-achieved', []);
  const [qTerm, setQTerm] = useState(null); // {hebrew, verify}
  const openTerm = h => setQTerm({
    hebrew: h,
    verify: false
  });
  const openVerify = h => setQTerm({
    hebrew: h,
    verify: true
  });
  const [muted, setMutedState] = useState(Snd.isMuted());
  const [user, setUser] = useState(null);
  const [sync, setSync] = useState('');
  const [newAch, setNewAch] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const loadingRef = useRef(false);
  const achInit = useRef(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    if (dark) setStats(s => s.usedDark ? s : {
      ...s,
      usedDark: true
    });
  }, [dark]);
  // day streak on mount
  useEffect(() => {
    setStats(s => {
      const today = new Date().toISOString().slice(0, 10);
      if (s.lastVisit === today) return s;
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const ds = s.lastVisit === y ? (s.dayStreak || 0) + 1 : 1;
      return {
        ...s,
        lastVisit: today,
        dayStreak: ds,
        maxDayStreak: Math.max(s.maxDayStreak || 0, ds)
      };
    });
  }, []);
  // crossword solves reported by the embedded game (postMessage)
  useEffect(() => {
    function onMsg(e) {
      if (e && e.data && e.data.type === 'ml-cw-solved') {
        const sec = typeof e.data.seconds === 'number' ? e.data.seconds : 99999;
        setStats(s => ({
          ...s,
          cwSolved: (s.cwSolved || 0) + 1,
          cwBest: Math.min(s.cwBest || 99999, sec)
        }));
        Snd.fanfare && Snd.fanfare();
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const toggleFav = h => setFav(f => f.includes(h) ? f.filter(x => x !== h) : [...f, h]);
  const toggleStudied = h => setStudied(f => f.includes(h) ? f.filter(x => x !== h) : [...f, h]);
  const onQResult = ok => {
    if (qTerm && qTerm.verify) {
      if (ok) {
        setStudied(f => f.includes(qTerm.hebrew) ? f : [...f, qTerm.hebrew]);
      } else {
        setFav(f => f.includes(qTerm.hebrew) ? f : [...f, qTerm.hebrew]);
      }
    }
  };
  const recordAnswer = ok => setStats(s => ({
    ...s,
    answered: (s.answered || 0) + 1,
    correct: (s.correct || 0) + (ok ? 1 : 0)
  }));
  const recordQuiz = (score, len) => setStats(s => ({
    ...s,
    quizzes: (s.quizzes || 0) + 1,
    perfect: (s.perfect || 0) + (score === len && len > 0 ? 1 : 0)
  }));
  const fireConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1900);
  };
  const toggleSound = () => {
    const n = !muted;
    setMutedState(n);
    Snd.setMuted(n);
    if (!n) Snd.pop();
  };

  // achievement detection — celebrate ONLY on a genuine new unlock.
  // Never on first mount, and never while remote data is loading (sign-in/refresh), so the
  // streak/achievement toast + confetti don't replay every time the app opens.
  useEffect(() => {
    const m = metrics(studied, favorites, stats);
    const earned = earnedIds(m);
    // achieved is monotonic — once earned, always earned (never re-celebrate, never drop on a transient stats dip).
    if (!achInit.current || loadingRef.current) {
      achInit.current = true;
      setAchieved(prev => uniq([...prev, ...earned]));
      return;
    }
    const fresh = earned.filter(id => !achieved.includes(id));
    if (fresh.length) {
      const a = ACH.find(x => x.id === fresh[0]);
      if (a) {
        setNewAch(a);
        setConfetti(true);
        Snd.fanfare();
        setTimeout(() => setNewAch(null), 3600);
        setTimeout(() => setConfetti(false), 1900);
      }
      setAchieved(prev => uniq([...prev, ...earned]));
    }
  }, [studied, favorites, stats]); // eslint-disable-line

  // firebase sync
  const saveUserData = useCallback(async uid => {
    if (!db || !auth.currentUser) return;
    setSync('syncing');
    try {
      await db.collection('users').doc(uid).set({
        displayName: auth.currentUser.displayName,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL,
        favorites,
        studied,
        stats,
        achieved,
        lastSync: firebase.firestore.FieldValue.serverTimestamp()
      }, {
        merge: true
      });
      setSync('synced');
      setTimeout(() => setSync(''), 1500);
    } catch (e) {
      console.error(e);
      setSync('error');
    }
  }, [favorites, studied, stats, achieved]);
  useEffect(() => {
    if (!auth) return;
    if (auth.getRedirectResult) {
      auth.getRedirectResult().catch(function (e) {
        if (e && e.code && e.code !== 'auth/no-auth-event') console.warn('sign-in redirect:', e.code);
      });
    }
    const unsub = auth.onAuthStateChanged(async u => {
      setUser(u);
      if (u && db) {
        setSync('syncing');
        try {
          const doc = await db.collection('users').doc(u.uid).get();
          if (doc.exists) {
            const d = doc.data();
            loadingRef.current = true;
            setFav(d.favorites || []);
            setStudied(d.studied || []);
            if (d.stats) setStats(s => mergeStats(s, d.stats));
            if (d.achieved) setAchieved(prev => uniq([...prev, ...d.achieved]));
            setTimeout(() => {
              loadingRef.current = false;
            }, 600);
            setSync('synced');
            setTimeout(() => setSync(''), 1500);
          } else {
            await db.collection('users').doc(u.uid).set({
              displayName: u.displayName,
              email: u.email,
              photoURL: u.photoURL,
              favorites,
              studied,
              stats,
              achieved,
              lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, {
              merge: true
            });
            setSync('synced');
            setTimeout(() => setSync(''), 1500);
          }
        } catch (e) {
          console.error(e);
          setSync('error');
        }
      }
    });
    return unsub;
  }, []);
  useEffect(() => {
    if (user && !loadingRef.current) saveUserData(user.uid);
  }, [favorites, studied, stats, achieved]); // eslint-disable-line

  const signIn = async () => {
    if (!auth) {
      alert('אין חיבור לאינטרנט');
      return;
    }
    try {
      if (IS_IOS || IS_STANDALONE) {
        await auth.signInWithRedirect(googleProvider);
      } // popups fail on iOS Safari / standalone PWAs
      else {
        await auth.signInWithPopup(googleProvider);
      }
    } catch (e) {
      const c = e && e.code;
      if (c === 'auth/popup-blocked' || c === 'auth/cancelled-popup-request' || c === 'auth/operation-not-supported-in-this-environment') {
        try {
          await auth.signInWithRedirect(googleProvider);
          return;
        } catch (e2) {
          alert('שגיאת התחברות: ' + (e2.message || e2));
          return;
        }
      }
      if (c === 'auth/popup-closed-by-user') return; // user cancelled — no error popup
      alert('שגיאת התחברות: ' + (e.message || e));
    }
  };
  const signOut = async () => {
    loadingRef.current = true;
    try {
      await auth.signOut();
    } catch (e) {}
    setUser(null);
    setTimeout(() => {
      loadingRef.current = false;
    }, 600);
  };
  const dm = mode === 'glossary' || mode === 'flashcards' || mode === 'quiz' ? mode : 'glossary';
  return /*#__PURE__*/React.createElement("div", {
    className: "app",
    "data-mode": dm
  }, confetti && /*#__PURE__*/React.createElement(Confetti, null), newAch && /*#__PURE__*/React.createElement("div", {
    className: "ach-toast"
  }, /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, newAch.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u05D4\u05D9\u05E9\u05D2 \u05D7\u05D3\u05E9! ", newAch.title), /*#__PURE__*/React.createElement("span", null, newAch.desc))), /*#__PURE__*/React.createElement(Header, {
    pinCount: favorites.length,
    dark: dark,
    setDark: setDark,
    user: user,
    onProfile: () => setMode('profile'),
    onReview: () => setMode('review'),
    onLogo: () => setMode('about')
  }), /*#__PURE__*/React.createElement("div", {
    className: "scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "view",
    key: mode
  }, mode === 'glossary' && /*#__PURE__*/React.createElement(Glossary, {
    key: glossaryTopic,
    initialTopic: glossaryTopic,
    favorites: favorites,
    studied: studied,
    toggleFav: toggleFav,
    toggleStudied: toggleStudied,
    onOpenTerm: openTerm
  }), mode === 'flashcards' && /*#__PURE__*/React.createElement(Flashcards, {
    favorites: favorites,
    studied: studied,
    toggleFav: toggleFav,
    toggleStudied: toggleStudied,
    onKnow: openVerify
  }), mode === 'quiz' && /*#__PURE__*/React.createElement(Quiz, {
    studied: studied,
    toggleStudied: toggleStudied,
    favorites: favorites,
    recordAnswer: recordAnswer,
    recordQuiz: recordQuiz,
    fireConfetti: fireConfetti
  }), mode === 'crossword' && /*#__PURE__*/React.createElement(Crossword, {
    dark: dark
  }), mode === 'review' && /*#__PURE__*/React.createElement(ReviewList, {
    favorites: favorites,
    studied: studied,
    toggleFav: toggleFav,
    toggleStudied: toggleStudied,
    goQuiz: () => setMode('quiz'),
    onOpenTerm: openTerm
  }), mode === 'about' && /*#__PURE__*/React.createElement(About, null), mode === 'profile' && /*#__PURE__*/React.createElement(Profile, {
    user: user,
    studied: studied,
    favorites: favorites,
    stats: stats,
    sync: sync,
    signIn: signIn,
    signOut: signOut,
    onTopic: openTopic,
    muted: muted,
    toggleSound: toggleSound
  }))), /*#__PURE__*/React.createElement(Nav, {
    mode: mode,
    setMode: changeMode
  }), qTerm && /*#__PURE__*/React.createElement(TermQuiz, {
    key: qTerm.hebrew + (qTerm.verify ? 'v' : 'e'),
    hebrew: qTerm.hebrew,
    onClose: () => setQTerm(null),
    onResult: onQResult
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));