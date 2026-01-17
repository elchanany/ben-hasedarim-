/**
 * Job Formatter Utility
 * 
 * Formats job data for phone readout
 */

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
}

/**
 * Formats a job for phone readout
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
