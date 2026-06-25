import { avatarGradient, initials } from "@/lib/constants";
import type { Attendee } from "@/lib/types";

interface AttendeeCardProps {
  attendee: Attendee;
  onOpen: () => void;
  onSms: () => void;
  onVcard: () => void;
}

const SmsIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 11.5a8.5 8.5 0 0 1-12 7.7L3 21l1.8-6A8.5 8.5 0 1 1 21 11.5Z" />
  </svg>
);

const VcardIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="9" cy="9" r="3" />
    <path d="M3 19a6 6 0 0 1 12 0M16 8h5M16 12h5M16 16h5" />
  </svg>
);

export function AttendeeCard({
  attendee,
  onOpen,
  onSms,
  onVcard,
}: AttendeeCardProps) {
  const { first_name, last_name, company, industry, photo_url, open_to_contact } =
    attendee;

  return (
    <div
      className="acard"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div
        className="av"
        style={photo_url ? undefined : { background: avatarGradient(attendee.id) }}
      >
        {photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo_url} alt="" />
        ) : (
          initials(first_name, last_name)
        )}
      </div>
      <div className="meta">
        <div className="nm">
          {first_name} {last_name}
          {open_to_contact ? (
            <span className="ndot" title="Open to contact" />
          ) : null}
        </div>
        {company ? <div className="ti">{company}</div> : null}
        {industry ? <span className="ind">{industry}</span> : null}
      </div>
      <div className="acts">
        <button
          type="button"
          className="iconbtn sms"
          title="Text"
          onClick={(e) => {
            e.stopPropagation();
            onSms();
          }}
        >
          {SmsIcon}
        </button>
        <button
          type="button"
          className="iconbtn vc"
          title="Save contact"
          onClick={(e) => {
            e.stopPropagation();
            onVcard();
          }}
        >
          {VcardIcon}
        </button>
      </div>
    </div>
  );
}
