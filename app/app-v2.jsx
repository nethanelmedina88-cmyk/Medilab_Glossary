/* @jsxRuntime classic */
/* ^ keep classic JSX (React.createElement) — we load React via global <script>, not as a module,
   so the automatic runtime's `import "react/jsx-runtime"` would crash the in-browser Babel build. */
/* SHLIFIM v2 — Modern + Brand Spark. Logic: window.SL. Data: window.GLOSSARY/TOPICS. Auth/sync: Firebase. */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const GLOSSARY = window.GLOSSARY || [];
const TOPICS = window.TOPICS || [];
const TBK = window.TOPIC_BY_KEY || {};
const ACH = window.ACHIEVEMENTS || [];
const Snd = window.SLSound || { success(){},wrong(){},ding(){},pop(){},fanfare(){},setMuted(){},isMuted(){return false;} };
const Speak = window.SLSpeak || function(){};
const maps = SL.buildAliasMaps(GLOSSARY);
const searchIndex = SL.buildSearchIndex(GLOSSARY);
const HEB = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];
const TOTAL = GLOSSARY.length;
const topicTotals=(function(){const m={};GLOSSARY.forEach(t=>{if(t.topic)m[t.topic]=(m[t.topic]||0)+1;});return m;})();
const topicOf=(function(){const m={};GLOSSARY.forEach(t=>{m[t.hebrew]=t.topic;});return m;})();

function metrics(studied,favorites,stats){
  const done={}; studied.forEach(h=>{const tk=topicOf[h]; if(tk)done[tk]=(done[tk]||0)+1;});
  const topicDone={}; let tc=0;
  TOPICS.forEach(t=>{const tot=topicTotals[t.key]||0;const d=done[t.key]||0;const c=tot>0&&d>=tot;topicDone[t.key]=c;if(c)tc++;});
  const answered=stats.answered||0, correct=stats.correct||0;
  return { studied:studied.length, hard:favorites.length, dayStreak:stats.dayStreak||0, maxDayStreak:stats.maxDayStreak||0,
    answered, correct, accuracy:answered?correct/answered:0, quizzes:stats.quizzes||0, perfect:stats.perfect||0,
    topicsCompleted:tc, topicDone, usedDark:!!stats.usedDark, cwSolved:stats.cwSolved||0 };
}
const earnedIds=m=>ACH.filter(a=>{try{return a.check(m);}catch(e){return false;}}).map(a=>a.id);
const uniq=arr=>Array.from(new Set(arr));
const fmtSec=s=>Math.floor(s/60)+':'+('0'+(Math.round(s)%60)).slice(-2);
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent||'') || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const IS_STANDALONE = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone===true;
// merge cloud stats into local WITHOUT clobbering progress: counters only grow, and the
// most-recently-visited side keeps its day-streak (local mount may have advanced today's).
function mergeStats(local,cloud){
  local=local||{}; if(!cloud) return local;
  const out={...local,...cloud};
  ['answered','correct','quizzes','perfect','maxDayStreak'].forEach(k=>{ out[k]=Math.max(local[k]||0,cloud[k]||0); });
  out.usedDark=!!(local.usedDark||cloud.usedDark);
  const ll=local.lastVisit||'', cl=cloud.lastVisit||'';
  if(ll>=cl){ out.lastVisit=ll||cl; out.dayStreak=local.dayStreak||cloud.dayStreak||0; }
  else { out.lastVisit=cl; out.dayStreak=cloud.dayStreak||0; }
  out.maxDayStreak=Math.max(out.maxDayStreak||0,out.dayStreak||0);
  return out;
}

/* ---------- Firebase ---------- */
const FB_CONFIG={apiKey:"AIzaSyCffeHkYj2rY6odXD2MZbmArGNjh-nxuGA",authDomain:"shlifim-medilab.firebaseapp.com",projectId:"shlifim-medilab",storageBucket:"shlifim-medilab.firebasestorage.app",messagingSenderId:"378600944240",appId:"1:378600944240:web:eb8815afb165fb4d28fab5",measurementId:"G-HM38FMZ72X"};
let auth=null,db=null,googleProvider=null;
try{ if(window.firebase){ if(!firebase.apps.length)firebase.initializeApp(FB_CONFIG); auth=firebase.auth(); db=firebase.firestore(); googleProvider=new firebase.auth.GoogleAuthProvider(); googleProvider.setCustomParameters({prompt:'select_account'}); } }catch(e){ console.warn('firebase',e); }

function useLocal(key,init){ const [v,setV]=useState(()=>{try{const s=localStorage.getItem(key);return s!=null?JSON.parse(s):init;}catch{return init;}}); useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}},[key,v]); return [v,setV]; }
function highlight(text,q){ if(!q)return text; const i=(text||'').toLowerCase().indexOf(q.toLowerCase()); if(i<0)return text; return <>{text.slice(0,i)}<mark className="hl">{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>; }

/* app-tile nav icons (colored square + white glyph) */
const IcCards=()=> <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#3F8C3F"/><rect x="8" y="8.5" width="10" height="7.5" rx="1.6" fill="#fff" opacity=".8"/><rect x="6" y="6.5" width="10" height="7.5" rx="1.6" fill="#fff"/><path d="M8.4 9.4h5M8.4 11.6h3.2" stroke="#3F8C3F" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcQuiz=()=> <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#E8654A"/><rect x="7" y="6.5" width="10" height="12" rx="2" fill="#fff"/><rect x="9.6" y="5.2" width="4.8" height="2.8" rx="1" fill="#E8654A"/><path d="M9.5 12.5l1.8 1.8 3.3-3.5" fill="none" stroke="#E8654A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcList=()=> <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1B6FA8"/><path d="M12 7.5c-1.3-.9-2.9-1.3-4.8-1.3-.5 0-.8.3-.8.8v8c0 .4.3.8.8.8 1.9 0 3.5.4 4.8 1.3V7.5z" fill="#fff"/><path d="M12 7.5c1.3-.9 2.9-1.3 4.8-1.3.5 0 .8.3.8.8v8c0 .4-.3.8-.8.8-1.9 0-3.5.4-4.8 1.3V7.5z" fill="#fff" opacity=".8"/></svg>;
const IcInfo=()=> <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#17A398"/><path d="M10 6.5v3.5L7 15.5c-.4.8.2 1.7 1 1.7h8c.8 0 1.4-.9 1-1.7L14 10V6.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 6.5h6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12.6" cy="14.2" r=".9" fill="#fff"/></svg>;
const IcGrid=()=> <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#7B4FB0"/><rect x="6" y="6" width="12" height="12" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.5"/><path d="M10 6v12M14 6v12M6 10h12M6 14h12" stroke="#fff" strokeWidth="1.2"/><rect x="6.6" y="6.6" width="2.8" height="2.8" fill="#fff"/><rect x="14.6" y="14.6" width="2.8" height="2.8" fill="#fff"/></svg>;
const TopicIcon=({tp})=> (tp&&tp.svg) ? <span className="tpi" dangerouslySetInnerHTML={{__html:tp.svg}}/> : null;
const IcSpeaker=()=> <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#3FA9D6"/><path d="M6 10h2.5L12 7v10l-3.5-3H6z" fill="#fff"/><path d="M14.5 9.8a3 3 0 0 1 0 4.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>;
const IcPin=()=> <svg viewBox="0 0 24 24"><rect x="1.1" y="1.1" width="21.8" height="21.8" rx="5.4" fill="#F0654F" stroke="#20262e" strokeWidth="1.4"/><path d="M9.5 5.5h5a.9.9 0 0 1 0 1.8h-.4l.5 4.4 1.5 1.5a.9.9 0 0 1-.6 1.5H12.9v3.8a.9.9 0 0 1-1.8 0V16.2H8.5a.9.9 0 0 1-.6-1.5l1.5-1.5.5-4.4h-.4a.9.9 0 0 1 0-1.8z" fill="#fff"/></svg>;

function TopicTag({topicKey}){ const tp=TBK[topicKey]; if(!tp)return null;
  return <span className="subj" style={{background:'transparent',border:'1px solid '+tp.accent,color:'var(--text-2)'}}>
    <span style={{width:8,height:8,borderRadius:'50%',background:tp.accent,display:'inline-block',marginInlineEnd:3}}></span><TopicIcon tp={tp}/> {tp.label}</span>; }
function TopicChips({value,onPick}){ return (<div className="chips">
  <button className={`chip ${!value?'on':''}`} onClick={()=>onPick('')}>הכל</button>
  {TOPICS.map(t=>{const on=value===t.key; return <button key={t.key} className="chip" onClick={()=>onPick(on?'':t.key)} style={on?{background:t.primary,color:'#fff',borderColor:t.primary}:undefined}><TopicIcon tp={t}/> {t.label}</button>;})}
</div>); }
function Confetti(){ const cols=['#3FA9D6','#5CB85C','#F0654F','#F9D85C','#9B59B6']; const p=[];
  for(let i=0;i<42;i++){ p.push(<i key={i} style={{left:(Math.random()*100)+'%',background:cols[i%cols.length],animationDuration:(1+Math.random()*1.1)+'s',animationDelay:(Math.random()*0.3)+'s'}}/>); }
  return <div className="confetti">{p}</div>; }

/* ---------- PWA INSTALL ---------- */
function useInstall(){
  const [deferred,setDeferred]=useState(null);
  const [installed,setInstalled]=useState(false);
  useEffect(()=>{
    const onBIP=e=>{ e.preventDefault(); setDeferred(e); };
    const onInstalled=()=>{ setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt',onBIP);
    window.addEventListener('appinstalled',onInstalled);
    return ()=>{ window.removeEventListener('beforeinstallprompt',onBIP); window.removeEventListener('appinstalled',onInstalled); };
  },[]);
  const mm=window.matchMedia&&window.matchMedia('(display-mode: standalone)');
  const isStandalone=(mm&&mm.matches)||window.navigator.standalone===true;
  const ua=navigator.userAgent||'';
  const isIOS=/iphone|ipad|ipod/i.test(ua)&&!window.MSStream;
  const promptInstall=async()=>{ if(!deferred)return; deferred.prompt(); try{ await deferred.userChoice; }catch(e){} setDeferred(null); };
  return { canInstall:!!deferred, isIOS, isStandalone, installed, promptInstall };
}
// instructions overlay shared by the home banner and the About button
function InstallSheets({sheet,onClose}){
  if(!sheet) return null;
  const ua=navigator.userAgent||''; const isFirefox=/firefox|fxios/i.test(ua); const isAndroid=/android/i.test(ua);
  return (<div className="overlay" onClick={onClose}>
    <div className="sheet-card ios-sheet" onClick={e=>e.stopPropagation()}>
      <button className="od-x" onClick={onClose} aria-label="סגור">×</button>
      <img src="icon-192.png" alt="" style={{width:54,height:54,borderRadius:14}}/>
      {sheet==='ios'
        ? <><h3>התקנה ל-iPhone / iPad</h3>
            <ol>
              <li>הקישו על כפתור השיתוף <b>⬆️</b> בתחתית הדפדפן (Safari)</li>
              <li>גללו ובחרו <b>הוסף למסך הבית</b> (Add to Home Screen)</li>
              <li>הקישו <b>הוסף</b> — והאייקון של שליפים יופיע במסך הבית 🎉</li>
            </ol></>
        : <><h3>התקנת האפליקציה</h3>
            {isFirefox
              ? <ol>
                  <li><b>Firefox במחשב</b> אינו תומך בהתקנה אוטומטית.</li>
                  <li>להתקנה מלאה — פתחו את האתר ב-<b>Google Chrome</b> או ב-<b>Microsoft Edge</b>, וכאן יופיע כפתור התקנה אוטומטי.</li>
                  <li>ב-Firefox בטלפון: תפריט <b>⋮</b> ← <b>התקן</b> / <b>הוספה למסך הבית</b>.</li>
                </ol>
              : <ol>
                  <li>פתחו את תפריט הדפדפן ({isAndroid?'⋮ בפינה העליונה':'⋮ או ☰ בפינה'}).</li>
                  <li>בחרו <b>{isAndroid?'התקנת אפליקציה / הוספה למסך הבית':'התקן את שליפים… (Install app)'}</b>.</li>
                  <li>אשרו — והאייקון יתווסף למסך הבית / לשולחן העבודה 🎉</li>
                </ol>}
            <p style={{fontSize:13,color:'var(--text-3)',margin:'4px 0 12px'}}>אפשר תמיד להשתמש באתר ישירות בדפדפן, בלי להתקין.</p></>}
      <button className="btn btn-accent" style={{width:'100%'}} onClick={onClose}>הבנתי</button>
    </div>
  </div>);
}
// shared click behaviour: native prompt if available, else iOS / manual instructions
function useInstallAction(){
  const inst=useInstall();
  const [sheet,setSheet]=useState('');
  const act=async()=>{ if(inst.canInstall){ await inst.promptInstall(); } else if(inst.isIOS){ setSheet('ios'); } else { setSheet('manual'); } };
  return { ...inst, sheet, setSheet, act };
}
// dismissible banner at the top of the glossary
function InstallCard(){
  const {isStandalone,installed,sheet,setSheet,act}=useInstallAction();
  const [dismissed,setDismissed]=useLocal('ml-install-x',false);
  if(installed||isStandalone||dismissed) return null;
  return (<>
    <div className="install-card">
      <img className="install-icon" src="icon-192.png" alt="" aria-hidden="true"/>
      <div className="install-txt"><b>התקינו את שליפים</b><span>אפליקציה מלאה במסך הבית — עובדת גם לא מקוון</span></div>
      <button className="install-go" onClick={act}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>
        התקנה
      </button>
      <button className="install-close" onClick={()=>setDismissed(true)} aria-label="סגור">×</button>
    </div>
    <InstallSheets sheet={sheet} onClose={()=>setSheet('')}/>
  </>);
}
// permanent button for the About page
function InstallButton(){
  const {isStandalone,installed,sheet,setSheet,act}=useInstallAction();
  if(installed||isStandalone) return (<div className="install-done">✓ האפליקציה כבר מותקנת אצלך</div>);
  return (<>
    <button className="btn btn-pri install-btn-about" onClick={act}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>
      התקנת האפליקציה
    </button>
    <InstallSheets sheet={sheet} onClose={()=>setSheet('')}/>
  </>);
}

/* ---------- HEADER / NAV ---------- */
function Header({pinCount,dark,setDark,user,onProfile,onReview,onLogo}){
  return (<header className="hdr">
    <div className="logo-wrap" onClick={onLogo} style={{cursor:'pointer'}} title="אודות" role="button" aria-label="אודות"><img className="logo-mark" src="logo.jpg" alt="MediLab"/><span className="bub b1"></span><span className="bub b2"></span><span className="bub b3"></span></div>
    <div className="brand"><b>שליפים</b><span>נתנאל יוחאי מדינה</span></div>
    <div className="hdr-spacer"></div>
    <button className="streak" onClick={onReview} title="מושגים לחזרה" style={pinCount?{color:'var(--coral-700)',borderColor:'var(--coral-500)'}:undefined}><IcPin/> {pinCount||0}</button>
    <button className="icon-toggle" onClick={()=>setDark(d=>!d)} aria-label="מצב כהה">{dark?'☀️':'🌙'}</button>
    <button className="avatar" onClick={onProfile} aria-label="אזור אישי">{user&&user.photoURL?<img src={user.photoURL} referrerPolicy="no-referrer" alt=""/>:'👤'}</button>
  </header>); }
function Nav({mode,setMode}){ const T=[['glossary','מילון',IcList,'g'],['flashcards','כרטיסיות',IcCards,'f'],['quiz','מבחון',IcQuiz,'q'],['crossword','תשבץ',IcGrid,'x'],['about','אודות',IcInfo,'g']];
  return (<nav className="nav">{T.map(([m,label,Ic,c])=>(<button key={m} className={`tab ${c} ${mode===m?'on':''}`} onClick={()=>setMode(m)}><Ic/>{label}<div className="pipe"></div></button>))}</nav>); }

/* ---------- GLOSSARY ---------- */
function TermCard({t,q,fav,studied,onFav,onStudied,onOpenTerm}){
  const [open,setOpen]=useState(false);
  const isAlias=!!t.aliasOf; const canon=isAlias?SL.resolveEntry(t.hebrew,maps):t;
  const def=canon?canon.definition:t.definition; const long=(def||'').length>170; const shown=long&&!open?def.slice(0,170)+'…':def;
  return (<article className={`card ${studied?'studied':''}`}>
    <div className="card-top">
      <div><div className={`term ${onOpenTerm?'link':''}`} onClick={onOpenTerm?function(){onOpenTerm(t.hebrew);}:undefined}>{highlight(t.hebrew,q)}</div>{t.english&&<div className="en">{t.english}</div>}</div>
      <div className="acts">
        <button className="ibtn" onClick={()=>Speak(t.hebrew)} title="הקראה" aria-label="הקראה"><IcSpeaker/></button>
        <button className={`ibtn ${fav?'pin':''}`} onClick={onFav} title={fav?'הסר מרשימת החזרה':'סמן כמושג לחזרה (קשה לזכור)'} aria-label="לחזרה"><span className={fav?'':'pin-off'}><IcPin/></span></button>
        <button className={`ibtn ${studied?'done':''}`} onClick={()=>{ if(!studied)Snd.ding(); onStudied(); }} title={studied?'בטל נלמד':'סמן כנלמד'} aria-label="נלמד">{studied?'✓':'○'}</button>
      </div>
    </div>
    {t.topic && <TopicTag topicKey={t.topic}/>}
    {isAlias && canon && <div className="alias-note">ראו: <b>{t.aliasOf}</b></div>}
    <p className="def">{highlight(shown,q)}</p>
    {long && <button className="more" onClick={()=>setOpen(o=>!o)}>{open?'הצג פחות':'קרא עוד'}</button>}
  </article>);
}
function Glossary({favorites,studied,toggleFav,toggleStudied,initialTopic,onOpenTerm}){
  const [q,setQ]=useState(''); const [letter,setLetter]=useState(''); const [topic,setTopic]=useState(initialTopic||'');
  const letterCounts=useMemo(()=>{const c={};GLOSSARY.forEach(t=>c[t.letter]=(c[t.letter]||0)+1);return c;},[]);
  const results=useMemo(()=>{let items=SL.search(searchIndex,q); if(letter)items=items.filter(t=>t.letter===letter); if(topic)items=items.filter(t=>t.topic===topic); return items;},[q,letter,topic]);
  const tp=topic?TBK[topic]:null;
  return (<>
    <div className="hero"><h1>מילון מושגים</h1><p>{TOTAL} מושגים · חיפוש, סינון לפי אות ונושא</p></div>
    <InstallCard/>
    <div className="search"><span aria-hidden="true">🔍</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="חפשו מושג… (אוסמוזה, PCR, אקסון)"/>{q&&<button className="x" onClick={()=>setQ('')} aria-label="נקה">×</button>}</div>
    <TopicChips value={topic} onPick={setTopic}/>
    <div className="letters"><button className={`let ${!letter?'on':''}`} style={{width:'auto',padding:'0 10px'}} onClick={()=>setLetter('')}>הכל</button>
      {HEB.map(l=>(<button key={l} className={`let ${letter===l?'on':''}`} disabled={!letterCounts[l]} onClick={()=>setLetter(letter===l?'':l)}>{l}</button>))}</div>
    <div className="meta">{tp?<><TopicIcon tp={tp}/> {tp.label} · </>:''}{results.length} מושגים</div>
    {results.length===0
      ? <div className="empty"><div style={{fontSize:46}}>🔬</div><h3>לא נמצאו תוצאות</h3><p>נסו מושג אחר או נקו את הסינון.</p></div>
      : results.map(t=>(<TermCard key={t.hebrew+t.letter} t={t} q={q.trim()} fav={favorites.includes(t.hebrew)} studied={studied.includes(t.hebrew)} onFav={()=>toggleFav(t.hebrew)} onStudied={()=>toggleStudied(t.hebrew)} onOpenTerm={onOpenTerm}/>))}
  </>);
}

/* ---------- REVIEW LIST (pinned terms) ---------- */
function ReviewList({favorites,studied,toggleFav,toggleStudied,goQuiz,onOpenTerm}){
  const items=GLOSSARY.filter(t=>favorites.includes(t.hebrew));
  return (<>
    <div className="hero"><h1><IcPin/> מושגים לחזרה</h1><p>{items.length} מושגים שסימנת לחזור אליהם</p></div>
    {items.length===0
      ? <div className="empty"><div className="pin-lg"><IcPin/></div><h3>הרשימה ריקה</h3><p>סמנו מושג ב-📌 (במילון או בכרטיסיות) כדי לאסוף אותו לכאן, ולהיבחן רק על מה שקשה לכם.</p></div>
      : (<>
          <button className="btn btn-accent" style={{width:'100%',marginBottom:14}} onClick={goQuiz}>🎯 בחנו אותי על המושגים האלה ←</button>
          {items.map(t=>(<TermCard key={t.hebrew+t.letter} t={t} q="" fav={true} studied={studied.includes(t.hebrew)} onFav={()=>toggleFav(t.hebrew)} onStudied={()=>toggleStudied(t.hebrew)} onOpenTerm={onOpenTerm}/>))}
        </>)}
  </>);
}

/* ---------- FLASHCARDS ---------- */
function Flashcards({favorites,studied,toggleFav,toggleStudied,onKnow}){
  const [deck,setDeck]=useState('all'); const [topic,setTopic]=useState(''); const [i,setI]=useState(0); const [flip,setFlip]=useState(false);
  const cards=useMemo(()=>{let items=GLOSSARY.filter(t=>!t.aliasOf&&!/^\s*ראה:/.test(t.definition));
    if(topic)items=items.filter(t=>t.topic===topic); if(deck==='unstudied')items=items.filter(t=>!studied.includes(t.hebrew)); if(deck==='review')items=items.filter(t=>favorites.includes(t.hebrew)); return items;},[deck,topic,studied,favorites]);
  useEffect(()=>{setI(0);setFlip(false);},[deck,topic]);
  const card=cards[i];
  const next=useCallback(()=>{setFlip(false);setI(x=>(x+1)%Math.max(1,cards.length));},[cards.length]);
  const prev=useCallback(()=>{setFlip(false);setI(x=>(x-1+cards.length)%Math.max(1,cards.length));},[cards.length]);
  useEffect(()=>{const k=e=>{if(e.key==='ArrowLeft')next();if(e.key==='ArrowRight')prev();if(e.key===' '){e.preventDefault();setFlip(f=>!f);}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[next,prev]);
  const tref=useRef(null);
  const onTouchEnd=e=>{if(tref.current==null)return;const dx=e.changedTouches[0].clientX-tref.current;if(Math.abs(dx)>50){dx<0?next():prev();}tref.current=null;};
  return (<>
    <div className="hero"><h1>כרטיסיות</h1><p>לימוד פעיל · הקישו להפיכה, החליקו למעבר</p></div>
    <div className="deck">
      <button className={`chip ${deck==='all'?'on':''}`} onClick={()=>setDeck('all')}>הכל</button>
      <button className={`chip ${deck==='unstudied'?'on':''}`} onClick={()=>setDeck('unstudied')}>לא נלמדו</button>
      <button className={`chip ${deck==='review'?'on':''}`} onClick={()=>setDeck('review')}><IcPin/> לחזרה</button>
    </div>
    <TopicChips value={topic} onPick={setTopic}/>
    {cards.length===0
      ? <div className="empty"><div style={{fontSize:46}}>🎴</div><h3>אין כרטיסיות בערימה הזו</h3></div>
      : (<>
        <div className="prog"><span>{i+1} / {cards.length}</span><div className="bar"><i style={{width:`${((i+1)/cards.length)*100}%`}}></i></div></div>
        <div className={`fc ${flip?'flip':''}`} onClick={()=>setFlip(f=>!f)} onTouchStart={e=>tref.current=e.touches[0].clientX} onTouchEnd={onTouchEnd}>
          <div className="fc-inner">
            <div className="fc-face"><div className="fc-badge">{card.letter}</div><div className="fc-term">{card.hebrew}</div>{card.english&&<div className="fc-en">{card.english}</div>}{card.topic&&<div style={{marginTop:12}}><TopicTag topicKey={card.topic}/></div>}<div className="fc-hint">↻ הקישו לתשובה</div></div>
            <div className="fc-face fc-back"><div className="fc-def">{card.definition}</div><div className="fc-hint">↻ הקישו לחזרה</div></div>
          </div>
        </div>
        <div className="fc-ctrl">
          <button className="fc-nav" onClick={prev} aria-label="הקודם">→</button>
          <button className="fc-nav" onClick={()=>Speak(flip?card.definition:card.hebrew)} aria-label="הקראה" title="הקראה"><IcSpeaker/></button>
          <button className="btn btn-accent" style={{flex:1}} onClick={()=> studied.includes(card.hebrew)?toggleStudied(card.hebrew):onKnow(card.hebrew)}>{studied.includes(card.hebrew)?'✓ נלמד':'אני יודע — בדקו אותי'}</button>
          <button className="fc-nav" style={favorites.includes(card.hebrew)?{color:'#fff',background:'var(--coral-500)',borderColor:'var(--coral-700)'}:undefined} onClick={()=>toggleFav(card.hebrew)} aria-label="לחזרה" title="מושג לחזרה"><IcPin/></button>
          <button className="fc-nav" onClick={next} aria-label="הבא">←</button>
        </div>
      </>)}
  </>);
}

/* ---------- QUIZ ---------- */
function buildQuiz(pool,n){ const kinds=['pick-definition','pick-term','type-answer']; const items=[]; const used={}; let g=0;
  while(items.length<n && g<n*25){ g++; const kind=kinds[items.length%3];
    if(kind==='type-answer'){const t=pool[Math.floor(Math.random()*pool.length)];if(used[t.hebrew])continue;used[t.hebrew]=1;items.push({kind,term:t,prompt:SL.defText(t),options:[]});}
    else{const it=SL.generateItem(pool,maps,kind,Math.floor(Math.random()*1e6));if(used[it.term.hebrew])continue;used[it.term.hebrew]=1;items.push(it);} }
  return items; }
function Quiz({studied,toggleStudied,favorites,recordAnswer,recordQuiz,fireConfetti}){
  const [topic,setTopic]=useState(''); const [len,setLen]=useState(10); const [hardOnly,setHardOnly]=useState(false);
  const [quiz,setQuiz]=useState(null); const [qi,setQi]=useState(0);
  const [answered,setAnswered]=useState(false); const [chosen,setChosen]=useState(null);
  const [typed,setTyped]=useState(''); const [score,setScore]=useState(0); const [spark,setSpark]=useState(false);
  const pool=useMemo(()=>{let p=SL.eligibleTerms(GLOSSARY,maps); if(topic)p=p.filter(t=>t.topic===topic); if(hardOnly)p=p.filter(t=>favorites.includes(t.hebrew)); return p;},[topic,hardOnly,favorites]);
  const start=()=>{setQuiz(buildQuiz(pool,Math.min(len,pool.length)));setQi(0);setAnswered(false);setChosen(null);setTyped('');setScore(0);};
  const item=quiz&&quiz[qi];
  const grade=ok=>{ recordAnswer(ok); if(ok){ setScore(s=>s+1); setSpark(true); setTimeout(()=>setSpark(false),700); Snd.success(); if(!studied.includes(item.term.hebrew))toggleStudied(item.term.hebrew); } else { Snd.wrong(); } };
  const answerMC=opt=>{if(answered)return;setChosen(opt);setAnswered(true);grade(opt.correct);};
  const answerType=()=>{if(answered)return;const ok=SL.checkAnswer(item,typed,maps);setAnswered(true);setChosen({correct:ok});grade(ok);};
  const nextQ=()=>{ if(qi+1>=quiz.length){ recordQuiz(score,quiz.length); if(score===quiz.length&&quiz.length>0){fireConfetti();Snd.fanfare();} setQi(quiz.length); return; } setQi(qi+1);setAnswered(false);setChosen(null);setTyped(''); };
  if(!quiz) return (<>
    <div className="hero"><h1>מבחון</h1><p>בחירה מרובה · השלמת מושג · בדיקה עצמית</p></div>
    <div className="setup"><h2>בחרו נושא</h2><TopicChips value={topic} onPick={setTopic}/>
      <div style={{margin:'12px 0'}}><button className={`chip ${hardOnly?'on':''}`} onClick={()=>setHardOnly(h=>!h)} style={hardOnly?{background:'var(--coral-500)',color:'#fff',borderColor:'var(--coral-700)'}:undefined}><IcPin/> מושגים לחזרה בלבד ({favorites.length})</button></div>
      <h2>מספר שאלות</h2>
      <div className="seg">{[5,10,15,20].map(n=>(<button key={n} className={`chip ${len===n?'on':''}`} onClick={()=>setLen(n)}>{n}</button>))}</div>
      <button className="btn btn-accent" style={{width:'100%'}} onClick={start} disabled={pool.length<3}>{pool.length<3?'מעט מדי מושגים בסינון הזה':`התחילו מבחון (${pool.length} מושגים) ←`}</button>
    </div></>);
  if(qi>=quiz.length){ const pct=Math.round(score/quiz.length*100);
    return (<><div className="hero"><h1>סיימתם!</h1></div>
      <div className="result"><div className="big">{score}/{quiz.length}</div>
        <p style={{color:'var(--text-2)',marginTop:6}}>{pct}% הצלחה {pct>=80?'🎉 מצוין!':pct>=60?'👍 כל הכבוד':'💪 שווה חזרה'}</p>
        <div style={{display:'flex',gap:8,marginTop:18}}><button className="btn btn-accent" style={{flex:1}} onClick={start}>מבחון נוסף</button><button className="btn btn-ghost" style={{flex:1}} onClick={()=>setQuiz(null)}>שינוי נושא</button></div></div></>);
  }
  return (<>
    {spark && <div className="spark-pop">✨</div>}
    <div className="q-top"><span>שאלה {qi+1} / {quiz.length}</span><div className="bar"><i style={{width:`${(qi/quiz.length)*100}%`}}></i></div><span className="q-score">{score} ✓</span></div>
    <span className="q-kind">{item.kind==='pick-definition'?'בחרו את ההגדרה הנכונה':item.kind==='pick-term'?'בחרו את המושג הנכון':'הקלידו את המושג'}</span>
    <div className="q-q">{item.kind==='pick-definition'?<>מהי <span className="hl">{item.term.hebrew}</span>?</>:item.prompt}</div>
    <button className="chip" onClick={()=>Speak(item.kind==='pick-definition'?item.term.hebrew:item.prompt)} style={{marginBottom:10}} aria-label="הקראה"><IcSpeaker/> הקראה</button>
    {item.kind==='type-answer'
      ? (<><div className="q-type-in"><input value={typed} onChange={e=>setTyped(e.target.value)} disabled={answered} placeholder="הקלידו את המושג…" onKeyDown={e=>e.key==='Enter'&&answerType()}/>{!answered&&<button className="btn btn-accent" onClick={answerType}>בדיקה</button>}</div>
        {answered && (chosen.correct?<div className="fb ok">🎉 נכון! {item.term.hebrew}</div>:<div className="fb no">✗ התשובה: {item.term.hebrew}</div>)}</>)
      : item.options.map((o,idx)=>{let cls='opt';if(answered){if(o.correct)cls+=' correct';else if(chosen===o)cls+=' wrong';}
          return <button key={idx} className={cls} onClick={()=>answerMC(o)} disabled={answered}><span className="mk">{answered&&o.correct?'✓':String.fromCharCode(1488+idx)}</span><span>{o.text}</span></button>;})}
    {answered && item.kind!=='type-answer' && (chosen&&chosen.correct?<div className="fb ok">🎉 כל הכבוד!</div>:<div className="fb no">התשובה הנכונה מסומנת בירוק</div>)}
    {answered && <button className="btn btn-accent" style={{width:'100%',marginTop:12}} onClick={nextQ}>{qi+1>=quiz.length?'לתוצאות ←':'לשאלה הבאה ←'}</button>}
  </>);
}

/* ---------- ABOUT ---------- */
const WA='https://wa.me/972524295838';
/* ---------- CROSSWORD (embedded game) ---------- */
function Crossword({dark}){
  return (<div className="cw-wrap">
    <iframe key={dark?'d':'l'} title="תשבץ ביולוגיה" className="cw-frame" src={"crossword.html?embed=1&dark="+(dark?1:0)}/>
  </div>);
}

function About(){
  return (<>
    <div className="hero"><h1>אודות</h1><p>נתנאל יוחאי מדינה · מורה לביולוגיה ולביוטכנולוגיה</p></div>
    <div className="about-hero"><img className="portrait" src="portrait.jpg" alt="נתנאל מדינה"/>
      <div><div className="about-kicker">שיעורים פרטיים · 5 יח״ל · ביוטכנולוגיה 10 יח״ל</div><div className="about-name">נעים להכיר — נתנאל 👋</div></div></div>
    <p className="about-body">מורה לביולוגיה ולביוטכנולוגיה עם <b>10 שנות ניסיון בתיכון</b>, מגיש תלמידים לבגרות בביולוגיה (5 יח״ל) ובביוטכנולוגיה (10 יח״ל).</p>
    <p className="about-body"><b>מעביר שיעורים פרטיים — יחידניים (אחד-על-אחד) ובקבוצות קטנות</b>, בזום או פרונטלי במרכז למידה. ליווי אישי, מותאם לרמה ולקצב של כל תלמיד — עד הבגרות. 📈</p>
    <div className="quote">״אני מאמין שלכל תלמיד יש דרך משלו להבין, והתפקיד שלי הוא למצוא אותה.״</div>
    <div className="stat-row"><div className="stat-box"><b>10</b><span>שנות הוראה</span></div><div className="stat-box"><b>1,600+</b><span>שאלות בגרות</span></div><div className="stat-box"><b>3</b><span>ספרי עזר</span></div></div>
    <div className="degrees">
      <div className="degree"><span className="tag">B.Sc</span><div><b>תואר ראשון בביולוגיה</b><span>אוניברסיטת חיפה</span></div></div>
      <div className="degree"><span className="tag">M.Teach</span><div><b>תואר שני בהוראת המדעים</b><span>מכללת אורנים</span></div></div>
      <div className="degree"><span className="tag">M.Sc</span><div><b>תואר שני בביוטכנולוגיה</b><span>מכון ויצמן למדע</span></div></div>
    </div>
    <h2 className="sec-title">שלושת הספרים שכתבתי 📚</h2><p className="sec-sub">מותאמים לתוכנית הלימודים תשפ״ו · מנוקדים, מאוירים, נגישים</p>
    <div className="books">
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-questions.png" alt="ספר השאלות"/><div><span className="tag">מהדורה II</span><h4>ספר השאלות</h4><p>1,674 שאלות בגרות בנושאי הליבה וההעמקה.</p><span className="price">₪149</span></div></a>
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-research.png" alt="קטעי מחקר"/><div><span className="tag">פורמט בגרות</span><h4>קטעי מחקר</h4><p>50 קטעי מחקר עם שאלות, הצעות פתרון והסברים.</p><span className="price">₪95</span></div></a>
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-glossary.png" alt="מונחון"/><div><span className="tag">תשפ״ו · 2026</span><h4>מונחון</h4><p>מילון מודפס של 452 מושגים, מנוקד ומאויר.</p><span className="price">₪69</span></div></a>
    </div>
    <div className="bundle"><h4>שלושת הספרים יחד 🎁</h4><p>כל הארגז לבגרות</p><div className="prices"><span className="old">₪313</span><span className="new">₪249</span><span className="save">חוסכים ₪64</span></div><a href={WA} target="_blank" rel="noopener">לרכישת החבילה →</a></div>
    <div className="install-about">
      <img src="icon-192.png" alt="" aria-hidden="true"/>
      <div><h4>התקינו את שליפים למסך הבית</h4><p>גישה מהירה כמו אפליקציה אמיתית — עובדת גם ללא אינטרנט.</p></div>
      <InstallButton/>
    </div>
    <h2 className="sec-title">דברו איתי 📩</h2>
    <div className="contact">
      <a href={WA} target="_blank" rel="noopener"><span className="em">💬</span> WhatsApp</a>
      <a href="tel:+972524295838"><span className="em">📞</span> 052-429-5838</a>
      <a href="https://instagram.com/bio_bagrut" target="_blank" rel="noopener"><span className="em">📷</span> @bio_bagrut</a>
      <a href="mailto:biomedilab88@gmail.com"><span className="em">✉️</span> מייל</a>
    </div>
    <div style={{textAlign:'center',marginTop:14}}><a className="btn btn-ghost" href="https://nethanelmedina88-cmyk.github.io/Bio_MediLab/" target="_blank" rel="noopener" style={{textDecoration:'none'}}>לאתר המלא ←</a></div>
  </>);
}

/* ---------- PROFILE / STATS / ACHIEVEMENTS ---------- */
function Ring({pct,color}){ const r=34,c=2*Math.PI*r,off=c*(1-pct/100);
  return (<svg width="84" height="84" viewBox="0 0 84 84" className="ring"><circle cx="42" cy="42" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9"/><circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 42 42)"/><text x="42" y="48" textAnchor="middle" fontFamily="Secular One" fontWeight="800" fontSize="20" fill="var(--text)">{pct}%</text></svg>); }
function Profile({user,studied,favorites,stats,sync,signIn,signOut,onTopic,muted,toggleSound}){
  const m=metrics(studied,favorites,stats);
  const earned=earnedIds(m); const earnedSet={}; earned.forEach(id=>earnedSet[id]=1);
  const pct=Math.round(m.studied/TOTAL*100); const acc=Math.round(m.accuracy*100);
  const perTopic=TOPICS.map(t=>({t,total:topicTotals[t.key]||0,done:studied.filter(h=>topicOf[h]===t.key).length})).filter(x=>x.total>0);
  return (<>
    <div className="hero"><h1>אזור אישי</h1></div>
    <div className="prof-card">
      <div className="av">{user&&user.photoURL?<img src={user.photoURL} referrerPolicy="no-referrer" alt=""/>:'👤'}</div>
      {user ? (<><div className="prof-name">{user.displayName||'תלמיד/ה'}</div><div className="prof-email">{user.email}</div>
        {sync && <div style={{marginTop:8}}><span className="sync-pill">{sync==='syncing'?'מסנכרן…':sync==='synced'?'✓ מסונכרן':'שגיאת סנכרון'}</span></div>}
        <button className="signout" onClick={signOut}>התנתק</button></>)
        : (<><div className="prof-name">לימוד כאורח</div><div className="sync-note">התחברו עם Google כדי לסנכרן התקדמות, הישגים וסטטיסטיקה בין כל המכשירים.</div>
          <button className="google-btn" style={{marginTop:12}} onClick={signIn}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.8 45 31 45 24z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17 2 20.4 2 24s1 7 2.5 9.9l7.3-5.7z"/><path fill="#EA4335" d="M24 11.5c3.2 0 6 1.1 8.3 3.2l6.2-6.2C34.9 5 29.9 3 24 3 15.4 3 8.1 7.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/></svg>
            התחברות עם Google</button></>)}
    </div>
    <div className="prof-card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'right',padding:'14px 16px'}}>
      <span style={{fontWeight:700}}><IcSpeaker/> צלילי משוב</span>
      <button className="chip" onClick={toggleSound} style={muted?undefined:{background:'var(--green-500)',color:'#fff',borderColor:'var(--green-700)'}}>{muted?'כבוי 🔇':'דלוק 🔊'}</button>
    </div>
    <div className="ring-wrap"><Ring pct={pct} color="#3FA9D6"/><div className="mini-stats">
      <div className="stat-box"><b>{m.studied}</b><span>נלמדו / {TOTAL}</span></div>
      <div className="stat-box"><b>{m.hard}</b><span><IcPin/> לחזרה</span></div>
    </div></div>
    <div className="perf">
      <div className="stat-box"><b>{acc}%</b><span>דייקנות במבחנים</span></div>
      <div className="stat-box"><b>{m.answered}</b><span>שאלות נענו</span></div>
      <div className="stat-box"><b>{m.quizzes}</b><span>מבחנים</span></div>
      <div className="stat-box"><b>{m.perfect}</b><span>מבחנים מושלמים</span></div>
      <div className="stat-box"><b>{m.dayStreak}</b><span>🔥 ימים ברצף</span></div>
      <div className="stat-box"><b>{m.maxDayStreak}</b><span>שיא רצף</span></div>
      <div className="stat-box"><b>{stats.cwSolved||0}</b><span><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2.4" fill="#E4D6F3"/><path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" stroke="#fff" strokeWidth="1.6"/><rect x="4.5" y="4.5" width="4.3" height="4.3" rx="1" fill="#7B4FB0"/><rect x="15.2" y="15.2" width="4.3" height="4.3" rx="1" fill="#7B4FB0"/></svg> תשבצים שנפתרו</span></div>
      {stats.cwBest!=null && stats.cwBest<99999 && <div className="stat-box"><b>{fmtSec(stats.cwBest)}</b><span><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13.5" r="7.5" stroke="#3FA9D6" strokeWidth="1.9"/><path d="M12 9.5v4l2.4 1.5" stroke="#3FA9D6" strokeWidth="1.9" strokeLinecap="round"/><path d="M9.8 3.2h4.4" stroke="#3FA9D6" strokeWidth="1.9" strokeLinecap="round"/></svg> שיא תשבץ</span></div>}
    </div>
    <h2 className="sec-title">התקדמות לפי נושא</h2>
    <p className="sec-sub">הקישו על נושא כדי לראות את כל המושגים שלו</p>
    <div style={{marginTop:6}}>{perTopic.map(({t,total,done})=>{const p=Math.round(done/total*100);
      return (<div className="topic-prog click" key={t.key} onClick={()=>onTopic(t.key)}><div className="lab"><span><TopicIcon tp={t}/> {t.label} ›</span><span>{done}/{total}</span></div><div className="tbar"><i style={{width:p+'%',background:t.primary}}></i></div></div>);})}</div>
    <div className="ach-head"><h2>הישגים 🏆</h2><span className="cnt">{earned.length}/{ACH.length}</span></div>
    <div className="ach-grid">{ACH.map(a=>(<div key={a.id} className={`ach ${earnedSet[a.id]?'on':''}`} title={a.desc}><span className="em">{a.emoji}</span><span className="t">{a.title}</span></div>))}</div>
  </>);
}

/* ---------- TERM QUESTION (active recall on a single term) ---------- */
function TermQuiz({hebrew,onClose,onResult}){
  const t=maps.byHeb[hebrew];
  const [sel,setSel]=useState(null); const done=useRef(false);
  useEffect(()=>{ const k=e=>{ if(e.key==='Escape')onClose(); }; window.addEventListener('keydown',k); return()=>window.removeEventListener('keydown',k); },[onClose]);
  const ct=t&&(t.aliasOf?(SL.resolveEntry(t.hebrew,maps)||t):t);
  const def=ct&&SL.defText(ct);
  const opts=useMemo(()=>{ if(!ct) return [];
    const dis=SL.pickDistractors(GLOSSARY, ct, maps, 2, 'paraphrase');
    return [{text:def,correct:true}].concat(dis.map(d=>({text:SL.defText(d),correct:false}))).sort(()=>Math.random()-0.5);
  },[hebrew]); // eslint-disable-line
  if(!t) return null;
  const answer=o=>{ if(sel)return; setSel(o); o.correct?Snd.success():Snd.wrong(); if(!done.current){ done.current=true; if(onResult)onResult(o.correct); } };
  return (<div className="overlay" onClick={onClose}>
    <div className="sheet-card" onClick={e=>e.stopPropagation()}>
      <button className="od-x" onClick={onClose} aria-label="סגור">×</button>
      <div className="od-term">{t.hebrew} <button className="ibtn" style={{display:'inline-flex',width:34,height:34,verticalAlign:'middle'}} onClick={()=>Speak(t.hebrew)} aria-label="הקראה"><IcSpeaker/></button></div>
      {t.english&&<div className="en">{t.english}</div>}
      {t.topic&&<div style={{marginTop:6}}><TopicTag topicKey={t.topic}/></div>}
      <div className="od-sec">מהי <b>{t.hebrew}</b>? בחרו את ההגדרה הנכונה:</div>
      {opts.map((o,i)=>{ let cls='opt'; if(sel){ if(o.correct)cls+=' correct'; else if(sel===o)cls+=' wrong'; }
        return <button key={i} className={cls} disabled={!!sel} onClick={()=>answer(o)}><span className="mk">{sel&&o.correct?'✓':String.fromCharCode(1488+i)}</span><span>{o.text}</span></button>; })}
      {sel && <div className={`fb ${sel.correct?'ok':'no'}`}>{sel.correct?'🎉 כל הכבוד! ידעת את המושג':'אל דאגה — ההגדרה הנכונה מסומנת בירוק'}</div>}
      {sel && <button className="btn btn-accent" style={{width:'100%',marginTop:12}} onClick={onClose}>סגירה</button>}
    </div>
  </div>);
}

/* ---------- APP ---------- */
function App(){
  const [mode,setMode]=useState('glossary');
  const [glossaryTopic,setGlossaryTopic]=useState('');
  const changeMode=m=>{ if(m==='glossary')setGlossaryTopic(''); setMode(m); };
  const openTopic=key=>{ setGlossaryTopic(key); setMode('glossary'); };
  const [dark,setDark]=useLocal('ml-dark',false);
  const [favorites,setFav]=useLocal('ml-favorites',[]);
  const [studied,setStudied]=useLocal('ml-studied',[]);
  const [stats,setStats]=useLocal('ml-stats',{});
  const [achieved,setAchieved]=useLocal('ml-achieved',[]);
  const [qTerm,setQTerm]=useState(null); // {hebrew, verify}
  const openTerm=h=>setQTerm({hebrew:h,verify:false});
  const openVerify=h=>setQTerm({hebrew:h,verify:true});
  const [muted,setMutedState]=useState(Snd.isMuted());
  const [user,setUser]=useState(null); const [sync,setSync]=useState('');
  const [newAch,setNewAch]=useState(null); const [confetti,setConfetti]=useState(false);
  const loadingRef=useRef(false); const achInit=useRef(false);

  useEffect(()=>{ document.documentElement.classList.toggle('dark',dark); if(dark)setStats(s=>s.usedDark?s:{...s,usedDark:true}); },[dark]);
  // day streak on mount
  useEffect(()=>{ setStats(s=>{ const today=new Date().toISOString().slice(0,10); if(s.lastVisit===today)return s;
    const y=new Date(Date.now()-86400000).toISOString().slice(0,10); const ds=(s.lastVisit===y)?((s.dayStreak||0)+1):1;
    return {...s,lastVisit:today,dayStreak:ds,maxDayStreak:Math.max(s.maxDayStreak||0,ds)}; }); },[]);
  // crossword solves reported by the embedded game (postMessage)
  useEffect(()=>{ function onMsg(e){ if(e&&e.data&&e.data.type==='ml-cw-solved'){
    const sec=(typeof e.data.seconds==='number')?e.data.seconds:99999;
    setStats(s=>({...s,cwSolved:(s.cwSolved||0)+1,cwBest:Math.min(s.cwBest||99999,sec)})); Snd.fanfare&&Snd.fanfare(); } }
    window.addEventListener('message',onMsg); return ()=>window.removeEventListener('message',onMsg); },[]);

  const toggleFav=h=>setFav(f=>f.includes(h)?f.filter(x=>x!==h):[...f,h]);
  const toggleStudied=h=>setStudied(f=>f.includes(h)?f.filter(x=>x!==h):[...f,h]);
  const onQResult=ok=>{ if(qTerm&&qTerm.verify){ if(ok){ setStudied(f=>f.includes(qTerm.hebrew)?f:[...f,qTerm.hebrew]); } else { setFav(f=>f.includes(qTerm.hebrew)?f:[...f,qTerm.hebrew]); } } };
  const recordAnswer=ok=>setStats(s=>({...s,answered:(s.answered||0)+1,correct:(s.correct||0)+(ok?1:0)}));
  const recordQuiz=(score,len)=>setStats(s=>({...s,quizzes:(s.quizzes||0)+1,perfect:(s.perfect||0)+((score===len&&len>0)?1:0)}));
  const fireConfetti=()=>{ setConfetti(true); setTimeout(()=>setConfetti(false),1900); };
  const toggleSound=()=>{ const n=!muted; setMutedState(n); Snd.setMuted(n); if(!n)Snd.pop(); };

  // achievement detection — celebrate ONLY on a genuine new unlock.
  // Never on first mount, and never while remote data is loading (sign-in/refresh), so the
  // streak/achievement toast + confetti don't replay every time the app opens.
  useEffect(()=>{ const m=metrics(studied,favorites,stats); const earned=earnedIds(m);
    // achieved is monotonic — once earned, always earned (never re-celebrate, never drop on a transient stats dip).
    if(!achInit.current || loadingRef.current){ achInit.current=true; setAchieved(prev=>uniq([...prev,...earned])); return; }
    const fresh=earned.filter(id=>!achieved.includes(id));
    if(fresh.length){ const a=ACH.find(x=>x.id===fresh[0]); if(a){ setNewAch(a); setConfetti(true); Snd.fanfare();
      setTimeout(()=>setNewAch(null),3600); setTimeout(()=>setConfetti(false),1900); } setAchieved(prev=>uniq([...prev,...earned])); }
  },[studied,favorites,stats]); // eslint-disable-line

  // firebase sync
  const saveUserData=useCallback(async(uid)=>{ if(!db||!auth.currentUser)return; setSync('syncing');
    try{ await db.collection('users').doc(uid).set({displayName:auth.currentUser.displayName,email:auth.currentUser.email,photoURL:auth.currentUser.photoURL,favorites,studied,stats,achieved,lastSync:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); setSync('synced'); setTimeout(()=>setSync(''),1500); }
    catch(e){ console.error(e); setSync('error'); } },[favorites,studied,stats,achieved]);
  useEffect(()=>{ if(!auth)return;
    if(auth.getRedirectResult){ auth.getRedirectResult().catch(function(e){ if(e&&e.code&&e.code!=='auth/no-auth-event') console.warn('sign-in redirect:',e.code); }); }
    const unsub=auth.onAuthStateChanged(async(u)=>{ setUser(u);
    if(u&&db){ setSync('syncing');
      try{ const doc=await db.collection('users').doc(u.uid).get();
        if(doc.exists){ const d=doc.data(); loadingRef.current=true; setFav(d.favorites||[]); setStudied(d.studied||[]); if(d.stats)setStats(s=>mergeStats(s,d.stats)); if(d.achieved)setAchieved(prev=>uniq([...prev,...d.achieved])); setTimeout(()=>{loadingRef.current=false;},600); setSync('synced'); setTimeout(()=>setSync(''),1500); }
        else { await db.collection('users').doc(u.uid).set({displayName:u.displayName,email:u.email,photoURL:u.photoURL,favorites,studied,stats,achieved,lastSync:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); setSync('synced'); setTimeout(()=>setSync(''),1500); }
      }catch(e){ console.error(e); setSync('error'); } }
  }); return unsub; },[]);
  useEffect(()=>{ if(user&&!loadingRef.current)saveUserData(user.uid); },[favorites,studied,stats,achieved]); // eslint-disable-line

  const signIn=async()=>{ if(!auth){alert('אין חיבור לאינטרנט');return;}
    try{
      if(IS_IOS||IS_STANDALONE){ await auth.signInWithRedirect(googleProvider); }   // popups fail on iOS Safari / standalone PWAs
      else { await auth.signInWithPopup(googleProvider); }
    }catch(e){
      const c=e&&e.code;
      if(c==='auth/popup-blocked'||c==='auth/cancelled-popup-request'||c==='auth/operation-not-supported-in-this-environment'){
        try{ await auth.signInWithRedirect(googleProvider); return; }catch(e2){ alert('שגיאת התחברות: '+(e2.message||e2)); return; }
      }
      if(c==='auth/popup-closed-by-user') return;   // user cancelled — no error popup
      alert('שגיאת התחברות: '+(e.message||e));
    } };
  const signOut=async()=>{ loadingRef.current=true; try{ await auth.signOut(); }catch(e){} setUser(null); setTimeout(()=>{loadingRef.current=false;},600); };

  const dm=(mode==='glossary'||mode==='flashcards'||mode==='quiz')?mode:'glossary';
  return (
    <div className="app" data-mode={dm}>
      {confetti && <Confetti/>}
      {newAch && <div className="ach-toast"><span className="em">{newAch.emoji}</span><div><b>הישג חדש! {newAch.title}</b><span>{newAch.desc}</span></div></div>}
      <Header pinCount={favorites.length} dark={dark} setDark={setDark} user={user} onProfile={()=>setMode('profile')} onReview={()=>setMode('review')} onLogo={()=>setMode('about')}/>
      <div className="scroll">
        <div className="view" key={mode}>
          {mode==='glossary' && <Glossary key={glossaryTopic} initialTopic={glossaryTopic} favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied} onOpenTerm={openTerm}/>}
          {mode==='flashcards' && <Flashcards favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied} onKnow={openVerify}/>}
          {mode==='quiz' && <Quiz studied={studied} toggleStudied={toggleStudied} favorites={favorites} recordAnswer={recordAnswer} recordQuiz={recordQuiz} fireConfetti={fireConfetti}/>}
          {mode==='crossword' && <Crossword dark={dark}/>}
          {mode==='review' && <ReviewList favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied} goQuiz={()=>setMode('quiz')} onOpenTerm={openTerm}/>}
          {mode==='about' && <About/>}
          {mode==='profile' && <Profile user={user} studied={studied} favorites={favorites} stats={stats} sync={sync} signIn={signIn} signOut={signOut} onTopic={openTopic} muted={muted} toggleSound={toggleSound}/>}
        </div>
      </div>
      <Nav mode={mode} setMode={changeMode}/>
      {qTerm && <TermQuiz key={qTerm.hebrew+(qTerm.verify?'v':'e')} hebrew={qTerm.hebrew} onClose={()=>setQTerm(null)} onResult={onQResult}/>}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
