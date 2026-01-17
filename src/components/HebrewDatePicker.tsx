
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useContext } from 'react';
import { ChevronDownIcon } from './icons';
import { PopoverSelect } from './PopoverSelect';

import {
  gregorianISOToHebrewDateParts,
  hebrewDatePartsToGregorianISO,
  getHebrewMonthsForYear,
  gregSourceToHebrewString,
  getTodayGregorianISO,
  getDaysInHebrewMonth,
  gematriya,
  formatGregorianString
} from '../utils/dateConverter';
import { Modal } from './Modal';
import { Button } from './Button';
import { Select } from './Select';
import { AuthContext } from '../contexts/AuthContext';

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
const GREGORIAN_WEEKDAY_SHORT_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // ראשון עד שבת
const GREGORIAN_MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];
const DEFAULT_LABEL_CLASS = 'block text-sm font-medium text-dark-text mb-1 text-right';

const getDaysInGregorianMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

const getFirstDayOfGregorianMonth = (month: number, year: number): number => {
  // מחזיר את יום השבוע של היום הראשון בחודש (0 = ראשון, 6 = שבת)
  return new Date(year, month - 1, 1).getDay();
};

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
  const [mode, setMode] = useState<'hebrew' | 'gregorian'>(() => {
    const pref = authCtx?.datePreference;
    if (pref === 'hebrew' || pref === 'gregorian') return pref;
    return 'hebrew'; // default to hebrew if 'both' or undefined
  });
  const [isOpen, setIsOpen] = useState(false);
  const [tentativeSelectedGregorianISO, setTentativeSelectedGregorianISO] = useState<string | null>(null);

  const todayHdGlobal = useMemo(() => {
    const today = new Date();
    const hebrewParts = gregorianISOToHebrewDateParts(today.toISOString());
    return hebrewParts ? { getFullYear: () => hebrewParts.year, getMonth: () => hebrewParts.month } : { getFullYear: () => 5784, getMonth: () => 1 };
  }, []);

  // Hebrew display state
  const [displayYear, setDisplayYear] = useState<number>(todayHdGlobal.getFullYear());
  const [displayMonth, setDisplayMonth] = useState<number>(todayHdGlobal.getMonth());

  // Gregorian display state
  const todayGreg = useMemo(() => new Date(), []);
  const [gregDisplayYear, setGregDisplayYear] = useState<number>(todayGreg.getFullYear());
  const [gregDisplayMonth, setGregDisplayMonth] = useState<number>(todayGreg.getMonth() + 1); // 1-12

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
    // Update gregorian display state from value
    if (value) {
      const date = new Date(value);
      setGregDisplayYear(date.getFullYear());
      setGregDisplayMonth(date.getMonth() + 1);
    } else {
      const now = new Date();
      setGregDisplayYear(now.getFullYear());
      setGregDisplayMonth(now.getMonth() + 1);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      setTentativeSelectedGregorianISO(value);
      const partsToDisplay = value ? gregorianISOToHebrewDateParts(value) : gregorianISOToHebrewDateParts(getTodayGregorianISO());
      if (partsToDisplay) {
        setDisplayYear(partsToDisplay.year);
        setDisplayMonth(partsToDisplay.month);
      }
      // Set gregorian display when open
      if (value) {
        const date = new Date(value);
        setGregDisplayYear(date.getFullYear());
        setGregDisplayMonth(date.getMonth() + 1);
      } else {
        const now = new Date();
        setGregDisplayYear(now.getFullYear());
        setGregDisplayMonth(now.getMonth() + 1);
      }
    }
  }, [isOpen, value]);

  const handleDayClickInGrid = (day: number) => {
    const newTentativeISO = hebrewDatePartsToGregorianISO(day, displayMonth, displayYear);
    setTentativeSelectedGregorianISO(newTentativeISO);
  };

  const handleConfirmSelection = () => {
    if (tentativeSelectedGregorianISO) {
      onChange(tentativeSelectedGregorianISO);
    }
    setIsOpen(false);
  };

  const handleQuickSelect = (offset: 0 | 1 | 2) => {
    const targetJsDate = new Date();
    targetJsDate.setDate(targetJsDate.getDate() + offset);

    const y = targetJsDate.getFullYear();
    const m = (targetJsDate.getMonth() + 1).toString().padStart(2, '0');
    const d = targetJsDate.getDate().toString().padStart(2, '0');
    const gregorianISO = `${y}-${m}-${d}`;

    onChange(gregorianISO);

    const parts = gregorianISOToHebrewDateParts(gregorianISO);
    if (parts) {
      setDisplayMonth(parts.month);
      setDisplayYear(parts.year);
    }
    setIsOpen(false);
  };


  const changeMonth = (delta: number) => {
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
        newMonth = getHebrewMonthsForYear(newYear)[0].value;
      }
    } else {
      if (currentMonthIndex > 0) {
        newMonth = currentYearMonths[currentMonthIndex - 1].value;
      } else {
        newYear--;
        const prevYearMonths = getHebrewMonthsForYear(newYear);
        newMonth = prevYearMonths[prevYearMonths.length - 1].value;
      }
    }
    setDisplayMonth(newMonth);
    setDisplayYear(newYear);
  };

  const changeYear = (delta: number) => {
    let newYear = displayYear + delta;
    const monthsInNewYear = getHebrewMonthsForYear(newYear);
    let newMonth = displayMonth;
    if (!monthsInNewYear.some(m => m.value === newMonth)) {
      newMonth = delta > 0 ? (monthsInNewYear[0]?.value || 1) : (monthsInNewYear[monthsInNewYear.length - 1]?.value || 12);
    }
    setDisplayYear(newYear);
    setDisplayMonth(newMonth);
  };

  // Gregorian calendar handlers
  const handleGregDayClick = (day: number) => {
    const isoString = `${gregDisplayYear}-${gregDisplayMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setTentativeSelectedGregorianISO(isoString);
  };

  const changeGregMonth = (delta: number) => {
    let newMonth = gregDisplayMonth + delta;
    let newYear = gregDisplayYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setGregDisplayMonth(newMonth);
    setGregDisplayYear(newYear);
  };

  const changeGregYear = (delta: number) => {
    setGregDisplayYear(gregDisplayYear + delta);
  };

  const renderGregorianCalendarGrid = () => {
    const daysInMonth = getDaysInGregorianMonth(gregDisplayMonth, gregDisplayYear);
    const firstDayOfMonth = getFirstDayOfGregorianMonth(gregDisplayMonth, gregDisplayYear);
    const blanks = Array(firstDayOfMonth).fill(null);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const todayJs = new Date();
    todayJs.setHours(0, 0, 0, 0);

    const selectedDate = tentativeSelectedGregorianISO ? new Date(tentativeSelectedGregorianISO) : null;
    if (selectedDate) selectedDate.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center mb-4" role="grid" aria-labelledby={`${id}-month-year-display`}>
        {GREGORIAN_WEEKDAY_SHORT_NAMES.map((dayName, idx) => (
          <div key={`${dayName}-${idx}`} className="text-xs font-semibold text-gray-400 py-2">{dayName}</div>
        ))}
        {blanks.map((_, i) => <div key={`blank-${i}`} className="p-1"></div>)}
        {daysArray.map(day => {
          const cellDate = new Date(gregDisplayYear, gregDisplayMonth - 1, day);
          cellDate.setHours(0, 0, 0, 0);

          const isPast = cellDate < todayJs;
          const isSelected = selectedDate &&
            selectedDate.getFullYear() === gregDisplayYear &&
            (selectedDate.getMonth() + 1) === gregDisplayMonth &&
            selectedDate.getDate() === day;
          const isToday = cellDate.getTime() === todayJs.getTime();

          let dayClass = "w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all duration-200 mx-auto";

          if (isPast) {
            dayClass += " text-gray-300 cursor-not-allowed";
            if (isSelected) {
              dayClass += " bg-gray-100 text-gray-400";
            }
          } else {
            if (isSelected) {
              dayClass += " bg-royal-blue text-white shadow-md font-semibold transform scale-105";
            } else if (isToday) {
              dayClass += " text-royal-blue font-bold ring-1 ring-royal-blue bg-blue-50 hover:bg-blue-100 cursor-pointer";
            } else {
              dayClass += " text-gray-700 hover:bg-gray-100 cursor-pointer";
            }
          }

          return (
            <div
              key={day}
              className={dayClass}
              onClick={() => !isPast && handleGregDayClick(day)}
              aria-disabled={isPast}
              role="button"
              tabIndex={isPast ? -1 : 0}
              aria-label={`בחר ${day} ${GREGORIAN_MONTH_NAMES[gregDisplayMonth - 1]} ${gregDisplayYear} ${isToday ? '(היום)' : ''} ${isPast ? '(לא זמין)' : ''}`}
              title={isToday ? 'היום' : undefined}
            >
              {day}
            </div>
          );
        })}
      </div>
    );
  };

  const gregMonthOptions = useMemo(() => {
    return GREGORIAN_MONTH_NAMES.map((name, idx) => ({ value: idx + 1, label: name }));
  }, []);

  const gregYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 20 }, (_, i) => {
      const year = currentYear - 5 + i;
      return { value: year, label: year.toString() };
    });
  }, []);

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInHebrewMonth(displayMonth, displayYear);
    // קירוב בסיסי למיקום תחילת החודש (כפי שהיה)
    const blanks = Array(0).fill(null);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const selectedParts = tentativeSelectedGregorianISO ? gregorianISOToHebrewDateParts(tentativeSelectedGregorianISO) : null;

    const todayJs = new Date();
    todayJs.setHours(0, 0, 0, 0);

    const currentDisplayMonthName = getHebrewMonthsForYear(displayYear).find(m => m.value === displayMonth)?.name || '';


    return (
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center mb-4" role="grid" aria-labelledby={`${id}-month-year-display`}>
        {HEBREW_WEEKDAY_SHORT_NAMES.map(dayName => (
          <div key={dayName} className="text-xs font-semibold text-gray-400 py-2">{dayName}</div>
        ))}
        {blanks.map((_, i) => <div key={`blank-${i}`} className="p-1"></div>)}
        {daysArray.map(day => {
          // חישוב תאריך גרגוריאני (קירוב)
          const currentCellJsDate = hebrewDatePartsToGregorianISO(day, displayMonth, displayYear);
          const jsDate = currentCellJsDate ? new Date(currentCellJsDate) : new Date();
          jsDate.setHours(0, 0, 0, 0);

          const isPast = jsDate < todayJs;
          const isSelected = selectedParts?.day === day && selectedParts?.month === displayMonth && selectedParts?.year === displayYear;
          const todayParts = gregorianISOToHebrewDateParts(getTodayGregorianISO());
          const isToday = todayParts && day === todayParts.day && displayMonth === todayParts.month && displayYear === todayParts.year;

          let dayClass = "w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all duration-200 mx-auto";

          if (isPast) {
            dayClass += " text-gray-300 cursor-not-allowed";
            if (isSelected) {
              dayClass += " bg-gray-100 text-gray-400";
            }
          } else {
            if (isSelected) {
              dayClass += " bg-royal-blue text-white shadow-md font-semibold transform scale-105";
            } else if (isToday) {
              dayClass += " text-royal-blue font-bold ring-1 ring-royal-blue bg-blue-50 hover:bg-blue-100 cursor-pointer";
            } else {
              dayClass += " text-gray-700 hover:bg-gray-100 cursor-pointer";
            }
          }

          return (
            <div
              key={day}
              className={dayClass}
              onClick={() => !isPast && handleDayClickInGrid(day)}
              aria-disabled={isPast}
              role="button"
              tabIndex={isPast ? -1 : 0}
              aria-label={`בחר ${gematriya(day)} ${currentDisplayMonthName} ${gematriya(displayYear)} ${isToday ? '(היום)' : ''} ${isPast ? '(לא זמין)' : ''}`}
              title={isToday ? 'היום' : undefined}
            >
              {gematriya(day)}
            </div>
          );
        })}
      </div>
    );
  };

  const yearOptions = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const year = todayHdGlobal.getFullYear() - 10 + i;
    return { value: year, label: gematriya(year) };
  }), [todayHdGlobal]);

  const monthOptions = useMemo(() => {
    return getHebrewMonthsForYear(displayYear).map(m => ({ value: m.value, label: m.name }));
  }, [displayYear]);

  const displayedValue = value
    ? (mode === 'gregorian' ? formatGregorianString(value) : gregSourceToHebrewString(value))
    : (required ? 'בחר תאריך...' : 'תאריך לא הוגדר');

  const confirmButtonText = (() => {
    if (!tentativeSelectedGregorianISO) return 'בחר תאריך מהלוח';
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = tentativeSelectedGregorianISO.split('T')[0].split('-').map(n => parseInt(n, 10));
    const target = new Date(y, (m || 1) - 1, d || 1);
    const deltaDays = Math.round((target.getTime() - todayLocal.getTime()) / 86400000);
    let relative = '';
    if (deltaDays === 0) relative = 'היום';
    else if (deltaDays === 1) relative = 'מחר';
    else if (deltaDays === 2) relative = 'מחרתיים';
    else if (deltaDays > 2) relative = `עוד ${deltaDays} ימים מעכשיו`;
    const label = mode === 'gregorian' ? formatGregorianString(tentativeSelectedGregorianISO) : gregSourceToHebrewString(tentativeSelectedGregorianISO);
    return `קבע: ${label}${relative ? ` (${relative})` : ''}`;
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
        className={`mt-1 block w-full px-4 py-3 bg-gray-50/50 border ${error ? 'border-red-500' : 'border-gray-100'} rounded-2xl shadow-sm focus:outline-none focus-visible:ring-8 focus-visible:ring-royal-blue/5 focus:border-royal-blue focus:bg-white transition-all text-sm font-medium text-dark-text cursor-pointer ${inputClassName}`}
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
        headerActions={
          <div className="flex items-center gap-2">
            <Button variant={mode === 'hebrew' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('hebrew')}>עברי</Button>
            <Button variant={mode === 'gregorian' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('gregorian')}>לועזי</Button>
          </div>
        }
      >
        <div id={`${id}-modal-content`} className="space-y-4 p-2" role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
          {/* Content is already announced by modal title, h2 below might be redundant for SR but good for visual structure */}
          <h2 id={`${id}-month-year-display`} className="sr-only">
            {mode === 'gregorian'
              ? `${GREGORIAN_MONTH_NAMES[gregDisplayMonth - 1]} ${gregDisplayYear}`
              : `${getHebrewMonthsForYear(displayYear).find(m => m.value === displayMonth)?.name || ''} ${gematriya(displayYear)}`
            }
          </h2>
          {mode === 'gregorian' ? (
            // Gregorian mode - show gregorian month/year selectors
            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-6 mb-6 px-2">
              <div className="flex items-center gap-1 justify-center relative bg-white rounded-lg px-2">
                <Button variant="ghost" size="sm" onClick={() => changeGregMonth(1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="חודש הבא">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">›</span>
                </Button>
                <div className="mx-1">
                  <PopoverSelect
                    options={gregMonthOptions}
                    value={gregDisplayMonth}
                    onChange={(val) => setGregDisplayMonth(Number(val))}
                    buttonClassName="font-bold text-lg text-dark-text py-1 px-2 hover:text-royal-blue"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => changeGregMonth(-1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="חודש קודם">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">‹</span>
                </Button>
              </div>

              <div className="flex items-center gap-1 justify-center relative bg-white rounded-lg px-2">
                <Button variant="ghost" size="sm" onClick={() => changeGregYear(1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="שנה הבאה">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">›</span>
                </Button>
                <div className="mx-1">
                  <PopoverSelect
                    options={gregYearOptions}
                    value={gregDisplayYear}
                    onChange={(val) => setGregDisplayYear(Number(val))}
                    buttonClassName="font-bold text-lg text-dark-text py-1 px-2 hover:text-royal-blue"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => changeGregYear(-1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="שנה קודמת">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">‹</span>
                </Button>
              </div>
            </div>
          ) : (
            // Hebrew mode - show hebrew month/year selectors
            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-6 mb-6 px-2">
              <div className="flex items-center gap-1 justify-center relative bg-white rounded-lg px-2">
                <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="חודש הבא">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">›</span>
                </Button>
                <div className="mx-1">
                  <PopoverSelect
                    options={monthOptions}
                    value={displayMonth}
                    onChange={(val) => setDisplayMonth(Number(val))}
                    buttonClassName="font-bold text-lg text-dark-text py-1 px-2 hover:text-royal-blue"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="חודש קודם">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">‹</span>
                </Button>
              </div>

              <div className="flex items-center gap-1 justify-center relative bg-white rounded-lg px-2">
                <Button variant="ghost" size="sm" onClick={() => changeYear(1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="שנה הבאה">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">›</span>
                </Button>
                <div className="mx-1">
                  <PopoverSelect
                    options={yearOptions}
                    value={displayYear}
                    onChange={(val) => setDisplayYear(Number(val))}
                    buttonClassName="font-bold text-lg text-dark-text py-1 px-2 hover:text-royal-blue"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => changeYear(-1)} className="text-gray-400 hover:text-royal-blue hover:bg-royal-blue/5 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all" aria-label="שנה קודמת">
                  <span className="text-2xl leading-none pb-1 relative top-[1px]">‹</span>
                </Button>
              </div>
            </div>
          )}
          {mode === 'gregorian' ? (
            renderGregorianCalendarGrid()
          ) : (
            renderCalendarGrid()
          )}
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleQuickSelect(0)}
                className="px-3 py-1 text-xs font-medium text-royal-blue bg-blue-50 hover:bg-blue-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-royal-blue"
              >
                היום
              </button>
              <button
                onClick={() => handleQuickSelect(1)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
              >
                מחר
              </button>
              <button
                onClick={() => handleQuickSelect(2)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
              >
                מחרתיים
              </button>
            </div>
            <Button
              variant="primary"
              onClick={handleConfirmSelection}
              disabled={!tentativeSelectedGregorianISO}
              className="w-full"
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
