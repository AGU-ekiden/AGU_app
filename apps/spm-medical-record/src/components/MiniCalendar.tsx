"use client";

import { useState } from "react";
import { RaceResult } from "@/types/karte";

interface MiniCalendarProps {
  karteDates: string[];
  medicalDates?: string[];
  bloodTestDates?: string[];
  raceDates?: string[];
  raceResults?: RaceResult[];
  onScrollToDate?: (date: string) => void;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function MiniCalendar({
  karteDates,
  medicalDates = [],
  bloodTestDates = [],
  raceDates = [],
  raceResults = [],
  onScrollToDate,
}: MiniCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const karteSet = new Set(karteDates);
  const medicalSet = new Set(medicalDates);
  const bloodTestSet = new Set(bloodTestDates);
  const raceSet = new Set(raceDates);

  const raceByDate = raceResults.reduce<Record<string, RaceResult[]>>((acc, r) => {
    if (!r.date) return acc;
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

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

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-medium py-0.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[2.75rem]" />;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const hasKarte = karteSet.has(dateStr);
          const hasMedical = medicalSet.has(dateStr);
          const hasBloodTest = bloodTestSet.has(dateStr);
          const hasRace = raceSet.has(dateStr);
          const hasActivity = hasKarte || hasRace || hasMedical || hasBloodTest;
          const isToday = dateStr === todayStr;
          const col = i % 7;
          const dayRaces = raceByDate[dateStr] ?? [];

          const textColor = col === 0
            ? "text-red-400"
            : col === 6
            ? "text-blue-500"
            : hasActivity
            ? "text-gray-700"
            : "text-gray-300";

          return (
            <button
              key={i}
              onClick={() => hasActivity && onScrollToDate?.(dateStr)}
              disabled={!hasActivity}
              className={`
                flex flex-col items-center pt-1 pb-1 px-0.5 w-full rounded transition-colors min-h-[2.75rem]
                ${hasActivity ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"}
                ${isToday ? "ring-1 ring-blue-400" : ""}
              `}
            >
              <span className={`text-[11px] font-medium leading-none mb-0.5 ${textColor}`}>{day}</span>

              {hasKarte && (
                <span className="text-[7px] font-bold text-center px-0.5 py-0.5 rounded leading-none w-full truncate mb-0.5 bg-blue-100 text-blue-600">
                  パーソナル
                </span>
              )}

              {hasMedical && (
                <span className="text-[7px] font-bold text-center px-0.5 py-0.5 rounded leading-none w-full truncate mb-0.5 bg-green-100 text-green-600">
                  メディカル
                </span>
              )}

              {hasBloodTest && (
                <span className="text-[7px] font-bold text-center px-0.5 py-0.5 rounded leading-none w-full truncate mb-0.5 bg-red-100 text-red-600">
                  血液検査
                </span>
              )}

              {dayRaces.length > 0 && (
                <div className="w-full">
                  {(dayRaces[0].eventName || dayRaces[0].result) && (
                    <div className="text-[9px] font-bold text-orange-600 leading-tight truncate w-full">
                      {[dayRaces[0].eventName, dayRaces[0].result].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {dayRaces.length > 1 && (
                    <div className="text-[9px] text-orange-400 leading-tight">+{dayRaces.length - 1}</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
