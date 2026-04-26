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
      background: "transparent",
    }}
    draggable={false}
  />
);

export default SightlineLogo;
