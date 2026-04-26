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
      d="M16 48 L16 24 L32 12 L48 24 L48 48 Z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinejoin="round"
    />
    <path
      d="M22 48 L22 28 L32 20 L42 28 L42 48"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="0.85"
      fill="none"
      strokeLinejoin="round"
    />
    <line
      x1="32"
      y1="12"
      x2="32"
      y2="48"
      stroke="currentColor"
      strokeOpacity="0.2"
      strokeWidth="0.75"
      strokeDasharray="2 3"
    />
    <line
      x1="16"
      y1="36"
      x2="48"
      y2="36"
      stroke="currentColor"
      strokeOpacity="0.15"
      strokeWidth="0.75"
    />
    <circle cx="32" cy="12" r="2" fill="currentColor" />
    <rect
      x="27"
      y="36"
      width="10"
      height="12"
      stroke="currentColor"
      strokeOpacity="0.8"
      strokeWidth="0.9"
      fill="none"
      rx="1"
    />
  </svg>
);

export default SightlineMark;