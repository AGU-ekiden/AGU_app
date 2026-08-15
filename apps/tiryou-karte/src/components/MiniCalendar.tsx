"use client";

import { useState } from "react";

interface MiniCalendarProps {
  karteDates: string[];
  raceDates?: string[];
  personalDates?: string[];
  bloodDates?: string[];
  inbodyDates?: string[];
  onJumpToMedical?: (date: string) => void;
  onJumpToRace?: (date: string) => void;
  onJumpToPersonal?: (date: string) => void;
  onJumpToBlood?: (date: string) => void;
  onJumpToInBody?: (date: string) => void;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function MiniCalendar({
  karteDates,
  raceDates = [],
  personalDates = [],
  bloodDates = [],
  inbodyDates = [],
  onJumpToMedical,
  onJumpToRace,
  onJumpToPersonal,
  onJumpToBlood,
  onJumpToInBody,
}: MiniCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const karteSet = new Set(karteDates);
  const raceSet = new Set(raceDates);
  const personalSet = new Set(personalDates);
  const bloodSet = new Set(bloodDates);
  const inbodySet = new Set(inbodyDates);

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {viewYear}年{viewMonth + 1}月
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-2 px-0.5">
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />メディカル
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8a6d1f]" />パーソナル
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />大会
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />血液検査
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />InBody
        </span>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-medium py-0.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-[#c9a227]" : "text-gray-400"}`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[3.25rem]" />;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const hasKarte = karteSet.has(dateStr);
          const hasRace = raceSet.has(dateStr);
          const hasPersonal = personalSet.has(dateStr);
          const hasBlood = bloodSet.has(dateStr);
          const hasInBody = inbodySet.has(dateStr);
          const hasActivity = hasKarte || hasRace || hasPersonal || hasBlood || hasInBody;
          const isToday = dateStr === todayStr;
          const col = i % 7;

          const handleClick = () => {
            if (hasRace) {
              onJumpToRace?.(dateStr);
              return;
            }
            if (hasBlood) {
              onJumpToBlood?.(dateStr);
              return;
            }
            if (hasInBody) {
              onJumpToInBody?.(dateStr);
              return;
            }
            if (hasPersonal) {
              onJumpToPersonal?.(dateStr);
              return;
            }
            if (hasKarte) {
              onJumpToMedical?.(dateStr);
            }
          };

          const textColor = col === 0
            ? "text-red-400"
            : col === 6
            ? "text-[#8a6d1f]"
            : hasActivity
            ? "text-gray-700"
            : "text-gray-300";

          return (
            <button
              key={i}
              onClick={handleClick}
              disabled={!hasActivity}
              className={`
                flex flex-col items-center pt-1 pb-1 px-0.5 w-full rounded transition-colors min-h-[3.25rem]
                ${hasActivity ? "hover:bg-green-50 cursor-pointer" : "cursor-default"}
                ${isToday ? "ring-1 ring-green-400" : ""}
              `}
            >
              <span className={`text-[11px] font-medium leading-none mb-0.5 ${textColor}`}>{day}</span>

              <div className="flex flex-col gap-0.5 w-full">
                {hasKarte && (
                  <span className="text-[6px] font-bold text-center px-0.5 rounded leading-tight w-full truncate bg-green-100 text-green-600">
                    メディカル
                  </span>
                )}
                {hasPersonal && (
                  <span className="text-[6px] font-bold text-center px-0.5 rounded leading-tight w-full truncate bg-[#f4e6bd] text-[#10254a]">
                    パーソナル
                  </span>
                )}
                {hasRace && (
                  <span className="text-[6px] font-bold text-center px-0.5 rounded leading-tight w-full truncate bg-orange-100 text-orange-600">
                    大会
                  </span>
                )}
                {hasBlood && (
                  <span className="text-[6px] font-bold text-center px-0.5 rounded leading-tight w-full truncate bg-red-100 text-red-600">
                    血液検査
                  </span>
                )}
                {hasInBody && (
                  <span className="text-[6px] font-bold text-center px-0.5 rounded leading-tight w-full truncate bg-purple-100 text-purple-600">
                    InBody
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
