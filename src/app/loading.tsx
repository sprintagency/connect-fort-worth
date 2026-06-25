// Shown instantly on navigation while the destination (dynamic) route streams
// in, so tab taps feel responsive instead of waiting on a server round-trip.
export default function Loading() {
  return (
    <div className="screen-loading" aria-hidden>
      <div className="sk sk-line" style={{ width: "55%", height: 22 }} />
      <div className="sk sk-line" style={{ width: "80%" }} />
      <div className="sk sk-card" />
      <div className="sk sk-card" />
      <div className="sk sk-card" />
    </div>
  );
}
