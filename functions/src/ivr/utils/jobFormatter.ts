/**
 * Job Formatter Utility
 * 
 * Formats job data for phone readout
 */

// City name to audio file mapping
const CITY_AUDIO_MAP: Record<string, string> = {
    'ירושלים': '054',
    'בני ברק': '051',
    'אשדוד': '049',
    'מודיעין עלית': '055',
    'ביתר עילית': '050',
    'אלעד': '052',
    'צפת': '057',
    'פתח תקווה': '056',
    'חיפה': '053',
    'כל הארץ': '048',
    'ארצי': '048',
    // English versions (in case data comes in English)
    'jerusalem': '054',
    'bnei brak': '051',
    'ashdod': '049',
};

interface Job {
    id?: string;
    title: string;
    area?: string;
    city?: string;
    description?: string;
    difficulty?: string;
    paymentType?: string;
    hourlyRate?: number;
    globalPayment?: number;
    numberOfPeopleNeeded?: number;
    suitability?: {
        men: boolean;
        women: boolean;
        general: boolean;
        minAge?: number;
    };
    contactPhone?: string;
    contactDisplayName?: string;
    postedDate?: string;
    specialRequirements?: string;
    paymentMethod?: string;
}

/**
 * Get audio file for city, or null if not mapped
 */
function getCityAudioFile(cityName: string): string | null {
    if (!cityName) return null;
    const normalized = cityName.trim().toLowerCase();
    // Check direct match
    if (CITY_AUDIO_MAP[cityName]) return CITY_AUDIO_MAP[cityName];
    // Check normalized match
    for (const [key, value] of Object.entries(CITY_AUDIO_MAP)) {
        if (key.toLowerCase() === normalized) return value;
    }
    return null;
}

/**
 * Formats a job for phone readout using AUDIO FILES for labels
 * This produces better quality voiceovers
 * @param job The job object
 * @param detailed If true, includes more details
 * @returns Array of Yemot message objects
 */
/**
 * Format time string HH:MM
 */
function formatTimeStr(date: Date): string {
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${hour}:${minute < 10 ? '0' + minute : minute}`;
}



/**
 * Format job date to relative time (Today/Yesterday/X days ago) with time
 */
/**
 * Format job date to relative time (Today/Yesterday/X days ago) with time
 * Uses Audio Files for smoother experience
 */
function formatJobDate(dateStr?: string): any[] {
    if (!dateStr) return [];

    try {
        const date = new Date(dateStr);
        const now = new Date();
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffTime = todayOnly.getTime() - dateOnly.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const timeStr = formatTimeStr(date);

        const result: any[] = [];

        // 1. "Posted"
        result.push({ type: 'file', data: '096' }); // POSTED_AT

        // 2. Relative date audio
        if (diffDays === 0) {
            result.push({ type: 'file', data: '098' }); // TODAY
        } else if (diffDays === 1) {
            result.push({ type: 'file', data: '102' }); // YESTERDAY
        } else if (diffDays === 2) {
            result.push({ type: 'file', data: '089' }); // BEFORE_TWO_DAYS
        } else {
            result.push({ type: 'file', data: '088' }); // BEFORE
            result.push({ type: 'number', data: String(diffDays) });
            result.push({ type: 'file', data: '090' }); // DAYS_AGO
        }

        // 3. "At hour"
        result.push({ type: 'file', data: '087' }); // AT_HOUR

        // 4. Time digits (Natural reading: "Eight" "Twenty One")
        const [hours, minutes] = timeStr.split(':');
        result.push({ type: 'number', data: String(parseInt(hours)) });
        result.push({ type: 'number', data: String(parseInt(minutes)) });

        return result;

    } catch (e) {
        console.error('Error formatting date:', e);
        return [];
    }
}

export function formatJobWithAudio(job: Job, detailed: boolean = false): any[] {
    const messages: any[] = [];

    // Title label + dynamic title
    messages.push({ type: 'file', data: '027' }); // JOB_NAME "שם העבודה"
    messages.push({ type: 'text', data: job.title || 'עבודה ללא שם' });

    // Date - NEW
    const dateParts = formatJobDate(job.postedDate);
    if (dateParts.length > 0) {
        messages.push(...dateParts);
    }

    // Location - use audio if available, otherwise TTS
    const location = job.area || job.city;
    if (location) {
        messages.push({ type: 'file', data: '025' }); // JOB_AREA "מיקום"
        const cityAudio = getCityAudioFile(location);
        if (cityAudio) {
            messages.push({ type: 'file', data: cityAudio }); // Use pre-recorded city audio
        } else {
            messages.push({ type: 'text', data: location }); // Fallback to TTS
        }
    }

    // Payment
    if (job.hourlyRate) {
        messages.push({ type: 'file', data: '030' }); // JOB_SALARY "תשלום"
        messages.push({ type: 'number', data: String(job.hourlyRate) });
        messages.push({ type: 'file', data: 'shekel_per_hour' }); // "שקלים לשעה"
    } else if (job.globalPayment) {
        messages.push({ type: 'file', data: '023' }); // GLOBAL_PAYMENT "תשלום גלובלי"
        messages.push({ type: 'number', data: String(job.globalPayment) });
        messages.push({ type: 'file', data: 'shekels' }); // "שקלים"
    }

    // Payment Method - NEW
    messages.push({ type: 'file', data: '063' }); // PAYMENT_METHOD_PROMPT "אפשרויות תשלום"

    if (job.paymentMethod) {
        // Handle string enum values from types.ts
        if (job.paymentMethod.includes('מזומן')) {
            messages.push({ type: 'file', data: '062' }); // CASH
        } else if (job.paymentMethod.includes('ביט') || job.paymentMethod.includes('פייבוקס')) {
            messages.push({ type: 'file', data: '061' }); // BIT
        } else if (job.paymentMethod.includes('תלוש')) {
            messages.push({ type: 'file', data: '064' }); // PAYSLIP
        } else {
            messages.push({ type: 'file', data: '062' }); // Default/Fallthrough
        }
    } else {
        // Default if missing
        messages.push({ type: 'file', data: '062' });
    }

    // Difficulty
    if (job.difficulty) {
        messages.push({ type: 'file', data: '026' }); // JOB_DIFFICULTY "רמת קושי"
        messages.push({ type: 'text', data: job.difficulty });
    }

    // Detailed info
    if (detailed) {
        // Suitability
        if (job.suitability) {
            if (job.suitability.general || (job.suitability.men && job.suitability.women)) {
                messages.push({ type: 'file', data: '066' }); // SUITABLE_FOR_EVERYONE
            } else if (job.suitability.men && !job.suitability.women) {
                messages.push({ type: 'file', data: '067' }); // SUITABLE_MEN
            } else if (job.suitability.women && !job.suitability.men) {
                messages.push({ type: 'file', data: '069' }); // SUITABLE_WOMEN
            }

            if (job.suitability.minAge) {
                messages.push({ type: 'file', data: '060' }); // FROM_AGE "מגיל"
                messages.push({ type: 'number', data: String(job.suitability.minAge) });
            }
        }

        // People needed
        if (job.numberOfPeopleNeeded && job.numberOfPeopleNeeded > 1) {
            messages.push({ type: 'text', data: `דרושים ${job.numberOfPeopleNeeded} אנשים` });
        }
    }

    return messages;
}

/**
 * Formats a job for phone readout (LEGACY - uses TTS text)
 * @deprecated Use formatJobWithAudio instead
 * @param job The job object
 * @param detailed If true, includes more details
 * @returns Formatted Hebrew text
 */
export function formatJobForPhone(job: Job, detailed: boolean = false): string {
    let text = '';

    // Title
    text += job.title || 'עבודה ללא שם';
    text += '. ';

    // Location
    const location = job.area || job.city;
    if (location) {
        text += `מיקום: ${location}. `;
    }

    // Payment
    if (job.hourlyRate) {
        text += `תשלום: ${job.hourlyRate} שקלים לשעה. `;
    } else if (job.globalPayment) {
        text += `תשלום גלובלי: ${job.globalPayment} שקלים. `;
    }

    // Difficulty
    if (job.difficulty) {
        text += `רמת קושי: ${job.difficulty}. `;
    }

    // Detailed info
    if (detailed) {
        // Description
        if (job.description) {
            text += `תיאור: ${job.description}. `;
        }

        // Suitability
        if (job.suitability) {
            if (job.suitability.general) {
                text += 'מתאים לכולם. ';
            } else if (job.suitability.men && !job.suitability.women) {
                text += 'לגברים בלבד. ';
            } else if (job.suitability.women && !job.suitability.men) {
                text += 'לנשים בלבד. ';
            }

            if (job.suitability.minAge) {
                text += `גיל מינימלי: ${job.suitability.minAge}. `;
            }
        }

        // People needed
        if (job.numberOfPeopleNeeded && job.numberOfPeopleNeeded > 1) {
            text += `דרושים ${job.numberOfPeopleNeeded} אנשים. `;
        }

        // Special requirements
        if (job.specialRequirements) {
            text += `דרישות מיוחדות: ${job.specialRequirements}. `;
        }

        // Contact name
        if (job.contactDisplayName) {
            text += `איש קשר: ${job.contactDisplayName}. `;
        }

        // Posted date
        if (job.postedDate) {
            const date = new Date(job.postedDate);
            const hebrewDate = formatHebrewDate(date);
            text += `פורסם: ${hebrewDate}. `;
        }
    }

    return text;
}

/**
 * Formats date in Hebrew
 */
function formatHebrewDate(date: Date): string {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const month = months[date.getMonth()];

    return `יום ${dayName}, ${dayNum} ב${month}`;
}

/**
 * Formats phone number for readout
 * Adds spaces between digit groups
 */
export function formatPhoneForReadout(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
        // Israeli mobile: 05X-XXX-XXXX
        return `${cleaned.slice(0, 3)}, ${cleaned.slice(3, 6)}, ${cleaned.slice(6)}`;
    } else if (cleaned.length === 9) {
        // Israeli landline: 0X-XXX-XXXX
        return `${cleaned.slice(0, 2)}, ${cleaned.slice(2, 5)}, ${cleaned.slice(5)}`;
    }

    return phone;
}
