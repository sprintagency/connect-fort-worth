/** Navy "built by Sprint" band shown above the tab bar on every screen. */
export function BuiltBy() {
  return (
    <div className="builtby">
      <span className="lbl">This app was built by</span>
      <a
        href="https://madebysprint.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Sprint, madebysprint.com"
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sprint-white.svg" alt="Sprint" />
      </a>
    </div>
  );
}
