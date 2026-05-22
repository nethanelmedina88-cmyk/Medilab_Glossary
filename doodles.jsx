// Hand-drawn SVG doodles in MediLab brand style (turquoise + green)
// Each doodle uses sketchy strokes — slight irregularities, doubled lines

const BLUE = '#3FA9D6';
const BLUE_DARK = '#1B6FA8';
const GREEN = '#5CB85C';
const GREEN_DARK = '#3F8C3F';

function FlaskDoodle({ size = 80, className = '' }) {
  return (
    <svg viewBox="0 0 80 100" width={size} height={size * 1.25} className={className} style={{ overflow: 'visible' }}>
      {/* bubbles rising */}
      <circle cx="40" cy="8" r="2.5" fill="none" stroke={BLUE} strokeWidth="1.5"/>
      <circle cx="46" cy="14" r="1.8" fill="none" stroke={BLUE} strokeWidth="1.5"/>
      <circle cx="36" cy="18" r="2" fill="none" stroke={BLUE} strokeWidth="1.5"/>
      <circle cx="44" cy="22" r="1.4" fill="none" stroke={GREEN} strokeWidth="1.5"/>
      {/* neck */}
      <path d="M 32 28 L 32 45 L 14 90 Q 14 95, 19 95 L 61 95 Q 66 95, 66 90 L 48 45 L 48 28 L 32 28 Z"
        fill="none" stroke={BLUE_DARK} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      {/* liquid */}
      <path d="M 24 70 Q 30 67 40 70 T 56 70 L 61 90 Q 61 93, 58 93 L 22 93 Q 19 93, 19 90 Z"
        fill={GREEN} opacity="0.55"/>
      <path d="M 24 70 Q 30 67 40 70 T 56 70" fill="none" stroke={BLUE_DARK} strokeWidth="1.8"/>
      {/* highlight */}
      <path d="M 36 50 L 34 70" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

function CellDoodle({ size = 90, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      {/* membrane (wavy circle) */}
      <path d="M 50 8 Q 70 6 82 22 Q 96 38 92 56 Q 88 78 70 88 Q 50 96 30 88 Q 10 78 8 56 Q 6 38 18 22 Q 30 6 50 8 Z"
        fill="#E8F4F8" stroke={BLUE_DARK} strokeWidth="2.2"/>
      {/* nucleus */}
      <circle cx="50" cy="50" r="16" fill={GREEN} opacity="0.4" stroke={BLUE_DARK} strokeWidth="2"/>
      <circle cx="50" cy="50" r="4" fill={BLUE_DARK}/>
      {/* organelles */}
      <ellipse cx="28" cy="38" rx="6" ry="4" fill="none" stroke={GREEN_DARK} strokeWidth="1.6"/>
      <ellipse cx="72" cy="64" rx="5" ry="3.5" fill="none" stroke={GREEN_DARK} strokeWidth="1.6"/>
      <ellipse cx="32" cy="72" rx="4" ry="3" fill="none" stroke={BLUE} strokeWidth="1.6"/>
      <circle cx="74" cy="34" r="3" fill="none" stroke={BLUE} strokeWidth="1.6"/>
    </svg>
  );
}

function DnaDoodle({ size = 80, className = '' }) {
  return (
    <svg viewBox="0 0 60 120" width={size * 0.5} height={size * 1} className={className}>
      {/* helix backbone */}
      <path d="M 12 5 Q 50 25 12 45 Q -26 65 12 85 Q 50 105 12 115" fill="none" stroke={BLUE_DARK} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M 48 5 Q 10 25 48 45 Q 86 65 48 85 Q 10 105 48 115" fill="none" stroke={GREEN_DARK} strokeWidth="2.2" strokeLinecap="round"/>
      {/* rungs */}
      {[12, 24, 36, 48, 60, 72, 84, 96, 108].map((y, i) => {
        const o = Math.sin((y / 120) * Math.PI * 2) * 18;
        return (
          <line key={i} x1={30 - o} y1={y} x2={30 + o} y2={y} stroke={i % 2 ? GREEN : BLUE} strokeWidth="2" strokeLinecap="round"/>
        );
      })}
    </svg>
  );
}

function MicroscopeDoodle({ size = 80, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      {/* base */}
      <path d="M 22 88 L 78 88 L 74 92 L 26 92 Z" fill={BLUE_DARK}/>
      <ellipse cx="50" cy="78" rx="22" ry="4" fill="none" stroke={BLUE_DARK} strokeWidth="2"/>
      {/* arm */}
      <path d="M 42 78 L 42 50 Q 42 42 50 42 L 58 42" fill="none" stroke={BLUE_DARK} strokeWidth="3" strokeLinecap="round"/>
      {/* eyepiece tube */}
      <rect x="48" y="16" width="14" height="28" fill={GREEN} stroke={BLUE_DARK} strokeWidth="2" rx="2"/>
      <ellipse cx="55" cy="14" rx="9" ry="3" fill={BLUE_DARK}/>
      {/* objective */}
      <path d="M 50 44 L 46 56 L 64 56 L 60 44 Z" fill={BLUE} stroke={BLUE_DARK} strokeWidth="2"/>
      {/* slide */}
      <line x1="30" y1="68" x2="70" y2="68" stroke={BLUE_DARK} strokeWidth="2.5"/>
    </svg>
  );
}

function LeafDoodle({ size = 70, className = '' }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className}>
      <path d="M 12 68 Q 8 32 32 14 Q 60 0 72 14 Q 78 36 56 60 Q 36 76 12 68 Z"
        fill={GREEN} opacity="0.35" stroke={GREEN_DARK} strokeWidth="2"/>
      <path d="M 12 68 Q 32 52 56 28" fill="none" stroke={GREEN_DARK} strokeWidth="2" strokeLinecap="round"/>
      <path d="M 22 56 L 30 50" stroke={GREEN_DARK} strokeWidth="1.5"/>
      <path d="M 32 48 L 40 40" stroke={GREEN_DARK} strokeWidth="1.5"/>
      <path d="M 42 38 L 50 32" stroke={GREEN_DARK} strokeWidth="1.5"/>
    </svg>
  );
}

function HeartDoodle({ size = 70, className = '' }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className}>
      <path d="M 40 70 Q 12 50 12 32 Q 12 18 24 18 Q 34 18 40 28 Q 46 18 56 18 Q 68 18 68 32 Q 68 50 40 70 Z"
        fill="#FCE8E8" stroke="#C44747" strokeWidth="2.2"/>
      {/* veins */}
      <path d="M 28 30 Q 34 38 40 36" fill="none" stroke="#C44747" strokeWidth="1.5"/>
      <path d="M 52 30 Q 46 38 40 36" fill="none" stroke="#C44747" strokeWidth="1.5"/>
      <path d="M 40 36 L 40 56" stroke="#C44747" strokeWidth="1.5"/>
    </svg>
  );
}

function AtomDoodle({ size = 80, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke={BLUE} strokeWidth="2"/>
      <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke={GREEN} strokeWidth="2" transform="rotate(60 50 50)"/>
      <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke={BLUE_DARK} strokeWidth="2" transform="rotate(120 50 50)"/>
      <circle cx="50" cy="50" r="6" fill={GREEN_DARK}/>
      <circle cx="86" cy="50" r="3" fill={BLUE}/>
      <circle cx="32" cy="78" r="3" fill={GREEN}/>
      <circle cx="32" cy="22" r="3" fill={BLUE_DARK}/>
    </svg>
  );
}

function BacteriaDoodle({ size = 80, className = '' }) {
  return (
    <svg viewBox="0 0 100 80" width={size} height={size * 0.8} className={className}>
      <ellipse cx="50" cy="40" rx="32" ry="18" fill="#D6F0E0" stroke={GREEN_DARK} strokeWidth="2"/>
      {/* flagella */}
      <path d="M 82 40 Q 90 32 88 24 Q 86 20 90 16" fill="none" stroke={GREEN_DARK} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M 18 40 Q 10 48 12 56 Q 14 60 10 64" fill="none" stroke={GREEN_DARK} strokeWidth="1.6" strokeLinecap="round"/>
      {/* dots */}
      <circle cx="40" cy="36" r="2" fill={GREEN_DARK}/>
      <circle cx="56" cy="44" r="2" fill={GREEN_DARK}/>
      <circle cx="48" cy="30" r="1.5" fill={GREEN_DARK}/>
    </svg>
  );
}

function SquiggleDoodle({ width = 100, color = BLUE, strokeWidth = 2, className = '' }) {
  return (
    <svg viewBox="0 0 100 20" width={width} height={width * 0.2} className={className} preserveAspectRatio="none">
      <path d="M 2 10 Q 12 2, 22 10 T 42 10 T 62 10 T 82 10 T 98 10" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  );
}

function StarDoodle({ size = 24, color = '#F4B942', className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path d="M 12 2 L 14.5 9 L 22 9.5 L 16 14 L 18 21 L 12 17 L 6 21 L 8 14 L 2 9.5 L 9.5 9 Z"
        fill={color} stroke={BLUE_DARK} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function SparkDoodle({ size = 20, color = '#F4B942', className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path d="M 12 2 L 13 10 L 22 12 L 13 14 L 12 22 L 11 14 L 2 12 L 11 10 Z"
        fill={color} stroke={color} strokeWidth="1"/>
    </svg>
  );
}

function ArrowDoodle({ width = 100, color = BLUE_DARK, className = '' }) {
  return (
    <svg viewBox="0 0 120 40" width={width} height={width * 0.33} className={className}>
      <path d="M 5 20 Q 30 5, 60 20 T 110 20" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M 110 20 L 100 12 M 110 20 L 100 28" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function HighlightUnderline({ width = 120, color = '#F9D85C', className = '' }) {
  return (
    <svg viewBox="0 0 120 14" width={width} height={width * 0.12} className={className} preserveAspectRatio="none">
      <path d="M 4 7 Q 30 11, 60 6 T 116 7" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

Object.assign(window, {
  FlaskDoodle, CellDoodle, DnaDoodle, MicroscopeDoodle, LeafDoodle, HeartDoodle,
  AtomDoodle, BacteriaDoodle, SquiggleDoodle, StarDoodle, SparkDoodle, ArrowDoodle, HighlightUnderline,
  DOODLE_BLUE: BLUE, DOODLE_BLUE_DARK: BLUE_DARK, DOODLE_GREEN: GREEN, DOODLE_GREEN_DARK: GREEN_DARK,
});
