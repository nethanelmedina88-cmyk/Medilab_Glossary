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
// Free-tier audio gate: App keeps these in sync with the current tier (see the effect in App).
let _audioLocked=false, _onAudioLock=null;
function Speak2(k,s){ if(_audioLocked){ if(_onAudioLock)_onAudioLock(); return; } Speak(k,s); }
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
// Goal-gradient: always show a NEAR target instead of the distant total, so the bar
// never reads "0 / 464". Milestones are real thresholds — nothing is faked.
const MILESTONES=[10,25,50,100,150,200,300];
function nextGoal(n,total){ for(let i=0;i<MILESTONES.length;i++){ if(n<MILESTONES[i]&&MILESTONES[i]<total) return MILESTONES[i]; } return total; }
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
// The on-screen keyboard covers the bottom of the screen. getBoundingClientRect() is in layout
// coordinates, and on iOS the layout viewport does NOT shrink when the keyboard opens — only
// visualViewport does — so we measure the visible band as [offsetTop, offsetTop+height] and
// scroll the app's own .scroll container until the element sits inside it.
// Publish the keyboard height as --kb. A quiz question exactly fills the screen, so .scroll has
// ZERO scrollable room — scrolling alone can never lift the field out from under the keyboard.
// The CSS adds --kb to .scroll's bottom padding, which creates the room to scroll into.
function syncKeyboardInset(){
  try{
    const vv=window.visualViewport;
    const kb=vv?Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop)):0;
    document.documentElement.style.setProperty('--kb',kb+'px');
    return kb;
  }catch(e){ return 0; }
}
// .scroll carries overflow-y:auto but is flex:1 inside a min-height:100vh .app, so it grows with
// its content and never actually scrolls — the page scrolls at the window level. Pick whichever
// ancestor genuinely has room to move.
function scrollerFor(el){
  let n=el&&el.parentElement;
  while(n&&n!==document.body&&n!==document.documentElement){
    const oy=getComputedStyle(n).overflowY;
    if((oy==='auto'||oy==='scroll')&&n.scrollHeight-n.clientHeight>1) return n;
    n=n.parentElement;
  }
  return window;
}
function keepAboveKeyboard(el){
  if(!el) return;
  const run=()=>{
    try{
      syncKeyboardInset();                       // make the room first…
      const vv=window.visualViewport;
      const top=vv?vv.offsetTop:0;
      const bottom=top+(vv?vv.height:window.innerHeight);
      const r=el.getBoundingClientRect();
      const over=r.bottom-(bottom-18);
      // …then scroll into it. 'auto', not 'smooth': a smooth scroll racing the keyboard
      // animation often never lands.
      if(over>0) scrollerFor(el).scrollBy({top:over,behavior:'auto'});
    }catch(e){}
  };
  // two passes: some Android keyboards report the resized viewport only after the animation
  setTimeout(run,300); setTimeout(run,650);
}
// Also react whenever the keyboard actually opens/resizes, not just on focus.
try{
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',function(){
      const a=document.activeElement;
      if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')) keepAboveKeyboard(a.closest('.q-type-in')||a);
      else syncKeyboardInset();   // keyboard closed → drop the extra padding again
    });
  }
}catch(e){}
function highlight(text,q){ if(!q)return text; const i=(text||'').toLowerCase().indexOf(q.toLowerCase()); if(i<0)return text; return <>{text.slice(0,i)}<mark className="hl">{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>; }

/* icons — Twemoji (CC-BY 4.0) supplied via window.MLICONS (app/mlicons.js) */
const mlic=(k)=> <span className="mlic" dangerouslySetInnerHTML={{__html:(window.MLICONS||{})[k]||''}}/>;
const IcCards=()=> mlic('cards');
const IcQuiz=()=> mlic('quiz');
const IcList=()=> mlic('book');
const IcInfo=()=> mlic('flask');
const IcGrid=()=> mlic('grid');
const TopicIcon=({tp})=> (tp&&tp.svg) ? <span className="tpi" dangerouslySetInnerHTML={{__html:tp.svg}}/> : null;
const IcSpeaker=()=> mlic('speaker');
const IcPin=()=> mlic('pin');
/* vocalized (menukad) form for display; falls back to plain hebrew. Search/audio/keys still use .hebrew */
const termLabel=t=> t&&(t.nikud||t.hebrew);

function TopicTag({topicKey}){ const tp=TBK[topicKey]; if(!tp)return null;
  return <span className="subj" style={{background:'transparent',border:'1px solid '+tp.accent,color:'var(--text-2)'}}>
    <span style={{width:8,height:8,borderRadius:'50%',background:tp.accent,display:'inline-block',marginInlineEnd:3}}></span><TopicIcon tp={tp}/> {tp.label}</span>; }
/* horizontal scroll row with click-to-scroll chevrons (RTL-aware); arrows show only when scrollable */
function Scroller({className,children}){
  const ref=useRef(null);
  const [start,setStart]=useState(true); const [end,setEnd]=useState(false);
  const update=useCallback(()=>{ const el=ref.current; if(!el) return; const max=el.scrollWidth-el.clientWidth; const sl=Math.abs(el.scrollLeft); setStart(sl<=4); setEnd(max<=4||sl>=max-4); },[]);
  useEffect(()=>{ update(); const el=ref.current; if(!el) return; el.addEventListener('scroll',update,{passive:true}); window.addEventListener('resize',update); const t=setTimeout(update,300); return ()=>{ el.removeEventListener('scroll',update); window.removeEventListener('resize',update); clearTimeout(t); }; },[update,children]);
  const page=(dir)=>{ const el=ref.current; if(!el) return; const rtl=getComputedStyle(el).direction==='rtl'; const amt=el.clientWidth*0.72; el.scrollBy({left:(rtl?-amt:amt)*dir}); };
  const chev=(d)=> <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return (<div className="scroller">
    <button className={`scroll-arrow right ${!start?'show':''}`} onClick={()=>page(-1)} aria-label="הקודם" tabIndex={-1}>{chev("M9 6l6 6-6 6")}</button>
    <div className={className} ref={ref}>{children}</div>
    <button className={`scroll-arrow left ${!end?'show':''}`} onClick={()=>page(1)} aria-label="הבא" tabIndex={-1}>{chev("M15 6l-6 6 6 6")}</button>
  </div>);
}
function TopicChips({value,onPick}){ return (<Scroller className="chips">
  <button className={`chip ${!value?'on':''}`} onClick={()=>onPick('')}>הכל</button>
  {TOPICS.map(t=>{const on=value===t.key; return <button key={t.key} className="chip" onClick={()=>onPick(on?'':t.key)} style={on?{background:t.primary,color:'#fff',borderColor:t.primary}:undefined}><TopicIcon tp={t}/> {t.label}</button>;})}
</Scroller>); }
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
    <button className="icon-toggle" onClick={onLogo} aria-label="אודות" title="אודות">ℹ️</button>
  </header>); }
function Nav({mode,setMode,tier,user}){ const T=[['glossary','מילון',IcList,'g'],['flashcards','כרטיסיות',IcCards,'f'],['quiz','מבחון',IcQuiz,'q'],['crossword','תשבץ',IcGrid,'x'],['profile','אזור אישי',null,'g']];
  return (<nav className="nav">{T.map(([m,label,Ic,c])=>(<button key={m} className={`tab ${c} ${mode===m?'on':''}`} onClick={()=>setMode(m)}>{!SL.canAccess(m==='crossword'?'crossword':'glossary',tier) && <span className="nav-lock">🔒</span>}{m==='profile'?<span className="nav-av">{user&&user.photoURL?<img src={user.photoURL} referrerPolicy="no-referrer" alt=""/>:'👤'}</span>:<Ic/>}{label}<div className="pipe"></div></button>))}</nav>); }

/* ---------- GLOSSARY ---------- */
function TermCard({t,q,fav,studied,onFav,onStudied,onOpenTerm}){
  const [open,setOpen]=useState(false);
  const isAlias=!!t.aliasOf; const canon=isAlias?SL.resolveEntry(t.hebrew,maps):t;
  const def=canon?canon.definition:t.definition; const long=(def||'').length>170; const shown=long&&!open?def.slice(0,170)+'…':def;
  return (<article className={`card ${studied?'studied':''}`}>
    <div className="card-top">
      <div><div className={`term ${onOpenTerm?'link':''}`} onClick={onOpenTerm?function(){onOpenTerm(t.hebrew);}:undefined}>{t.nikud?t.nikud:highlight(t.hebrew,q)}</div>{t.english&&<div className="en">{t.english}</div>}</div>
      <div className="acts">
        <button className="ibtn" onClick={()=>Speak2(t.hebrew,t.nikud)} title="הקראה" aria-label="הקראה"><IcSpeaker/></button>
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
    <Scroller className="letters"><button className={`let ${!letter?'on':''}`} style={{width:'auto',padding:'0 10px'}} onClick={()=>setLetter('')}>הכל</button>
      {HEB.map(l=>(<button key={l} className={`let ${letter===l?'on':''}`} disabled={!letterCounts[l]} onClick={()=>setLetter(letter===l?'':l)}>{l}</button>))}</Scroller>
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
function Flashcards({favorites,studied,toggleFav,toggleStudied,onKnow,tier,onNeedAll}){
  const lockTopics=tier==='free';
  const [deck,setDeck]=useState('all'); const [topic,setTopic]=useState(lockTopics?SL.FREE_TOPIC:''); const [i,setI]=useState(0); const [flip,setFlip]=useState(false);
  const pickTopic=next=>{ if(lockTopics && next!==SL.FREE_TOPIC){ onNeedAll&&onNeedAll(); return; } setTopic(next); };
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
    {lockTopics && <div className="free-hint" onClick={()=>onNeedAll&&onNeedAll()}>🔓 גרסה חינמית — נושא לדוגמה. הירשמו בחינם לכל 21 הנושאים</div>}
    <TopicChips value={topic} onPick={pickTopic}/>
    {cards.length===0
      ? <div className="empty"><div style={{fontSize:46}}>🎴</div><h3>אין כרטיסיות בערימה הזו</h3></div>
      : (<>
        <div className="prog"><span>{i+1} / {cards.length}</span><div className="bar"><i style={{width:`${((i+1)/cards.length)*100}%`}}></i></div></div>
        <div className={`fc ${flip?'flip':''}`} onClick={()=>setFlip(f=>!f)} onTouchStart={e=>tref.current=e.touches[0].clientX} onTouchEnd={onTouchEnd}>
          <div className="fc-inner">
            <div className="fc-face"><div className="fc-badge">{card.letter}</div><div className="fc-term">{termLabel(card)}</div>{card.english&&<div className="fc-en">{card.english}</div>}{card.topic&&<div style={{marginTop:12}}><TopicTag topicKey={card.topic}/></div>}<div className="fc-hint">↻ הקישו לתשובה</div></div>
            <div className="fc-face fc-back"><div className="fc-def">{card.definition}</div><div className="fc-hint">↻ הקישו לחזרה</div></div>
          </div>
        </div>
        <div className="fc-ctrl">
          <button className="fc-nav" onClick={prev} aria-label="הקודם">→</button>
          <button className="fc-nav" onClick={()=>Speak2(flip?card.definition:card.hebrew,flip?null:card.nikud)} aria-label="הקראה" title="הקראה"><IcSpeaker/></button>
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
function Quiz({studied,toggleStudied,favorites,recordAnswer,recordQuiz,fireConfetti,tier,onNeedAll,needTier}){
  const lockTopics=tier==='free';
  const [topic,setTopic]=useState(lockTopics?SL.FREE_TOPIC:''); const [len,setLen]=useState(10); const [hardOnly,setHardOnly]=useState(false);
  const [weakSpots,setWeakSpots]=useState(false); const [examMode,setExamMode]=useState(false); const [timeLeft,setTimeLeft]=useState(0);
  const fmtT=s=>Math.floor(Math.max(0,s)/60)+':'+String(Math.max(0,s)%60).padStart(2,'0');
  const pickTopic=next=>{ if(lockTopics && next!==SL.FREE_TOPIC){ onNeedAll&&onNeedAll(); return; } setTopic(next); };
  const [quiz,setQuiz]=useState(null); const [qi,setQi]=useState(0);
  const [answered,setAnswered]=useState(false); const [chosen,setChosen]=useState(null);
  const [typed,setTyped]=useState(''); const [score,setScore]=useState(0); const [spark,setSpark]=useState(false);
  const pool=useMemo(()=>{let p=SL.eligibleTerms(GLOSSARY,maps); if(topic)p=p.filter(t=>t.topic===topic); if(weakSpots)p=p.filter(t=>favorites.includes(t.hebrew)||!studied.includes(t.hebrew)); else if(hardOnly)p=p.filter(t=>favorites.includes(t.hebrew)); return p;},[topic,hardOnly,weakSpots,favorites,studied]);
  const start=()=>{const L=Math.min(len,pool.length);setQuiz(buildQuiz(pool,L));setQi(0);setAnswered(false);setChosen(null);setTyped('');setScore(0);setTimeLeft(examMode?L*15:0);};
  const item=quiz&&quiz[qi];
  const grade=ok=>{ recordAnswer(ok); if(ok){ setScore(s=>s+1); setSpark(true); setTimeout(()=>setSpark(false),700); Snd.success(); if(!studied.includes(item.term.hebrew))toggleStudied(item.term.hebrew); } else { Snd.wrong(); } };
  const answerMC=opt=>{if(answered)return;setChosen(opt);setAnswered(true);grade(opt.correct);};
  const answerType=()=>{if(answered)return;const ok=SL.checkAnswer(item,typed,maps);setAnswered(true);setChosen({correct:ok});grade(ok);};
  const nextQ=()=>{ if(qi+1>=quiz.length){ recordQuiz(score,quiz.length); if(score===quiz.length&&quiz.length>0){fireConfetti();Snd.fanfare();} setQi(quiz.length); return; } setQi(qi+1);setAnswered(false);setChosen(null);setTyped(''); };
  // exam-mode countdown: when time runs out, jump to results with the current score
  useEffect(()=>{ if(!examMode||!quiz||qi>=quiz.length) return; if(timeLeft<=0){ recordQuiz(score,quiz.length); setQi(quiz.length); return; } const id=setTimeout(()=>setTimeLeft(t=>t-1),1000); return ()=>clearTimeout(id); },[examMode,quiz,qi,timeLeft]); // eslint-disable-line
  if(!quiz) return (<>
    <div className="hero"><h1>מבחון</h1><p>בחירה מרובה · השלמת מושג · בדיקה עצמית</p></div>
    {/* smart default: a ready-to-go quiz, so nobody has to fill a form first */}
    <div className="quickstart">
      <div className="qs-txt"><b>מבחון מוכן לכם</b><span>{len} שאלות · {topic||'כל הנושאים'}{hardOnly?' · לחזרה בלבד':''}{weakSpots?' · חזרה ממוקדת':''}{examMode?' · מצב בחינה':''}</span></div>
      <button className="btn btn-accent" onClick={start} disabled={pool.length<3}>יאללה ←</button>
    </div>
    <p className="qs-or">או שנו את ההגדרות לפי הטעם שלכם:</p>
    <div className="setup">{lockTopics && <div className="free-hint" onClick={()=>onNeedAll&&onNeedAll()}>🔓 גרסה חינמית — נושא לדוגמה. הירשמו בחינם לכל 21 הנושאים</div>}<h2>בחרו נושא</h2><TopicChips value={topic} onPick={pickTopic}/>
      <div style={{margin:'12px 0'}}><button className={`chip ${hardOnly?'on':''}`} onClick={()=>setHardOnly(h=>!h)} style={hardOnly?{background:'var(--coral-500)',color:'#fff',borderColor:'var(--coral-700)'}:undefined}><IcPin/> מושגים לחזרה בלבד ({favorites.length})</button></div>
      <div style={{margin:'0 0 12px',display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className={`chip ${weakSpots?'on':''}`} onClick={()=>{ if(!weakSpots){ if(!needTier('weakspots'))return; setHardOnly(false);} setWeakSpots(w=>!w); }} style={weakSpots?{background:'var(--accent-strong)',color:'#fff',borderColor:'var(--accent-strong)'}:undefined}>🎯 חזרה ממוקדת</button>
        <button className={`chip ${examMode?'on':''}`} onClick={()=>{ if(!examMode && !needTier('exam'))return; setExamMode(e=>!e); }} style={examMode?{background:'var(--accent-strong)',color:'#fff',borderColor:'var(--accent-strong)'}:undefined}>⏱️ מצב בחינה</button>
      </div>
      <h2>מספר שאלות</h2>
      <div className="seg">{[5,10,15,20].map(n=>(<button key={n} className={`chip ${len===n?'on':''}`} onClick={()=>setLen(n)}>{n}{n===10&&<i className="rec">מומלץ</i>}</button>))}</div>
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
    <div className="q-top"><span>שאלה {qi+1} / {quiz.length}</span><div className="bar"><i style={{width:`${(qi/quiz.length)*100}%`}}></i></div><span className="q-score">{examMode?<span className={timeLeft<=15?'q-time-low':''}>⏱️ {fmtT(timeLeft)}</span>:`${score} ✓`}</span></div>
    <span className="q-kind">{item.kind==='pick-definition'?'בחרו את ההגדרה הנכונה':item.kind==='pick-term'?'בחרו את המושג הנכון':'הקלידו את המושג'}</span>
    <div className="q-q">{item.kind==='pick-definition'?<>מהי <span className="hl mnk">{termLabel(item.term)}</span>?</>:item.prompt}</div>
    <button className="chip" onClick={()=>Speak2(item.kind==='pick-definition'?item.term.hebrew:item.prompt, item.kind==='pick-definition'?item.term.nikud:null)} style={{marginBottom:10}} aria-label="הקראה"><IcSpeaker/> הקראה</button>
    {item.kind==='type-answer'
      ? (<><div className="q-type-in"><input value={typed} onChange={e=>setTyped(e.target.value)} disabled={answered} placeholder="הקלידו את המושג…"
          enterKeyHint="done" autoComplete="off" autoCorrect="off"
          onFocus={e=>keepAboveKeyboard(e.target.closest('.q-type-in'))}
          onKeyDown={e=>e.key==='Enter'&&answerType()}/>{!answered&&<button className="btn btn-accent" onClick={answerType}>בדיקה</button>}</div>
        {answered && (chosen.correct?<div className="fb ok">🎉 נכון! {termLabel(item.term)}</div>:<div className="fb no">✗ התשובה: {termLabel(item.term)}</div>)}</>)
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

/* ---------- ABOUT: content mirrored from medilabacademy.com ---------- */
const SITE='https://medilabacademy.com';
const CLASSROOM=[
  {src:'classroom-1.webp',alt:'שיעור על מבנה ה-DNA בכיתה'},
  {src:'classroom-2.webp',alt:'תלמידים בחלוקי מעבדה בפעילות בחוץ'},
  {src:'classroom-3.webp',alt:'תמונת סוף שנה עם הכיתה'},
  {src:'classroom-4.webp',alt:'עבודה בקבוצות בשיעור'},
  {src:'classroom-5.webp',alt:'הרצאה מול הכיתה'},
  {src:'classroom-6.webp',alt:'חגיגת סיום שנה'}
];
// Quotes are verbatim excerpts from medilabacademy.com; photos come from the same cards there,
// so a face is never paired with the wrong name.
const TESTIMONIALS=[
  {n:'תהל ח׳',g:85,img:'rec-tahel.jpg',t:'בתחילת כיתה י״א הגעתי לכיתה של נתנאל. ביולוגיה הרגישה לי כמו שפה זרה, והמבחן הראשון שלי נגמר ב-40. החלטתי שאני שונאת את זה — אבל נתנאל לא הסכים. השלמנו ביחד יותר משנה של פערים. הוא היה איתי גם כשרציתי לוותר, האמין בי והזכיר לי שאני מסוגלת.'},
  {n:'אמלי ס׳',g:88,img:'rec-emily.jpg',t:'נתנאל היה הרבה מעבר למורה עבורי. כשהיה לי קשה בלימודים, הוא תמיד דאג להבין מה הקושי האמיתי, ולהתאים את העזרה למה שאני צריכה באותו רגע. בלי העזרה המקצועית שלו לא הייתי מגיעה לציון שהגעתי אליו, ובלי האמונה שלו לא הייתי נמצאת במקום שאליו שאפתי להגיע.'},
  {n:'יונתן מ׳',g:89,img:'rec-yonatan.jpg',t:'נתנאל תמיד דאג לי כמורה — שאני אצליח בצורה הכי טובה שאפשר. הסביר את החומר בצורה הכי ברורה, ותמיד ענה על שאלות גם מחוץ לשיעור. אצל נתנאל באמת אפשר להגיד: מי שרצה — הצליח. הוא דאג לנו גם לימודית וגם אישית.'},
  {n:'שון ס׳',g:95,img:'rec-shon.jpg',t:'נתנאל מורה מעולה — גם בצורה שהוא מביא את הלימודים באופן נגיש עם דוגמאות מהעולם האמיתי להבנה עמוקה, וגם בגישה החיובית שלו. מעבר לחומר, הוא מורה שאוהב להרחיב את הידע, ומצית אהבה אצל התלמידים למדעים וביולוגיה בפרט.'},
  {n:'איתן ו׳',g:97,img:'rec-eitan.jpg',t:'נתנאל הוא הרבה יותר מסתם מורה, הוא המורה הטוב ביותר שזכיתי ללמוד אצלו. היכולת להפוך כל שיעור לחוויה היא נדירה, והוא דואג להעמיק ולהרחיב הרבה מעבר לתוכנית הלימודים — מתוך תשוקה אמיתית לידע. כשתלמיד שואל שאלה, הוא חוקר לעומק ומחזיר תשובה מפורטת וברורה.'},
  {n:'רוני ב׳',g:98,img:'rec-roni.jpg',t:'נתנאל הוא מורה מיוחד ולא שגרתי. מעורר השראה, נותן יחס אישי לכל תלמיד ומאמין בכולם. יודע למצוא את הדימוי המדויק שמסביר גם נושאים מורכבים, ומעביר שיעורים בצחוק ובחן. דורש מכל אחד את המקסימום ודוחף לקצה היכולת, כי ההצלחה שלנו חשובה לו.'},
  {n:'דניאלה ק׳',g:98,img:'rec-daniela.jpg',t:'נתנאל מורה מעורר השראה בכמות תשומת הלב שהפגנת כלפי כל קושי שתלמידים חוו, ועזרת לנווט אותם להצלחה במבחנים. תמיד היה חשוב לך להרחיב את האופקים ולהציג את התוכן בביולוגיה בצורה הכי מעניינת — מצגות מרתקות, מחקרים וניסויים מדהימים.'},
  {n:'נועה א׳',g:100,img:'rec-noa.jpg',t:'אם הייתם אומרים לי בתחילת כיתה י׳ שלא רק שאסיים בציון מעולה אלא גם אתאהב במקצוע, לא הייתי מאמינה. נתנאל הפך את המקצוע מתחום אפור ומשעמם למקצוע הכי מעניין שלמדתי בתיכון.'},
  {n:'יולי א׳',g:100,img:'rec-yuli.jpg',t:'נתנאל תמיד היה לי לאוזן קשבת, ולימוד איתו השאיר עליי חותם אמיתי. קשוב, סבלני, בגובה העיניים — והיה מוכן לעצור ולהסביר שוב, גם מיליון פעם בדרכים שונות. ביולוגיה היה בין השיעורים היחידים שאהבתי, והוא הסיבה לכך.'}
];
// Auto-scrolling strip. The list is rendered twice so the loop is seamless; the second copy is
// hidden from assistive tech. Motion pauses on hover, on the button, and for
// prefers-reduced-motion — WCAG 2.2.2 needs a way to stop anything that moves for over 5s.
function Testimonials(){
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    try{ if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true); }catch(e){}
  },[]);
  const items=TESTIMONIALS.concat(TESTIMONIALS);
  return (<div className="marq-wrap">
    <div className={'marq'+(paused?' paused':'')}>
      <div className="marq-track">
        {items.map((t,i)=>{ const dup=i>=TESTIMONIALS.length;
          return (<figure className="tst" key={i} aria-hidden={dup||undefined}>
            <blockquote>{t.t}</blockquote>
            <figcaption>
              <img className="tst-av" src={t.img} alt={dup?'':t.n} loading="lazy" width="38" height="38"/>
              <span className="tst-n">{t.n}</span>
              <span className="tst-g">{t.g}</span>
            </figcaption>
          </figure>);
        })}
      </div>
    </div>
    <button className="marq-btn" onClick={()=>setPaused(p=>!p)} aria-pressed={paused}>
      {paused?'▶ להמשך הגלילה':'⏸ לעצירה'}
    </button>
  </div>);
}
// 5s per photo. Honours prefers-reduced-motion: an auto-advancing carousel is exactly the
// kind of motion that setting exists to stop, so there we show one photo and let the dots drive.
function Classroom(){
  const [i,setI]=useState(0);
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    let reduce=false;
    try{ reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
    if(reduce||paused) return;
    const id=setInterval(()=>setI(n=>(n+1)%CLASSROOM.length),5000);
    return ()=>clearInterval(id);
  },[paused]);
  return (<div className="cr-wrap">
    <div className="cr-stage" onClick={()=>setPaused(p=>!p)} title={paused?'המשך':'עצירה'}>
      {CLASSROOM.map((s,n)=>(
        <img key={s.src} src={s.src} alt={s.alt} loading="lazy"
             className={'cr-img'+(n===i?' on':'')} aria-hidden={n!==i}/>
      ))}
    </div>
    <div className="cr-dots">{CLASSROOM.map((s,n)=>(
      <button key={n} className={'cr-dot'+(n===i?' on':'')} onClick={()=>setI(n)}
              aria-label={'תמונה '+(n+1)+' מתוך '+CLASSROOM.length}/>
    ))}</div>
  </div>);
}
function About(){
  return (<>
    <div className="hero"><h1>אודות</h1><p>נתנאל יוחאי מדינה · מורה לביולוגיה ולביוטכנולוגיה</p></div>
    <div className="about-hero"><img className="portrait" src="portrait.jpg" alt="נתנאל מדינה"/>
      <div><div className="about-kicker">שיעורים פרטיים · 5 יח״ל · ביוטכנולוגיה 10 יח״ל</div><div className="about-name">נעים להכיר — נתנאל 👋</div></div></div>
    <p className="about-body">מורה לביולוגיה ולביוטכנולוגיה עם <b>10 שנות ניסיון בהכנה לבגרות</b> בביולוגיה (5 יח״ל) ובביוטכנולוגיה (10 יח״ל).</p>
    <p className="about-body"><b>שיעורים אחד-על-אחד או בקבוצות קטנות</b> — מקוון בזום או פרונטלי במרכז ״כיוונים״ באשדוד. שיחת היכרות ראשונה תמיד על חשבוני. 📈</p>
    <div className="quote">״אני מאמין שלכל תלמיד יש דרך משלו להבין, והתפקיד שלי הוא למצוא אותה.״</div>
    <div className="stat-row">
      <div className="stat-box"><b>94</b><span>ציון ממוצע</span></div>
      <div className="stat-box"><b>100</b><span>הציון הגבוה</span></div>
      <div className="stat-box"><b>10+</b><span>שנות ניסיון</span></div>
    </div>
    <div className="degrees">
      <div className="degree"><span className="tag">B.Sc</span><div><b>ביולוגיה</b><span>אוניברסיטת חיפה</span></div></div>
      <div className="degree"><span className="tag">M.Teach</span><div><b>הוראת ביולוגיה</b><span>מכללת אורנים</span></div></div>
      <div className="degree"><span className="tag">M.Sc</span><div><b>הוראת המדעים</b><span>מכון ויצמן למדע</span></div></div>
    </div>

    <h2 className="sec-title">הלומדה המלאה 🎓</h2>
    <p className="sec-sub">שליפים הוא המונחון. באתר מחכה כל השאר.</p>
    <div className="lomda">
      <p>כל תת-נושא מקבל דרגת שליטה שעולה רק מתשובות נכונות על שאלות בגרות אמיתיות — כך רואים בדיוק מה עוד לא סגור, במקום להרגיש שקראתם.</p>
      <div className="lomda-stats">
        <div><b>893</b><span>שאלות בגרות אמיתיות</span></div>
        <div><b>24</b><span>פרקים · 3 קורסי ליבה</span></div>
        <div><b>1971–2025</b><span>שנות מועדים</span></div>
      </div>
      <ul className="lomda-list">
        <li>הסבר לכל תשובה — נכונה או שגויה — שמראה איפה בדיוק נפלתם</li>
        <li>שלושה רמזים מדורגים בכל שאלה שנתקעתם בה</li>
        <li>שאלה אישית למורה על כל שאלה, עם תשובה בדרך כלל באותו יום</li>
        <li>מפת מסע אישית ב-24 פרקים, ומדליה על כל פרק שנסגר</li>
      </ul>
      <a className="btn btn-accent lomda-cta" href={SITE+'/start'} target="_blank" rel="noopener">14 יום חינם, בלי כרטיס אשראי ←</a>
    </div>

    <h2 className="sec-title">מה תלמידים כותבים 💬</h2>
    <p className="sec-sub">הציון שקיבלו בבגרות מופיע לצד השם</p>
    <Testimonials/>

    <h2 className="sec-title">רגעים מהכיתה 📸</h2>
    <p className="sec-sub">עשר שנים של שיעורים, מעבדות וסופי שנה</p>
    <Classroom/>

    <h2 className="sec-title">שלושת הספרים שכתבתי 📚</h2><p className="sec-sub">מותאמים לתוכנית הלימודים תשפ״ו · מנוקדים, מאוירים, נגישים</p>
    <div className="books">
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-questions.jpg" alt="כריכת ספר השאלות" loading="lazy"/><div><span className="tag">מהדורה II</span><h4>ספר השאלות</h4><p>1,706 שאלות בגרות, לפי נושא ותת-נושא.</p><span className="price">₪149</span></div></a>
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-research.jpg" alt="כריכת קטעי מחקר" loading="lazy"/><div><span className="tag">פורמט בגרות</span><h4>קטעי מחקר</h4><p>50 קטעים בפורמט בגרות, עם פתרונות מלאים.</p><span className="price">₪95</span></div></a>
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-glossary.jpg" alt="כריכת המונחון" loading="lazy"/><div><span className="tag">תשפ״ו · 2026</span><h4>מונחון</h4><p>452 מושגים מנוקדים, בדפוס.</p><span className="price">₪69</span></div></a>
    </div>
    <p className="sec-sub" style={{textAlign:'center',marginTop:10}}>
      פרק לדוגמה חינם מכל ספר · <a href={SITE+'/shop'} target="_blank" rel="noopener">לכל הספרים באתר ←</a>
    </p>
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
    <p className="sec-sub" style={{textAlign:'center',marginTop:8}}>א׳—ה׳ · 10:00—21:00</p>
    <div style={{textAlign:'center',marginTop:14}}><a className="btn btn-ghost" href={SITE} target="_blank" rel="noopener" style={{textDecoration:'none'}}>לאתר המלא ←</a></div>
    <p className="credit">אייקונים: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> · רישיון CC-BY 4.0</p>
    <div className="legal-links">
      <a href="legal.html#terms" target="_blank" rel="noopener">תנאי שימוש</a>
      <a href="legal.html#privacy" target="_blank" rel="noopener">מדיניות פרטיות</a>
      <a href="legal.html#accessibility" target="_blank" rel="noopener">הצהרת נגישות</a>
      <a href="legal.html#refund" target="_blank" rel="noopener">ביטולים והחזרים</a>
    </div>
    <p className="credit">© 2026 MediLab · נתנאל יוחאי מדינה · כל הזכויות שמורות</p>
  </>);
}

/* ---------- PROFILE / STATS / ACHIEVEMENTS ---------- */
function Ring({pct,color}){ const r=34,c=2*Math.PI*r,off=c*(1-pct/100);
  return (<svg width="84" height="84" viewBox="0 0 84 84" className="ring"><circle cx="42" cy="42" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9"/><circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 42 42)"/><text x="42" y="48" textAnchor="middle" fontFamily="Secular One" fontWeight="800" fontSize="20" fill="var(--text)">{pct}%</text></svg>); }
// Honest head start: step 1 is genuinely complete — you are looking at the app right now.
function Journey({m}){
  const steps=[
    {t:'פתחתם את שליפים', done:true},
    {t:'מושג ראשון', done:m.studied>=1},
    {t:'10 מושגים', done:m.studied>=10},
    {t:'מבחון ראשון', done:m.quizzes>=1},
    {t:'נושא שלם', done:m.topicsCompleted>=1}
  ];
  const done=steps.filter(s=>s.done).length;
  const next=steps.find(s=>!s.done);
  return (<div className="journey">
    <div className="jr-head"><b>המסע שלכם לבגרות</b><span>{done}/{steps.length}</span></div>
    <div className="jr-track">{steps.map((s,i)=>(<div key={i} className={`jr-step ${s.done?'on':''}`}><i>{s.done?'✓':i+1}</i><span>{s.t}</span></div>))}</div>
    {next && <p className="jr-next">היעד הבא: <b>{next.t}</b> — כמעט שם 💪</p>}
  </div>);
}
function Profile({user,studied,favorites,stats,sync,signIn,signOut,onTopic,muted,toggleSound,tier}){
  const m=metrics(studied,favorites,stats);
  const earned=earnedIds(m); const earnedSet={}; earned.forEach(id=>earnedSet[id]=1);
  const goal=nextGoal(m.studied,TOTAL);
  const goalPct=Math.min(100,Math.round(m.studied/goal*100));
  const pct=Math.round(m.studied/TOTAL*100); const acc=Math.round(m.accuracy*100);
  const perTopic=TOPICS.map(t=>({t,total:topicTotals[t.key]||0,done:studied.filter(h=>topicOf[h]===t.key).length})).filter(x=>x.total>0);
  return (<>
    <div className="hero"><h1>אזור אישי</h1></div>
    <div className="prof-card">
      <div className="av">{user&&user.photoURL?<img src={user.photoURL} referrerPolicy="no-referrer" alt=""/>:'👤'}</div>
      <div className={`tier-badge tier-${tier}`}>{tier===SL.TIER.PAID?'מסלול בגרות ✓':tier===SL.TIER.REGISTERED?'מסלול הרשמה':'אורח'}</div>
      {user ? (<><div className="prof-name">{user.displayName||'תלמיד/ה'}</div><div className="prof-email">{user.email}</div>
        {sync && <div style={{marginTop:8}}><span className="sync-pill">{sync==='syncing'?'מסנכרן…':sync==='synced'?'✓ מסונכרן':'שגיאת סנכרון'}</span></div>}
        <button className="signout" onClick={signOut}>התנתק</button></>)
        : (<><div className="prof-name">לימוד כאורח</div><div className="sync-note">התחברו עם Google כדי לסנכרן התקדמות, הישגים וסטטיסטיקה בין כל המכשירים.</div>
          <button className="google-btn" style={{marginTop:12}} onClick={signIn}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.8 45 31 45 24z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17 2 20.4 2 24s1 7 2.5 9.9l7.3-5.7z"/><path fill="#EA4335" d="M24 11.5c3.2 0 6 1.1 8.3 3.2l6.2-6.2C34.9 5 29.9 3 24 3 15.4 3 8.1 7.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/></svg>
            התחברות עם Google</button></>)}
    </div>
    <Journey m={m}/>
    <div className="prof-card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'right',padding:'14px 16px'}}>
      <span style={{fontWeight:700}}><IcSpeaker/> צלילי משוב</span>
      <button className="chip" onClick={toggleSound} style={muted?undefined:{background:'var(--green-500)',color:'#fff',borderColor:'var(--green-700)'}}>{muted?'כבוי 🔇':'דלוק 🔊'}</button>
    </div>
    <div className="ring-wrap"><Ring pct={goalPct} color="#3FA9D6"/><div className="mini-stats">
      <div className="stat-box"><b>{m.studied}/{goal}</b><span>ליעד הקרוב</span></div>
      <div className="stat-box"><b>{m.hard}</b><span><IcPin/> לחזרה</span></div>
    </div></div>
    <p className="goal-note">{m.studied<goal
      ? <>עוד <b>{goal-m.studied}</b> מושגים והיעד נסגר · בסך הכול {m.studied} מתוך {TOTAL} ({pct}%)</>
      : <>סיימתם את כל {TOTAL} המושגים 🎉</>}</p>
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
    <p className="sec-sub" style={{marginTop:2}}>כל גביע נעול מראה בדיוק מה צריך לעשות כדי להשיג אותו</p>
    <div className="ach-grid">{ACH.map(a=>{
      const on=!!earnedSet[a.id];
      let have=0,need=0,pct=0,showBar=false;
      if(!on && a.prog){ const p=a.prog(m)||[0,0]; need=p[1]||0; have=Math.max(0,Math.min(p[0]||0,need)); pct=need?Math.round(have/need*100):0; showBar=need>1; }
      return (<div key={a.id} className={`ach ${on?'on':''}`}>
        <span className="em">{a.emoji}</span>
        <div className="ach-txt">
          <span className="t">{a.title}</span>
          <span className="d">{on?a.desc:a.todo}</span>
          {showBar && <><span className="ach-bar"><i style={{width:pct+'%'}}></i></span><span className="ach-n">{have} מתוך {need}</span></>}
        </div>
      </div>);
    })}</div>
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
      <div className="od-term">{termLabel(t)} <button className="ibtn" style={{display:'inline-flex',width:34,height:34,verticalAlign:'middle'}} onClick={()=>Speak2(t.hebrew,t.nikud)} aria-label="הקראה"><IcSpeaker/></button></div>
      {t.english&&<div className="en">{t.english}</div>}
      {t.topic&&<div style={{marginTop:6}}><TopicTag topicKey={t.topic}/></div>}
      <div className="od-sec">מהי <b>{termLabel(t)}</b>? בחרו את ההגדרה הנכונה:</div>
      {opts.map((o,i)=>{ let cls='opt'; if(sel){ if(o.correct)cls+=' correct'; else if(sel===o)cls+=' wrong'; }
        return <button key={i} className={cls} disabled={!!sel} onClick={()=>answer(o)}><span className="mk">{sel&&o.correct?'✓':String.fromCharCode(1488+i)}</span><span>{o.text}</span></button>; })}
      {sel && <div className={`fb ${sel.correct?'ok':'no'}`}>{sel.correct?'🎉 כל הכבוד! ידעת את המושג':'אל דאגה — ההגדרה הנכונה מסומנת בירוק'}</div>}
      {sel && <button className="btn btn-accent" style={{width:'100%',marginTop:12}} onClick={onClose}>סגירה</button>}
    </div>
  </div>);
}

/* ---------- APP ---------- */
function SignUpGate({onClose,onSignIn,studied,favorites}){
  const built=(studied||0)+(favorites||0);
  return (<div className="overlay" onClick={onClose}><div className="sheet-card gate-card" onClick={e=>e.stopPropagation()}>
    <div className="gate-emoji">{built>0?'💾':'🔑'}</div>
    <h3>{built>0?'אל תאבדו את מה שבניתם':'הירשמו בחינם כדי לפתוח'}</h3>
    {built>0 && <div className="gate-built">
      <div><b>{studied}</b><span>מושגים שלמדתם</span></div>
      <div><b>{favorites}</b><span>מושגים שסימנתם</span></div>
    </div>}
    {built>0 && <p className="gate-loss">ההתקדמות הזו שמורה <b>רק במכשיר הזה</b>. ניקוי הדפדפן או מעבר לטלפון אחר — והכול נעלם.</p>}
    <p>{built>0
      ? 'חשבון חינמי שומר הכול בענן, ובנוסף פותח את כל מצבי התרגול וההקראה.'
      : 'המילון פתוח לכם בחינם וללא הרשמה. חשבון חינמי מוסיף את כל מצבי התרגול, ההקראה, מעקב ההתקדמות והסנכרון בין המכשירים.'}</p>
    <button className="google-btn" onClick={onSignIn}>המשך עם Google</button>
    <p className="gate-fine">חינם לחלוטין · בלי סיסמה · פחות מ‑10 שניות</p>
    <button className="btn btn-ghost" onClick={onClose}>אולי אחר כך</button>
  </div></div>);
}
function Paywall({onClose,user,onSignIn}){
  const wa=txt=>'https://wa.me/972524295838?text='+encodeURIComponent(txt);
  return (<div className="overlay" onClick={onClose}><div className="sheet-card gate-card" onClick={e=>e.stopPropagation()}>
    <div className="gate-emoji">⭐</div>
    <h3>מסלול הבגרות</h3>
    <p>התשבץ וכלי בגרות מתקדמים נוספים.</p>
    <div className="anchor-row">
      <div className="anchor-item"><span>שלושת ספרי העזר המודפסים</span><b className="num-ltr">₪313</b></div>
      <div className="anchor-item"><span>ספר השאלות בלבד</span><b className="num-ltr">₪149</b></div>
    </div>
    <p className="anchor-lead">ומסלול הבגרות באפליקציה, לשנה שלמה:</p>
    {!user && <p className="paywall-note">כדי לשמור את המנוי צריך תחילה חשבון:</p>}
    {!user && <button className="google-btn" onClick={onSignIn}>התחברו עם Google</button>}
    <div className="plans">
      <a className="plan" href={wa('אשמח לרכוש מנוי חודשי (₪4.99) בשליפים')} target="_blank" rel="noopener">
        <div className="plan-per num-ltr">₪4.99</div><div className="plan-unit">לחודש</div>
        <div className="plan-year">₪59.88 לשנה</div>
      </a>
      <a className="plan plan-best" href={wa('אשמח לרכוש מנוי שנתי (₪23.99) בשליפים')} target="_blank" rel="noopener">
        <div className="plan-badge">המשתלם ביותר</div>
        <div className="plan-per num-ltr">₪1.99</div><div className="plan-unit">לחודש</div>
        <div className="plan-year">חיוב שנתי ₪23.99 · חוסכים ₪35.89</div>
      </a>
    </div>
    <p className="paywall-note" style={{marginTop:12}}>התשלום ייפתח בקרוב — כרגע לרכישה מוקדמת דרך הקישורים.</p>
    <button className="btn btn-ghost" onClick={onClose}>סגירה</button>
  </div></div>);
}
function App(){
  const [mode,setMode]=useState('glossary');
  const [glossaryTopic,setGlossaryTopic]=useState('');
  const changeMode=m=>{ if(m==='crossword' && !needTier('crossword')) return; if(m==='glossary')setGlossaryTopic(''); setMode(m); };
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
  const [entitlement,setEntitlement]=useState(null); const [gate,setGate]=useState(null);
  const tier=useMemo(()=>SL.tierOf(user,entitlement,Date.now()),[user,entitlement]);
  // Returns true if the feature is accessible; otherwise opens the right gate and returns false.
  function needTier(feature){ if(SL.canAccess(feature,tier)) return true; setGate((SL.FEATURE_MIN[feature]||0)>=2?'paywall':'signup'); return false; }
  useEffect(()=>{ _audioLocked=!SL.canAccess('audio',tier); _onAudioLock=()=>setGate('signup'); },[tier]);
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
    if(fresh.length){ const a=ACH.find(x=>x.id===fresh[0]); if(a){ setNewAch(a); setConfetti(true); Snd.trophy();
      setTimeout(()=>setNewAch(null),3600); setTimeout(()=>setConfetti(false),1900); } setAchieved(prev=>uniq([...prev,...earned])); }
  },[studied,favorites,stats]); // eslint-disable-line

  // firebase sync
  const saveUserData=useCallback(async(uid)=>{ if(!db||!auth.currentUser)return; setSync('syncing');
    try{ await db.collection('users').doc(uid).set({displayName:auth.currentUser.displayName,email:auth.currentUser.email,photoURL:auth.currentUser.photoURL,favorites,studied,stats,achieved,lastSync:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); setSync('synced'); setTimeout(()=>setSync(''),1500); }
    catch(e){ console.error(e); setSync('error'); } },[favorites,studied,stats,achieved]);
  useEffect(()=>{ if(!auth)return;
    if(auth.getRedirectResult){ auth.getRedirectResult().catch(function(e){ if(e&&e.code&&e.code!=='auth/no-auth-event') console.warn('sign-in redirect:',e.code); }); }
    const unsub=auth.onAuthStateChanged(async(u)=>{ setUser(u); setEntitlement(null); // clear first; re-fetch below for a signed-in user (avoids stale paid on account switch)
    if(u&&db){ setSync('syncing');
      try{ const eDoc=await db.collection('entitlements').doc(u.uid).get(); setEntitlement(eDoc.exists?eDoc.data():null); }catch(e){ setEntitlement(null); }
      try{ const doc=await db.collection('users').doc(u.uid).get();
        if(doc.exists){ const d=doc.data(); loadingRef.current=true;
          // UNION, never replace. Overwriting local with the cloud copy silently destroyed every
          // term studied as a guest (or offline since the last sync) the moment you signed in —
          // the opposite of what the sign-up gate promises. stats/achieved already merged; these
          // two did not.
          setFav(prev=>uniq([...(d.favorites||[]),...prev]));
          setStudied(prev=>uniq([...(d.studied||[]),...prev]));
          if(d.stats)setStats(s=>mergeStats(s,d.stats)); if(d.achieved)setAchieved(prev=>uniq([...prev,...d.achieved]));
          setTimeout(()=>{loadingRef.current=false;},600); setSync('synced'); setTimeout(()=>setSync(''),1500); }
        else { await db.collection('users').doc(u.uid).set({displayName:u.displayName,email:u.email,photoURL:u.photoURL,favorites,studied,stats,achieved,lastSync:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); setSync('synced'); setTimeout(()=>setSync(''),1500); }
      }catch(e){ console.error(e); setSync('error'); } }
  }); return unsub; },[]);
  useEffect(()=>{ if(user&&!loadingRef.current)saveUserData(user.uid); },[favorites,studied,stats,achieved]); // eslint-disable-line

  const signIn=async()=>{ if(!auth){alert('אין חיבור לאינטרנט');return;}
    try{
      // Popup returns the credential to the app via postMessage (same-origin), so it works
      // even under browser storage partitioning. signInWithRedirect is NOT used as the primary
      // path because our app origin (github.io) differs from authDomain (firebaseapp.com):
      // after the redirect the partitioned auth result can't be read back and the user stays
      // signed-out ("guest"). Redirect stays only as a last-resort fallback if a popup is blocked.
      await auth.signInWithPopup(googleProvider);
    }catch(e){
      const c=e&&e.code;
      if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request') return;   // user cancelled — no error
      if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment'){
        try{ await auth.signInWithRedirect(googleProvider); return; }catch(e2){ alert('שגיאת התחברות: '+(e2.message||e2)); return; }
      }
      alert('שגיאת התחברות: '+(e.message||e));
    } };
  const signOut=async()=>{
    // Flush everything to the account BEFORE dropping the session. Without this, progress made
    // since the last write lives only on this device and never follows the user to the next one.
    try{ if(db&&auth.currentUser) await saveUserData(auth.currentUser.uid); }catch(e){}
    loadingRef.current=true; setEntitlement(null);
    try{ await auth.signOut(); }catch(e){}
    setUser(null); setTimeout(()=>{loadingRef.current=false;},600);
  };

  const dm=(mode==='glossary'||mode==='flashcards'||mode==='quiz')?mode:'glossary';
  return (
    <div className="app" data-mode={dm}>
      {confetti && <Confetti/>}
      {newAch && <div className="ach-toast"><span className="em">{newAch.emoji}</span><div><b>הישג חדש! {newAch.title}</b><span>{newAch.desc}</span></div></div>}
      <Header pinCount={favorites.length} dark={dark} setDark={setDark} user={user} onProfile={()=>setMode('profile')} onReview={()=>setMode('review')} onLogo={()=>setMode('about')}/>
      <div className="scroll">
        <div className="view" key={mode}>
          {mode==='glossary' && <Glossary key={glossaryTopic} initialTopic={glossaryTopic} favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied} onOpenTerm={openTerm}/>}
          {mode==='flashcards' && <Flashcards favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied} onKnow={openVerify} tier={tier} onNeedAll={()=>needTier('practice-all')}/>}
          {mode==='quiz' && <Quiz studied={studied} toggleStudied={toggleStudied} favorites={favorites} recordAnswer={recordAnswer} recordQuiz={recordQuiz} fireConfetti={fireConfetti} tier={tier} onNeedAll={()=>needTier('practice-all')} needTier={needTier}/>}
          {mode==='crossword' && <Crossword dark={dark}/>}
          {mode==='review' && <ReviewList favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied} goQuiz={()=>setMode('quiz')} onOpenTerm={openTerm}/>}
          {mode==='about' && <About/>}
          {mode==='profile' && <Profile user={user} studied={studied} favorites={favorites} stats={stats} sync={sync} signIn={signIn} signOut={signOut} onTopic={openTopic} muted={muted} toggleSound={toggleSound} tier={tier}/>}
        </div>
      </div>
      <Nav mode={mode} setMode={changeMode} tier={tier} user={user}/>
      {gate==='signup' && <SignUpGate onClose={()=>setGate(null)} onSignIn={()=>{setGate(null);signIn();}} studied={studied.length} favorites={favorites.length}/>}
      {gate==='paywall' && <Paywall onClose={()=>setGate(null)} user={user} onSignIn={()=>{setGate(null);signIn();}}/>}
      {qTerm && <TermQuiz key={qTerm.hebrew+(qTerm.verify?'v':'e')} hebrew={qTerm.hebrew} onClose={()=>setQTerm(null)} onResult={onQResult}/>}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
