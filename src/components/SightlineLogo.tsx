import logoSrc from "@/assets/sightline-logo.png";

export const SightlineLogo = ({ size = 22 }: { size?: number }) => (
  <img
    src={logoSrc}
    alt="Sightline"
    width={size}
    height={size}
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
      borderRadius: Math.round(size * 0.22),
    }}
    draggable={false}
  />
);

export default SightlineLogo;
