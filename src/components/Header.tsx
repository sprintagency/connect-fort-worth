import type { EventRow } from "@/lib/types";

interface HeaderProps {
  event: EventRow | null;
  sponsorUrl: string | null;
  sponsorName: string | null;
}

/**
 * Persistent brand header: Access Fort Worth logo + a "PRESENTED BY" sponsor
 * slot. The sponsor image comes from the event row or NEXT_PUBLIC_SPONSOR_LOGO_URL;
 * an empty slot shows a dashed placeholder (matching the prototype).
 */
export function Header({ event, sponsorUrl, sponsorName }: HeaderProps) {
  const logo = sponsorUrl || event?.sponsor_logo_url || null;
  const name = sponsorName || event?.sponsor_name || null;
  const link = event?.sponsor_url || null;

  return (
    <header className="brandbar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="access"
        src="/access-fort-worth-white.png"
        alt="Access Fort Worth"
      />
      {logo ? (
        link ? (
          <a
            className="sponsor filled"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            title={name ?? "Presented by"}
          >
            <span className="lbl">PRESENTED BY</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={name ?? "Event sponsor"} />
          </a>
        ) : (
          <div className="sponsor filled" title={name ?? "Presented by"}>
            <span className="lbl">PRESENTED BY</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={name ?? "Event sponsor"} />
          </div>
        )
      ) : (
        <div className="sponsor" title="Sponsor slot">
          <span className="lbl">PRESENTED BY</span>
          <span className="ph">+ Sponsor logo</span>
        </div>
      )}
    </header>
  );
}
