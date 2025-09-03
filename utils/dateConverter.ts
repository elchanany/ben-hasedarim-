// פונקציות לחישוב תאריכים עבריים ללא תלות בספריות חיצוניות

// קבועים לתאריכים עבריים
const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTH_NAMES_BASE = ['ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר'];
const ADAR_BET_NAME = 'אדר ב׳';
const ADAR_ALEPH_SUFFIX = ' א׳';

// פונקציה להמרת מספרים לגימטריה עברית
const gematriya = (num: number): string => {
    const hebrewNumerals = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];
    
    if (num <= 30) {
        return hebrewNumerals[num];
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
        
        if (ones > 0) {
            result += hebrewNumerals[ones];
        }
        
        return result;
    } else {
        // תמיכה בשנים (למשל 5784)
        const year = num.toString();
        let result = '';
        for (let i = 0; i < year.length; i++) {
            const digit = parseInt(year[i]);
            if (digit === 0) continue;
            result += hebrewNumerals[digit];
        }
        return result;
    }
};

// פונקציה לבדיקה אם שנה עברית היא שנה מעוברת
const isLeapYear = (year: number): boolean => {
    // חישוב פשוט לשנה מעוברת לפי המחזור העברי
    const cycle = (year - 1) % 19;
    return [0, 3, 6, 8, 11, 14, 17].includes(cycle);
};

// פונקציה להמרת תאריך גרגוריאני לתאריך עברי
const gregorianToHebrew = (date: Date): { day: number, month: number, year: number } => {
    // חישוב פשוט לתאריך עברי (קירוב)
    const startDate = new Date(1900, 0, 1); // 1 בינואר 1900
    const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // הוספת ימים לתאריך העברי הבסיסי
    let hebrewYear = 5660; // 1900 בעברית
    let hebrewMonth = 1;
    let hebrewDay = 1;
    
    // חישוב פשוט (קירוב)
    const hebrewDays = daysDiff + 1;
    let remainingDays = hebrewDays;
    
    while (remainingDays > 0) {
        const daysInMonth = getDaysInHebrewMonth(hebrewMonth, hebrewYear);
        if (remainingDays <= daysInMonth) {
            hebrewDay = remainingDays;
            break;
        }
        remainingDays -= daysInMonth;
        hebrewMonth++;
        if (hebrewMonth > (isLeapYear(hebrewYear) ? 13 : 12)) {
            hebrewMonth = 1;
            hebrewYear++;
        }
    }
    
    return { day: hebrewDay, month: hebrewMonth, year: hebrewYear };
};

export const GREGORIAN_FORMAT_SETTINGS: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
};

export const gregSourceToHebrewString = (isoOrDate?: string | Date | null, includeWeekday = false): string => {
    if (!isoOrDate) return 'תאריך לא זמין';
    try {
        const gregDate = typeof isoOrDate === 'string' 
            ? (isoOrDate.includes('-') ? new Date(isoOrDate.split('T')[0] + 'T00:00:00') : new Date(isoOrDate) ) 
            : isoOrDate;

        if (isNaN(gregDate.getTime())) return 'תאריך לא תקין';
        
        const hebrewDate = gregorianToHebrew(gregDate);
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
        return hebrewDateStr;
    } catch (e) {
        console.error("Error converting Gregorian to Hebrew:", e, "Input:", isoOrDate);
        return 'שגיאת תאריך';
    }
};

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
        // חישוב פשוט (קירוב)
        const baseDate = new Date(1900, 0, 1);
        let totalDays = 0;
        
        // חישוב ימים מהשנה הבסיסית
        for (let y = 5660; y < year; y++) {
            totalDays += isLeapYear(y) ? 385 : 354;
        }
        
        // הוספת ימים מהחודשים הקודמים
        for (let m = 1; m < month; m++) {
            totalDays += getDaysInHebrewMonth(m, year);
        }
        
        // הוספת הימים בחודש הנוכחי
        totalDays += day - 1;
        
        const resultDate = new Date(baseDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
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
    // חישוב פשוט של ימים בחודש עברי
    if (month === 1 || month === 3 || month === 5 || month === 7 || month === 9 || month === 11) {
        return 30;
    } else if (month === 2 || month === 4 || month === 6 || month === 8 || month === 10) {
        return 29;
    } else if (month === 12) {
        return isLeapYear(year) ? 30 : 29;
    } else if (month === 13) {
        return isLeapYear(year) ? 29 : 0;
    }
    return 0;
}

export const getHebrewMonthsForYear = (year: number): { value: number, name: string }[] => {
    const resultMonths: { value: number, name: string }[] = [];
    const isLeap = isLeapYear(year);
    const numMonths = isLeap ? 13 : 12;

    for (let m = 1; m <= numMonths; m++) {
        let hebrewName = '';

        if (m >= 1 && m <= 11) {
            hebrewName = HEBREW_MONTH_NAMES_BASE[m - 1];
        } else if (m === 12) {
            hebrewName = HEBREW_MONTH_NAMES_BASE[11];
            if (isLeap) {
                hebrewName += ADAR_ALEPH_SUFFIX;
            }
        } else if (m === 13) {
            if (isLeap) {
                hebrewName = ADAR_BET_NAME;
            } else {
                continue; 
            }
        }
        
        if (hebrewName) {
            resultMonths.push({ value: m, name: hebrewName });
        }
    }
    return resultMonths;
};

export const formatJobPostedDateTimeDetails = (isoDateString: string): string => {
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
        const day = jobDate.getDate().toString().padStart(2, '0');
        const month = (jobDate.getMonth() + 1).toString().padStart(2, '0');
        const year = jobDate.getFullYear();
        return `${day}.${month}.${year} בשעה ${jobDateHoursMinutes}`;
    }
};

export const formatRelativePostedDate = (isoDateString: string): string => {
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
        // Fallback to full Hebrew date for older posts
        return `ב-${gregSourceToHebrewString(date, false)}`;
    }
};