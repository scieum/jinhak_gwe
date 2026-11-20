/** Transparent JINHAK arrow wordmark, shared by desktop and mobile home. */
export function BrandLogo() {
  return (
    <img
      className="brand-logo"
      src={`${import.meta.env.BASE_URL}assets/brand/jinhak-logo-v3-transparent.png`}
      alt="JINHAK · 진학내비"
      width={2172}
      height={724}
      decoding="async"
    />
  );
}
