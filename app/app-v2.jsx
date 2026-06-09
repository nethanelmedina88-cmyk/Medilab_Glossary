/* SHLIFIM v2 — Modern + Brand Spark. Reuses window.SL (logic), window.GLOSSARY, window.SUBJECTS. */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const GLOSSARY = window.GLOSSARY || [];
const SUBJECTS = window.SUBJECTS || { core: [], depth: [] };
const ALL_SUBJECTS = SUBJECTS.core.concat(SUBJECTS.depth);
const maps = SL.buildAliasMaps(GLOSSARY);
const searchIndex = SL.buildSearchIndex(GLOSSARY);
const HEB = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

function useLocal(key, init){
  const [v,setV] = useState(()=>{ try{ const s=localStorage.getItem(key); return s!=null?JSON.parse(s):init; }catch{ return init; } });
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{} },[key,v]);
  return [v,setV];
}
function highlight(text, q){
  if(!q) return text; const i = (text||'').toLowerCase().indexOf(q.toLowerCase());
  if(i<0) return text;
  return <>{text.slice(0,i)}<mark className="hl">{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>;
}
const Flask = ({size=30}) => (
  <svg className="flask" viewBox="0 0 40 40" width={size} height={size}><defs><linearGradient id="flg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3FA9D6"/><stop offset="1" stopColor="#5CB85C"/></linearGradient></defs>
  <path d="M16 4h8M18 4v12L9 32a3 3 0 0 0 3 4h16a3 3 0 0 0 3-4l-9-16V4" fill="none" stroke="url(#flg)" strokeWidth="2.6" strokeLinejoin="round"/>
  <path d="M13 26h14l3 6a2 2 0 0 1-2 3H12a2 2 0 0 1-2-3z" fill="url(#flg)" opacity=".5"/></svg>
);
const IcCards=()=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>;
const IcQuiz=()=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>;
const IcList=()=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16M4 12h16M4 19h10"/></svg>;

/* ---------- HEADER ---------- */
function Header({streak, dark, setDark}){
  return (
    <header className="hdr">
      <Flask/>
      <div className="brand"><b>שליפים</b><span>MediLab · ביולוגיה</span></div>
      <div className="hdr-spacer"></div>
      <div className="streak" title="רצף לימוד">🔥 {streak}</div>
      <button className="icon-toggle" onClick={()=>setDark(d=>!d)} aria-label="מצב כהה">{dark?'☀️':'🌙'}</button>
    </header>
  );
}
/* ---------- NAV ---------- */
function Nav({mode,setMode}){
  const T=[['glossary','מילון',IcList,'g'],['flashcards','כרטיסיות',IcCards,'f'],['quiz','מבחון',IcQuiz,'q']];
  return (
    <nav className="nav">
      {T.map(([m,label,Ic,c])=>(
        <button key={m} className={`tab ${c} ${mode===m?'on':''}`} onClick={()=>setMode(m)}>
          <Ic/>{label}<div className="pipe"></div>
        </button>
      ))}
    </nav>
  );
}

/* ---------- GLOSSARY ---------- */
function TermCard({t, q, fav, studied, onFav, onStudied}){
  const [open,setOpen]=useState(false);
  const isAlias = !!t.aliasOf;
  const canon = isAlias ? SL.resolveEntry(t.hebrew, maps) : t;
  const def = canon ? canon.definition : t.definition;
  const long = (def||'').length>170;
  const shown = long && !open ? def.slice(0,170)+'…' : def;
  return (
    <article className={`card ${studied?'studied':''}`}>
      <div className="card-top">
        <div>
          <div className="term">{highlight(t.hebrew,q)}</div>
          {t.english && <div className="en">{t.english}</div>}
        </div>
        <div className="acts">
          <button className={`ibtn ${fav?'fav':''}`} onClick={onFav} aria-label="מועדף">{fav?'★':'☆'}</button>
          <button className={`ibtn ${studied?'done':''}`} onClick={onStudied} aria-label="נלמד">{studied?'✓':'○'}</button>
        </div>
      </div>
      {t.subject && <span className="subj">🏷️ {t.subject}{t.subtopic?` · ${t.subtopic}`:''}</span>}
      {isAlias && canon
        ? <div className="alias-note">ראו: <b>{t.aliasOf}</b></div>
        : null}
      <p className="def">{highlight(shown,q)}</p>
      {long && <button className="more" onClick={()=>setOpen(o=>!o)}>{open?'הצג פחות':'קרא עוד'}</button>}
    </article>
  );
}
function Glossary({favorites,studied,toggleFav,toggleStudied}){
  const [q,setQ]=useState(''); const [letter,setLetter]=useState(''); const [subj,setSubj]=useState('');
  const letterCounts=useMemo(()=>{const c={};GLOSSARY.forEach(t=>c[t.letter]=(c[t.letter]||0)+1);return c;},[]);
  const results=useMemo(()=>{
    let items = SL.search(searchIndex, q);
    if(letter) items=items.filter(t=>t.letter===letter);
    if(subj) items=items.filter(t=>t.subject===subj || t.subjectAlso===subj);
    return items;
  },[q,letter,subj]);
  return (
    <>
      <div className="hero"><h1>מילון מושגים</h1><p>{GLOSSARY.length} מושגים · חיפוש, סינון לפי אות ונושא</p></div>
      <div className="search">
        <span aria-hidden="true">🔍</span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="חפשו מושג… (אוסמוזה, PCR, אקסון)"/>
        {q && <button className="x" onClick={()=>setQ('')} aria-label="נקה">×</button>}
      </div>
      <div className="chips">
        <button className={`chip ${!subj?'on':''}`} onClick={()=>setSubj('')}>כל הנושאים</button>
        {ALL_SUBJECTS.map(s=>(
          <button key={s.name} className={`chip ${subj===s.name?'on':''}`} onClick={()=>setSubj(subj===s.name?'':s.name)}>{s.name}</button>
        ))}
      </div>
      <div className="letters">
        <button className={`let ${!letter?'on':''}`} style={{width:'auto',padding:'0 10px'}} onClick={()=>setLetter('')}>הכל</button>
        {HEB.map(l=>(<button key={l} className={`let ${letter===l?'on':''}`} disabled={!letterCounts[l]} onClick={()=>setLetter(letter===l?'':l)}>{l}</button>))}
      </div>
      <div className="meta">{results.length} מושגים</div>
      {results.length===0
        ? <div className="empty"><div style={{fontSize:46}}>🔬</div><h3>לא נמצאו תוצאות</h3><p>נסו מושג אחר או נקו את הסינון.</p></div>
        : results.map(t=>(
            <TermCard key={t.hebrew+t.letter} t={t} q={q.trim()}
              fav={favorites.includes(t.hebrew)} studied={studied.includes(t.hebrew)}
              onFav={()=>toggleFav(t.hebrew)} onStudied={()=>toggleStudied(t.hebrew)}/>
          ))}
    </>
  );
}

/* ---------- FLASHCARDS ---------- */
function Flashcards({favorites,studied,toggleFav,toggleStudied}){
  const [deck,setDeck]=useState('all'); const [subj,setSubj]=useState('');
  const [i,setI]=useState(0); const [flip,setFlip]=useState(false);
  const cards=useMemo(()=>{
    let items=GLOSSARY.filter(t=>!t.aliasOf && !/^\s*ראה:/.test(t.definition));
    if(subj) items=items.filter(t=>t.subject===subj||t.subjectAlso===subj);
    if(deck==='unstudied') items=items.filter(t=>!studied.includes(t.hebrew));
    if(deck==='favorites') items=items.filter(t=>favorites.includes(t.hebrew));
    return items;
  },[deck,subj,studied,favorites]);
  useEffect(()=>{setI(0);setFlip(false);},[deck,subj]);
  const card=cards[i];
  const next=useCallback(()=>{setFlip(false);setI(x=>(x+1)%Math.max(1,cards.length));},[cards.length]);
  const prev=useCallback(()=>{setFlip(false);setI(x=>(x-1+cards.length)%Math.max(1,cards.length));},[cards.length]);
  useEffect(()=>{const k=e=>{if(e.key==='ArrowLeft')next();if(e.key==='ArrowRight')prev();if(e.key===' '){e.preventDefault();setFlip(f=>!f);}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[next,prev]);
  const tref=useRef(null);
  const onTouchEnd=e=>{ if(tref.current==null)return; const dx=e.changedTouches[0].clientX-tref.current; if(Math.abs(dx)>50){dx<0?next():prev();} tref.current=null; };
  return (
    <>
      <div className="hero"><h1>כרטיסיות</h1><p>לימוד פעיל · הקישו להפיכה, החליקו למעבר</p></div>
      <div className="deck">
        <button className={`chip ${deck==='all'?'on':''}`} onClick={()=>setDeck('all')}>הכל</button>
        <button className={`chip ${deck==='unstudied'?'on':''}`} onClick={()=>setDeck('unstudied')}>לא נלמדו</button>
        <button className={`chip ${deck==='favorites'?'on':''}`} onClick={()=>setDeck('favorites')}>מועדפים</button>
      </div>
      <div className="chips">
        <button className={`chip ${!subj?'on':''}`} onClick={()=>setSubj('')}>כל הנושאים</button>
        {ALL_SUBJECTS.map(s=>(<button key={s.name} className={`chip ${subj===s.name?'on':''}`} onClick={()=>setSubj(subj===s.name?'':s.name)}>{s.name}</button>))}
      </div>
      {cards.length===0
        ? <div className="empty"><div style={{fontSize:46}}>🎴</div><h3>אין כרטיסיות בערימה הזו</h3></div>
        : (<>
            <div className="prog"><span>{i+1} / {cards.length}</span><div className="bar"><i style={{width:`${((i+1)/cards.length)*100}%`}}></i></div></div>
            <div className={`fc ${flip?'flip':''}`} onClick={()=>setFlip(f=>!f)}
              onTouchStart={e=>tref.current=e.touches[0].clientX} onTouchEnd={onTouchEnd}>
              <div className="fc-inner">
                <div className="fc-face">
                  <div className="fc-badge">{card.letter}</div>
                  <div className="fc-term">{card.hebrew}</div>
                  {card.english && <div className="fc-en">{card.english}</div>}
                  {card.subject && <span className="subj" style={{marginTop:12}}>🏷️ {card.subject}</span>}
                  <div className="fc-hint">↻ הקישו לתשובה</div>
                </div>
                <div className="fc-face fc-back">
                  <div className="fc-def">{card.definition}</div>
                  <div className="fc-hint">↻ הקישו לחזרה</div>
                </div>
              </div>
            </div>
            <div className="fc-ctrl">
              <button className="fc-nav" onClick={prev} aria-label="הקודם">→</button>
              <button className="btn btn-accent" style={{flex:1}} onClick={()=>toggleStudied(card.hebrew)}>{studied.includes(card.hebrew)?'✓ נלמד':'סמן כנלמד'}</button>
              <button className={`fc-nav ${favorites.includes(card.hebrew)?'':''}`} onClick={()=>toggleFav(card.hebrew)} aria-label="מועדף">{favorites.includes(card.hebrew)?'★':'☆'}</button>
              <button className="fc-nav" onClick={next} aria-label="הבא">←</button>
            </div>
          </>)}
    </>
  );
}

/* ---------- QUIZ ---------- */
function buildQuiz(pool, n){
  const kinds=['pick-definition','pick-term','type-answer']; const items=[]; const used={}; let g=0;
  while(items.length<n && g<n*25){
    g++; const kind=kinds[items.length%3];
    if(kind==='type-answer'){
      const t=pool[Math.floor(Math.random()*pool.length)]; if(used[t.hebrew])continue; used[t.hebrew]=1;
      items.push({kind,term:t,prompt:t.definition,options:[]});
    } else {
      const it=SL.generateItem(pool,maps,kind,Math.floor(Math.random()*1e6)); if(used[it.term.hebrew])continue; used[it.term.hebrew]=1;
      items.push(it);
    }
  }
  return items;
}
function Quiz({studied,toggleStudied}){
  const [subj,setSubj]=useState(''); const [len,setLen]=useState(10);
  const [quiz,setQuiz]=useState(null); const [qi,setQi]=useState(0);
  const [answered,setAnswered]=useState(false); const [chosen,setChosen]=useState(null);
  const [typed,setTyped]=useState(''); const [score,setScore]=useState(0); const [spark,setSpark]=useState(false);
  const pool=useMemo(()=>{ let p=SL.eligibleTerms(GLOSSARY,maps); if(subj)p=p.filter(t=>t.subject===subj||t.subjectAlso===subj); return p; },[subj]);
  const start=()=>{ setQuiz(buildQuiz(pool,Math.min(len,pool.length))); setQi(0);setAnswered(false);setChosen(null);setTyped('');setScore(0); };
  const item=quiz&&quiz[qi];
  const reward=ok=>{ if(ok){ setScore(s=>s+1); setSpark(true); setTimeout(()=>setSpark(false),700); toggleStudied&&!studied.includes(item.term.hebrew)&&toggleStudied(item.term.hebrew);} };
  const answerMC=opt=>{ if(answered)return; setChosen(opt); setAnswered(true); reward(opt.correct); };
  const answerType=()=>{ if(answered)return; const ok=SL.checkAnswer(item,typed,maps); setAnswered(true); setChosen({correct:ok}); reward(ok); };
  const nextQ=()=>{ if(qi+1>=quiz.length){ setQi(quiz.length); return; } setQi(qi+1);setAnswered(false);setChosen(null);setTyped(''); };

  if(!quiz) return (
    <>
      <div className="hero"><h1>מבחון</h1><p>בחירה מרובה · השלמת מושג · בדיקה עצמית</p></div>
      <div className="setup">
        <h2>בחרו נושא</h2>
        <div className="seg">
          <button className={`chip ${!subj?'on':''}`} onClick={()=>setSubj('')}>הכל</button>
          {ALL_SUBJECTS.map(s=>(<button key={s.name} className={`chip ${subj===s.name?'on':''}`} onClick={()=>setSubj(s.name)}>{s.name}</button>))}
        </div>
        <h2>מספר שאלות</h2>
        <div className="seg">{[5,10,15,20].map(n=>(<button key={n} className={`chip ${len===n?'on':''}`} onClick={()=>setLen(n)}>{n}</button>))}</div>
        <button className="btn btn-accent" style={{width:'100%'}} onClick={start}>התחילו מבחון ←</button>
      </div>
    </>
  );

  if(qi>=quiz.length){ const pct=Math.round(score/quiz.length*100);
    return (<><div className="hero"><h1>סיימתם!</h1></div>
      <div className="result"><div className="big">{score}/{quiz.length}</div>
        <p style={{color:'var(--text-2)',marginTop:6}}>{pct}% הצלחה {pct>=80?'🎉 מצוין!':pct>=60?'👍 כל הכבוד':'💪 שווה חזרה'}</p>
        <div style={{display:'flex',gap:8,marginTop:18}}>
          <button className="btn btn-accent" style={{flex:1}} onClick={start}>מבחון נוסף</button>
          <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setQuiz(null)}>שינוי נושא</button>
        </div>
      </div></>);
  }

  return (
    <>
      {spark && <div className="spark-pop">✨</div>}
      <div className="q-top"><span>שאלה {qi+1} / {quiz.length}</span><div className="bar"><i style={{width:`${(qi/quiz.length)*100}%`}}></i></div><span className="q-score">{score} ✓</span></div>
      <span className="q-kind">{item.kind==='pick-definition'?'בחרו את ההגדרה הנכונה':item.kind==='pick-term'?'בחרו את המושג הנכון':'הקלידו את המושג'}</span>
      <div className="q-q">{item.kind==='pick-definition'?<>מהי <span className="hl">{item.term.hebrew}</span>?</>:item.prompt}</div>

      {item.kind==='type-answer'
        ? (<>
            <div className="q-type-in">
              <input value={typed} onChange={e=>setTyped(e.target.value)} disabled={answered} placeholder="הקלידו את המושג…" onKeyDown={e=>e.key==='Enter'&&answerType()}/>
              {!answered && <button className="btn btn-accent" onClick={answerType}>בדיקה</button>}
            </div>
            {answered && (chosen.correct
              ? <div className="fb ok">🎉 נכון! {item.term.hebrew}</div>
              : <div className="fb no">✗ התשובה: {item.term.hebrew}</div>)}
          </>)
        : item.options.map((o,idx)=>{
            let cls='opt'; if(answered){ if(o.correct)cls+=' correct'; else if(chosen===o)cls+=' wrong'; }
            return <button key={idx} className={cls} onClick={()=>answerMC(o)} disabled={answered}>
              <span className="mk">{answered&&o.correct?'✓':String.fromCharCode(1488+idx)}</span><span>{o.text}</span></button>;
          })}

      {answered && item.kind!=='type-answer' && (chosen&&chosen.correct?<div className="fb ok">🎉 כל הכבוד!</div>:<div className="fb no">התשובה הנכונה מסומנת בירוק</div>)}
      {answered && <button className="btn btn-accent" style={{width:'100%',marginTop:12}} onClick={nextQ}>{qi+1>=quiz.length?'לתוצאות ←':'לשאלה הבאה ←'}</button>}
    </>
  );
}

/* ---------- APP ---------- */
function App(){
  const [mode,setMode]=useState('glossary');
  const [dark,setDark]=useLocal('ml-dark',false);
  const [favorites,setFav]=useLocal('ml-favorites',[]);
  const [studied,setStudied]=useLocal('ml-studied',[]);
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);},[dark]);
  const toggleFav=h=>setFav(f=>f.includes(h)?f.filter(x=>x!==h):[...f,h]);
  const toggleStudied=h=>setStudied(f=>f.includes(h)?f.filter(x=>x!==h):[...f,h]);
  const streak=studied.length; // simple proxy for now
  return (
    <div className="app" data-mode={mode}>
      <Header streak={streak} dark={dark} setDark={setDark}/>
      <div className="scroll">
        {mode==='glossary' && <Glossary favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied}/>}
        {mode==='flashcards' && <Flashcards favorites={favorites} studied={studied} toggleFav={toggleFav} toggleStudied={toggleStudied}/>}
        {mode==='quiz' && <Quiz studied={studied} toggleStudied={toggleStudied}/>}
      </div>
      <Nav mode={mode} setMode={setMode}/>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
