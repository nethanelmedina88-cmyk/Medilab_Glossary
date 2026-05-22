/* MediLab Glossary Search — main app
   Hand-drawn doodle aesthetic, RTL Hebrew, full interactivity
*/

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ============ HELPERS ============
function normalize(s) {
  return (s || '').toLowerCase().replace(/[\u0591-\u05C7"'״׳\-–—\(\)]/g, '').replace(/\s+/g, ' ').trim();
}

function highlight(text, query) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="hl">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const HEB_LETTERS = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

// localStorage helpers
function useLocal(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v != null ? JSON.parse(v) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

// ============ HEADER ============
function Header({ dark, setDark, favCount, studiedCount, onOpenFlashcards, onShowAbout }) {
  return (
    <header className="ml-header">
      <a className="ml-brand" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <img src="logo.jpg" alt="MediLab" />
        <span className="ml-brand-text">
          <span className="ml-brand-name">MediLab</span>
          <span className="ml-brand-sub">מילון מושגים · ביולוגיה</span>
        </span>
      </a>
      <nav className="ml-nav">
        <button className="ml-chip" onClick={onOpenFlashcards} aria-label="כרטיסיות פלאש">
          <span className="ml-chip-ico">🎴</span>
          כרטיסיות
        </button>
        <button className="ml-chip" onClick={onShowAbout}>
          <span className="ml-chip-ico">★</span>
          {favCount > 0 ? `${favCount} מועדפים` : 'מועדפים'}
        </button>
        <div className="ml-counter" title="מושגים שנלמדו">
          <span className="ml-counter-num">{studiedCount}</span>
          <span className="ml-counter-lbl">נלמדו</span>
        </div>
        <button className="ml-mode" onClick={() => setDark(!dark)} aria-label="מצב לילה">
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>
    </header>
  );
}

// ============ HERO + SEARCH ============
function Hero({ query, setQuery, onSurprise, totalTerms, resultCount, inputRef }) {
  const showing = !!query.trim();
  return (
    <section className="ml-hero">
      {/* Floating doodles around the search */}
      <div className="ml-doodle ml-doodle-1"><FlaskDoodle size={70} /></div>
      <div className="ml-doodle ml-doodle-2"><DnaDoodle size={90} /></div>
      <div className="ml-doodle ml-doodle-3"><CellDoodle size={75} /></div>
      <div className="ml-doodle ml-doodle-4"><LeafDoodle size={60} /></div>
      <div className="ml-doodle ml-doodle-5"><AtomDoodle size={70} /></div>
      <div className="ml-doodle ml-doodle-6"><MicroscopeDoodle size={68} /></div>
      <div className="ml-doodle ml-doodle-7"><BacteriaDoodle size={65} /></div>
      <div className="ml-doodle ml-doodle-8"><HeartDoodle size={58} /></div>

      <div className="ml-hero-inner">
        <h1 className="ml-h1">
          חיפוש <span className="ml-h1-accent">מושגים<HighlightUnderline width={160} /></span> לבגרות בביולוגיה
        </h1>
        <p className="ml-tagline">
          {totalTerms} מושגים · 5 יח״ל · מנוקדים, מסודרים, מובנים
          <SquiggleDoodle width={80} color="var(--green)" className="ml-tag-sq" />
        </p>

        <div className="ml-search-wrap">
          <div className="ml-search">
            <span className="ml-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.2"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              className="ml-search-input"
              placeholder="חפשו מושג… (למשל: אוסמוזה, מיטוזה, אנזים)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="ml-search-clear" onClick={() => setQuery('')} aria-label="נקה">×</button>
            )}
            <button className="ml-search-surprise" onClick={onSurprise} title="הפתיעו אותי — מושג רנדומלי">
              <span className="ml-surprise-emoji">🎲</span>
              <span className="ml-surprise-text">הפתיעו אותי</span>
            </button>
          </div>
          <div className="ml-search-glow" aria-hidden="true"></div>
        </div>

        {showing && (
          <div className="ml-results-count">
            <SparkDoodle size={16} />
            <strong>{resultCount}</strong> תוצאות עבור "<em>{query}</em>"
          </div>
        )}
      </div>
    </section>
  );
}

// ============ LETTER FILTER ============
function LetterFilter({ activeLetter, setActiveLetter, letterCounts }) {
  return (
    <div className="ml-letter-strip" role="tablist" aria-label="סינון לפי אות">
      <button
        className={`ml-letter ${!activeLetter ? 'is-active' : ''}`}
        onClick={() => setActiveLetter('')}
      >
        הכל
      </button>
      {HEB_LETTERS.map(l => (
        <button
          key={l}
          className={`ml-letter ${activeLetter === l ? 'is-active' : ''} ${!letterCounts[l] ? 'is-empty' : ''}`}
          onClick={() => setActiveLetter(activeLetter === l ? '' : l)}
          disabled={!letterCounts[l]}
          title={`${letterCounts[l] || 0} מושגים`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ============ TERM CARD ============
function TermCard({ term, query, isFav, isStudied, onToggleFav, onToggleStudied, onShowFlashcard }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (term.definition || '').length > 180;
  const def = isLong && !expanded ? term.definition.slice(0, 180) + '…' : term.definition;
  return (
    <article className={`ml-card ${isStudied ? 'is-studied' : ''}`}>
      <div className="ml-card-head">
        <div className="ml-card-title-wrap">
          <span className="ml-card-letter" aria-hidden="true">{term.letter}</span>
          <div>
            <h3 className="ml-card-title">{highlight(term.hebrew, query)}</h3>
            {term.english && <p className="ml-card-en">{highlight(term.english, query)}</p>}
          </div>
        </div>
        <div className="ml-card-actions">
          <button
            className={`ml-icon-btn ${isFav ? 'is-on' : ''}`}
            onClick={onToggleFav}
            title={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
            aria-label="מועדף"
          >
            {isFav ? '★' : '☆'}
          </button>
          <button
            className={`ml-icon-btn ${isStudied ? 'is-on-check' : ''}`}
            onClick={onToggleStudied}
            title={isStudied ? 'בטל סימון נלמד' : 'סמן כנלמד'}
            aria-label="נלמד"
          >
            {isStudied ? '✓' : '○'}
          </button>
        </div>
      </div>
      <p className="ml-card-def">{highlight(def, query)}</p>
      {isLong && (
        <button className="ml-card-more" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'הצג פחות' : 'קרא עוד'}
        </button>
      )}
    </article>
  );
}

// ============ RESULTS LIST ============
function Results({ items, query, favorites, toggleFav, studied, toggleStudied, onShowFlashcard, showFavOnly, setShowFavOnly, favCount }) {
  if (items.length === 0) {
    return (
      <div className="ml-empty">
        <div className="ml-empty-illu">
          <MicroscopeDoodle size={120} />
        </div>
        <h3>לא נמצאו תוצאות</h3>
        <p>נסו לחפש מושג אחר, או בדקו את האיות.{query ? ` חיפשתם: "${query}"` : ''}</p>
      </div>
    );
  }
  return (
    <section className="ml-results">
      <div className="ml-results-bar">
        <div className="ml-results-bar-info">
          <strong>{items.length}</strong> מושגים
        </div>
        <label className={`ml-fav-toggle ${showFavOnly ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            checked={showFavOnly}
            onChange={e => setShowFavOnly(e.target.checked)}
          />
          <span className="ml-fav-toggle-vis">★</span>
          רק מועדפים ({favCount})
        </label>
      </div>
      <div className="ml-grid">
        {items.map(t => (
          <TermCard
            key={t.hebrew + t.letter}
            term={t}
            query={query}
            isFav={favorites.includes(t.hebrew)}
            isStudied={studied.includes(t.hebrew)}
            onToggleFav={() => toggleFav(t.hebrew)}
            onToggleStudied={() => toggleStudied(t.hebrew)}
            onShowFlashcard={() => onShowFlashcard(t)}
          />
        ))}
      </div>
    </section>
  );
}

// ============ FLASHCARDS MODE ============
function Flashcards({ items, onClose, studied, toggleStudied, favorites, toggleFav }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [deckMode, setDeckMode] = useState('all'); // all | favorites | unstudied

  const deck = useMemo(() => {
    if (deckMode === 'favorites') return items.filter(t => favorites.includes(t.hebrew));
    if (deckMode === 'unstudied') return items.filter(t => !studied.includes(t.hebrew));
    return items;
  }, [items, deckMode, favorites, studied]);

  useEffect(() => { setIdx(0); setFlipped(false); }, [deckMode]);

  const term = deck[idx];

  const next = useCallback(() => {
    setFlipped(false);
    setIdx(i => (i + 1) % Math.max(1, deck.length));
  }, [deck.length]);
  const prev = useCallback(() => {
    setFlipped(false);
    setIdx(i => (i - 1 + deck.length) % Math.max(1, deck.length));
  }, [deck.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') next();   // RTL: left arrow = next
      if (e.key === 'ArrowRight') prev();
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  return (
    <div className="ml-fc-overlay" role="dialog" aria-modal="true">
      <div className="ml-fc-bg-doodles">
        <div className="ml-fc-bgd ml-fc-bgd-1"><DnaDoodle size={140} /></div>
        <div className="ml-fc-bgd ml-fc-bgd-2"><CellDoodle size={120} /></div>
        <div className="ml-fc-bgd ml-fc-bgd-3"><AtomDoodle size={110} /></div>
        <div className="ml-fc-bgd ml-fc-bgd-4"><FlaskDoodle size={100} /></div>
      </div>
      <button className="ml-fc-close" onClick={onClose} aria-label="סגור">×</button>
      <div className="ml-fc-header">
        <h2>🎴 כרטיסיות פלאש</h2>
        <div className="ml-fc-mode">
          <button className={deckMode==='all'?'is-on':''} onClick={() => setDeckMode('all')}>הכל ({items.length})</button>
          <button className={deckMode==='unstudied'?'is-on':''} onClick={() => setDeckMode('unstudied')}>לא נלמדו ({items.filter(t=>!studied.includes(t.hebrew)).length})</button>
          <button className={deckMode==='favorites'?'is-on':''} onClick={() => setDeckMode('favorites')}>מועדפים ({favorites.length})</button>
        </div>
      </div>

      {deck.length === 0 ? (
        <div className="ml-fc-empty">
          <p>אין כרטיסיות בערימה הזו.</p>
          <button onClick={() => setDeckMode('all')}>חזרה לכל הכרטיסיות</button>
        </div>
      ) : (
        <>
          <div className="ml-fc-progress">
            <span>{idx + 1} / {deck.length}</span>
            <div className="ml-fc-bar"><div style={{ width: `${((idx+1)/deck.length)*100}%` }}></div></div>
          </div>
          <div className={`ml-fc-card ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(f => !f)}>
            <div className="ml-fc-face ml-fc-front">
              <span className="ml-fc-letter">{term.letter}</span>
              <h3>{term.hebrew}</h3>
              {term.english && <p className="ml-fc-en">{term.english}</p>}
              <p className="ml-fc-hint">לחצו לתשובה ↻</p>
            </div>
            <div className="ml-fc-face ml-fc-back">
              <h4>{term.hebrew}</h4>
              <p>{term.definition}</p>
              <p className="ml-fc-hint">לחצו לחזרה ↻</p>
            </div>
          </div>
          <div className="ml-fc-controls">
            <button className="ml-fc-nav" onClick={next} aria-label="הבא">→</button>
            <button
              className={`ml-fc-mark ${studied.includes(term.hebrew) ? 'is-on' : ''}`}
              onClick={() => toggleStudied(term.hebrew)}
            >
              {studied.includes(term.hebrew) ? '✓ נלמד' : 'סמן כנלמד'}
            </button>
            <button
              className={`ml-fc-mark ${favorites.includes(term.hebrew) ? 'is-fav' : ''}`}
              onClick={() => toggleFav(term.hebrew)}
            >
              {favorites.includes(term.hebrew) ? '★ מועדף' : '☆ למועדפים'}
            </button>
            <button className="ml-fc-nav" onClick={prev} aria-label="הקודם">←</button>
          </div>
          <p className="ml-fc-kbd">חיצי מקלדת = ניווט · רווח = הפיכה · Esc = יציאה</p>
        </>
      )}
    </div>
  );
}

// ============ ABOUT + BOOKS SECTION ============
function MediLabAd() {
  return (
    <section className="ml-ad">
      <div className="ml-ad-doodles">
        <div className="ml-ad-d ml-ad-d-1"><DnaDoodle size={80} /></div>
        <div className="ml-ad-d ml-ad-d-2"><CellDoodle size={70} /></div>
        <div className="ml-ad-d ml-ad-d-3"><LeafDoodle size={60} /></div>
      </div>

      {/* === ABOUT ROW === */}
      <div className="ml-about">
        <div className="ml-about-photo-wrap">
          <div className="ml-about-photo">
            <img src="portrait.jpg" alt="נתנאל יוחאי מדינה" />
          </div>
          <div className="ml-about-badge">
            <SparkDoodle size={14} />
            <span>10 שנות הוראה</span>
          </div>
          <div className="ml-about-doodle-1"><FlaskDoodle size={50} /></div>
        </div>

        <div className="ml-about-text">
          <p className="ml-ad-kicker">שיעורים פרטיים · ביולוגיה 5 יח״ל · ביוטכנולוגיה 10 יח״ל</p>
          <h2 className="ml-ad-title">
            נעים להכיר — אני <span className="ml-ad-accent">נתנאל.<HighlightUnderline width={140} color="#F9D85C"/></span>
          </h2>
          <p className="ml-ad-body">
            מורה לביולוגיה ולביוטכנולוגיה עם <em>10 שנות ניסיון בתיכון</em>, מגיש תלמידים לבגרויות בביולוגיה (5 יח״ל) ובביוטכנולוגיה (10 יח״ל).
            מעביר שיעורים פרטיים אחד-על-אחד או בקבוצות קטנות — מקוון בזום או פרונטלי במרכז ״כיוונים״ באשדוד.
          </p>
          <p className="ml-ad-body ml-about-quote">
            אני מאמין שלכל תלמיד יש דרך משלו להבין, והתפקיד שלי הוא למצוא אותה.
          </p>

          <div className="ml-degrees">
            <span className="ml-degrees-label">בוגר 3 תארים:</span>
            <div className="ml-degrees-list">
              <div className="ml-degree">
                <span className="ml-degree-tag">B.Sc</span>
                <div>
                  <strong>תואר ראשון בביולוגיה</strong>
                  <span>אוניברסיטת חיפה</span>
                </div>
              </div>
              <div className="ml-degree">
                <span className="ml-degree-tag">M.Teach</span>
                <div>
                  <strong>תואר שני בהוראת המדעים</strong>
                  <span>מכון ויצמן למדע</span>
                </div>
              </div>
              <div className="ml-degree">
                <span className="ml-degree-tag">M.Sc</span>
                <div>
                  <strong>תואר שני במדעים</strong>
                  <span>מכון ויצמן למדע</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ml-ad-stats">
            <div className="ml-ad-stat">
              <span className="ml-ad-stat-n">10</span>
              <span className="ml-ad-stat-l">שנות הוראה</span>
            </div>
            <div className="ml-ad-stat">
              <span className="ml-ad-stat-n">1,600+</span>
              <span className="ml-ad-stat-l">שאלות בגרות</span>
            </div>
            <div className="ml-ad-stat">
              <span className="ml-ad-stat-n">3</span>
              <span className="ml-ad-stat-l">ספרי עזר</span>
            </div>
          </div>

          <div className="ml-ad-cta">
            <a className="ml-ad-btn ml-ad-btn-primary" href="https://wa.me/972524295838?text=%D7%94%D7%99%D7%99%2C%20%D7%A8%D7%90%D7%99%D7%AA%D7%99%20%D7%90%D7%AA%20%D7%9E%D7%A0%D7%95%D7%A2%20%D7%94%D7%97%D7%99%D7%A4%D7%95%D7%A9%20%D7%95%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A7%D7%91%D7%95%D7%A2%20%D7%A9%D7%99%D7%A2%D7%95%D7%A8%20%D7%94%D7%99%D7%9B%D7%A8%D7%95%D7%AA" target="_blank" rel="noopener">
              <span>קבעו שיעור היכרות</span>
              <ArrowDoodle width={36} color="white" />
            </a>
            <a className="ml-ad-btn ml-ad-btn-ghost" href="https://nethanelmedina88-cmyk.github.io/Bio_MediLab/" target="_blank" rel="noopener">
              לאתר המלא ←
            </a>
          </div>
          <p className="ml-ad-fine">
            ☎ <a href="tel:+972524295838">052-429-5838</a>  ·  📷 <a href="https://instagram.com/bio_bagrut" target="_blank" rel="noopener">@bio_bagrut</a>
          </p>
        </div>
      </div>

      {/* === BOOKS ROW === */}
      <div className="ml-books">
        <div className="ml-books-head">
          <h3 className="ml-books-title">
            שלושת הספרים <span className="ml-ad-accent">שכתבתי<HighlightUnderline width={110} color="#F9D85C"/></span>
          </h3>
          <p className="ml-books-sub">מותאמים לתוכנית הלימודים החדשה תשפ״ו · מנוקדים, מאוירים, נגישים</p>
        </div>

        <div className="ml-books-grid">
          <a className="ml-book-card" href="https://wa.me/972524295838?text=%D7%94%D7%99%D7%99%2C%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%A1%D7%A4%D7%A8%20%D7%94%D7%A9%D7%90%D7%9C%D7%95%D7%AA" target="_blank" rel="noopener">
            <div className="ml-book-cover">
              <img src="book-questions.png" alt="ספר השאלות" />
            </div>
            <div className="ml-book-info">
              <span className="ml-book-tag">מהדורה II</span>
              <h4>ספר השאלות</h4>
              <p>1,674 שאלות בגרות בנושאי הליבה וההעמקה, מסודרות לפי נושא ותת-נושא.</p>
              <span className="ml-book-price">₪149</span>
            </div>
          </a>

          <a className="ml-book-card" href="https://wa.me/972524295838?text=%D7%94%D7%99%D7%99%2C%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%A1%D7%A4%D7%A8%20%D7%A7%D7%98%D7%A2%D7%99%20%D7%94%D7%9E%D7%97%D7%A7%D7%A8" target="_blank" rel="noopener">
            <div className="ml-book-cover">
              <img src="book-research.png" alt="קטעי מחקר" />
            </div>
            <div className="ml-book-info">
              <span className="ml-book-tag">פורמט בגרות</span>
              <h4>קטעי מחקר</h4>
              <p>50 קטעי מחקר עם שאלות מקוריות, הצעות פתרון והסברים מפורטים.</p>
              <span className="ml-book-price">₪95</span>
            </div>
          </a>

          <a className="ml-book-card ml-book-featured" href="https://wa.me/972524295838?text=%D7%94%D7%99%D7%99%2C%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%9E%D7%95%D7%A0%D7%97%D7%95%D7%9F" target="_blank" rel="noopener">
            <span className="ml-book-ribbon">המילון הזה ↓</span>
            <div className="ml-book-cover">
              <img src="book-glossary.png" alt="מונחון" />
            </div>
            <div className="ml-book-info">
              <span className="ml-book-tag">תשפ״ו · 2026</span>
              <h4>מונחון</h4>
              <p>מילון מודפס של 452 מושגים, מנוקד על ידי DICTA ומאויר — בדיוק מה שיש פה.</p>
              <span className="ml-book-price">₪69</span>
            </div>
          </a>
        </div>

        <div className="ml-bundle">
          <div className="ml-bundle-left">
            <span className="ml-bundle-rib">מבצע · החבילה המלאה</span>
            <h4>שלושת הספרים יחד</h4>
            <p>ספר השאלות + קטעי מחקר + מונחון — כל הארגז המלא לבגרות</p>
          </div>
          <div className="ml-bundle-right">
            <div className="ml-bundle-price">
              <span className="ml-ad-price-old">₪313</span>
              <span className="ml-ad-price-new">₪249</span>
              <span className="ml-ad-price-save">חוסכים ₪64</span>
            </div>
            <a className="ml-ad-card-cta" href="https://wa.me/972524295838?text=%D7%94%D7%99%D7%99%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%97%D7%91%D7%99%D7%9C%D7%AA%20%D7%94%D7%9E%D7%91%D7%A6%D7%A2" target="_blank" rel="noopener">
              לרכישת החבילה →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ FOOTER ============
function Footer({ studiedCount, total }) {
  return (
    <footer className="ml-footer">
      <div className="ml-footer-row">
        <div className="ml-footer-brand">
          <img src="logo.jpg" alt="MediLab" />
          <span>MediLab · מדע קצר ולעניין</span>
        </div>
        <div className="ml-footer-progress">
          התקדמת ב-<strong>{studiedCount}</strong> מתוך <strong>{total}</strong> מושגים
          <div className="ml-footer-bar"><div style={{ width: `${(studiedCount/total)*100}%` }}></div></div>
        </div>
        <div className="ml-footer-links">
          <a href="https://wa.me/972524295838" target="_blank" rel="noopener">WhatsApp</a>
          <a href="https://instagram.com/bio_bagrut" target="_blank" rel="noopener">Instagram</a>
          <a href="https://nethanelmedina88-cmyk.github.io/Bio_MediLab/" target="_blank" rel="noopener">האתר</a>
        </div>
      </div>
      <p className="ml-footer-fine">© 2026 MediLab · נתנאל יוחאי מדינה · ביולוגיה 5 יח״ל · ביוטכנולוגיה 10 יח״ל</p>
    </footer>
  );
}

// ============ MAIN APP ============
function App() {
  const [query, setQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState('');
  const [dark, setDark] = useLocal('ml-dark', false);
  const [favorites, setFavorites] = useLocal('ml-favorites', []);
  const [studied, setStudied] = useLocal('ml-studied', []);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [highlightedTerm, setHighlightedTerm] = useState(null);
  const inputRef = useRef(null);

  const all = window.GLOSSARY || [];

  useEffect(() => {
    document.documentElement.classList.toggle('is-dark', dark);
  }, [dark]);

  const toggleFav = (h) => setFavorites(f => f.includes(h) ? f.filter(x => x !== h) : [...f, h]);
  const toggleStudied = (h) => setStudied(f => f.includes(h) ? f.filter(x => x !== h) : [...f, h]);

  // letter counts
  const letterCounts = useMemo(() => {
    const c = {};
    for (const t of all) c[t.letter] = (c[t.letter] || 0) + 1;
    return c;
  }, [all]);

  // filter results
  const filtered = useMemo(() => {
    const q = normalize(query);
    let items = all;
    if (activeLetter) items = items.filter(t => t.letter === activeLetter);
    if (showFavOnly) items = items.filter(t => favorites.includes(t.hebrew));
    if (q) {
      items = items.filter(t =>
        normalize(t.hebrew).includes(q) ||
        normalize(t.english).includes(q) ||
        normalize(t.definition).includes(q)
      );
      // sort by relevance: title match first
      items = [...items].sort((a, b) => {
        const aT = normalize(a.hebrew).includes(q) ? 0 : normalize(a.english).includes(q) ? 1 : 2;
        const bT = normalize(b.hebrew).includes(q) ? 0 : normalize(b.english).includes(q) ? 1 : 2;
        return aT - bT;
      });
    }
    return items;
  }, [all, query, activeLetter, showFavOnly, favorites]);

  const onSurprise = () => {
    const pool = filtered.length > 0 ? filtered : all;
    const t = pool[Math.floor(Math.random() * pool.length)];
    setQuery(t.hebrew);
    setActiveLetter('');
    setHighlightedTerm(t.hebrew);
    setTimeout(() => {
      const el = document.querySelector('.ml-results');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="ml-app">
      <Header
        dark={dark}
        setDark={setDark}
        favCount={favorites.length}
        studiedCount={studied.length}
        onOpenFlashcards={() => setShowFlashcards(true)}
        onShowAbout={() => setShowFavOnly(s => !s)}
      />
      <Hero
        query={query}
        setQuery={setQuery}
        onSurprise={onSurprise}
        totalTerms={all.length}
        resultCount={filtered.length}
        inputRef={inputRef}
      />
      <LetterFilter
        activeLetter={activeLetter}
        setActiveLetter={setActiveLetter}
        letterCounts={letterCounts}
      />
      <Results
        items={filtered}
        query={query}
        favorites={favorites}
        toggleFav={toggleFav}
        studied={studied}
        toggleStudied={toggleStudied}
        onShowFlashcard={() => setShowFlashcards(true)}
        showFavOnly={showFavOnly}
        setShowFavOnly={setShowFavOnly}
        favCount={favorites.length}
      />
      <MediLabAd />
      <Footer studiedCount={studied.length} total={all.length} />
      {showFlashcards && (
        <Flashcards
          items={filtered.length > 0 ? filtered : all}
          onClose={() => setShowFlashcards(false)}
          studied={studied}
          toggleStudied={toggleStudied}
          favorites={favorites}
          toggleFav={toggleFav}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
