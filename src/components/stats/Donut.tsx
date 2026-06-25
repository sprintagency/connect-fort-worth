import type { IndustrySlice } from "@/lib/stats";

interface DonutProps {
  slices: IndustrySlice[];
  centerValue: number;
  centerLabel: string;
}

/** Donut chart matching the prototype's SVG geometry. */
export function Donut({ slices, centerValue, centerLabel }: DonutProps) {
  const cx = 21;
  const cy = 21;
  const r = 15.9155; // circumference ≈ 100 for easy percentage maths
  const c = 2 * Math.PI * r;

  return (
    <svg width="108" height="108" viewBox="0 0 42 42">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDF1F6" strokeWidth="6" />
      {slices.map((s, i) => {
        // Cumulative offset = sum of preceding slices (no render-time mutation).
        const offset = slices
          .slice(0, i)
          .reduce((sum, x) => sum + x.pct, 0);
        const len = (c * s.pct) / 100;
        const dashoffset = (-offset * c) / 100 + c * 0.25;
        return (
          <circle
            key={s.name}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="6"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <text
        x="21"
        y="20"
        textAnchor="middle"
        fontFamily="var(--disp)"
        fontWeight="700"
        fontSize="7"
        fill="#142433"
      >
        {centerValue}
      </text>
      <text
        x="21"
        y="26"
        textAnchor="middle"
        fontFamily="var(--body)"
        fontSize="3.4"
        fill="#8A99A8"
      >
        {centerLabel}
      </text>
    </svg>
  );
}
