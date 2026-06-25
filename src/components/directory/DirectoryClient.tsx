"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { INDUSTRIES } from "@/lib/constants";
import { createClient } from "@/utils/supabase/client";
import { track, type TrackContext } from "@/lib/track";
import { buildSmsHref } from "@/lib/sms";
import { downloadVCard } from "@/lib/vcard";
import { useToast } from "@/components/Toast";
import type { Attendee, EventRow } from "@/lib/types";
import { AttendeeCard } from "./AttendeeCard";
import { ProfileSheet } from "./ProfileSheet";
import { SwipeRow } from "./SwipeRow";
import { MemberEditor } from "@/components/admin/MemberEditor";

interface DirectoryClientProps {
  initial: Attendee[];
  event: EventRow | null;
  myAttendeeId: string | null;
  isAdmin: boolean;
}

export function DirectoryClient({
  initial,
  event,
  myAttendeeId,
  isAdmin,
}: DirectoryClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [indFilter, setIndFilter] = useState("");
  const [selected, setSelected] = useState<Attendee | null>(null);
  const [editing, setEditing] = useState<Attendee | null>(null);

  const ctx: TrackContext = useMemo(
    () => ({ eventId: event?.id ?? null, actorAttendeeId: myAttendeeId }),
    [event?.id, myAttendeeId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((p) => {
      if (indFilter && p.industry !== indFilter) return false;
      if (!q) return true;
      const hay =
        `${p.first_name} ${p.last_name} ${p.company ?? ""} ${p.industry ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [initial, query, indFilter]);

  // Debounced `search` tracking (skip the initial mount).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (query.trim() || indFilter) {
        void track(ctx, "search", {
          query: query.trim() || undefined,
          industry: indFilter || undefined,
        });
      }
    }, 700);
    return () => clearTimeout(id);
  }, [query, indFilter, ctx]);

  function openSheet(a: Attendee) {
    setSelected(a);
    void track(ctx, "profile_view", { targetAttendeeId: a.id });
  }

  function doSms(a: Attendee) {
    void track(ctx, "sms_click", { targetAttendeeId: a.id });
    toast(`Texting ${a.first_name}`);
    window.location.assign(buildSmsHref(a));
  }

  function doVcard(a: Attendee) {
    void track(ctx, "vcard_download", { targetAttendeeId: a.id });
    toast("vCard downloaded");
    downloadVCard(a);
  }

  async function deleteMember(a: Attendee) {
    if (
      !window.confirm(
        `Remove ${a.first_name} ${a.last_name} from the directory? This can't be undone.`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("attendees").delete().eq("id", a.id);
    if (error) {
      toast(error.message || "Couldn't remove this member");
      return;
    }
    if (selected?.id === a.id) setSelected(null);
    toast(`Removed ${a.first_name} ${a.last_name}`);
    router.refresh();
  }

  return (
    <>
      <div className="search">
        <div className="searchbox">
          <Search size={18} strokeWidth={2} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, or role…"
            aria-label="Search the directory"
          />
        </div>
        <div className="filterrow">
          <span className="lbl">Filter by industry</span>
          <div className="selwrap">
            <select
              value={indFilter}
              onChange={(e) => setIndFilter(e.target.value)}
              aria-label="Filter by industry"
            >
              <option value="">All industries</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <span className="chev">
              <ChevronDown size={13} strokeWidth={2.4} aria-hidden />
            </span>
          </div>
        </div>
      </div>

      <div className="list">
        {filtered.length === 0 ? (
          <div className="empty">
            {initial.length === 0
              ? "No one's in the directory yet. Be the first: head to Join."
              : "No one here matches that yet. Try another industry or clear your search."}
          </div>
        ) : (
          filtered.map((a) =>
            isAdmin ? (
              <SwipeRow
                key={a.id}
                onEdit={() => setEditing(a)}
                onDelete={() => deleteMember(a)}
              >
                <AttendeeCard
                  attendee={a}
                  onOpen={() => openSheet(a)}
                  onSms={() => doSms(a)}
                  onVcard={() => doVcard(a)}
                />
              </SwipeRow>
            ) : (
              <AttendeeCard
                key={a.id}
                attendee={a}
                onOpen={() => openSheet(a)}
                onSms={() => doSms(a)}
                onVcard={() => doVcard(a)}
              />
            ),
          )
        )}
      </div>

      <ProfileSheet
        attendee={selected}
        onClose={() => setSelected(null)}
        onSms={doSms}
        onVcard={doVcard}
      />

      {editing ? (
        <MemberEditor
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
