// Hero illustration: a Koshi's delivery rider on a scooter heading to the customer's pin.
// Original artwork drawn in the brand colours (see :root in index.css). Pure SVG — no image file to load.
export default function HeroIllustration() {
  return (
    <svg
      className="hero-illustration"
      viewBox="0 0 560 440"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A Koshi's delivery rider on a scooter bringing food to your door"
    >
      <defs>
      <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff4ea"/><stop offset="1" stopColor="#ffe3cf"/></linearGradient>
      <linearGradient id="hero-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffdfb"/><stop offset="1" stopColor="#f6dcc8"/></linearGradient>
      <linearGradient id="hero-box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd43b"/><stop offset="1" stopColor="#f59f00"/></linearGradient>
      </defs>
      <rect width="560" height="440" fill="url(#hero-sky)"/>
      {/* sun */}
      <circle cx="330" cy="190" r="150" fill="#ffd8bf" opacity=".55"/>
      <circle cx="330" cy="190" r="104" fill="#ffcba4" opacity=".45"/>
      {/* clouds */}
      <g fill="#fff" opacity=".9">
      <path d="M180 70a18 18 0 0 1 34-6a14 14 0 0 1 22 12h-62a9 9 0 0 1 6-6z"/>
      <path d="M404 58a16 16 0 0 1 30-5a12 12 0 0 1 19 10h-54a8 8 0 0 1 5-5z"/>
      </g>
      {/* skyline */}
      <g fill="#ffc9a3" opacity=".75">
      <rect x="18" y="238" width="46" height="112" rx="6"/><rect x="70" y="206" width="38" height="144" rx="6"/>
      <rect x="440" y="222" width="42" height="128" rx="6"/><rect x="488" y="252" width="56" height="98" rx="6"/>
      </g>
      <g fill="#fff" opacity=".7">
      <rect x="28" y="252" width="8" height="10" rx="2"/><rect x="44" y="252" width="8" height="10" rx="2"/><rect x="28" y="272" width="8" height="10" rx="2"/>
      <rect x="80" y="222" width="8" height="10" rx="2"/><rect x="94" y="222" width="8" height="10" rx="2"/><rect x="80" y="242" width="8" height="10" rx="2"/>
      <rect x="452" y="236" width="8" height="10" rx="2"/><rect x="466" y="236" width="8" height="10" rx="2"/><rect x="500" y="266" width="8" height="10" rx="2"/><rect x="516" y="266" width="8" height="10" rx="2"/>
      </g>
      {/* route to destination */}
      <path d="M34 170 C 120 120, 230 170, 330 72 S 450 60, 478 92" fill="none" stroke="#d9480f" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" opacity=".7"/>
      <circle cx="34" cy="170" r="7" fill="#fff" stroke="#d9480f" strokeWidth="3"/>
      <g transform="translate(478 96)">
      <path d="M0 -44c-15 0-26 11-26 25c0 19 26 41 26 41s26-22 26-41c0-14-11-25-26-25z" fill="#d9480f"/>
      <circle cx="0" cy="-19" r="10" fill="#fff"/>
      <ellipse cx="0" cy="26" rx="14" ry="4" fill="#1f1a17" opacity=".12"/>
      </g>
      {/* road */}
      <rect x="0" y="350" width="560" height="90" fill="#5a4a42"/>
      <rect x="0" y="350" width="560" height="7" fill="#7a675d"/>
      <g fill="#fff" opacity=".55"><rect x="20" y="392" width="44" height="6" rx="3"/><rect x="110" y="392" width="44" height="6" rx="3"/><rect x="200" y="392" width="44" height="6" rx="3"/><rect x="290" y="392" width="44" height="6" rx="3"/><rect x="380" y="392" width="44" height="6" rx="3"/><rect x="470" y="392" width="44" height="6" rx="3"/></g>
      {/* speed lines */}
      <g stroke="#d9480f" strokeLinecap="round" opacity=".45" strokeWidth="6">
      <line x1="24" y1="212" x2="84" y2="212"/><line x1="8" y1="244" x2="78" y2="244"/><line x1="36" y1="276" x2="90" y2="276"/>
      </g>
      {/* exhaust puffs */}
      <g fill="#fff" opacity=".85"><circle cx="112" cy="318" r="10"/><circle cx="94" cy="312" r="7"/><circle cx="80" cy="320" r="5"/></g>
      {/* shadow */}
      <ellipse cx="292" cy="352" rx="170" ry="8" fill="#1f1a17" opacity=".25"/>
      {/* delivery box */}
      <g>
      <rect x="102" y="150" width="104" height="92" rx="14" fill="url(#hero-box)"/>
      <rect x="102" y="150" width="104" height="22" rx="11" fill="#f08c00"/>
      <rect x="102" y="164" width="104" height="8" fill="#f08c00"/>
      <circle cx="154" cy="210" r="20" fill="#d9480f"/>
      <text x="154" y="218" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontWeight="700" fontSize="22" fill="#fff">K</text>
      <path d="M134 150 v-8 a6 6 0 0 1 6-6 h28 a6 6 0 0 1 6 6 v8" fill="none" stroke="#f08c00" strokeWidth="5"/>
      <rect x="112" y="242" width="86" height="8" rx="4" fill="#5c4b43"/>
      </g>
      {/* scooter */}
      <g>
      {/* rear cowl */}
      <path d="M132 312 C 128 262, 178 240, 236 244 L 300 252 L 306 306 Z" fill="url(#hero-body)" stroke="#e8c4ab" strokeWidth="2"/>
      <path d="M140 290 C 160 268, 210 262, 300 270" stroke="#d9480f" strokeWidth="7" fill="none" strokeLinecap="round"/>
      {/* floorboard */}
      <rect x="250" y="294" width="112" height="16" rx="8" fill="#3a302a"/>
      {/* seat */}
      <rect x="188" y="230" width="94" height="18" rx="9" fill="#2d2522"/>
      {/* leg shield & steering column */}
      <path d="M336 306 C 348 262, 352 232, 364 196 L 384 200 C 378 236, 376 270, 386 306 Z" fill="url(#hero-body)" stroke="#e8c4ab" strokeWidth="2"/>
      <path d="M352 290 C 358 262, 362 236, 370 212" stroke="#d9480f" strokeWidth="6" fill="none" strokeLinecap="round"/>
      {/* front fender */}
      <path d="M364 304 Q 404 262 444 304 L 434 308 Q 404 282 374 308 Z" fill="#d9480f"/>
      {/* handlebar + headlight */}
      <line x1="356" y1="194" x2="392" y2="184" stroke="#2d2522" strokeWidth="9" strokeLinecap="round"/>
      <circle cx="392" cy="210" r="11" fill="#ffe066" stroke="#2d2522" strokeWidth="4"/>
      <path d="M404 204 l34 -10 M404 214 l38 2" stroke="#ffe066" strokeWidth="4" strokeLinecap="round" opacity=".8"/>
      {/* wheels */}
      <g><circle cx="186" cy="316" r="34" fill="#1f1a17"/><circle cx="186" cy="316" r="15" fill="#a8998f"/><circle cx="186" cy="316" r="5" fill="#1f1a17"/></g>
      <g><circle cx="406" cy="316" r="34" fill="#1f1a17"/><circle cx="406" cy="316" r="15" fill="#a8998f"/><circle cx="406" cy="316" r="5" fill="#1f1a17"/></g>
      </g>
      {/* rider */}
      <g>
      {/* back leg (shadowed) */}
      <path d="M238 238 L 294 240 L 306 294" fill="none" stroke="#1c2a52" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
      {/* front leg */}
      <path d="M244 234 L 304 234 L 318 290" fill="none" stroke="#2f3f7a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M308 292 h28 a8 8 0 0 1 0 14 h-30 z" fill="#1f1a17"/>
      {/* torso / jacket */}
      <path d="M214 240 C 204 196, 222 152, 262 148 C 292 146, 306 168, 302 198 L 292 242 Z" fill="#d9480f"/>
      <path d="M238 158 C 250 176, 256 204, 254 238" stroke="#f76707" strokeWidth="6" fill="none" strokeLinecap="round"/>
      {/* arm */}
      <path d="M282 170 L 318 196 L 352 192" fill="none" stroke="#b93c0a" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="356" cy="191" r="10" fill="#2d2522"/>
      {/* neck + head */}
      <rect x="258" y="130" width="16" height="22" rx="6" fill="#c98b5b"/>
      <circle cx="270" cy="118" r="25" fill="#c98b5b"/>
      {/* helmet */}
      <path d="M242 118 C 240 86, 264 72, 286 80 C 302 86, 306 102, 304 116 L 244 122 Z" fill="#d9480f"/>
      <path d="M246 104 C 256 90, 276 84, 296 90" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <path d="M280 104 h26 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-24 z" fill="#2d2522" opacity=".85"/>
      <rect x="282" y="107" width="10" height="3" rx="1.5" fill="#fff" opacity=".6"/>
      <ellipse cx="258" cy="124" rx="5" ry="7" fill="#b87a4b"/>
      {/* smile */}
      <path d="M284 132 q6 5 12 0" stroke="#7a4a2a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  )
}
