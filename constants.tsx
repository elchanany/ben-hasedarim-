import React from 'react'; // Import React for JSX
import { City, PaymentMethod, PaymentType, JobDateType, JobDifficulty } from './types'; 
// Removed BriefcaseIcon, UserIcon, PlusCircleIcon, SearchIcon, BellIcon if they were only for JOB_CATEGORIES.
// Keeping them if they are used elsewhere or might be.
// For instance, BriefcaseIcon is used in AdminDashboardPage and ProfilePage. UserIcon is used widely.
import { BriefcaseIcon, UserIcon, PlusCircleIcon, SearchIcon, BellIcon } from './components/icons';
import { PARSED_ISRAELI_CITIES } from './data/cities'; 
import { gregSourceToHebrewString, getTodayGregorianISO } from './utils/dateConverter';

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

export const DATE_TYPE_FILTER_OPTIONS: {value: JobDateType | '', label: string}[] = [
      { value: '', label: 'כל התאריכים'},
      { value: 'today', label: `להיום (${gregSourceToHebrewString(getTodayGregorianISO())})`},
      { value: 'comingWeek', label: 'לשבוע הקרוב'},
      { value: 'flexibleDate', label: 'תאריך גמיש'},
      { value: 'specificDate', label: 'תאריך ספציפי (טווח)'},
];

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
