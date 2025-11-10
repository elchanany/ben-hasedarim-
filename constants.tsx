import React from 'react'; // Import React for JSX
import { City, PaymentMethod, PaymentType, JobDateType, JobDifficulty } from './types'; 
// Removed BriefcaseIcon, UserIcon, PlusCircleIcon, SearchIcon, BellIcon if they were only for JOB_CATEGORIES.
// Keeping them if they are used elsewhere or might be.
// For instance, BriefcaseIcon is used in AdminDashboardPage and ProfilePage. UserIcon is used widely.
import { BriefcaseIcon, UserIcon, PlusCircleIcon, SearchIcon, BellIcon } from './components/icons';
import { PARSED_ISRAELI_CITIES } from './data/cities'; 
import { gregSourceToHebrewString, getTodayGregorianISO, formatGregorianString, formatDateByPreference } from './utils/dateConverter';
import { useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';

export const ISRAELI_CITIES: City[] = PARSED_ISRAELI_CITIES;

// JOB_CATEGORIES constant REMOVED

export const DEFAULT_USER_DISPLAY_NAME = "שם לתצוגה";

export const SORT_OPTIONS = [
  { id: 'newest', label: 'הכי חדשות' },
  { id: 'hottest', label: 'הכי חמות' },
  { id: 'highestPay', label: 'התשלום הגבוה ביותר' },
] as const;

export type SortById = typeof SORT_OPTIONS[number]['id'];

export const INITIAL_JOBS_DISPLAY_COUNT = 6;


export const PAYMENT_KIND_OPTIONS: { value: 'any' | PaymentType.HOURLY | PaymentType.GLOBAL; label: string }[] = [
    { value: 'any', label: 'הכל (שעתי וגלובלי)' },
    { value: PaymentType.HOURLY, label: 'לפי שעה' },
    { value: PaymentType.GLOBAL, label: 'גלובלי (סה"כ)' },
];

export const PAYMENT_METHOD_FILTER_OPTIONS = Object.values(PaymentMethod).map(pm => ({ id: pm, value: pm, label: pm }));

// שים לב: מערך קבוע לא יתעדכן לפי העדפת המשתמש. השתמש ב-hook הבא במקום:
export const useDateTypeOptions = (): {value: JobDateType | '', label: string}[] => {
  const todayLabel = useTodayLabel();
  return [
    { value: '', label: 'כל התאריכים' },
    { value: 'today', label: todayLabel },
    { value: 'comingWeek', label: 'לשבוע הקרוב' },
    { value: 'flexibleDate', label: 'תאריך גמיש' },
    { value: 'specificDate', label: 'תאריך ספציפי (טווח)' },
  ];
};

export const useTodayLabel = () => {
  const authCtx = useContext(AuthContext);
  const today = getTodayGregorianISO();
  const formatted = formatDateByPreference(today, authCtx?.datePreference || 'hebrew');
  return `להיום (${formatted})`;
};

export const DURATION_FLEXIBILITY_OPTIONS: { value: 'any' | 'yes' | 'no'; label: string }[] = [
    { value: 'any', label: 'הכל (גמיש ולא גמיש)' },
    { value: 'yes', label: 'כן, משך הזמן גמיש' },
    { value: 'no', label: 'לא, משך הזמן קבוע' },
];

export const SUITABILITY_FOR_OPTIONS: { value: 'any' | 'men' | 'women' | 'general'; label: string }[] = [
    { value: 'any', label: 'הכל' },
    { value: 'men', label: 'גברים' },
    { value: 'women', label: 'נשים' },
    { value: 'general', label: 'כללי (גברים ונשים)' },
];

export const JOB_DIFFICULTY_FILTER_OPTIONS: { value: JobDifficulty | ''; label: string }[] = [
    { value: '', label: 'כל הרמות'},
    ...Object.values(JobDifficulty).map(d => ({ value: d, label: d }))
];
