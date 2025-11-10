
import React, { useState, useEffect, useCallback, useMemo } from 'react';
 
import {
  gregorianISOToHebrewDateParts,
  hebrewDatePartsToGregorianISO,
  getHebrewMonthsForYear,
  gregSourceToHebrewString,
  getTodayGregorianISO,
  getDaysInHebrewMonth,
  gematriya,
  getHebrewPartsForDateForPicker,
  getHebrewStringForDate,
    fetchParashaNameForGregorianISO,
    getHolidayLabelForGregorianISO
} from '../utils/dateConverter';
import { Modal } from './Modal';
import { Button } from './Button';
import { Select } from './Select';
import { useContext, useState as useStateReact } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { formatGregorianString } from '../utils/dateConverter';

// Helper to format a JS Date into YYYY-MM-DD in local time
  const toISODate = (d: Date): string => {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const y = local.getFullYear();
  const m = (local.getMonth() + 1).toString().padStart(2, '0');
  const day = local.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

  // Parse YYYY-MM-DD as local date (avoid UTC shift)
  const parseISOToLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('T')[0].split('-').map(n => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

// יחוס התאריך ביחס להיום: היום/מחר/מחרתיים/עוד X ימים מעכשיו
const getRelativeLabelFromToday = (iso: string): string => {
  try {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = parseISOToLocalDate(iso);
    const deltaDays = Math.round((target.getTime() - todayLocal.getTime()) / 86400000);
    if (deltaDays === 0) return 'היום';
    if (deltaDays === 1) return 'מחר';
    if (deltaDays === 2) return 'מחרתיים';
    if (deltaDays > 2) return `עוד ${deltaDays} ימים מעכשיו`;
    return '';
  } catch {
    return '';
  }
};

interface HebrewDatePickerProps {
  label?: string;
  value: string | null; 
  onChange: (gregorianISO: string | null) => void;
  error?: string;
  id?: string;
  required?: boolean;
  inputClassName?: string;
  containerClassName?: string;
  labelClassName?: string;
}

const HEBREW_WEEKDAY_SHORT_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DEFAULT_LABEL_CLASS = 'block text-sm font-medium text-dark-text mb-1 text-right'; 

export const HebrewDatePicker: React.FC<HebrewDatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  id = 'hebrew-date-picker', 
  required,
  inputClassName = '',
  containerClassName = 'mb-4',
  labelClassName
}) => {
  const authCtx = useContext(AuthContext);
  const [mode, setMode] = useState<'hebrew' | 'gregorian'>(() => authCtx?.datePreference || 'hebrew');
  const [isOpen, setIsOpen] = useState(false);
  const [tentativeSelectedGregorianISO, setTentativeSelectedGregorianISO] = useState<string | null>(null);
  const [tentativeHebrewSelected, setTentativeHebrewSelected] = useState<{ day: number; month: number; year: number } | null>(null);
  const [parashaTooltipByIso, setParashaTooltipByIso] = useState<Record<string, string>>({});
  // מצב ללוח לועזי
  const [gDisplayYear, setGDisplayYear] = useState<number>(new Date().getFullYear());
  const [gDisplayMonth, setGDisplayMonth] = useState<number>(new Date().getMonth() + 1); // 1-12

  const todayHdGlobal = useMemo(() => {
    try {
      const today = new Date();
      const hebrewParts = gregorianISOToHebrewDateParts(today.toISOString());
      if (hebrewParts) {
        return { getFullYear: () => hebrewParts.year, getMonth: () => hebrewParts.month };
      }
    } catch (error) {
      console.error("Error calculating today's Hebrew date:", error);
    }
    // Fallback לתאריך נוכחי
    const today = new Date();
    const currentYear = today.getFullYear();
    const hebrewYear = currentYear + 3760; // קירוב לשנה עברית
    return { getFullYear: () => hebrewYear, getMonth: () => 1 };
  }, []);

  const [displayYear, setDisplayYear] = useState<number>(todayHdGlobal.getFullYear());
  const [displayMonth, setDisplayMonth] = useState<number>(todayHdGlobal.getMonth());

  useEffect(() => {
    const newParts = value ? gregorianISOToHebrewDateParts(value) : null;
    if (newParts) {
      setDisplayYear(newParts.year);
      setDisplayMonth(newParts.month);
    } else {
      const todayHebrew = gregorianISOToHebrewDateParts(getTodayGregorianISO());
      if (todayHebrew) {
        setDisplayYear(todayHebrew.year);
        setDisplayMonth(todayHebrew.month);
      }
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      const todayISO = getTodayGregorianISO();
      setTentativeSelectedGregorianISO(value || todayISO);

      if (value) {
        const partsToDisplay = gregorianISOToHebrewDateParts(value);
      if (partsToDisplay) {
        setDisplayYear(partsToDisplay.year);
        setDisplayMonth(partsToDisplay.month);
          setTentativeHebrewSelected({ day: partsToDisplay.day, month: partsToDisplay.month, year: partsToDisplay.year });
        }
      } else {
        const todayPartsForPicker = getHebrewPartsForDateForPicker(new Date(todayISO));
        const todayHeb = gregorianISOToHebrewDateParts(todayISO);
        if (todayPartsForPicker && todayHeb) {
          setDisplayYear(todayPartsForPicker.year);
          setDisplayMonth(todayPartsForPicker.monthValue);
          setTentativeHebrewSelected({ day: todayHeb.day, month: todayPartsForPicker.monthValue, year: todayPartsForPicker.year });
        } else if (todayHeb) {
          setDisplayYear(todayHeb.year);
          setDisplayMonth(todayHeb.month);
          setTentativeHebrewSelected({ day: todayHeb.day, month: todayHeb.month, year: todayHeb.year });
        }
      }
      // Initialize Gregorian header when opening
      const base = value || todayISO;
      const [yy, mm] = base.split('T')[0].split('-').map(n => parseInt(n, 10));
      if (yy) setGDisplayYear(yy);
      if (mm) setGDisplayMonth(mm);
    }
  }, [isOpen, value]);

  // Prefetch parasha titles for all Shabbat dates in current displayed month
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const days = getDaysInHebrewMonth(displayMonth, displayYear);
        const firstDayIso = hebrewDatePartsToGregorianISO(1, displayMonth, displayYear);
        if (!firstDayIso) return;
        const firstDate = parseISOToLocalDate(firstDayIso);
        const entries: [string, string][] = [];
        const fetches: Array<Promise<void>> = [];
        for (let d = 1; d <= days; d++) {
                const js = new Date(firstDate.getTime() + (d - 1) * 86400000);
                js.setHours(12, 0, 0, 0);
          if (js.getDay() === 6) {
            const iso = toISODate(js);
            if (!parashaTooltipByIso[iso]) {
              fetches.push(
                fetchParashaNameForGregorianISO(iso).then(name => {
                  if (!isCancelled && name) entries.push([iso, name]);
                })
              );
            }
          }
        }
        if (fetches.length > 0) await Promise.all(fetches);
        if (!isCancelled && entries.length > 0) {
          setParashaTooltipByIso(prev => {
            const next = { ...prev };
            for (const [k, v] of entries) next[k] = v;
            return next;
          });
        }
      } catch (e) {
        console.error('Prefetch parasha error:', e);
      }
    })();
    return () => { isCancelled = true; };
  }, [displayMonth, displayYear]);

  const handleDayClickInGrid = (day: number) => {
    try {
    const newTentativeISO = hebrewDatePartsToGregorianISO(day, displayMonth, displayYear);
    setTentativeSelectedGregorianISO(newTentativeISO);
      setTentativeHebrewSelected({ day, month: displayMonth, year: displayYear });
    } catch (error) {
      console.error("Error in handleDayClickInGrid:", error);
    }
  };

  const handleConfirmSelection = () => {
    try {
    if (tentativeSelectedGregorianISO) {
      onChange(tentativeSelectedGregorianISO);
      } else if (tentativeHebrewSelected) {
        const iso = hebrewDatePartsToGregorianISO(
          tentativeHebrewSelected.day,
          tentativeHebrewSelected.month,
          tentativeHebrewSelected.year
        );
        onChange(iso);
    }
    setIsOpen(false);
    } catch (error) {
      console.error("Error in handleConfirmSelection:", error);
      setIsOpen(false);
    }
  };

  const handleQuickSelect = (offset: 0 | 1 | 2) => { 
    const targetJsDate = new Date();
    targetJsDate.setDate(targetJsDate.getDate() + offset);

    const y = targetJsDate.getFullYear();
    const m = (targetJsDate.getMonth() + 1).toString().padStart(2, '0');
    const d = targetJsDate.getDate().toString().padStart(2, '0');
    const gregorianISO = `${y}-${m}-${d}`;

    onChange(gregorianISO);

    try {
      // Sync month/year according to Hebrew calendar parts
      const partsForPicker = getHebrewPartsForDateForPicker(targetJsDate);
      if (partsForPicker) {
        setDisplayMonth(partsForPicker.monthValue);
        setDisplayYear(partsForPicker.year);
      } else {
    const parts = gregorianISOToHebrewDateParts(gregorianISO);
    if (parts) {
      setDisplayMonth(parts.month);
      setDisplayYear(parts.year);
        }
      }
    } catch (error) {
      console.error("Error converting date to Hebrew:", error);
    }
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    try {
    let newMonth = displayMonth;
    let newYear = displayYear;
    
    const currentYearMonths = getHebrewMonthsForYear(newYear); 
    let currentMonthIndex = currentYearMonths.findIndex(m => m.value === newMonth);

    if (currentMonthIndex === -1 && currentYearMonths.length > 0) {
        currentMonthIndex = 0;
        newMonth = currentYearMonths[0].value;
    }

    if (delta > 0) {
        if (currentMonthIndex < currentYearMonths.length - 1) {
            newMonth = currentYearMonths[currentMonthIndex + 1].value;
        } else {
            newYear++;
                const nextYearMonths = getHebrewMonthsForYear(newYear);
                newMonth = nextYearMonths.length > 0 ? nextYearMonths[0].value : 1;
        }
    } else {
        if (currentMonthIndex > 0) {
            newMonth = currentYearMonths[currentMonthIndex - 1].value;
        } else {
            newYear--;
            const prevYearMonths = getHebrewMonthsForYear(newYear);
                newMonth = prevYearMonths.length > 0 ? prevYearMonths[prevYearMonths.length - 1].value : 12;
        }
    }
    setDisplayMonth(newMonth);
    setDisplayYear(newYear);
    } catch (error) {
      console.error("Error in changeMonth:", error);
    }
  };

  const changeYear = (delta: number) => {
    try {
      let newYear = displayYear + delta;
      const monthsInNewYear = getHebrewMonthsForYear(newYear);
      let newMonth = displayMonth;
      if (!monthsInNewYear.some(m => m.value === newMonth)) {
        newMonth = delta > 0
          ? (monthsInNewYear[0]?.value || 1)
          : (monthsInNewYear[monthsInNewYear.length - 1]?.value || 12);
      }
      setDisplayYear(newYear);
      setDisplayMonth(newMonth);
    } catch (error) {
      console.error("Error in changeYear:", error);
    }
  };

  // ניווט לועזי
  const changeGMonth = (delta: number) => {
    let m = gDisplayMonth + delta;
    let y = gDisplayYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setGDisplayMonth(m); setGDisplayYear(y);
  };
  const changeGYear = (delta: number) => setGDisplayYear(prev => prev + delta);

  const renderCalendarGrid = () => {
    try {
    const daysInMonth = getDaysInHebrewMonth(displayMonth, displayYear);
      
      // חישוב היום הראשון של החודש בצורה מדויקת יותר
      const firstDayIso = hebrewDatePartsToGregorianISO(1, displayMonth, displayYear);
      const firstDayDate = firstDayIso ? parseISOToLocalDate(firstDayIso) : new Date();
      const firstDayOfMonth = firstDayDate.getDay();

      const blanks = Array(firstDayOfMonth).fill(null);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const selectedParts = tentativeSelectedGregorianISO ? gregorianISOToHebrewDateParts(tentativeSelectedGregorianISO) : null;

    const todayJs = new Date();
    todayJs.setHours(0, 0, 0, 0);
    
    const currentDisplayMonthName = getHebrewMonthsForYear(displayYear).find(m => m.value === displayMonth)?.name || '';

    return (
        <div className="bg-white rounded border border-gray-200 p-2">
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-labelledby={`${id}-month-year-display`}>
            {HEBREW_WEEKDAY_SHORT_NAMES.map((dayName, index) => (
              <div key={dayName} className={`font-medium text-sm p-2 rounded ${index === 6 ? 'text-blue-600 bg-blue-50' : 'text-gray-700 bg-gray-50'}`}>
                {dayName}
              </div>
            ))}
            {blanks.map((_, i) => <div key={`blank-${i}`} className="p-2"></div>)}
        {daysArray.map(day => {
              try {
                const jsDate = new Date(firstDayDate.getTime() + (day - 1) * 86400000);

                const dayOfWeek = jsDate.getDay(); // 0 = ראשון, 6 = שבת
                const isShabbat = dayOfWeek === 6;
          const isPast = jsDate < todayJs;
          const isSelected = selectedParts?.day === day && selectedParts?.month === displayMonth && selectedParts?.year === displayYear;
                const isTentativelySelected = tentativeHebrewSelected
                  ? tentativeHebrewSelected.day === day && tentativeHebrewSelected.month === displayMonth && tentativeHebrewSelected.year === displayYear
                  : false;
          const todayParts = gregorianISOToHebrewDateParts(getTodayGregorianISO());
          const isToday = todayParts && day === todayParts.day && displayMonth === todayParts.month && displayYear === todayParts.year;

                // בדיקת חגים יהודיים – (השאר כפי שהיה)
                let holidayName = '';
                const isHoliday = (() => {
                  if (displayMonth === 7 && (day === 1 || day === 2)) { holidayName = day === 1 ? 'ראש השנה - יום א׳' : 'ראש השנה - יום ב׳'; return true; }
                  if (displayMonth === 7 && day === 10) { holidayName = 'יום כיפור'; return true; }
                  if (displayMonth === 7 && day >= 15 && day <= 21) { const sukotDay = day - 14; holidayName = `סוכות - יום ${sukotDay === 1 ? 'א׳' : sukotDay === 2 ? 'ב׳' : sukotDay === 3 ? 'ג׳' : sukotDay === 4 ? 'ד׳' : sukotDay === 5 ? 'ה׳' : sukotDay === 6 ? 'ו׳' : 'ז׳'}`; return true; }
                  if (displayMonth === 7 && day === 22) { holidayName = 'שמיני עצרת'; return true; }
                  if (displayMonth === 7 && day === 23) { holidayName = 'שמחת תורה'; return true; }
                  if (displayMonth === 9 && day >= 25) { const han = day - 24; holidayName = `חנוכה - נר ${han === 1 ? 'א׳' : han === 2 ? 'ב׳' : han === 3 ? 'ג׳' : han === 4 ? 'ד׳' : han === 5 ? 'ה׳' : 'ו׳'}`; return true; }
                  if (displayMonth === 10 && day <= 2) { const han = day + 6; holidayName = `חנוכה - נר ${han === 7 ? 'ז׳' : 'ח׳'}`; return true; }
                  if (displayMonth === 11 && day === 15) { holidayName = 'ט״ו בשבט - ראש השנה לאילנות'; return true; }
                  if (displayMonth === 12 && day === 14) { holidayName = 'פורים'; return true; }
                  if (displayMonth === 1 && day >= 15 && day <= 22) { if (day === 15) holidayName = 'פסח - ליל הסדר'; else if (day === 16) holidayName = 'פסח - יום א׳'; else if (day === 21) holidayName = 'פסח - יום ז׳'; else if (day === 22) holidayName = 'פסח - אחרון של פסח'; else holidayName = 'פסח - חול המועד'; return true; }
                  if (displayMonth === 2 && day === 18) { holidayName = 'ל״ג בעומר'; return true; }
                  if (displayMonth === 2 && day === 28) { holidayName = 'יום ירושלים'; return true; }
                  if (displayMonth === 3 && (day === 6 || day === 7)) { holidayName = day === 6 ? 'שבועות - יום א׳' : 'שבועות - יום ב׳'; return true; }
                  return false;
                })();

                const isoForDay = toISODate(jsDate);
                const parashaName = parashaTooltipByIso[isoForDay];
                const holidayFromEngine = getHolidayLabelForGregorianISO(isoForDay) || '';

                let dayClass = "w-8 h-8 rounded border transition-colors text-sm font-medium flex items-center justify-center cursor-pointer relative";

          if (isPast) {
                  dayClass += " text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed";
                } else {
                  // קדימות: שבת -> חג -> רגיל
                  if (isSelected || isTentativelySelected) {
                    dayClass = "w-8 h-8 rounded border-4 border-red-600 bg-red-500 text-white font-bold flex items-center justify-center cursor-pointer shadow-lg ring-2 ring-red-300 ring-offset-1";
                  } else if (isToday) {
                    dayClass = "w-8 h-8 rounded border-2 border-emerald-400 bg-emerald-100 text-emerald-700 font-bold flex flex-col items-center justify-center cursor-pointer text-[11px] leading-tight hover:bg-emerald-200 hover:border-emerald-500 hover:text-emerald-800";
                  } else if (isShabbat) {
                    dayClass += " text-blue-600 bg-blue-100 border-blue-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700";
                  } else if (isHoliday) {
                    dayClass += " text-purple-700 bg-purple-100 border-purple-300 hover:bg-red-100 hover:border-red-300 hover:text-red-700";
                  } else {
                    dayClass += " text-gray-700 bg-white border-gray-300 hover:bg-red-100 hover:border-red-300 hover:text-red-700";
                  }
                }

                // Build a single, unified tooltip string
                const toHebrewLetter = (n: number) => {
                  const map: Record<number, string> = {1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח'};
                  return map[n] || gematriya(n);
                };

                const holidayLabel = (() => {
                  if (!isHoliday) return '';
                  if (holidayFromEngine) return holidayFromEngine;
                  // Month numbers are Hebrew months per our model (1=ניסן ... 7=תשרי)
                  if (displayMonth === 7) {
                    if (day === 1) return 'א׳ ראש השנה';
                    if (day === 2) return 'ב׳ ראש השנה';
                    if (day === 10) return 'יום כיפור';
                    if (day === 15) return 'סוכות – יום א׳';
                    if (day >= 16 && day <= 21) return 'חול המועד סוכות';
                    if (day === 22) return 'שמיני עצרת';
                    if (day === 23) return 'שמחת תורה';
                  }
                  if (displayMonth === 9) {
                    if (day >= 25) return `${toHebrewLetter(day - 24)} חנוכה`;
                  }
                  if (displayMonth === 10) {
                    if (day <= 2) return `${toHebrewLetter(day + 6)} חנוכה`;
                  }
                  if (displayMonth === 11 && day === 15) return 'ט״ו בשבט';
                  if (displayMonth === 12 && day === 14) return 'פורים';
                  if (displayMonth === 1) {
                    if (day === 15) return 'ליל הסדר';
                    if (day === 16) return 'פסח – יום א׳';
                    if (day > 16 && day < 21) return 'פסח – חול המועד';
                    if (day === 21) return 'פסח – יום ז׳';
                    if (day === 22) return 'אחרון של פסח';
                  }
                  if (displayMonth === 2 && day === 18) return 'ל״ג בעומר';
                  if (displayMonth === 2 && day === 28) return 'יום ירושלים';
                  if (displayMonth === 3) {
                    if (day === 6) return 'שבועות – יום א׳';
                    if (day === 7) return 'שבועות – יום ב׳';
                  }
                  return '';
                })();

                const tooltipText = (() => {
                  if (isToday) return 'היום';
                  if (isShabbat && holidayLabel) {
                    // בשבת-חג לא מציגים פרשה
                    return `שבת ${holidayLabel}`;
                  }
                  if (isShabbat && parashaName) {
                    return `שבת פרשת ${parashaName}`;
                  }
                  if (isShabbat) return 'שבת';
                  if (holidayLabel) return holidayLabel;
                  return '';
                })();

          return (
                  <button
                key={day}
                    type="button"
                className={dayClass}
                onClick={() => !isPast && handleDayClickInGrid(day)}
                    disabled={isPast}
                    role="gridcell"
                    aria-selected={isSelected || isTentativelySelected}
                    aria-label={`${gematriya(day)} ${currentDisplayMonthName} ${gematriya(displayYear)}${tooltipText ? ` – ${tooltipText}` : ''}`}
                    title={tooltipText || `${gematriya(day)} ${currentDisplayMonthName} ${gematriya(displayYear)}`}
            >
              {isToday ? (
                <>
                  <span>{gematriya(day)}</span>
                  <span className="text-[10px] mt-0.5">היום</span>
                </>
              ) : (
                gematriya(day)
              )}
                    {(isSelected || isTentativelySelected) && (
                      <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                    )}
                  </button>
                );
              } catch (dayError) {
                console.error("Error rendering day:", day, dayError);
                return (
                  <div key={day} className="w-8 h-8 rounded bg-red-50 border border-red-200 flex items-center justify-center text-xs text-red-500">
                    {day}
            </div>
          );
              }
            })}
          </div>
        </div>
      );
    } catch (error) {
      console.error("Error in renderCalendarGrid:", error);
      return (
        <div className="text-center text-red-600 p-4 bg-red-50 rounded">
          <p>שגיאה בטעינת לוח השנה</p>
      </div>
    );
    }
  };

  const renderGregorianCalendarGrid = () => {
    try {
      const year = gDisplayYear;
      const monthIndex0 = gDisplayMonth - 1; // 0-11
      const firstDayDate = new Date(year, monthIndex0, 1);
      const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
      const firstDayOfMonth = firstDayDate.getDay();
      const blanks = Array(firstDayOfMonth).fill(null);
      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      const selectedISO = tentativeSelectedGregorianISO || undefined;
      const todayJs = new Date(); todayJs.setHours(0,0,0,0);
      const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(firstDayDate);

      return (
        <div className="bg-white rounded border border-gray-200 p-2">
          <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-labelledby={`${id}-month-year-display-g` }>
            {HEBREW_WEEKDAY_SHORT_NAMES.map((dayName, index) => (
              <div key={dayName} className={`font-medium text-sm p-2 rounded ${index === 6 ? 'text-blue-600 bg-blue-50' : 'text-gray-700 bg-gray-50'}`}>{dayName}</div>
            ))}
            {blanks.map((_, i) => <div key={`gblank-${i}`} className="p-2"></div>)}
            {daysArray.map(day => {
              const jsDate = new Date(year, monthIndex0, day);
              jsDate.setHours(0,0,0,0);
              const iso = toISODate(jsDate);
              const isPast = jsDate < todayJs;
              const isSelected = selectedISO === iso;
              const isToday = iso === getTodayGregorianISO();
              let dayClass = "w-8 h-8 rounded border transition-colors text-sm font-medium flex items-center justify-center cursor-pointer relative";
              if (isPast) {
                dayClass += " text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed";
              } else if (isSelected) {
                dayClass = "w-8 h-8 rounded border-4 border-red-600 bg-red-500 text-white font-bold flex items-center justify-center cursor-pointer shadow-lg ring-2 ring-red-300 ring-offset-1";
              } else if (isToday) {
                dayClass = "w-8 h-8 rounded border-2 border-emerald-400 bg-emerald-100 text-emerald-700 font-bold flex flex-col items-center justify-center cursor-pointer text-[11px] leading-tight hover:bg-emerald-200 hover:border-emerald-500 hover:text-emerald-800";
              } else {
                dayClass += " text-gray-700 bg-white border-gray-300 hover:bg-red-100 hover:border-red-300 hover:text-red-700";
              }
              return (
                <button
                  key={day}
                  type="button"
                  className={dayClass}
                  onClick={() => !isPast && (setTentativeSelectedGregorianISO(iso), setTentativeHebrewSelected(null))}
                  disabled={isPast}
                  role="gridcell"
                  aria-label={`${day} ${monthName} ${year}`}
                  title={`${day} ${monthName} ${year}${isToday ? ' – היום' : ''}`}
                >
                  {isToday ? (<><span>{day}</span><span className="text-[10px] mt-0.5">היום</span></>) : day}
                </button>
              );
            })}
          </div>
        </div>
      );
    } catch (e) {
      console.error('Error in renderGregorianCalendarGrid:', e);
      return null;
    }
  };

  const yearOptions = useMemo(() => Array.from({ length: 50 }, (_, i) => {
    const year = todayHdGlobal.getFullYear() - 25 + i;
    return { value: year, label: gematriya(year) };
  }), [todayHdGlobal]);

  const monthOptions = useMemo(() => {
    return getHebrewMonthsForYear(displayYear).map(m => ({ value: m.value, label: m.name }));
  }, [displayYear]);

  const displayedValue = value ? (() => {
    try {
      const tempDate = new Date(value);
      return mode === 'gregorian' ? formatGregorianString(tempDate) : getHebrewStringForDate(tempDate);
    } catch (e) {
      return mode === 'gregorian' ? formatGregorianString(value) : gregSourceToHebrewString(value);
    }
  })() : (required ? 'בחר תאריך...' : 'תאריך לא הוגדר');

  const confirmButtonText = (() => {
    const iso = tentativeSelectedGregorianISO || (tentativeHebrewSelected ? hebrewDatePartsToGregorianISO(
      tentativeHebrewSelected.day,
      tentativeHebrewSelected.month,
      tentativeHebrewSelected.year
    ) : null);
    if (!iso) return 'בחר תאריך מהלוח';
    const relative = getRelativeLabelFromToday(iso);
    let hebrewText: string;
    try {
      hebrewText = mode === 'gregorian' ? formatGregorianString(new Date(iso)) : getHebrewStringForDate(new Date(iso));
    } catch (e) {
      hebrewText = mode === 'gregorian' ? formatGregorianString(iso) : gregSourceToHebrewString(iso);
    }
    return `קבע: ${hebrewText}${relative ? ` (${relative})` : ''}`;
  })();
  
  const modalTitleId = `${id}-modal-title`;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={labelClassName || DEFAULT_LABEL_CLASS}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="text"
        id={id}
        value={displayedValue}
        onClick={() => setIsOpen(true)}
        readOnly
        className={`mt-1 block w-full px-3 py-2 bg-light-blue/10 border ${error ? 'border-red-500' : 'border-light-blue/30'} rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color focus:border-royal-blue sm:text-sm text-dark-text cursor-pointer ${inputClassName}`}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={!!error}
        aria-haspopup="dialog"
        aria-controls={isOpen ? `${id}-modal-content` : undefined}
        aria-describedby={error ? `${id}-error-desc` : undefined}
      />
      {error && <p id={`${id}-error-desc`} className="mt-1 text-xs text-red-600 text-right" role="alert">{error}</p>}

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={mode === 'gregorian' ? 'בחירת תאריך לועזי' : 'בחירת תאריך עברי'} 
        titleId={modalTitleId} 
        size="lg" 
        panelClassName="bg-white rounded-lg shadow-xl border border-gray-300 max-w-xl w-full mx-4"
        headerActions={
          <div className="flex items-center gap-2">
            <Button variant={mode === 'hebrew' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('hebrew')}>עברי</Button>
            <Button variant={mode === 'gregorian' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('gregorian')}>לועזי</Button>
          </div>
        }
      >
        <div id={`${id}-modal-content`} className="bg-white p-4" role="dialog" aria-modal="true" aria-labelledby={modalTitleId} dir="rtl">
          <h2 id={`${id}-month-year-display`} className="sr-only">{`${getHebrewMonthsForYear(displayYear).find(m => m.value === displayMonth)?.name || ''} ${gematriya(displayYear)}`}</h2>
          
          {/* ניווט חודש ושנה */}
          {mode === 'gregorian' ? (
          <div className="flex flex-wrap justify-between items-center mb-4 p-2 bg-gray-50 rounded border gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => changeGMonth(-1)} aria-label="חודש קודם" className="border-gray-300 text-gray-600 hover:bg-gray-100">‹</Button>
              <Select
                options={[{value:1,label:'ינואר'},{value:2,label:'פברואר'},{value:3,label:'מרץ'},{value:4,label:'אפריל'},{value:5,label:'מאי'},{value:6,label:'יוני'},{value:7,label:'יולי'},{value:8,label:'אוגוסט'},{value:9,label:'ספטמבר'},{value:10,label:'אוקטובר'},{value:11,label:'נובמבר'},{value:12,label:'דצמבר'}]}
                value={gDisplayMonth.toString()}
                onChange={(e) => setGDisplayMonth(parseInt(e.target.value))}
                selectClassName="py-1 px-2 text-sm border border-gray-300 rounded min-w-[120px]"
                containerClassName="mb-0"
                aria-label="בחר חודש לועזי"
                id={`${id}-g-month-select`}
              />
              <Button variant="outline" size="sm" onClick={() => changeGMonth(1)} aria-label="חודש הבא" className="border-gray-300 text-gray-600 hover:bg-gray-100">›</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => changeGYear(-1)} aria-label="שנה קודמת" className="border-gray-300 text-gray-600 hover:bg-gray-100">‹</Button>
              <Select
                options={Array.from({length: 51}, (_,i)=>{const y=new Date().getFullYear()-25+i;return {value:y,label:y.toString()}})}
                value={gDisplayYear.toString()}
                onChange={(e) => setGDisplayYear(parseInt(e.target.value))}
                selectClassName="py-1 px-2 text-sm border border-gray-300 rounded min-w-[120px]"
                containerClassName="mb-0"
                aria-label="בחר שנה לועזית"
                id={`${id}-g-year-select`}
              />
              <Button variant="outline" size="sm" onClick={() => changeGYear(1)} aria-label="שנה הבאה" className="border-gray-300 text-gray-600 hover:bg-gray-100">›</Button>
            </div>
          </div>
          ) : (
          <div className="flex flex-wrap justify-between items-center mb-4 p-2 bg-gray-50 rounded border gap-3">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeMonth(-1)} 
                aria-label="חודש קודם" 
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                ‹
              </Button>
              <Select
                options={monthOptions}
                value={displayMonth.toString()}
                onChange={(e) => setDisplayMonth(parseInt(e.target.value))}
                selectClassName="py-1 px-2 text-sm border border-gray-300 rounded min-w-[120px]"
                containerClassName="mb-0"
                aria-label="בחר חודש"
                id={`${id}-month-select`}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeMonth(1)} 
                aria-label="חודש הבא" 
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                ›
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeYear(-1)} 
                aria-label="שנה קודמת" 
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                ‹
              </Button>
              <Select
                options={yearOptions}
                value={displayYear.toString()}
                onChange={(e) => setDisplayYear(parseInt(e.target.value))}
                selectClassName="py-1 px-2 text-sm border border-gray-300 rounded min-w-[120px]"
                containerClassName="mb-0"
                aria-label="בחר שנה"
                id={`${id}-year-select`}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeYear(1)} 
                aria-label="שנה הבאה" 
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                ›
              </Button>
            </div>
          </div>
          )}
          
          {mode === 'gregorian' ? renderGregorianCalendarGrid() : renderCalendarGrid()}
          
          <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
            <div className="flex justify-center space-x-2 rtl:space-x-reverse">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickSelect(0)} 
                  className="border-red-400 text-red-600 hover:bg-red-50 px-3 py-1"
                >
                  היום
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickSelect(1)} 
                  className="border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1"
                >
                  מחר
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickSelect(2)} 
                  className="border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1"
                >
                  מחרתיים
                </Button>
            </div>
            <Button
                variant="primary"
                onClick={handleConfirmSelection}
                disabled={!tentativeSelectedGregorianISO && !tentativeHebrewSelected}
                className="w-full bg-royal-blue hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500 py-2"
                aria-label={confirmButtonText}
            >
                {confirmButtonText}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
