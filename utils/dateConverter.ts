// פונקציות לחישוב תאריכים עבריים עם ספריית Hebcal מדויקת
import { HDate, ParshaEvent, HebrewCalendar, Location, Sedra } from '@hebcal/core';

// קבועים לתאריכים עבריים
const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTH_NAMES_BASE = ['ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר'];
const ADAR_BET_NAME = 'אדר ב׳';
const ADAR_ALEPH_SUFFIX = ' א׳';
// מיפוי שמות פרשות מאנגלית לעברית לשימוש בסדרת השבוע (Sedra)
const PARASHA_EN_HE: Record<string, string> = {
  Bereshit: 'בראשית', Noach: 'נח', LechLecha: 'לך לך', Vayera: 'וירא', ChayeiSarah: 'חיי שרה', Toledot: 'תולדות',
  Vayetzei: 'ויצא', Vayishlach: 'וישלח', Vayeshev: 'וישב', Miketz: 'מקץ', Vayigash: 'ויגש', Vayechi: 'ויחי',
  Shemot: 'שמות', Vaera: 'וארא', Bo: 'בא', Beshalach: 'בשלח', Yitro: 'יתרו', Mishpatim: 'משפטים',
  Terumah: 'תרומה', Tetzaveh: 'תצוה', KiTisa: 'כי תשא', Vayakhel: 'ויקהל', Pekudei: 'פקודי',
  Vayikra: 'ויקרא', Tzav: 'צו', Shemini: 'שמיני', Tazria: 'תזריע', Metzora: 'מצורע', AchreiMot: 'אחרי מות', Kedoshim: 'קדושים',
  Emor: 'אמור', Behar: 'בהר', Bechukotai: 'בחוקותי', Bamidbar: 'במדבר', Nasso: 'נשא', "Beha'alotcha": 'בהעלותך',
  "Sh'lach": 'שלח', Korach: 'קרח', Chukat: 'חקת', Balak: 'בלק', Pinchas: 'פינחס', Matot: 'מטות', Masei: 'מסעי',
  Devarim: 'דברים', Vaetchanan: 'ואתחנן', Eikev: 'עקב', "Re'eh": 'ראה', Shoftim: 'שופטים', KiTeitzei: 'כי תצא',
  KiTavo: 'כי תבוא', Nitzavim: 'נצבים', Vayeilech: 'וילך', "Ha'Azinu": 'האזינו', "V'ZotHaBerachah": 'וזאת הברכה'
};

// פונקציה להמרת מספרים לגימטריה עברית
export const gematriya = (num: number): string => {
    if (!num || isNaN(num) || num <= 0) {
        console.warn("Invalid number for gematriya:", num);
        return 'א'; // fallback
    }

    const hebrewNumerals = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];
    
    if (num <= 30) {
        return hebrewNumerals[num] || 'א';
    } else if (num <= 99) {
        const tens = Math.floor(num / 10);
        const ones = num % 10;
        let result = '';
        
        if (tens === 2) result += 'כ';
        else if (tens === 3) result += 'ל';
        else if (tens === 4) result += 'מ';
        else if (tens === 5) result += 'נ';
        else if (tens === 6) result += 'ס';
        else if (tens === 7) result += 'ע';
        else if (tens === 8) result += 'פ';
        else if (tens === 9) result += 'צ';
        
        if (ones > 0 && ones < hebrewNumerals.length) {
            result += hebrewNumerals[ones];
        }
        
        return result || 'א';
    } else if (num >= 5000) {
        // שנים עבריות - מתחילות מ־5000 בערך
        const year = num.toString();
        let result = '';
        
        if (year.length >= 4) {
            // לדוגמה: 5785 -> התשפ"ה
            const thousands = parseInt(year[0]);
            const hundreds = parseInt(year[1]);
            const tens = parseInt(year[2]);
            const ones = parseInt(year[3]);
            
            // אלפים - בדרך כלל מתעלמים מה־5
            if (thousands === 5) {
                // מתחילים מהמאות
                if (hundreds > 0) {
                    if (hundreds === 1) result += 'ק';
                    else if (hundreds === 2) result += 'ר';
                    else if (hundreds === 3) result += 'ש';
                    else if (hundreds === 4) result += 'ת';
                    else if (hundreds === 5) result += 'תק';
                    else if (hundreds === 6) result += 'תר';
                    else if (hundreds === 7) result += 'תש';
                    else if (hundreds === 8) result += 'תת';
                    else if (hundreds === 9) result += 'תתק';
                }
                
                // עשרות
                if (tens > 0) {
                    if (tens === 1) result += 'י';
                    else if (tens === 2) result += 'כ';
                    else if (tens === 3) result += 'ל';
                    else if (tens === 4) result += 'מ';
                    else if (tens === 5) result += 'נ';
                    else if (tens === 6) result += 'ס';
                    else if (tens === 7) result += 'ע';
                    else if (tens === 8) result += 'פ';
                    else if (tens === 9) result += 'צ';
                }
                
                // יחידות
                if (ones > 0 && ones < hebrewNumerals.length) {
                    result += hebrewNumerals[ones];
                }
                
                // הוספת גרש לפני האות האחרונה או גרשיים אם יש שתי אותיות
                if (result.length > 1) {
                    result = result.slice(0, -1) + '"' + result.slice(-1);
                } else if (result.length === 1) {
                    result += "'";
                }
            }
        }
        
        return result || 'התשפ"ה'; // fallback לשנה נוכחית
    } else {
        // מספרים אחרים בין 100-4999
        const hundreds = Math.floor(num / 100);
        const remainder = num % 100;
        let result = '';
        
        // מאות
        if (hundreds === 1) result += 'ק';
        else if (hundreds === 2) result += 'ר';
        else if (hundreds === 3) result += 'ש';
        else if (hundreds === 4) result += 'ת';
        else if (hundreds >= 5) {
            result += 'ת';
            const extraHundreds = hundreds - 4;
            if (extraHundreds === 1) result += 'ק';
            else if (extraHundreds === 2) result += 'ר';
            else if (extraHundreds === 3) result += 'ש';
            else if (extraHundreds === 4) result += 'ת';
        }
        
        // עשרות ויחידות
        if (remainder > 0) {
            if (remainder <= 30) {
                result += hebrewNumerals[remainder] || '';
            } else {
                const tens = Math.floor(remainder / 10);
                const ones = remainder % 10;
                
                if (tens === 2) result += 'כ';
                else if (tens === 3) result += 'ל';
                else if (tens === 4) result += 'מ';
                else if (tens === 5) result += 'נ';
                else if (tens === 6) result += 'ס';
                else if (tens === 7) result += 'ע';
                else if (tens === 8) result += 'פ';
                else if (tens === 9) result += 'צ';
                
                if (ones > 0 && ones < hebrewNumerals.length) {
                    result += hebrewNumerals[ones];
                }
            }
        }
        
        return result || 'א';
    }
};

// פונקציה לבדיקה אם שנה עברית היא שנה מעוברת
const isLeapYear = (year: number): boolean => {
    // חישוב פשוט לשנה מעוברת לפי המחזור העברי
    const cycle = (year - 1) % 19;
    return [0, 3, 6, 8, 11, 14, 17].includes(cycle);
};

export const getCurrentHebrewDate = (): { day: number, month: number, year: number } => {
  const hd = new HDate(new Date());
  return { day: hd.getDate(), month: hd.getMonth(), year: hd.getFullYear() };
};
// המרה מדויקת מלועזי לעברי באמצעות Hebcal
const gregorianToHebrew = (date: Date): { day: number, month: number, year: number } => {
  if (!date || isNaN(date.getTime())) {
    console.error("Invalid date provided to gregorianToHebrew:", date);
    const todayHd = new HDate(new Date());
    return { day: todayHd.getDate(), month: todayHd.getMonth(), year: todayHd.getFullYear() };
  }
  const hd = new HDate(date);
  return { day: hd.getDate(), month: hd.getMonth(), year: hd.getFullYear() };
};

export const GREGORIAN_FORMAT_SETTINGS: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
};

export type DateDisplayPreference = 'hebrew' | 'gregorian';

export const formatGregorianString = (isoOrDate?: string | Date | null, includeWeekday = false): string => {
    if (!isoOrDate) return 'תאריך לא זמין';
    try {
        const date = typeof isoOrDate === 'string'
            ? new Date(isoOrDate.split('T')[0] + 'T00:00:00')
            : isoOrDate;
        if (isNaN(date.getTime())) return 'תאריך לא תקין';
        const options: Intl.DateTimeFormatOptions = includeWeekday
            ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            : { year: 'numeric', month: 'long', day: 'numeric' };
        return new Intl.DateTimeFormat('he-IL', options).format(date).replace(/[,]/g, '').replace(/\s+/g, ' ').trim();
    } catch {
        return 'תאריך לא זמין';
    }
};

export const formatDateByPreference = (
  isoOrDate: string | Date | null | undefined,
  preference: DateDisplayPreference = 'hebrew',
  includeWeekday = false
): string => {
  return preference === 'gregorian'
    ? formatGregorianString(isoOrDate || null, includeWeekday)
    : gregSourceToHebrewString(isoOrDate || null, includeWeekday);
};

export const gregSourceToHebrewString = (isoOrDate?: string | Date | null, includeWeekday = false): string => {
    if (!isoOrDate) return 'תאריך לא זמין';
    try {
        const gregDate = typeof isoOrDate === 'string' 
            ? (isoOrDate.includes('-') ? new Date(isoOrDate.split('T')[0] + 'T00:00:00') : new Date(isoOrDate) ) 
            : isoOrDate;
    console.log('gregSourceToHebrewString input:', isoOrDate, 'Greg date:', gregDate);
        if (isNaN(gregDate.getTime())) return 'תאריך לא תקין';
        
        const hebrewDate = gregorianToHebrew(gregDate);
    console.log('Hebrew date calculated:', hebrewDate);
        const day = hebrewDate.day;
        const monthNumber = hebrewDate.month;
        const year = hebrewDate.year;
        const isLeap = isLeapYear(year);
        let currentMonthName = '';
        if (monthNumber >= 1 && monthNumber <= 11) {
            currentMonthName = HEBREW_MONTH_NAMES_BASE[monthNumber - 1];
        } else if (monthNumber === 12) {
            currentMonthName = HEBREW_MONTH_NAMES_BASE[11];
            if (isLeap) {
                currentMonthName += ADAR_ALEPH_SUFFIX;
            }
        } else if (monthNumber === 13) {
            if (isLeap) {
                currentMonthName = ADAR_BET_NAME;
            } else {
                currentMonthName = 'אדר';
            }
        }
        let hebrewDateStr = `${gematriya(day)} ${currentMonthName} ${gematriya(year)}`;
        if (includeWeekday) {
            const weekdayIndex = gregDate.getDay();
            const weekdayName = HEBREW_WEEKDAYS[weekdayIndex]; 
            hebrewDateStr = `יום ${weekdayName}, ${hebrewDateStr}`;
        }
    console.log('Final Hebrew string:', hebrewDateStr);
        return hebrewDateStr;
    } catch (e) {
        console.error("Error converting Gregorian to Hebrew:", e, "Input:", isoOrDate);
        return 'שגיאת תאריך';
    }
}; // Add console.log for debugging

export const getTodayGregorianISO = (): string => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const getTodayHebrewDateString = (includeWeekday = false): string => {
    return gregSourceToHebrewString(new Date(), includeWeekday);
};

export const hebrewDatePartsToGregorianISO = (day: number, month: number, year: number): string | null => {
    try {
        const hd = new HDate(day, month, year);
        const resultDate = hd.greg();
        const y = resultDate.getFullYear();
        const m = (resultDate.getMonth() + 1).toString().padStart(2, '0');
        const d = resultDate.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    } catch (e) {
        console.error("Error converting Hebrew parts to Gregorian:", e, `{day: ${day}, month: ${month}, year: ${year}}`);
        return null;
    }
};

export const gregorianISOToHebrewDateParts = (isoDateString: string): { day: number, month: number, year: number, monthName: string, jsMonth: number, dayOfWeek: number } | null => {
    try {
        const dateParts = isoDateString.split('T')[0].split('-').map(s => parseInt(s, 10));
        const gregDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

        if (isNaN(gregDate.getTime())) {
             console.error("Invalid date created from ISO string:", isoDateString);
             return null;
        }

        const hebrewDate = gregorianToHebrew(gregDate);
        const monthNumber = hebrewDate.month;
        const year = hebrewDate.year;
        const isLeap = isLeapYear(year);
        let currentMonthName = '';

        if (monthNumber >= 1 && monthNumber <= 11) {
            currentMonthName = HEBREW_MONTH_NAMES_BASE[monthNumber - 1];
        } else if (monthNumber === 12) {
            currentMonthName = HEBREW_MONTH_NAMES_BASE[11];
            if (isLeap) {
                currentMonthName += ADAR_ALEPH_SUFFIX;
            }
        } else if (monthNumber === 13) {
            if (isLeap) {
                currentMonthName = ADAR_BET_NAME;
            } else {
                currentMonthName = 'אדר';
            }
        }

        return {
            day: hebrewDate.day,
            month: monthNumber, 
            year: year,
            monthName: currentMonthName,
            jsMonth: gregDate.getMonth(), 
            dayOfWeek: gregDate.getDay() 
        };
    } catch (e) {
        console.error("Error converting Gregorian ISO to Hebrew parts:", e, "Input:", isoDateString);
        return null;
    }
};

export const getHebrewMonthName = (monthNumber: number, year: number): string => { 
    const isLeap = isLeapYear(year);
    let hebrewName = '';

    if (monthNumber >= 1 && monthNumber <= 11) {
        hebrewName = HEBREW_MONTH_NAMES_BASE[monthNumber - 1];
    } else if (monthNumber === 12) {
        hebrewName = HEBREW_MONTH_NAMES_BASE[11];
        if (isLeap) {
            hebrewName += ADAR_ALEPH_SUFFIX;
        }
    } else if (monthNumber === 13) {
        if (isLeap) {
            hebrewName = ADAR_BET_NAME;
        } else {
            hebrewName = 'חודש לא תקין';
        }
    } else {
        hebrewName = 'חודש לא תקין';
    }
    return hebrewName;
}

export const getDaysInHebrewMonth = (month: number, year: number): number => { 
    try {
        // חודשים עבריים הם תמיד 29 או 30 ימים. בדיקה אם יש יום 30 תקף בחודש.
        const is30 = new HDate(30, month, year).getMonth() === month;
        return is30 ? 30 : 29;
    } catch (e) {
        console.error('getDaysInHebrewMonth error:', e, { month, year });
        // Fallback שמרני
        return 29;
    }
}

export const getHebrewMonthsForYear = (year: number): { value: number, name: string }[] => {
    const resultMonths: { value: number, name: string }[] = [];
    const isLeap = isLeapYear(year);
    const numMonths = isLeap ? 13 : 12;

    // סדר חודשים שמתחיל מתשרי (לתצוגה)
    const monthDisplayOrder = ['תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול'];
    
    // מיפוי מחודש תצוגה לחודש פנימי
    const displayToInternal = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]; // תשרי=7, חשוון=8, וכו'

    for (let displayMonth = 0; displayMonth < 12; displayMonth++) {
        const internalMonth = displayToInternal[displayMonth];
        let monthName = monthDisplayOrder[displayMonth];
        
        // טיפול באדר בשנה מעוברת
        if (displayMonth === 5) { // אדר
            if (isLeap) {
                resultMonths.push({ value: internalMonth, name: monthName + ' א׳' });
                resultMonths.push({ value: 13, name: 'אדר ב׳' });
            } else {
                resultMonths.push({ value: internalMonth, name: monthName });
            }
        } else {
            resultMonths.push({ value: internalMonth, name: monthName });
        }
    }
    
    return resultMonths;
};

export const formatJobPostedDateTimeDetails = (isoDateString: string, preference: DateDisplayPreference = 'hebrew'): string => {
    const jobDate = new Date(isoDateString);
    const now = new Date();

    const diffInSeconds = Math.floor((now.getTime() - jobDate.getTime()) / 1000);
    const jobDateHoursMinutes = jobDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // Check if jobDate is today
    const jobDay = new Date(jobDate.getFullYear(), jobDate.getMonth(), jobDate.getDate());
    const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayDay = new Date(todayDay);
    yesterdayDay.setDate(todayDay.getDate() - 1);
    const dayBeforeYesterdayDay = new Date(todayDay);
    dayBeforeYesterdayDay.setDate(todayDay.getDate() - 2);

    if (jobDay.getTime() === todayDay.getTime()) { // Posted today
        if (diffInSeconds < 60) {
            return "לפני מספר שניות";
        } else if (diffInSeconds < 3600) { // Less than an hour
            return `לפני ${Math.floor(diffInSeconds / 60)} דקות`;
        } else { // More than an hour ago, but today
            const hours = Math.floor(diffInSeconds / 3600);
            const minutes = Math.floor((diffInSeconds % 3600) / 60);
            if (minutes === 0) {
                 return `לפני ${hours} ${hours === 1 ? 'שעה' : 'שעות'}`;
            }
            return `לפני ${hours} ${hours === 1 ? 'שעה' : 'שעות'} ו-${minutes} דקות`;
        }
    } else if (jobDay.getTime() === yesterdayDay.getTime()) {
        return `אתמול בשעה ${jobDateHoursMinutes}`;
    } else if (jobDay.getTime() === dayBeforeYesterdayDay.getTime()) {
        return `שלשום בשעה ${jobDateHoursMinutes}`;
    } else {
        // Use preference for older dates
        return `${formatDateByPreference(jobDate, preference, false)} בשעה ${jobDateHoursMinutes}`;
    }
};

export const formatRelativePostedDate = (isoDateString: string, preference: DateDisplayPreference = 'hebrew'): string => {
    const date = new Date(isoDateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
        return "לפני מספר שניות";
    } else if (diffInMinutes < 60) {
        return `לפני ${diffInMinutes} דקות`;
    } else if (diffInHours < 24) {
        return `לפני ${diffInHours} שעות`;
    } else if (diffInDays === 1) {
        return "אתמול";
    } else if (diffInDays === 2) {
        return "שלשום";
    } else {
        // Fallback to full date for older posts based on preference
        return `ב-${formatDateByPreference(date, preference, false)}`;
    }
};

export const getTodayHebrewString = (includeWeekday = false): string => {
  try {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = includeWeekday
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
    const formatter = new Intl.DateTimeFormat('he-u-ca-hebrew', options);
    const raw = formatter.format(today).replace(/[,]/g, '').replace(/\s+/g, ' ').trim();

    // Extract numbers and month text
    const yearMatch = raw.match(/(\d{4})$/);
    // day is the first 1-2 digit number
    const dayMatch = raw.match(/(^|\s)(\d{1,2})(?=\s)/);
    // month text is the middle part without numbers (and without leading 'ב')
    let middle = raw
      .replace(/^יום\s+[^\s]+\s*/,'') // drop weekday if present
      .replace(/\d{1,2}\s*/,'')
      .replace(/\s*\d{4}$/,'')
      .trim();
    middle = middle.replace(/^ב[־\s]?/, ''); // remove leading 'ב'

    const dayNum = dayMatch ? parseInt(dayMatch[2], 10) : NaN;
    const yearNum = yearMatch ? parseInt(yearMatch[1], 10) : NaN;

    if (!isNaN(dayNum) && !isNaN(yearNum) && middle) {
      const dayHeb = gematriya(dayNum);
      const yearHeb = gematriya(yearNum);
      return includeWeekday
        ? raw.replace(/(^יום\s+[^\s]+\s*)?\d{1,2}[^\d]*\d{4}$/, '').trim() + ` ${dayHeb} ${middle} ${yearHeb}`
        : `${dayHeb} ${middle} ${yearHeb}`;
    }

    // Fallback to existing conversion if parsing failed
    return gregSourceToHebrewString(today, includeWeekday);
  } catch (e) {
    console.error('getTodayHebrewString Intl fallback due to error:', e);
    return gregSourceToHebrewString(new Date(), includeWeekday);
    }
};

export const getHebrewStringForDate = (date: Date, includeWeekday = false): string => {
  try {
    const options: Intl.DateTimeFormatOptions = includeWeekday
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
    // Use the Hebrew calendar via Intl (most accurate in browsers)
    const formatter = new Intl.DateTimeFormat('he-u-ca-hebrew', options);
    const raw = formatter.format(date);
    
    // Extract numbers and convert to Hebrew letters
    const yearMatch = raw.match(/(\d{4})/);
    const dayMatch = raw.match(/(\d{1,2})/);
    
    if (dayMatch && yearMatch) {
      const dayNum = parseInt(dayMatch[1], 10);
      const yearNum = parseInt(yearMatch[1], 10);
      const dayHeb = gematriya(dayNum);
      const yearHeb = gematriya(yearNum);
      
      // Extract month name (remove numbers and clean)
      let monthName = raw
        .replace(/\d+/g, '')
        .replace(/^יום\s+[^\s]+\s*/, '') // remove weekday
        .replace(/^ב[־\s]?/, '') // remove leading 'ב'
        .replace(/[,]/g, '')
        .trim();
      
      return includeWeekday 
        ? raw.replace(/\d+/g, '').trim() + ` ${dayHeb} ${monthName} ${yearHeb}`
        : `${dayHeb} ${monthName} ${yearHeb}`;
    }
    
    return raw.replace(/[,]/g, '').replace(/\s+/g, ' ').trim();
  } catch (e) {
    console.error('getHebrewStringForDate Intl fallback due to error:', e);
    return gregSourceToHebrewString(date, includeWeekday);
  }
};

export const getHebrewPartsForDateForPicker = (date: Date): { year: number; monthValue: number } | null => {
  try {
    const monthFormatter = new Intl.DateTimeFormat('he-u-ca-hebrew', { month: 'long' });
    const yearFormatter = new Intl.DateTimeFormat('he-u-ca-hebrew', { year: 'numeric' });
    let monthName = monthFormatter.format(date).trim();
    const yearStr = yearFormatter.format(date).trim();
    const yearNum = parseInt(yearStr.replace(/[^\d]/g, ''), 10);
    if (!yearNum) return null;
    const normalize = (s: string) => s.replace(/^ב[־\s]?/, '').replace(/"/g, '"').replace(/׳/g, '׳').trim();
    let normalizedMonth = normalize(monthName);
    if (normalizedMonth === 'אדר א') normalizedMonth = 'אדר א׳';
    if (normalizedMonth === 'אדר ב') normalizedMonth = 'אדר ב׳';
    const months = getHebrewMonthsForYear(yearNum);
    const match = months.find(m => normalize(m.name) === normalizedMonth);
    if (!match) return null;
    return { year: yearNum, monthValue: match.value };
  } catch (e) {
    console.error('getHebrewPartsForDateForPicker error:', e);
    return null;
    }
};


const getParashaForDate = (gregorianDate: Date): string | null => {
  try {
    // רק שבתות
    const dayOfWeek = gregorianDate.getDay();
    if (dayOfWeek !== 6) return null;
    
    // יצירת אובייקט תאריך עברי מדויק
    const hd = new HDate(gregorianDate);
    
    // קבלת הפרשה לתאריך זה (ירושלים כמיקום ברירת מחדל)
    const location = Location.lookup('Jerusalem') || new Location(31.7683, 35.2137, false, 'Asia/Jerusalem');
    const events = HebrewCalendar.calendar({
      start: hd,
      end: hd,
      location: location,
      il: true,
      sedrot: true, // כולל פרשות
      noHolidays: false
    });
    
    // חיפוש אירוע פרשה
    const parashaEvent = events.find(ev => ev instanceof ParshaEvent);
    
    if (parashaEvent) {
      const hebrewTitle = parashaEvent.render('he');
      return hebrewTitle.replace(/^פרשת\s+/, '').trim();
    }
    
    // fallback: שימוש ב-Sedra כדי להביא את פרשת השבוע גם כששבת חלה בחג
    try {
      const sedra = new Sedra(hd.getFullYear(), true);
      const arr = sedra.get(hd) as string[];
      if (Array.isArray(arr) && arr.length > 0) {
        const heb = arr.map(name => PARASHA_EN_HE[name] || name).join('-');
        return heb;
      }
    } catch (e) {
      // ignore
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting parasha from Hebcal:', error);
    return null;
  }
};

// New: Fetch parasha name for a specific Gregorian ISO date with local calculation
const PARASHA_CACHE: Record<string, string> = {};

export const fetchParashaNameForGregorianISO = async (iso: string): Promise<string | null> => {
  try {
    if (PARASHA_CACHE[iso]) return PARASHA_CACHE[iso];
    
    const date = new Date(iso);
    const parasha = getParashaForDate(date);
    
    if (parasha) {
      PARASHA_CACHE[iso] = parasha;
      return parasha;
    }
    
    return null;
  } catch (e) {
    console.error('fetchParashaNameForGregorianISO error:', e);
    return null;
    }
};

// החזרת תווית חג בעברית לתאריך גרגוריאני (ישראל)
export const getHolidayLabelForGregorianISO = (iso: string): string | null => {
  try {
    const [y, m, d] = iso.split('T')[0].split('-').map(s => parseInt(s, 10));
    const jsDate = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
    const hd = new HDate(jsDate);
    const location = Location.lookup('Jerusalem') || new Location(31.7683, 35.2137, false, 'Asia/Jerusalem');
    const events = HebrewCalendar.calendar({
      start: hd,
      end: hd,
      location,
      il: true,
      sedrot: true,
      noHolidays: false
    });
    const allHeb = events
      .filter(ev => !(ev instanceof ParshaEvent))
      .map(ev => ev.render('he'))
      .filter(Boolean) as string[];
    if (allHeb.length === 0) return null;
    // העדפת אירוע שאינו "ערב" אם קיים
    allHeb.sort((a, b) => (a.startsWith('ערב ') ? 1 : 0) - (b.startsWith('ערב ') ? 1 : 0));
    const unique = Array.from(new Set(allHeb));
    return unique.join(' – ');
  } catch (e) {
    console.error('getHolidayLabelForGregorianISO error:', e, iso);
    return null;
  }
};