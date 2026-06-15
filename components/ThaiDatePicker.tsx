"use client";

import { THAI_MONTHS, toBE } from "@/lib/constants";

// value/onChange use a Gregorian "YYYY-MM-DD" string; the UI shows วัน/เดือน(ไทย)/ปี(พ.ศ.)
export default function ThaiDatePicker({
  value,
  onChange,
}: {
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
}) {
  const [yStr, mStr, dStr] = value.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear + 1; y >= thisYear - 5; y--) years.push(y);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function set(y: number, m: number, d: number) {
    const maxD = new Date(y, m, 0).getDate();
    const dd = Math.min(d, maxD);
    onChange(`${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  }

  return (
    <div className="flex gap-2">
      <select
        className="select select-bordered select-sm"
        value={day}
        onChange={(e) => set(year, month, Number(e.target.value))}
      >
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        className="select select-bordered select-sm"
        value={month}
        onChange={(e) => set(year, Number(e.target.value), day)}
      >
        {THAI_MONTHS.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        className="select select-bordered select-sm"
        value={year}
        onChange={(e) => set(Number(e.target.value), month, day)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            พ.ศ. {toBE(y)}
          </option>
        ))}
      </select>
    </div>
  );
}
