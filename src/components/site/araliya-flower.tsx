/**
 * The Araliya mark, drawn exactly as on the original serendib.learn site:
 * five cream petals and an amber centre on a forest-green circle.
 */
export function AraliyaFlower({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#1B4332" />
      <g transform="translate(32,32)">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="0" cy="-16" rx="6" ry="11" fill="#F7F3ED" transform={`rotate(${angle})`} />
        ))}
        <circle cx="0" cy="0" r="6" fill="#C9873A" />
        <circle cx="0" cy="0" r="2.5" fill="#F7F3ED" />
      </g>
    </svg>
  );
}
