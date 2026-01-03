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

export const MAJOR_CITIES_NAMES = [
  'ירושלים',
  'בני ברק',
  'בית שמש',
  'מודיעין עילית',
  'אלעד',
  'צפת',
  'ביתר עילית',
  'תל אביב-יפו',
  'אשדוד',
  'פתח תקווה',
  'נתניה',
  'רחובות',
  'חיפה',
  'באר שבע',
  'טבריה',
  'נתיבות',
  'אופקים',
  'רכסים',
  'חריש'
];

// Define Regions
export const REGION_MAPPINGS = [
  {
    label: 'אזור ירושלים והסביבה',
    value: 'region_jerusalem',
    cities: ['ירושלים', 'ביתר עילית', 'בית שמש', 'גבעת זאב', 'מבשרת ציון', 'מעלה אדומים', 'צור הדסה', 'אפרת', 'קריית יערים', 'אבו גוש']
  },
  {
    label: 'אזור בני ברק והמרכז',
    value: 'region_center',
    cities: ['בני ברק', 'תל אביב-יפו', 'רמת גן', 'גבעתיים', 'פתח תקווה', 'ראש העין', 'אור יהודה', 'יהוד-מונוסון', 'קריית אונו', 'גבעת שמואל']
  },
  {
    label: 'אזור מודיעין, אילת והשפלה',
    value: 'region_modiin_elad',
    cities: ['מודיעין עילית', 'מודיעין-מכבים-רעות', 'אלעד', 'לוד', 'רמלה', 'שוהם', 'רחובות', 'ראשון לציון', 'נס ציונה', 'באר יעקב']
  },
  {
    label: 'אזור הצפון',
    value: 'region_north',
    cities: ['חיפה', 'טבריה', 'צפת', 'רכסים', 'חריש', 'עפולה', 'נוף הגליל', 'כרמיאל', 'עכו', 'נהריה', 'קריית אתא', 'קריית ביאליק', 'קריית ים', 'קריית מוצקין', 'חצור הגלילית', 'מגדל העמק']
  },
  {
    label: 'אזור הדרום',
    value: 'region_south',
    cities: ['באר שבע', 'אשדוד', 'אשקלון', 'נתיבות', 'אופקים', 'שדרות', 'קריית גת', 'קריית מלאכי', 'ערד', 'דימונה', 'ירוחם', 'מצפה רמון', 'אילת']
  },
  {
    label: 'אזור השרון',
    value: 'region_sharon',
    cities: ['נתניה', 'חדרה', 'הרצליה', 'רעננה', 'כפר סבא', 'הוד השרון', 'רמת השרון', 'כפר יונה']
  }
];

export const getCityOptions = () => {
  const allCities = ISRAELI_CITIES.map(city => ({ value: city.name, label: city.name }));

  const majorCities = allCities.filter(c => MAJOR_CITIES_NAMES.includes(c.label))
    .sort((a, b) => MAJOR_CITIES_NAMES.indexOf(a.label) - MAJOR_CITIES_NAMES.indexOf(b.label));

  const otherCities = allCities.filter(c => !MAJOR_CITIES_NAMES.includes(c.label))
    .sort((a, b) => a.label.localeCompare(b.label, 'he'));

  const regions = REGION_MAPPINGS.map(r => ({ value: r.value, label: r.label }));

  return [
    { value: '', label: 'כל הארץ' },
    { label: '--- אזורים ---', value: 'disabled_regions', isDisabled: true },
    ...regions,
    { label: '--- ערים מרכזיות ---', value: 'disabled_major', isDisabled: true },
    ...majorCities,
    { label: '--- כל הערים ---', value: 'disabled_all', isDisabled: true },
    ...otherCities
  ];
};

// JOB_CATEGORIES constant REMOVED

export const DEFAULT_USER_DISPLAY_NAME = "שם לתצוגה";

export { PaymentType, JobDifficulty, PaymentMethod } from './types';
export type { JobDateType } from './types';

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

export const PAYMENT_METHOD_FILTER_OPTIONS = Object.values(PaymentMethod).map(pm => ({
  id: pm.replace(/\s+/g, '_'),
  value: pm,
  label: pm
}));

// שים לב: מערך קבוע לא יתעדכן לפי העדפת המשתמש. השתמש ב-hook הבא במקום:
export const useDateTypeOptions = (): { value: JobDateType | '', label: string }[] => {
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
  { value: '', label: 'כל הרמות' },
  ...Object.values(JobDifficulty).map(d => ({ value: d, label: d }))
];
