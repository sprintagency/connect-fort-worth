"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, MessageCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { DashboardData } from "@/lib/stats";
import { Donut } from "./Donut";

const SmsFeedIcon = <MessageCircle size={15} strokeWidth={2} aria-hidden />;
const VcardFeedIcon = <Download size={15} strokeWidth={2} aria-hidden />;

export function StatsDashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initial);
  const refreshing = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as DashboardData);
    } catch {
      /* keep last good data */
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    // Bonus: live updates when new actions land (requires Realtime enabled on
    // attendee_actions). Falls back to the interval poll below otherwise.
    const channel = supabase
      .channel("cfw-actions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendee_actions" },
        () => {
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(refresh, 1500);
        },
      )
      .subscribe();

    const poll = setInterval(refresh, 25000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [refresh]);

  const connPct = (n: number) =>
    data.connections > 0
      ? `${Math.round((n / data.connections) * 100)}% of connections`
      : "no connections yet";

  return (
    <div className="dash">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Event dashboard</h2>
        <button
          type="button"
          onClick={refresh}
          className="iconbtn vc"
          title="Refresh"
          style={{ width: 34, height: 34 }}
        >
          <RefreshCw size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="liverow">
        <span className="pulse" /> Live · every tap is tracked in real time
      </div>

      <div className="kpis">
        <div className="kpi hero-k">
          <div className="k-l">Connections made</div>
          <div className="k-v">{data.connections.toLocaleString()}</div>
          <div className="k-d">
            {data.avgPerAttendee.toFixed(2)} avg per attendee · SMS + vCard
          </div>
        </div>
        <div className="kpi">
          <div className="k-l">Attendees</div>
          <div className="k-v">{data.attendees.toLocaleString()}</div>
          <div className="k-d">in the directory</div>
        </div>
        <div className="kpi">
          <div className="k-l">Active today</div>
          <div className="k-v">{data.activeToday.toLocaleString()}</div>
          <div className="k-d">since midnight</div>
        </div>
        <div className="kpi">
          <div className="k-l">SMS taps</div>
          <div className="k-v">{data.smsTaps.toLocaleString()}</div>
          <div className="k-d">{connPct(data.smsTaps)}</div>
        </div>
        <div className="kpi">
          <div className="k-l">vCard saves</div>
          <div className="k-v">{data.vcardSaves.toLocaleString()}</div>
          <div className="k-d">{connPct(data.vcardSaves)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="p-h">
          Top industries <small>share of directory</small>
        </div>
        {data.topIndustries.length > 0 ? (
          <div className="donutwrap">
            <Donut
              slices={data.topIndustries}
              centerValue={data.attendees}
              centerLabel="attendees"
            />
            <div className="legend">
              {data.topIndustries.map((s) => (
                <div className="legrow" key={s.name}>
                  <span className="sw" style={{ background: s.color }} />
                  <span className="nm">{s.name}</span>
                  <span className="pc">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty" style={{ padding: "10px 0" }}>
            No attendees yet.
          </div>
        )}
      </div>

      <div className="panel">
        <div className="p-h">Most-connected companies</div>
        {data.topCompanies.length > 0 ? (
          <div className="lead">
            {data.topCompanies.map((c, i) => (
              <div className={`leadrow ${i === 0 ? "top1" : ""}`} key={c.company}>
                <span className="rk">{i + 1}</span>
                <span className="co">{c.company}</span>
                <span className="ct">{c.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: "10px 0" }}>
            No connections yet.
          </div>
        )}
      </div>

      <div className="panel">
        <div className="p-h">Recent activity</div>
        {data.feed.length > 0 ? (
          <div className="actfeed">
            {data.feed.map((a, i) => (
              <div className="actitem" key={i}>
                <div className={`ai ${a.type}`}>
                  {a.type === "s" ? SmsFeedIcon : VcardFeedIcon}
                </div>
                <div>
                  <div className="at">{a.text}</div>
                  <div className="ago">{a.ago}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: "10px 0" }}>
            Connections will show up here live.
          </div>
        )}
      </div>
    </div>
  );
}
