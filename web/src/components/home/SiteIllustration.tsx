// Hand-built illustration of a generic Gulf construction site at morning haze (doc 12 §5.1).
// No real landmarks, brands or faces. Colours are fixed: the hero is navy in both themes.
const FRAME_FLOORS = [330, 290, 250, 210];
const FRAME_COLUMNS = [150, 196, 242, 288, 324];
const LATTICE_STEP = 14;

function lattice(x0: number, x1: number, yTop: number, yBottom: number): string {
  let d = "";
  for (let x = x0; x < x1; x += LATTICE_STEP) d += `M${x} ${yBottom}L${x + LATTICE_STEP / 2} ${yTop}L${x + LATTICE_STEP} ${yBottom}`;
  return d;
}

function mastLattice(x: number, width: number, yTop: number, yBottom: number): string {
  let d = "";
  for (let y = yBottom; y > yTop; y -= LATTICE_STEP) d += `M${x} ${y}L${x + width} ${y - LATTICE_STEP / 2}L${x} ${y - LATTICE_STEP}`;
  return d;
}

export function SiteIllustration() {
  return (
    <svg className="hm-site" viewBox="0 0 640 440" role="img"
      aria-label="Illustration: a construction site at morning haze with a tower crane, a concrete frame under construction, a shade canopy, a cooled rest cabin and a water station, with a low generic skyline behind.">
      <defs>
        <linearGradient id="hm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E2436" />
          <stop offset=".55" stopColor="#2B4558" />
          <stop offset=".78" stopColor="#8C8670" />
          <stop offset="1" stopColor="#CDB98F" />
        </linearGradient>
        <radialGradient id="hm-sun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#F4E2B8" stopOpacity=".55" />
          <stop offset="1" stopColor="#F4E2B8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky, low sun and haze */}
      <rect width="640" height="340" fill="url(#hm-sky)" />
      <circle cx="486" cy="196" r="110" fill="url(#hm-sun)" />
      <circle cx="486" cy="196" r="24" fill="#F2DDAE" opacity=".85" />

      {/* Generic low skyline — flat-topped blocks only */}
      <path fill="#6F7E86" opacity=".35"
        d="M0 300V262h22v-18h26v30h18v-40h30v52h20v-24h24v34h34v-46h20v-12h22v58h40v-30h26v22h30v-48h28v40h22v-26h36v38h26v-56h24v60h30v-34h26v28h22v-20h34v48z" />
      <path fill="#4F626D" opacity=".45"
        d="M0 318v-34h40v-22h30v40h36v-28h26v42h48v-36h22v30h60v-24h28v34h70v-30h32v22h40v-40h26v44h54v-26h30v32h50v-18h28v34z" />
      <rect y="292" width="640" height="48" fill="#D9C7A0" opacity=".28" />

      {/* Ground */}
      <rect y="330" width="640" height="110" fill="#C8B48C" />
      <rect y="396" width="640" height="44" fill="#B7A27A" />
      <path d="M0 404h640" stroke="#A8936B" strokeWidth="2" strokeDasharray="18 14" />

      {/* Concrete frame under construction */}
      <g fill="#8E979C">
        {FRAME_FLOORS.map((y) => <rect key={y} x="140" y={y - 6} width="196" height="7" />)}
        <rect x="140" y="164" width="104" height="7" />
        {FRAME_FLOORS.slice(1).map((y) =>
          FRAME_COLUMNS.map((x) => <rect key={`${x}-${y}`} x={x - 3} y={y} width="6" height="34" />))}
        {[150, 196, 242].map((x) => <rect key={x} x={x - 3} y="170" width="6" height="34" />)}
      </g>
      <g fill="#6F797F" opacity=".55">
        {FRAME_FLOORS.slice(1).map((y) => <rect key={y} x="140" y={y} width="196" height="3" />)}
      </g>
      {/* Rebar starters and scaffold */}
      <path d="M246 164v-14m8 14v-12m8 12v-14m8 14v-12m8 12v-14m8 14v-12m8 12v-14m8 14v-12m8 12v-14m8 14v-12"
        stroke="#5E676C" strokeWidth="1.5" />
      <path d="M128 330V206m-10 124V206M118 230h10m-10 30h10m-10 30h10m-10 26h10" stroke="#A9B1B5" strokeWidth="1.5" />

      {/* Tower crane */}
      <g stroke="#E2D8C3" strokeWidth="1.5" fill="none">
        <rect x="352" y="76" width="14" height="254" />
        <path d={mastLattice(352, 14, 76, 330)} />
        <path d="M359 40 352 76m7-36 7 36M359 40 108 70m251-30 104 30" strokeWidth="1.2" />
        <rect x="108" y="70" width="244" height="10" />
        <path d={lattice(108, 352, 70, 80)} />
        <rect x="366" y="70" width="98" height="10" />
      </g>
      <rect x="430" y="80" width="30" height="20" fill="#B5AB98" />
      <rect x="336" y="80" width="16" height="14" fill="#DCE5E8" stroke="#E2D8C3" strokeWidth="1.5" />
      <path d="M222 80v74" stroke="#E2D8C3" strokeWidth="1.2" />
      <rect x="214" y="78" width="16" height="5" fill="#E2D8C3" />
      <rect x="206" y="154" width="32" height="6" fill="#7A8388" />
      <rect x="348" y="326" width="22" height="6" fill="#7A8388" />

      {/* Shade canopy with bench */}
      <ellipse cx="478" cy="388" rx="70" ry="9" fill="#9E8A63" opacity=".55" />
      <path d="M418 386v-50m120 50v-60" stroke="#4E5B63" strokeWidth="3" />
      <path d="M410 338 546 322 520 352 432 356Z" fill="#178388" />
      <path d="M410 338 546 322" stroke="#0B5558" strokeWidth="2" />
      <rect x="446" y="370" width="60" height="5" fill="#5D6A72" />
      <path d="M452 375v10m48-10v10" stroke="#5D6A72" strokeWidth="3" />

      {/* Water station */}
      <rect x="560" y="364" width="18" height="24" rx="2" fill="#2F6E8C" />
      <rect x="558" y="356" width="22" height="10" rx="5" fill="#3E86A8" />
      <path d="M569 376h-6" stroke="#D7ECEA" strokeWidth="2" />
      <path d="M558 392h22" stroke="#4E5B63" strokeWidth="3" />

      {/* Cooled rest cabin with AC unit */}
      <rect x="40" y="346" width="96" height="44" fill="#E7E1D3" />
      <rect x="36" y="342" width="104" height="6" fill="#B9B2A3" />
      <rect x="52" y="360" width="26" height="14" fill="#9CC9C6" />
      <rect x="96" y="358" width="18" height="32" fill="#C9C2B2" />
      <rect x="140" y="360" width="16" height="16" fill="#AEB5B8" />
      <circle cx="148" cy="368" r="5" fill="none" stroke="#6F797F" strokeWidth="1.5" />
      <path d="M162 362c4 2 4 6 0 8m6-10c5 3 5 9 0 12" stroke="#D7ECEA" strokeWidth="1.5" fill="none" />
      <ellipse cx="88" cy="392" rx="56" ry="5" fill="#9E8A63" opacity=".5" />

      {/* Site fence */}
      <path d="M0 420h640" stroke="#8D7A57" strokeWidth="2" />
      <path d={Array.from({ length: 33 }, (_, i) => `M${i * 20} 420v-12`).join("")} stroke="#8D7A57" strokeWidth="2" />
    </svg>
  );
}
