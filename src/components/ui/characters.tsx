/**
 * Drawings for the avatar characters listed in `shared/avatars.ts`. A first
 * pass, drawn as simple flat SVG in the brand palette so they stay crisp at
 * every size and cost nothing to load — swap any of them for an
 * illustrator's version later by replacing its function here.
 *
 * Every drawing uses a 64×64 viewBox and fills the whole circle.
 */

const ink = "#2C2416";
const skinWarm = "#A86B3C";
const skinDeep = "#8A5530";

function Eyes({ y = 28, gap = 4, r = 1.4 }: { y?: number; gap?: number; r?: number }) {
  return (
    <>
      <circle cx={32 - gap} cy={y} r={r} fill={ink} />
      <circle cx={32 + gap} cy={y} r={r} fill={ink} />
    </>
  );
}

function Akka() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#F2D3A0" />
      {/* Saree, with the pallu over one shoulder. */}
      <path d="M9 64c2-12 11-19 23-19s21 7 23 19z" fill="#2D6A4F" />
      <path d="M37 45.5 22 64h7l13.5-17z" fill="#C9873A" />
      <rect x="28" y="36" width="8" height="10" rx="3" fill={skinWarm} />
      {/* Hair, parted in the middle, with a konde at the back. */}
      <circle cx="32" cy="11" r="6" fill={ink} />
      <circle cx="32" cy="26" r="13" fill={ink} />
      <circle cx="35.5" cy="8.5" r="2.2" fill="#F7F3ED" />
      <circle cx="35.5" cy="8.5" r="0.9" fill="#C9873A" />
      <ellipse cx="32" cy="28.5" rx="10" ry="11.5" fill={skinWarm} />
      <path d="M21 27c0-9 5-13.5 11-13.5S43 18 43 27c-2.5-5.5-6-8.5-11-8.5S23.5 21.5 21 27z" fill={ink} />
      <circle cx="21.6" cy="31.5" r="1.5" fill="#C9873A" />
      <circle cx="42.4" cy="31.5" r="1.5" fill="#C9873A" />
      <circle cx="32" cy="23.8" r="1.1" fill="#B23A2E" />
      <Eyes y={28.5} />
      <path d="M28.5 33.5q3.5 3 7 0" stroke="#5A2E1A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  );
}

function Aiya() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#95C4AA" />
      <path d="M9 64c2-12 11-19 23-19s21 7 23 19z" fill="#F7F3ED" />
      <path d="M26 45.5 32 53l6-7.5" stroke="#D8CFC0" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <rect x="28" y="36" width="8" height="10" rx="3" fill={skinDeep} />
      <ellipse cx="32" cy="28" rx="10" ry="11.5" fill={skinDeep} />
      <ellipse cx="21.6" cy="29" rx="1.8" ry="2.6" fill={skinDeep} />
      <ellipse cx="42.4" cy="29" rx="1.8" ry="2.6" fill={skinDeep} />
      <path d="M21.5 26c-1-9 4.5-13.5 11-13.5 7 0 11 4.5 10.5 13.5-1.5-4.5-5-7-10.5-6.5-5 0-9 2.5-11 6.5z" fill="#1D1710" />
      <Eyes y={27.5} />
      <path d="M27.5 32.6q4.5-2.4 9 0-4.5 1.6-9 0z" fill="#1D1710" />
      <path d="M29 35.3q3 2 6 0" stroke="#4A2614" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  );
}

function Aachchi() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#CFE3D6" />
      {/* White osariya with a lace edge. */}
      <path d="M9 64c2-12 11-19 23-19s21 7 23 19z" fill="#FBF8F2" />
      <path d="M14 56c6-6 12-8 18-8s12 2 18 8" stroke="#95C4AA" strokeWidth="1.6" strokeDasharray="2 2" fill="none" />
      <rect x="28" y="36" width="8" height="10" rx="3" fill={skinWarm} />
      <circle cx="32" cy="12" r="6.5" fill="#D9D4CC" />
      <circle cx="32" cy="26" r="13" fill="#D9D4CC" />
      <ellipse cx="32" cy="29" rx="10" ry="11.5" fill={skinWarm} />
      <path d="M21 27.5c0-9 5-13.5 11-13.5s11 4.5 11 13.5c-2.5-5.5-6-8-11-8s-8.5 2.5-11 8z" fill="#D9D4CC" />
      <circle cx="28" cy="29" r="3.3" fill="none" stroke="#4A3B2A" strokeWidth="1.1" />
      <circle cx="36" cy="29" r="3.3" fill="none" stroke="#4A3B2A" strokeWidth="1.1" />
      <path d="M31.3 29h1.4" stroke="#4A3B2A" strokeWidth="1.1" />
      <Eyes y={29} r={1.1} />
      <path d="M28.5 34.5q3.5 3 7 0" stroke="#5A2E1A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M24.5 33.5q1 1.2 0 2.4M39.5 33.5q-1 1.2 0 2.4" stroke="#8A5530" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </>
  );
}

function Seeya() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#E9DCC6" />
      {/* National dress: white shirt, banded collar. */}
      <path d="M9 64c2-12 11-19 23-19s21 7 23 19z" fill="#FBF8F2" />
      <path d="M27 45.5h10" stroke="#D8CFC0" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="51" r="0.9" fill="#C9873A" />
      <circle cx="32" cy="56" r="0.9" fill="#C9873A" />
      <rect x="28" y="36" width="8" height="10" rx="3" fill={skinDeep} />
      <ellipse cx="32" cy="27.5" rx="10.5" ry="12" fill={skinDeep} />
      <path d="M21.5 30c-1.5-4-.5-8 1.5-10 0 3.5 1 6 .5 10zM42.5 30c1.5-4 .5-8-1.5-10 0 3.5-1 6-.5 10z" fill="#EDEAE4" />
      <ellipse cx="21.4" cy="29" rx="1.8" ry="2.6" fill={skinDeep} />
      <ellipse cx="42.6" cy="29" rx="1.8" ry="2.6" fill={skinDeep} />
      <path d="M26 23.5h4M34 23.5h4" stroke="#EDEAE4" strokeWidth="1.4" strokeLinecap="round" />
      <Eyes y={27} r={1.2} />
      <path d="M26 33q6-3.5 12 0-2 2.6-6 2.2-4 .4-6-2.2z" fill="#EDEAE4" />
      <path d="M29.5 36.6q2.5 1.4 5 0" stroke="#4A2614" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Yaka() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#1B4332" />
      {/* Crown of cobra hoods, as on a Raksha mask. */}
      {[16, 32, 48].map((x) => (
        <g key={x}>
          <path d={`M${x - 5} 20c0-8 2.5-12 5-12s5 4 5 12z`} fill="#2D8F5A" stroke="#F1C40F" strokeWidth="1" />
          <circle cx={x - 1.6} cy="13" r="0.9" fill="#F1C40F" />
          <circle cx={x + 1.6} cy="13" r="0.9" fill="#F1C40F" />
        </g>
      ))}
      <ellipse cx="32" cy="38" rx="20" ry="18" fill="#C0392B" />
      <path d="M15 29c3-5 7-6 11-4-4 0-7 2-11 4zM49 29c-3-5-7-6-11-4 4 0 7 2 11 4z" fill="#F1C40F" />
      <circle cx="24" cy="34" r="5.2" fill="#F7F3ED" />
      <circle cx="40" cy="34" r="5.2" fill="#F7F3ED" />
      <circle cx="24" cy="34" r="2.5" fill="#111" />
      <circle cx="40" cy="34" r="2.5" fill="#111" />
      <path d="M30 37h4l1.5 5h-7z" fill="#962D22" />
      <circle cx="17.5" cy="42" r="1.6" fill="#F1C40F" />
      <circle cx="46.5" cy="42" r="1.6" fill="#F1C40F" />
      <ellipse cx="32" cy="48" rx="10" ry="5" fill={ink} />
      <path d="M24 46h16v2.2H24z" fill="#F7F3ED" />
      <path d="M23.5 50.5 25.5 44l2 6.5zM40.5 50.5 38.5 44l-2 6.5z" fill="#F7F3ED" />
      <ellipse cx="32" cy="51" rx="4" ry="2" fill="#E74C3C" />
    </>
  );
}

function Kotiya() {
  const spots: [number, number][] = [
    [22, 20], [27, 17], [37, 17], [42, 20], [19, 27], [45, 27], [24, 25], [40, 25], [32, 15],
  ];
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#2D6A4F" />
      <circle cx="17" cy="14" r="6" fill="#D9A441" />
      <circle cx="47" cy="14" r="6" fill="#D9A441" />
      <circle cx="17" cy="14" r="3" fill="#5A3A1E" />
      <circle cx="47" cy="14" r="3" fill="#5A3A1E" />
      <ellipse cx="32" cy="32" rx="19" ry="20" fill="#D9A441" />
      {spots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="none" stroke="#3B2A18" strokeWidth="1.2" />
      ))}
      <ellipse cx="32" cy="41" rx="10" ry="8" fill="#F3E2B5" />
      <ellipse cx="25" cy="31" rx="3" ry="2.6" fill="#3C6E47" />
      <ellipse cx="39" cy="31" rx="3" ry="2.6" fill="#3C6E47" />
      <ellipse cx="25" cy="31" rx="0.9" ry="2.2" fill="#111" />
      <ellipse cx="39" cy="31" rx="0.9" ry="2.2" fill="#111" />
      <path d="M29 37.5h6l-3 3z" fill="#7A3B2E" />
      <path d="M32 40.5v2.5M32 43q-2.5 2-5 .5M32 43q2.5 2 5 .5" stroke="#3B2A18" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M22 41h-8M22 43.5l-7.5 2M42 41h8M42 43.5l7.5 2" stroke="#3B2A18" strokeWidth="0.7" strokeLinecap="round" />
    </>
  );
}

function Aliya() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#F2D3A0" />
      <ellipse cx="14" cy="31" rx="11" ry="14" fill="#7E7A78" />
      <ellipse cx="50" cy="31" rx="11" ry="14" fill="#7E7A78" />
      <ellipse cx="14.5" cy="31" rx="7" ry="10" fill="#C98F8F" opacity="0.55" />
      <ellipse cx="49.5" cy="31" rx="7" ry="10" fill="#C98F8F" opacity="0.55" />
      <ellipse cx="32" cy="28" rx="13" ry="15" fill="#8E8A87" />
      <path d="M27.5 36c0 11 2 18 8 20.5 3.5 1.5 6-2 3-4-4-2.5-4.5-8-3.5-16.5z" fill="#8E8A87" />
      <path d="M26 40c-3 2-4.5 5-4 8 2-2.5 3.5-4 5.5-5zM38 40c3 2 4.5 5 4 8-2-2.5-3.5-4-5.5-5z" fill="#FBF8F2" />
      {/* Perahera headdress. */}
      <path d="M21 15q11-9 22 0l-2 10q-9 5-18 0z" fill="#B23A2E" />
      <path d="M22.5 22q9.5 4.5 19 0" stroke="#F1C40F" strokeWidth="1.3" fill="none" />
      {[24.5, 28.5, 32, 35.5, 39.5].map((x, index) => (
        <circle key={x} cx={x} cy={index % 2 ? 15.5 : 18} r="1.1" fill="#F1C40F" />
      ))}
      <circle cx="26" cy="30" r="1.5" fill={ink} />
      <circle cx="38" cy="30" r="1.5" fill={ink} />
    </>
  );
}

function Monara() {
  const feathers = Array.from({ length: 9 }, (_, index) => -80 + index * 20);
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#1B4332" />
      {feathers.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 32 46)`}>
          <ellipse cx="32" cy="22" rx="5.2" ry="12" fill="#2D8F5A" />
          <ellipse cx="32" cy="16" rx="3.4" ry="4.2" fill="#C9873A" />
          <ellipse cx="32" cy="16.5" rx="2" ry="2.6" fill="#1D5F78" />
        </g>
      ))}
      <path d="M27 60c-1-9 0-17 3-23 1-2.5 1.5-5 1-8h3c.8 3 .5 6 1.5 8.5 3 6 4 14.5 3.5 22.5z" fill="#1D6F8A" />
      <circle cx="32.5" cy="27" r="4.5" fill="#1D6F8A" />
      <path d="M36.5 27.5 41 29l-4.3 1z" fill="#D9A441" />
      <circle cx="33.6" cy="26.2" r="1" fill="#F7F3ED" />
      <circle cx="33.8" cy="26.3" r="0.5" fill="#111" />
      {[29, 32, 35].map((x) => (
        <g key={x}>
          <path d={`M32.5 23 ${x} 17`} stroke="#1D6F8A" strokeWidth="0.8" />
          <circle cx={x} cy="16.5" r="1.1" fill="#1D6F8A" />
        </g>
      ))}
    </>
  );
}

function Ibba() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#CFE3D6" />
      <ellipse cx="12" cy="40" rx="6" ry="4.5" fill="#6FA36B" />
      <ellipse cx="17" cy="51" rx="5" ry="3.5" fill="#6FA36B" />
      <ellipse cx="45" cy="51" rx="5" ry="3.5" fill="#6FA36B" />
      {/* Head peeking out on the right. */}
      <ellipse cx="51" cy="37" rx="8" ry="7" fill="#6FA36B" />
      <circle cx="53.5" cy="35" r="1.4" fill={ink} />
      <path d="M52 40q3 1.5 5.5-.5" stroke={ink} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M9 47c0-15 10.5-25 22.5-25S54 32 54 47z" fill="#4E7A3A" />
      <path d="M9 47h45" stroke="#3B5E2B" strokeWidth="2" />
      <path d="M31.5 26.5 36.5 31l-1.5 7h-7l-1.5-7zM26.5 31l-7 2.5-2 7.5M36.5 31l7 2.5 2 7.5M28 38l-3 9M35 38l3 9" stroke="#A7C77A" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </>
  );
}

const drawings: Record<string, () => React.ReactElement> = {
  akka: Akka,
  aiya: Aiya,
  aachchi: Aachchi,
  seeya: Seeya,
  yaka: Yaka,
  kotiya: Kotiya,
  aliya: Aliya,
  monara: Monara,
  ibba: Ibba,
};

export function hasCharacterDrawing(id: string | undefined): id is string {
  return !!id && id in drawings;
}

/** A character drawn into a circle. `label` makes it announce itself to screen readers. */
export function CharacterArt({
  id,
  className,
  label,
}: {
  id: string;
  className?: string;
  label?: string;
}) {
  const Drawing = drawings[id];
  if (!Drawing) return null;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={`character-clip-${id}`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#character-clip-${id})`}>
        <Drawing />
      </g>
    </svg>
  );
}
