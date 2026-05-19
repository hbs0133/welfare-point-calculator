import { useEffect, useMemo, useRef, useState } from "react";
import { getTodayISO } from "../utils/format";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  popoverPlacement?: "bottom" | "top";
  variant?: "default" | "table";
};

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const parseISODate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: string) => {
  if (!date) {
    return "날짜 선택";
  }

  const parsedDate = parseISODate(date);
  return `${parsedDate.getFullYear()}. ${String(parsedDate.getMonth() + 1).padStart(
    2,
    "0",
  )}. ${String(parsedDate.getDate()).padStart(2, "0")}`;
};

const getCalendarDays = (currentMonth: Date) => {
  const firstDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startDate = new Date(firstDate);
  startDate.setDate(firstDate.getDate() - firstDate.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
};

export function DatePicker({
  value,
  onChange,
  popoverPlacement = "bottom",
  variant = "default",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() =>
    value ? parseISODate(value) : parseISODate(getTodayISO()),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISODate(value) : null;
  const todayISO = getTodayISO();
  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  useEffect(() => {
    if (value) {
      setCurrentMonth(parseISODate(value));
    }
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const moveMonth = (direction: number) => {
    setCurrentMonth(
      (previousMonth) =>
        new Date(previousMonth.getFullYear(), previousMonth.getMonth() + direction, 1),
    );
  };

  const selectDate = (date: Date) => {
    onChange(toISODate(date));
    setCurrentMonth(date);
    setIsOpen(false);
  };

  return (
    <div
      className={`date-picker date-picker--${variant} date-picker--${popoverPlacement}`}
      ref={containerRef}
    >
      <button
        className="date-picker__trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{formatDisplayDate(value)}</span>
        <svg
          aria-hidden="true"
          className="date-picker__icon"
          viewBox="0 0 20 20"
          width="18"
          height="18"
        >
          <path
            d="M5.5 2.5v2M14.5 2.5v2M3.5 7.5h13M5 4h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="date-picker__popover">
          <div className="date-picker__header">
            <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>
              ‹
            </button>
            <strong>
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </strong>
            <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>
              ›
            </button>
          </div>

          <div className="date-picker__weekdays">
            {WEEK_DAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="date-picker__days">
            {calendarDays.map((date) => {
              const isoDate = toISODate(date);
              const isSelected = selectedDate ? isoDate === toISODate(selectedDate) : false;
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isToday = isoDate === todayISO;

              return (
                <button
                  key={isoDate}
                  className={[
                    "date-picker__day",
                    isCurrentMonth ? "" : "is-muted",
                    isSelected ? "is-selected" : "",
                    isToday ? "is-today" : "",
                  ].join(" ")}
                  type="button"
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
