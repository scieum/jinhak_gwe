/** U:NAVI wordmark (transparent SVG), shared by desktop and mobile home. */
export function BrandLogo() {
  return (
    <img
      className="brand-logo"
      src={`${import.meta.env.BASE_URL}assets/brand/unavi-logo-v1.svg`}
      alt="U:NAVI"
      width={1273}
      height={297}
      decoding="async"
    />
  );
}
