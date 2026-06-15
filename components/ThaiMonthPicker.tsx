"use client";

import { THAI_MONTHS, toBE, toCE } from "@/lib/constants";

// value/onChange use a Gregorian "YYYY-MM" string; the UI shows Thai month + พ.ศ.
export default function ThaiMonthPicker({
  value,
  onChange,
}: {
  value: string; // "YYYY-MM"
  onChange: (v: string) => void;
}) {
  const [yStr, mStr] = value.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1-12

  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear + 1; y >= thisYear - 5; y--) years.push(y);

  function set(y: number, m: number) {
    onChange(`${y}-${String(m).padStart(2, "0")}`);
  }

  return (
    <div className="flex gap-2">
      <select
        className="select select-bordered select-sm"
        value={month}
        onChange={(e) => set(year, Number(e.target.value))}
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
        onChange={(e) => set(Number(e.target.value), month)}
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

export { toBE, toCE };
