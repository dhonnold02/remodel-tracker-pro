export const SightlineLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <path d="M10 50 L10 26 L32 10 L54 26 L54 50 Z" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
    <line x1="8" y1="50" x2="56" y2="50" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="26" y="34" width="12" height="16" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.1)" rx="1"/>
    <circle cx="44" cy="22" r="6" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
    <line x1="44" y1="16" x2="44" y2="19" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="44" y1="25" x2="44" y2="28" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="38" y1="22" x2="41" y2="22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="47" y1="22" x2="50" y2="22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="44" cy="22" r="1.5" fill="#3b82f6"/>
  </svg>
);

export default SightlineLogo;
