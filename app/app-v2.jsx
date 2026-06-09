/* SHLIFIM v2 — Modern + Brand Spark. Logic: window.SL. Data: window.GLOSSARY/TOPICS. Auth/sync: Firebase. */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const GLOSSARY = window.GLOSSARY || [];
const TOPICS = window.TOPICS || [];
const TBK = window.TOPIC_BY_KEY || {};
const maps = SL.buildAliasMaps(GLOSSARY);
const searchIndex = SL.buildSearchIndex(GLOSSARY);
const HEB = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];
const TOTAL = GLOSSARY.length;
const topicTotals = (function(){ const m={}; GLOSSARY.forEach(t=>{ if(t.topic) m[t.topic]=(m[t.topic]||0)+1; }); return m; })();
const topicOf = (function(){ const m={}; GLOSSARY.forEach(t=>{ m[t.hebrew]=t.topic; }); return m; })();

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
let auth=null, db=null, googleProvider=null;
try{
  if(window.firebase){
    if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    auth=firebase.auth(); db=firebase.firestore();
    googleProvider=new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({prompt:'select_account'});
  }
}catch(e){ console.warn('firebase init failed', e); }

function useLocal(key, init){
  const [v,setV]=useState(()=>{ try{ const s=localStorage.getItem(key); return s!=null?JSON.parse(s):init; }catch{ return init; } });
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{} },[key,v]);
  return [v,setV];
}
function highlight(text,q){ if(!q) return text; const i=(text||'').toLowerCase().indexOf(q.toLowerCase()); if(i<0) return text;
  return <>{text.slice(0,i)}<mark className="hl">{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>; }

const Flask=({size=30})=>(
  <svg className="flask" viewBox="0 0 40 40" width={size} height={size}><defs><linearGradient id="flg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3FA9D6"/><stop offset="1" stopColor="#5CB85C"/></linearGradient></defs>
  <path d="M16 4h8M18 4v12L9 32a3 3 0 0 0 3 4h16a3 3 0 0 0 3-4l-9-16V4" fill="none" stroke="url(#flg)" strokeWidth="2.6" strokeLinejoin="round"/>
  <path d="M13 26h14l3 6a2 2 0 0 1-2 3H12a2 2 0 0 1-2-3z" fill="url(#flg)" opacity=".5"/></svg>);
const IcCards=()=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>;
const IcQuiz=()=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>;
const IcList=()=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16M4 12h16M4 19h10"/></svg>;
const IcInfo=()=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>;

function TopicTag({topicKey}){ const tp=TBK[topicKey]; if(!tp) return null;
  return <span className="subj" style={{background:'transparent',border:'1px solid '+tp.accent,color:'var(--text-2)'}}>
    <span style={{width:8,height:8,borderRadius:'50%',background:tp.accent,display:'inline-block',marginInlineEnd:3}}></span>{tp.emoji} {tp.label}</span>; }
function TopicChips({value,onPick}){
  return (<div className="chips">
    <button className={`chip ${!value?'on':''}`} onClick={()=>onPick('')}>הכל</button>
    {TOPICS.map(t=>{ const on=value===t.key;
      return <button key={t.key} className="chip" onClick={()=>onPick(on?'':t.key)} style={on?{background:t.primary,color:'#fff',borderColor:t.primary}:undefined}>{t.emoji} {t.label}</button>; })}
  </div>); }

/* ---------- HEADER / NAV ---------- */
function Header({studiedCount, dark, setDark, user, onProfile}){
  return (
    <header className="hdr">
      <Flask/>
      <div className="brand"><b>שליפים</b><span>MediLab · ביולוגיה</span></div>
      <div className="hdr-spacer"></div>
      <div className="streak" title="מושגים שנלמדו">🔥 {studiedCount}</div>
      <button className="icon-toggle" onClick={()=>setDark(d=>!d)} aria-label="מצב כהה">{dark?'☀️':'🌙'}</button>
      <button className="avatar" onClick={onProfile} aria-label="אזור אישי">
        {user&&user.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" alt=""/> : '👤'}
      </button>
    </header>
  );
}
function Nav({mode,setMode}){
  const T=[['glossary','מילון',IcList,'g'],['flashcards','כרטיסיות',IcCards,'f'],['quiz','מבחון',IcQuiz,'q'],['about','אודות',IcInfo,'g']];
  return (<nav className="nav">
    {T.map(([m,label,Ic,c])=>(
      <button key={m} className={`tab ${c} ${mode===m?'on':''}`} onClick={()=>setMode(m)}><Ic/>{label}<div className="pipe"></div></button>
    ))}
  </nav>); }

/* ---------- GLOSSARY ---------- */
function TermCard({t,q,fav,studied,onFav,onStudied}){
  const [open,setOpen]=useState(false);
  const isAlias=!!t.aliasOf; const canon=isAlias?SL.resolveEntry(t.hebrew,maps):t;
  const def=canon?canon.definition:t.definition; const long=(def||'').length>170; const shown=long&&!open?def.slice(0,170)+'…':def;
  return (
    <article className={`card ${studied?'studied':''}`}>
      <div className="card-top">
        <div><div className="term">{highlight(t.hebrew,q)}</div>{t.english&&<div className="en">{t.english}</div>}</div>
        <div className="acts">
          <button className={`ibtn ${fav?'fav':''}`} onClick={onFav} aria-label="מועדף">{fav?'★':'☆'}</button>
          <button className={`ibtn ${studied?'done':''}`} onClick={onStudied} aria-label="נלמד">{studied?'✓':'○'}</button>
        </div>
      </div>
      {t.topic && <TopicTag topicKey={t.topic}/>}
      {isAlias && canon && <div className="alias-note">ראו: <b>{t.aliasOf}</b></div>}
      <p className="def">{highlight(shown,q)}</p>
      {long && <button className="more" onClick={()=>setOpen(o=>!o)}>{open?'הצג פחות':'קרא עוד'}</button>}
    </article>
  );
}
function Glossary({favorites,studied,toggleFav,toggleStudied}){
  const [q,setQ]=useState(''); const [letter,setLetter]=useState(''); const [topic,setTopic]=useState('');
  const letterCounts=useMemo(()=>{const c={};GLOSSARY.forEach(t=>c[t.letter]=(c[t.letter]||0)+1);return c;},[]);
  const results=useMemo(()=>{ let items=SL.search(searchIndex,q); if(letter)items=items.filter(t=>t.letter===letter); if(topic)items=items.filter(t=>t.topic===topic); return items; },[q,letter,topic]);
  const tp=topic?TBK[topic]:null;
  return (<>
    <div className="hero"><h1>מילון מושגים</h1><p>{TOTAL} מושגים · חיפוש, סינון לפי אות ונושא</p></div>
    <div className="search"><span aria-hidden="true">🔍</span>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="חפשו מושג… (אוסמוזה, PCR, אקסון)"/>
      {q&&<button className="x" onClick={()=>setQ('')} aria-label="נקה">×</button>}</div>
    <TopicChips value={topic} onPick={setTopic}/>
    <div className="letters">
      <button className={`let ${!letter?'on':''}`} style={{width:'auto',padding:'0 10px'}} onClick={()=>setLetter('')}>הכל</button>
      {HEB.map(l=>(<button key={l} className={`let ${letter===l?'on':''}`} disabled={!letterCounts[l]} onClick={()=>setLetter(letter===l?'':l)}>{l}</button>))}
    </div>
    <div className="meta">{tp?`${tp.emoji} ${tp.label} · `:''}{results.length} מושגים</div>
    {results.length===0
      ? <div className="empty"><div style={{fontSize:46}}>🔬</div><h3>לא נמצאו תוצאות</h3><p>נסו מושג אחר או נקו את הסינון.</p></div>
      : results.map(t=>(<TermCard key={t.hebrew+t.letter} t={t} q={q.trim()} fav={favorites.includes(t.hebrew)} studied={studied.includes(t.hebrew)} onFav={()=>toggleFav(t.hebrew)} onStudied={()=>toggleStudied(t.hebrew)}/>))}
  </>);
}

/* ---------- FLASHCARDS ---------- */
function Flashcards({favorites,studied,toggleFav,toggleStudied}){
  const [deck,setDeck]=useState('all'); const [topic,setTopic]=useState(''); const [i,setI]=useState(0); const [flip,setFlip]=useState(false);
  const cards=useMemo(()=>{ let items=GLOSSARY.filter(t=>!t.aliasOf&&!/^\s*ראה:/.test(t.definition));
    if(topic)items=items.filter(t=>t.topic===topic); if(deck==='unstudied')items=items.filter(t=>!studied.includes(t.hebrew)); if(deck==='favorites')items=items.filter(t=>favorites.includes(t.hebrew)); return items; },[deck,topic,studied,favorites]);
  useEffect(()=>{setI(0);setFlip(false);},[deck,topic]);
  const card=cards[i];
  const next=useCallback(()=>{setFlip(false);setI(x=>(x+1)%Math.max(1,cards.length));},[cards.length]);
  const prev=useCallback(()=>{setFlip(false);setI(x=>(x-1+cards.length)%Math.max(1,cards.length));},[cards.length]);
  useEffect(()=>{const k=e=>{if(e.key==='ArrowLeft')next();if(e.key==='ArrowRight')prev();if(e.key===' '){e.preventDefault();setFlip(f=>!f);}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[next,prev]);
  const tref=useRef(null);
  const onTouchEnd=e=>{ if(tref.current==null)return; const dx=e.changedTouches[0].clientX-tref.current; if(Math.abs(dx)>50){dx<0?next():prev();} tref.current=null; };
  return (<>
    <div className="hero"><h1>כרטיסיות</h1><p>לימוד פעיל · הקישו להפיכה, החליקו למעבר</p></div>
    <div className="deck">
      <button className={`chip ${deck==='all'?'on':''}`} onClick={()=>setDeck('all')}>הכל</button>
      <button className={`chip ${deck==='unstudied'?'on':''}`} onClick={()=>setDeck('unstudied')}>לא נלמדו</button>
      <button className={`chip ${deck==='favorites'?'on':''}`} onClick={()=>setDeck('favorites')}>מועדפים</button>
    </div>
    <TopicChips value={topic} onPick={setTopic}/>
    {cards.length===0
      ? <div className="empty"><div style={{fontSize:46}}>🎴</div><h3>אין כרטיסיות בערימה הזו</h3></div>
      : (<>
        <div className="prog"><span>{i+1} / {cards.length}</span><div className="bar"><i style={{width:`${((i+1)/cards.length)*100}%`}}></i></div></div>
        <div className={`fc ${flip?'flip':''}`} onClick={()=>setFlip(f=>!f)} onTouchStart={e=>tref.current=e.touches[0].clientX} onTouchEnd={onTouchEnd}>
          <div className="fc-inner">
            <div className="fc-face">
              <div className="fc-badge">{card.letter}</div><div className="fc-term">{card.hebrew}</div>
              {card.english&&<div className="fc-en">{card.english}</div>}
              {card.topic&&<div style={{marginTop:12}}><TopicTag topicKey={card.topic}/></div>}
              <div className="fc-hint">↻ הקישו לתשובה</div>
            </div>
            <div className="fc-face fc-back"><div className="fc-def">{card.definition}</div><div className="fc-hint">↻ הקישו לחזרה</div></div>
          </div>
        </div>
        <div className="fc-ctrl">
          <button className="fc-nav" onClick={prev} aria-label="הקודם">→</button>
          <button className="btn btn-accent" style={{flex:1}} onClick={()=>toggleStudied(card.hebrew)}>{studied.includes(card.hebrew)?'✓ נלמד':'סמן כנלמד'}</button>
          <button className="fc-nav" onClick={()=>toggleFav(card.hebrew)} aria-label="מועדף">{favorites.includes(card.hebrew)?'★':'☆'}</button>
          <button className="fc-nav" onClick={next} aria-label="הבא">←</button>
        </div>
      </>)}
  </>);
}

/* ---------- QUIZ ---------- */
function buildQuiz(pool,n){ const kinds=['pick-definition','pick-term','type-answer']; const items=[]; const used={}; let g=0;
  while(items.length<n && g<n*25){ g++; const kind=kinds[items.length%3];
    if(kind==='type-answer'){ const t=pool[Math.floor(Math.random()*pool.length)]; if(used[t.hebrew])continue; used[t.hebrew]=1; items.push({kind,term:t,prompt:t.definition,options:[]}); }
    else { const it=SL.generateItem(pool,maps,kind,Math.floor(Math.random()*1e6)); if(used[it.term.hebrew])continue; used[it.term.hebrew]=1; items.push(it); } }
  return items; }
function Quiz({studied,toggleStudied}){
  const [topic,setTopic]=useState(''); const [len,setLen]=useState(10);
  const [quiz,setQuiz]=useState(null); const [qi,setQi]=useState(0);
  const [answered,setAnswered]=useState(false); const [chosen,setChosen]=useState(null);
  const [typed,setTyped]=useState(''); const [score,setScore]=useState(0); const [spark,setSpark]=useState(false);
  const pool=useMemo(()=>{ let p=SL.eligibleTerms(GLOSSARY,maps); if(topic)p=p.filter(t=>t.topic===topic); return p; },[topic]);
  const start=()=>{ setQuiz(buildQuiz(pool,Math.min(len,pool.length))); setQi(0);setAnswered(false);setChosen(null);setTyped('');setScore(0); };
  const item=quiz&&quiz[qi];
  const reward=ok=>{ if(ok){ setScore(s=>s+1); setSpark(true); setTimeout(()=>setSpark(false),700); if(!studied.includes(item.term.hebrew))toggleStudied(item.term.hebrew);} };
  const answerMC=opt=>{ if(answered)return; setChosen(opt); setAnswered(true); reward(opt.correct); };
  const answerType=()=>{ if(answered)return; const ok=SL.checkAnswer(item,typed,maps); setAnswered(true); setChosen({correct:ok}); reward(ok); };
  const nextQ=()=>{ if(qi+1>=quiz.length){ setQi(quiz.length); return; } setQi(qi+1);setAnswered(false);setChosen(null);setTyped(''); };
  if(!quiz) return (<>
    <div className="hero"><h1>מבחון</h1><p>בחירה מרובה · השלמת מושג · בדיקה עצמית</p></div>
    <div className="setup"><h2>בחרו נושא</h2><TopicChips value={topic} onPick={setTopic}/>
      <h2 style={{marginTop:14}}>מספר שאלות</h2>
      <div className="seg">{[5,10,15,20].map(n=>(<button key={n} className={`chip ${len===n?'on':''}`} onClick={()=>setLen(n)}>{n}</button>))}</div>
      <button className="btn btn-accent" style={{width:'100%'}} onClick={start} disabled={pool.length<3}>התחילו מבחון ({pool.length} מושגים) ←</button>
    </div></>);
  if(qi>=quiz.length){ const pct=Math.round(score/quiz.length*100);
    return (<><div className="hero"><h1>סיימתם!</h1></div>
      <div className="result"><div className="big">{score}/{quiz.length}</div>
        <p style={{color:'var(--text-2)',marginTop:6}}>{pct}% הצלחה {pct>=80?'🎉 מצוין!':pct>=60?'👍 כל הכבוד':'💪 שווה חזרה'}</p>
        <div style={{display:'flex',gap:8,marginTop:18}}>
          <button className="btn btn-accent" style={{flex:1}} onClick={start}>מבחון נוסף</button>
          <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setQuiz(null)}>שינוי נושא</button>
        </div></div></>);
  }
  return (<>
    {spark && <div className="spark-pop">✨</div>}
    <div className="q-top"><span>שאלה {qi+1} / {quiz.length}</span><div className="bar"><i style={{width:`${(qi/quiz.length)*100}%`}}></i></div><span className="q-score">{score} ✓</span></div>
    <span className="q-kind">{item.kind==='pick-definition'?'בחרו את ההגדרה הנכונה':item.kind==='pick-term'?'בחרו את המושג הנכון':'הקלידו את המושג'}</span>
    <div className="q-q">{item.kind==='pick-definition'?<>מהי <span className="hl">{item.term.hebrew}</span>?</>:item.prompt}</div>
    {item.kind==='type-answer'
      ? (<><div className="q-type-in"><input value={typed} onChange={e=>setTyped(e.target.value)} disabled={answered} placeholder="הקלידו את המושג…" onKeyDown={e=>e.key==='Enter'&&answerType()}/>{!answered&&<button className="btn btn-accent" onClick={answerType}>בדיקה</button>}</div>
        {answered && (chosen.correct?<div className="fb ok">🎉 נכון! {item.term.hebrew}</div>:<div className="fb no">✗ התשובה: {item.term.hebrew}</div>)}</>)
      : item.options.map((o,idx)=>{ let cls='opt'; if(answered){ if(o.correct)cls+=' correct'; else if(chosen===o)cls+=' wrong'; }
          return <button key={idx} className={cls} onClick={()=>answerMC(o)} disabled={answered}><span className="mk">{answered&&o.correct?'✓':String.fromCharCode(1488+idx)}</span><span>{o.text}</span></button>; })}
    {answered && item.kind!=='type-answer' && (chosen&&chosen.correct?<div className="fb ok">🎉 כל הכבוד!</div>:<div className="fb no">התשובה הנכונה מסומנת בירוק</div>)}
    {answered && <button className="btn btn-accent" style={{width:'100%',marginTop:12}} onClick={nextQ}>{qi+1>=quiz.length?'לתוצאות ←':'לשאלה הבאה ←'}</button>}
  </>);
}

/* ---------- ABOUT ---------- */
const WA='https://wa.me/972524295838';
function About(){
  return (<>
    <div className="hero"><h1>אודות</h1><p>נתנאל יוחאי מדינה · מורה לביולוגיה ולביוטכנולוגיה</p></div>
    <div className="about-hero">
      <img className="portrait" src="portrait.jpg" alt="נתנאל מדינה"/>
      <div><div className="about-kicker">שיעורים פרטיים · 5 יח״ל · ביוטכנולוגיה 10 יח״ל</div>
        <div className="about-name">נעים להכיר — נתנאל 👋</div></div>
    </div>
    <p className="about-body">מורה לביולוגיה ולביוטכנולוגיה עם <b>10 שנות ניסיון בתיכון</b>, מגיש תלמידים לבגרויות בביולוגיה (5 יח״ל) ובביוטכנולוגיה (10 יח״ל). מעביר שיעורים פרטיים אחד-על-אחד או בקבוצות קטנות — מקוון בזום או פרונטלי במרכז ״כיוונים״ באשדוד.</p>
    <div className="quote">״אני מאמין שלכל תלמיד יש דרך משלו להבין, והתפקיד שלי הוא למצוא אותה.״</div>
    <div className="stat-row">
      <div className="stat-box"><b>10</b><span>שנות הוראה</span></div>
      <div className="stat-box"><b>1,600+</b><span>שאלות בגרות</span></div>
      <div className="stat-box"><b>3</b><span>ספרי עזר</span></div>
    </div>
    <div className="degrees">
      <div className="degree"><span className="tag">B.Sc</span><div><b>תואר ראשון בביולוגיה</b><span>אוניברסיטת חיפה</span></div></div>
      <div className="degree"><span className="tag">M.Teach</span><div><b>תואר שני בהוראת המדעים</b><span>מכון ויצמן למדע</span></div></div>
      <div className="degree"><span className="tag">M.Sc</span><div><b>תואר שני במדעים</b><span>מכון ויצמן למדע</span></div></div>
    </div>

    <h2 className="sec-title">שלושת הספרים שכתבתי 📚</h2>
    <p className="sec-sub">מותאמים לתוכנית הלימודים תשפ״ו · מנוקדים, מאוירים, נגישים</p>
    <div className="books">
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-questions.png" alt="ספר השאלות"/>
        <div><span className="tag">מהדורה II</span><h4>ספר השאלות</h4><p>1,674 שאלות בגרות בנושאי הליבה וההעמקה, לפי נושא ותת-נושא.</p><span className="price">₪149</span></div></a>
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-research.png" alt="קטעי מחקר"/>
        <div><span className="tag">פורמט בגרות</span><h4>קטעי מחקר</h4><p>50 קטעי מחקר עם שאלות מקוריות, הצעות פתרון והסברים.</p><span className="price">₪95</span></div></a>
      <a className="book" href={WA} target="_blank" rel="noopener"><img src="book-glossary.png" alt="מונחון"/>
        <div><span className="tag">תשפ״ו · 2026</span><h4>מונחון</h4><p>מילון מודפס של 452 מושגים, מנוקד ומאויר — בדיוק מה שיש כאן.</p><span className="price">₪69</span></div></a>
    </div>
    <div className="bundle">
      <h4>שלושת הספרים יחד 🎁</h4><p>ספר השאלות + קטעי מחקר + מונחון — כל הארגז לבגרות</p>
      <div className="prices"><span className="old">₪313</span><span className="new">₪249</span><span className="save">חוסכים ₪64</span></div>
      <a href={WA} target="_blank" rel="noopener">לרכישת החבילה →</a>
    </div>

    <h2 className="sec-title">דברו איתי 📩</h2>
    <div className="contact">
      <a href={WA} target="_blank" rel="noopener"><span className="em">💬</span> WhatsApp</a>
      <a href="tel:+972524295838"><span className="em">📞</span> 052-429-5838</a>
      <a href="https://instagram.com/bio_bagrut" target="_blank" rel="noopener"><span className="em">📷</span> @bio_bagrut</a>
      <a href="mailto:biomedilab88@gmail.com"><span className="em">✉️</span> מייל</a>
    </div>
    <div style={{textAlign:'center',marginTop:14}}>
      <a className="btn btn-ghost" href="https://nethanelmedina88-cmyk.github.io/Bio_MediLab/" target="_blank" rel="noopener" style={{textDecoration:'none'}}>לאתר המלא ←</a>
    </div>
  </>);
}

/* ---------- PROFILE / STATS ---------- */
function Ring({pct,color}){
  const r=34,c=2*Math.PI*r,off=c*(1-pct/100);
  return (<svg width="84" height="84" viewBox="0 0 84 84" className="ring">
    <circle cx="42" cy="42" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9"/>
    <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 42 42)"/>
    <text x="42" y="48" textAnchor="middle" fontFamily="Rubik" fontWeight="800" fontSize="20" fill="var(--text)">{pct}%</text>
  </svg>); }
function Profile({user,studied,favorites,sync,signIn,signOut}){
  const studiedCount=studied.length, pct=Math.round(studiedCount/TOTAL*100);
  const perTopic=useMemo(()=>{ const done={}; studied.forEach(h=>{ const tk=topicOf[h]; if(tk)done[tk]=(done[tk]||0)+1; });
    return TOPICS.map(t=>({t, total:topicTotals[t.key]||0, done:done[t.key]||0})).filter(x=>x.total>0); },[studied]);
  return (<>
    <div className="hero"><h1>אזור אישי</h1></div>
    <div className="prof-card">
      <div className="av">{user&&user.photoURL?<img src={user.photoURL} referrerPolicy="no-referrer" alt=""/>:'👤'}</div>
      {user ? (<>
        <div className="prof-name">{user.displayName||'תלמיד/ה'}</div>
        <div className="prof-email">{user.email}</div>
        {sync && <div style={{marginTop:8}}><span className="sync-pill">{sync==='syncing'?'מסנכרן…':sync==='synced'?'✓ מסונכרן':'שגיאת סנכרון'}</span></div>}
        <button className="signout" onClick={signOut}>התנתק</button>
      </>) : (<>
        <div className="prof-name">לימוד כאורח</div>
        <div className="sync-note">ההתקדמות נשמרת במכשיר הזה. התחברו עם Google כדי לסנכרן בין הטלפון, הטאבלט והמחשב.</div>
        <button className="google-btn" style={{marginTop:12}} onClick={signIn}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.8 45 31 45 24z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17 2 20.4 2 24s1 7 2.5 9.9l7.3-5.7z"/><path fill="#EA4335" d="M24 11.5c3.2 0 6 1.1 8.3 3.2l6.2-6.2C34.9 5 29.9 3 24 3 15.4 3 8.1 7.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/></svg>
          התחברות עם Google
        </button>
      </>)}
    </div>
    <div className="ring-wrap">
      <Ring pct={pct} color="#3FA9D6"/>
      <div className="mini-stats">
        <div className="stat-box"><b>{studiedCount}</b><span>נלמדו מתוך {TOTAL}</span></div>
        <div className="stat-box"><b>{favorites.length}</b><span>מועדפים</span></div>
      </div>
    </div>
    <h2 className="sec-title" style={{marginTop:8}}>התקדמות לפי נושא</h2>
    <div style={{marginTop:8}}>
      {perTopic.map(({t,total,done})=>{ const p=Math.round(done/total*100);
        return (<div className="topic-prog" key={t.key}>
          <div className="lab"><span>{t.emoji} {t.label}</span><span>{done}/{total}</span></div>
          <div className="tbar"><i style={{width:p+'%',background:t.primary}}></i></div>
        </div>); })}
    </div>
  </>);
}

/* ---------- APP ---------- */
function App(){
  const [mode,setMode]=useState('glossary');
  const [dark,setDark]=useLocal('ml-dark',false);
  const [favorites,setFav]=useLocal('ml-favorites',[]);
  const [studied,setStudied]=useLocal('ml-studied',[]);
  const [user,setUser]=useState(null);
  const [sync,setSync]=useState('');
  const loadingRef=useRef(false);
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);},[dark]);
  const toggleFav=h=>setFav(f=>f.includes(h)?f.filter(x=>x!==h):[...f,h]);
  const toggleStudied=h=>setStudied(f=>f.includes(h)?f.filter(x=>x!==h):[...f,h]);

  const saveUserData=useCallback(async(uid)=>{
    if(!db||!auth.currentUser) return; setSync('syncing');
    try{ await db.collection('users').doc(uid).set({
      displayName:auth.currentUser.displayName, email:auth.currentUser.email, photoURL:auth.currentUser.photoURL,
      favorites, studied, lastSync:firebase.firestore.FieldValue.serverTimestamp() },{merge:true});
      setSync('synced'); setTimeout(()=>setSync(''),1500);
    }catch(e){ console.error(e); setSync('error'); }
  },[favorites,studied]);

  useEffect(()=>{ if(!auth) return; const unsub=auth.onAuthStateChanged(async(u)=>{
    setUser(u);
    if(u&&db){ setSync('syncing');
      try{ const doc=await db.collection('users').doc(u.uid).get();
        if(doc.exists){ const d=doc.data(); loadingRef.current=true; setFav(d.favorites||[]); setStudied(d.studied||[]); setTimeout(()=>{loadingRef.current=false;},80); setSync('synced'); setTimeout(()=>setSync(''),1500); }
        else { await db.collection('users').doc(u.uid).set({displayName:u.displayName,email:u.email,photoURL:u.photoURL,favorites,studied,lastSync:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); setSync('synced'); setTimeout(()=>setSync(''),1500); }
      }catch(e){ console.error(e); setSync('error'); }
    }
  }); return unsub; },[]);

  useEffect(()=>{ if(user&&!loadingRef.current) saveUserData(user.uid); },[favorites,studied]);

  const signIn=async()=>{ if(!auth){alert('אין חיבור לרשת');return;} try{ await auth.signInWithPopup(googleProvider); }catch(e){ alert('שגיאת התחברות: '+e.message); } };
  const signOut=async()=>{ loadingRef.current=true; try{ await auth.signOut(); }catch(e){} setUser(null); setTimeout(()=>{loadingRef.current=false;},80); };

  const dm=(mode==='glossary'||mode==='flashcards'||mode==='quiz')?mode:'glossary';
  return (
    <div className="app" data-mode={dm}>
      <Header studiedCount={studied.length} dark={dark} setDark={setDark} user={user} onProfile={()=>setMode('profile')}/>
      <div className="scroll">
        {mode==='glossary' && <Glossary favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied}/>}
        {mode==='flashcards' && <Flashcards favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied}/>}
        {mode==='quiz' && <Quiz studied={studied} toggleStudied={toggleStudied}/>}
        {mode==='about' && <About/>}
        {mode==='profile' && <Profile user={user} studied={studied} favorites={favorites} sync={sync} signIn={signIn} signOut={signOut}/>}
      </div>
      <Nav mode={mode} setMode={setMode}/>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
