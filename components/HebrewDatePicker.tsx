
import React, { useState, useEffect, useCallback, useMemo } from 'react';
 
import {
  gregorianISOToHebrewDateParts,
  hebrewDatePartsToGregorianISO,
  getHebrewMonthsForYear,
  gregSourceToHebrewString,
  getTodayGregorianISO,
  getDaysInHebrewMonth
} from '../utils/dateConverter';
import { Modal } from './Modal';
import { Button } from './Button';
import { Select } from './Select';

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
  const [isOpen, setIsOpen] = useState(false);
  const [tentativeSelectedGregorianISO, setTentativeSelectedGregorianISO] = useState<string | null>(null);

  const todayHdGlobal = useMemo(() => {
    const today = new Date();
    const hebrewParts = gregorianISOToHebrewDateParts(today.toISOString());
    return hebrewParts ? { getFullYear: () => hebrewParts.year, getMonth: () => hebrewParts.month } : { getFullYear: () => 5784, getMonth: () => 1 };
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
      setTentativeSelectedGregorianISO(value);
      const partsToDisplay = value ? gregorianISOToHebrewDateParts(value) : gregorianISOToHebrewDateParts(getTodayGregorianISO());
      if (partsToDisplay) {
        setDisplayYear(partsToDisplay.year);
        setDisplayMonth(partsToDisplay.month);
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

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInHebrewMonth(displayMonth, displayYear);
    // חישוב היום הראשון של השבוע (קירוב פשוט)
    const firstDayOfWeek = 0; // ראשון

    const blanks = Array(firstDayOfWeek).fill(null);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const selectedParts = tentativeSelectedGregorianISO ? gregorianISOToHebrewDateParts(tentativeSelectedGregorianISO) : null;

    const todayJs = new Date();
    todayJs.setHours(0, 0, 0, 0);
    
    const currentDisplayMonthName = getHebrewMonthsForYear(displayYear).find(m => m.value === displayMonth)?.name || '';


    return (
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-labelledby={`${id}-month-year-display`}>
        {HEBREW_WEEKDAY_SHORT_NAMES.map(dayName => (
          <div key={dayName} className="font-semibold text-sm p-1 text-dark-text">{dayName}</div>
        ))}
        {blanks.map((_, i) => <div key={`blank-${i}`} className="p-1"></div>)}
        {daysArray.map(day => {
          // חישוב תאריך גרגוריאני (קירוב)
          const currentCellJsDate = hebrewDatePartsToGregorianISO(day, displayMonth, displayYear);
          const jsDate = currentCellJsDate ? new Date(currentCellJsDate) : new Date();
          jsDate.setHours(0,0,0,0);

          const isPast = jsDate < todayJs;
          const isSelected = selectedParts?.day === day && selectedParts?.month === displayMonth && selectedParts?.year === displayYear;
          const todayParts = gregorianISOToHebrewDateParts(getTodayGregorianISO());
          const isToday = todayParts && day === todayParts.day && displayMonth === todayParts.month && displayYear === todayParts.year;

          let dayClass = "p-2 rounded-full";

          if (isPast) {
            dayClass += " text-gray-400 cursor-not-allowed";
            if (isSelected) {
                dayClass += " bg-gray-200";
            }
          } else {
            dayClass += " text-dark-text cursor-pointer hover:bg-light-blue transition-colors";
            if (isSelected) {
              dayClass = "p-2 cursor-pointer rounded-full bg-royal-blue text-white";
            } else if (isToday) {
              dayClass += " ring-2 ring-deep-pink";
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
                aria-label={`בחר ${gematriya(day)} ${currentDisplayMonthName} ${gematriya(displayYear)} ${isPast ? '(לא זמין)' : ''}`}
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

  const displayedValue = value ? gregSourceToHebrewString(value)
                        : (required ? 'בחר תאריך...' : 'תאריך לא הוגדר');

  const confirmButtonText = tentativeSelectedGregorianISO
    ? `קבע: ${gregSourceToHebrewString(tentativeSelectedGregorianISO)}`
    : 'בחר תאריך מהלוח';
  
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
        className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color focus:border-royal-blue sm:text-sm text-dark-text cursor-pointer ${inputClassName}`}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={!!error}
        aria-haspopup="dialog"
        aria-controls={isOpen ? `${id}-modal-content` : undefined}
        aria-describedby={error ? `${id}-error-desc` : undefined}
      />
      {error && <p id={`${id}-error-desc`} className="mt-1 text-xs text-red-600 text-right" role="alert">{error}</p>}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="בחירת תאריך עברי" titleId={modalTitleId} size="md">
        <div id={`${id}-modal-content`} className="space-y-4 p-2" role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
          {/* Content is already announced by modal title, h2 below might be redundant for SR but good for visual structure */}
          <h2 id={`${id}-month-year-display`} className="sr-only">{`${getHebrewMonthsForYear(displayYear).find(m => m.value === displayMonth)?.name || ''} ${gematriya(displayYear)}`}</h2>
          <div className="flex justify-around items-center mb-4">
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)} aria-label="חודש קודם">&lt; הקודם</Button>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Select
                options={monthOptions}
                value={displayMonth.toString()}
                onChange={(e) => setDisplayMonth(parseInt(e.target.value))}
                selectClassName="py-1 text-sm"
                containerClassName="mb-0 min-w-[120px]"
                aria-label="בחר חודש"
                id={`${id}-month-select`}
              />
              <Select
                options={yearOptions}
                value={displayYear.toString()}
                onChange={(e) => setDisplayYear(parseInt(e.target.value))}
                selectClassName="py-1 text-sm"
                containerClassName="mb-0 min-w-[100px]"
                aria-label="בחר שנה"
                id={`${id}-year-select`}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => changeMonth(1)} aria-label="חודש הבא">הבא &gt;</Button>
          </div>
          {renderCalendarGrid()}
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="flex justify-center space-x-2 rtl:space-x-reverse">
                <Button variant="outline" size="sm" onClick={() => handleQuickSelect(0)}>היום</Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickSelect(1)}>מחר</Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickSelect(2)}>מחרתיים</Button>
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
