interface SightlineMarkProps {
  size?: number;
  className?: string;
}

const SightlineMark = ({ size = 20, className }: SightlineMarkProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M10 50 L10 26 L32 10 L54 26 L54 50 Z"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      strokeLinejoin="round"
    />
    <path
      d="M20 50 L20 30 L32 20 L44 30 L44 50"
      stroke="currentColor"
      strokeOpacity="0.55"
      strokeWidth="2"
      fill="none"
      strokeLinejoin="round"
    />
    <rect
      x="26"
      y="36"
      width="12"
      height="14"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="currentColor"
      fillOpacity="0.12"
      rx="1"
    />
    <line
      x1="8"
      y1="50"
      x2="56"
      y2="50"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export default SightlineMark;