"use client";

import React from "react";
import { ComputedTimeSlot, DayAvailabilitySummary } from "@/types/database";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";

interface InteractiveBookingCalendarProps {
  currentMonth: string; // YYYY-MM
  onMonthChange: (newMonth: string) => void;
  selectedDate: string | null; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  monthSummary: DayAvailabilitySummary[] | Record<string, DayAvailabilitySummary>;
  slotsForSelectedDate: ComputedTimeSlot[];
  selectedSlot: ComputedTimeSlot | null;
  onSelectSlot: (slot: ComputedTimeSlot) => void;
  loading?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function InteractiveBookingCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  monthSummary,
  slotsForSelectedDate,
  selectedSlot,
  onSelectSlot,
  loading = false,
}: InteractiveBookingCalendarProps) {
  const [yearStr, monthStr] = currentMonth.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1; // 0..11

  const summaryMap: Record<string, DayAvailabilitySummary> = Array.isArray(monthSummary)
    ? Object.fromEntries(monthSummary.map((item) => [item.date, item]))
    : monthSummary || {};

  const firstDayOfWeek = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const handlePrevMonth = () => {
    const prev = new Date(Date.UTC(year, monthIndex - 1, 1));
    const ym = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
    onMonthChange(ym);
  };

  const handleNextMonth = () => {
    const next = new Date(Date.UTC(year, monthIndex + 1, 1));
    const ym = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    onMonthChange(ym);
  };

  const dayCells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dayCells.push({ day: d, dateStr });
  }

  return (
    <div className="space-y-8">
      {/* Monthly Calendar Card */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-5 sm:p-7 shadow-2xs">
        {/* Month Header & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5DEC9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#141210]">
                {MONTH_NAMES[monthIndex]} {year}
              </h3>
              <p className="text-xs text-[#5C5449]">
                Timezone: Asia/Dhaka (Bangladesh Standard Time)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border border-[#E5DEC9] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border border-[#E5DEC9] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-4 py-3.5 text-xs text-[#5C5449] border-b border-[#E5DEC9]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E6B4E]" />
            <span>Available</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3A2008]" />
            <span>Selected</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B86B19]" />
            <span>Fully Booked</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D5CCB4]" />
            <span>Unavailable / Closed</span>
          </span>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-4 text-center">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="text-[11px] font-mono uppercase tracking-wider text-[#877D70] py-1.5"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
          {dayCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-14 sm:h-20" />;
            }

            const summary = summaryMap[cell.dateStr];
            const state = summary?.status || "unavailable";
            const isSelected = selectedDate === cell.dateStr;
            const isInteractive = state === "available" || state === "full";

            return (
              <button
                key={cell.dateStr}
                type="button"
                disabled={!isInteractive || loading}
                onClick={() => onSelectDate(cell.dateStr)}
                className={`h-14 sm:h-20 rounded-2xl p-1.5 sm:p-2.5 flex flex-col items-center sm:items-start justify-between border text-left transition-all ${
                  isSelected
                    ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008] shadow-sm"
                    : state === "available"
                    ? "bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border-[#D5CCB4] hover:border-[#3A2008] cursor-pointer"
                    : state === "full"
                    ? "bg-[#FAF7F2]/60 text-[#877D70] border-[#E5DEC9] cursor-pointer"
                    : "bg-[#FAF7F2]/30 text-[#B8AFA0] border-transparent cursor-not-allowed opacity-60"
                }`}
              >
                <span className="text-xs sm:text-sm font-bold font-mono">
                  {cell.day}
                </span>

                {/* Bottom availability pill */}
                <div className="w-full flex items-center justify-center sm:justify-between">
                  {state === "available" && (
                    <>
                      <span
                        className={`hidden sm:inline text-[10px] font-medium truncate ${
                          isSelected ? "text-[#D9A673]" : "text-[#2E6B4E]"
                        }`}
                      >
                        {summary.available_slots_count}{" "}
                        {summary.available_slots_count === 1 ? "slot" : "slots"}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? "bg-[#D9A673]" : "bg-[#2E6B4E]"
                        }`}
                      />
                    </>
                  )}

                  {state === "full" && (
                    <>
                      <span
                        className={`hidden sm:inline text-[10px] font-medium ${
                          isSelected ? "text-[#FAF7F2]" : "text-[#B86B19]"
                        }`}
                      >
                        Full
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#B86B19]" />
                    </>
                  )}

                  {state === "unavailable" && (
                    <span className="hidden sm:inline text-[10px] text-[#B8AFA0]">
                      —
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Selector */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-5 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DEC9] pb-4">
          <div>
            <h4 className="text-base font-bold text-[#141210] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A66D35]" />
              <span>
                {selectedDate
                  ? `Available Time Slots for ${selectedDate}`
                  : "Select an Available Date Above"}
              </span>
            </h4>
            <p className="text-xs text-[#5C5449] mt-0.5">
              All times shown in Asia/Dhaka (BST). Capacity and buffer periods are enforced in real time.
            </p>
          </div>
          {selectedDate && slotsForSelectedDate.length > 0 && (
            <span className="text-xs font-mono text-[#3A2008] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E5DEC9]">
              {slotsForSelectedDate.filter((s) => s.state === "available").length} open of{" "}
              {slotsForSelectedDate.length} slots
            </span>
          )}
        </div>

        {!selectedDate ? (
          <div className="py-10 text-center text-xs text-[#5C5449] bg-[#FAF7F2] rounded-2xl border border-dashed border-[#D5CCB4]">
            Please select a highlighted date on the calendar to inspect time slots.
          </div>
        ) : slotsForSelectedDate.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#5C5449] bg-[#FAF7F2] rounded-2xl border border-dashed border-[#D5CCB4]">
            No bookable time slots are available on {selectedDate}. Please choose another date.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {slotsForSelectedDate.map((slot) => {
              const isSelected =
                selectedSlot?.start_at === slot.start_at &&
                (selectedSlot?.slot_id === slot.slot_id || !slot.slot_id);
              const isAvailable = slot.state === "available" && slot.remaining_capacity > 0;
              const slotLabel = `${slot.start_time_label} – ${slot.end_time_label}`;
              const totalBuffer = (slot.buffer_before_mins || 0) + (slot.buffer_after_mins || 0);

              return (
                <button
                  key={`${slot.slot_id || slot.start_at}`}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => isAvailable && onSelectSlot(slot)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008] shadow-sm"
                      : isAvailable
                      ? "bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border-[#D5CCB4] hover:border-[#3A2008]"
                      : "bg-[#FAF7F2]/50 text-[#877D70] border-[#E5DEC9] cursor-not-allowed opacity-65"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold font-mono">
                      {slotLabel}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-[#D9A673] shrink-0" />
                    ) : !isAvailable ? (
                      <AlertCircle className="w-4 h-4 text-[#B86B19] shrink-0" />
                    ) : null}
                  </div>

                  {slot.session_title && (
                    <div
                      className={`text-[11px] font-medium truncate ${
                        isSelected ? "text-[#E5DEC9]" : "text-[#5C5449]"
                      }`}
                    >
                      {slot.session_title}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-current/10">
                    <span className="font-mono">
                      {slot.duration_mins}m
                      {totalBuffer > 0 ? ` + ${totalBuffer}m buffer` : ""}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isSelected
                          ? "text-[#D9A673]"
                          : isAvailable
                          ? "text-[#2E6B4E]"
                          : "text-[#B86B19]"
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      {slot.state === "full" || slot.remaining_capacity <= 0
                        ? "Fully Booked"
                        : slot.state === "unavailable"
                        ? slot.unavailable_reason || "Unavailable"
                        : `${slot.remaining_capacity} left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

