/**
 * Audio Files Manager
 * Centralized management of all IVR audio files
 * 
 * All audio files must be in WAV format: PCM 16-bit, 8000 Hz, Mono
 * Files should be uploaded to Yemot HaMashiach panel before use
 */

export const AUDIO_FILES = {
    // ===== MAIN MENU =====
    WELCOME: 'welcome',  // ✅ קיים
    MAIN_MENU_OPTIONS: '034',  // ✅ קיים

    // ===== JOBS MENU =====
    JOBS_MENU_OPTIONS: '032',  // ✅ קיים
    AREA_OPTIONS: '009',  // ✅ קיים
    NO_JOBS_FOUND: '036',  // ✅ קיים

    // Salary Filtering
    ENTER_MIN_SALARY: '020',  // ✅ קיים
    ENTER_MAX_SALARY: '018',  // ✅ קיים
    SALARY_OR_GLOBAL: 'salary_or_global',  // ✅ קיים

    // Age Filtering
    ENTER_MIN_AGE: '019',  // ✅ קיים
    ENTER_MAX_AGE: '017',  // ✅ קיים

    // ===== JOB DETAILS =====
    JOB_NAME: '027',  // ✅ קיים
    JOB_AREA: '025',  // ✅ קיים
    JOB_DIFFICULTY: '026',  // ✅ קיים
    JOB_SALARY: '030',  // ✅ קיים
    SHEKEL_PER_HOUR: 'shekel_per_hour',  // ✅ קיים
    GLOBAL_PAYMENT: '023',  // ✅ קיים
    SUITABLE_FOR_EVERYONE: '066',  // ✅ wav.066
    SUITABLE_MEN: '067',  // ✅ wav.067
    SUITABLE_WOMEN: '069',  // ✅ wav.069
    FROM_AGE: '060',  // ✅ wav.060 "מגיל"
    SUITABLE_FOR: '080',  // ✅ wav.080 "מתאימה ל"
    MEN: '075',  // ✅ wav.075 "גברים"
    WOMEN: '082',  // ✅ wav.082 "נשים"
    MEN_AND_WOMEN: '076',  // ✅ wav.076 "גברים ונשים"

    // Job List Display
    FOUND_JOBS: '071',  // ✅ wav.071 "נמצאו"
    JOBS_PLURAL: '074',  // ✅ wav.074 "עבודות"
    JOB_NUMBER: '073',  // ✅ wav.073 "עבודה מספר"
    JOB_DETAILS_OPTIONS: '072',  // ✅ wav.072 "לשמיעת פרטי יצירת קשר הקישו 1..."
    PHONE_NUMBER_CONTACT: '078',  // ✅ wav.078 "מספר הטלפון ליצירת קשר"

    // Navigation
    JOB_NAVIGATION: '028',  // ✅ קיים
    ALL_JOBS_DONE: '008',  // ✅ קיים
    CONTACT_DETAILS_INTRO: '013',  // ✅ קיים

    // ===== POST JOB =====
    POST_JOB_INTRO: 'post_job_intro',  // ✅ קיים
    NO_NAME_TRY_AGAIN: '037',  // ✅ קיים
    JOB_TITLE_RECORDED: '031',  // ✅ קיים
    CONFIRM_OR_RERECORD: '012',  // ✅ קיים
    SELECT_JOB_AREA: 'select_job_area',  // ✅ קיים
    ENTER_ADDRESS_PROMPT: '059',  // ✅ wav.059
    SAY_ADDRESS_ALOUD: '065',  // ✅ wav.065
    DIFFICULTY_OPTIONS: '014',  // ✅ קיים
    PAYMENT_TYPE_SELECT: '044',  // ✅ קיים
    ENTER_HOURLY_RATE: '016',  // ✅ קיים
    ENTER_GLOBAL_AMOUNT: '015',  // ✅ קיים
    SUITABILITY_SELECT: 'suitability_select',  // ✅ קיים
    ENTER_MINIMUM_AGE: '021',  // ✅ קיים
    PHONE_NUMBER_OPTIONS: '045',  // ✅ קיים
    ENTER_PHONE_NUMBER: '022',  // ✅ קיים
    CONFIRM_JOB_DETAILS: '010',  // ✅ קיים
    CONFIRM_OR_EDIT: '011',  // ✅ קיים
    JOB_PUBLISHED_SUCCESS: '029',  // ✅ קיים
    PUBLISH_CANCELLED: 'publish_cancelled',  // ✅ קיים
    PUBLISH_ERROR: 'publish_error',  // ✅ קיים

    // ===== DATE SELECTION =====
    DATE_SELECTION_PROMPT: '058',  // ✅ wav.058

    // Relative Date Readout
    POSTED_AT: '096',  // wav.096 (posted)
    TODAY: '098',  // wav.098 (today)
    YESTERDAY: '102',  // wav.102 (yesterday)
    BEFORE_TWO_DAYS: '089',  // wav.089 (before_two_days)
    BEFORE: '088',  // wav.088 (before)
    DAYS_AGO: '090',  // wav.090 (days)
    AT_HOUR: '087',  // wav.087 (at_hour)

    // ===== PAYMENT METHOD SELECTION =====
    PAYMENT_METHOD_PROMPT: '063',  // ✅ wav.063
    PAYMENT_CASH: '062',  // ✅ wav.062
    PAYMENT_PAYSLIP: '064',  // ✅ wav.064
    PAYMENT_BIT: '061',  // ✅ wav.061

    // ===== CITIES =====
    CITY_JERUSALEM: '054',  // ✅ wav.054
    CITY_BNEI_BRAK: '051',  // ✅ wav.051
    CITY_ASHDOD: '049',  // ✅ wav.049
    CITY_MODIIN_ILLIT: '055',  // ✅ wav.055
    CITY_BEITAR_ILLIT: '050',  // ✅ wav.050
    CITY_ELAD: '052',  // ✅ wav.052
    CITY_TZFAT: '057',  // ✅ wav.057
    CITY_PETACH_TIKVA: '056',  // ✅ wav.056
    CITY_HAIFA: '053',  // ✅ wav.053
    CITY_ALL_COUNTRY: '048',  // ✅ wav.048

    // ===== PAYMENT - POSTER =====
    PAYMENT_INTRO_POSTER: '040',  // ✅ קיים
    POST_JOB_PRICE_DETAILS: 'post_job_price_details',  // ✅ קיים
    POST_PAYMENT_BENEFITS: 'post_payment_benefits',  // ✅ קיים
    TO_CONTINUE_PAYMENT_PRESS_1: 'to_continue_payment_press_1',  // ✅ קיים
    TO_CANCEL_PRESS_2: 'to_cancel_press_2',  // ✅ קיים

    // ===== PAYMENT - VIEWER =====
    PAYMENT_INTRO_VIEWER: '041',  // ✅ קיים
    SUBSCRIPTION_OPTION_FULL: 'subscription_option_full',  // ✅ קיים
    SINGLE_PAYMENT_OPTION_FULL: 'single_payment_option_full',  // ✅ קיים
    PAYMENT_CHOICE_PROMPT: 'payment_choice_prompt',  // חסר?

    // ===== PAYMENT - COMMON =====
    SHEKELS: 'shekels',  // ✅ קיים
    SHEKELS_PER_MONTH: 'shekels_per_month',  // ✅ קיים
    PAYMENT_INSTRUCTIONS: '039',  // ✅ קיים
    PAYMENT_SUCCESSFUL_VIEWER: '043',  // ✅ קיים
    PAYMENT_SUCCESSFUL_POSTER: '042',  // ✅ קיים
    PAYMENT_FAILED: '038',  // ✅ קיים
    PAYMENT_CANCELLED_BY_USER: 'payment_cancelled_by_user',  // חסר?

    // ===== ALERTS (TZINTUK) =====
    ALERTS_INTRO_ADVA: '003',  // ✅ קיים
    ALERTS_SUBSCRIBE_OPTIONS: '097',  // wav.097 (subscribe_options)
    ALERTS_FILTER_OPTIONS: '002',  // ✅ קיים
    ALERTS_SUBSCRIBED: '091',  // wav.091 (alerts_subscribed)
    ALERTS_SUBSCRIBED_FILTERED: '086',  // wav.086 (alerts_subscribed_filtered)
    ALERTS_ALREADY_ACTIVE: '085',  // wav.085 (alerts_already_active)
    ALERTS_ALREADY_PAUSED: 'alerts_already_paused',  // חסר בתמונות
    ALERTS_LEGAL_NOTICE: '004',  // ✅ קיים
    ALERTS_UNSUBSCRIBE_CONFIRM: '006',  // ✅ קיים
    ALERTS_UNSUBSCRIBED: '007',  // ✅ קיים
    // Night mode options
    NIGHT_MODE_OPTION: 'night_mode_option',  // חסר - "לקבלת צינתוקים גם בלילה הקישו 3"
    NIGHT_MODE_QUESTION: '093',  // wav.093 (night_mode_question)
    NIGHT_MODE_ENABLED: '092',  // wav.092 (night_mode_enabled)

    // ===== UNSUBSCRIBE =====
    UNSUBSCRIBE_PROMPT: '100',  // wav.100 (unsubscribe_prompt)
    UNSUBSCRIBE_MENU: '099',  // wav.099 (unsubscribe_menu)
    NOT_SUBSCRIBED: '094',  // wav.094 (not_subscribed)
    UNSUBSCRIBED_SUCCESSFULLY: '101',  // wav.101 (unsubscribed_successfully)
    PAUSED_SUCCESSFULLY: '095',  // wav.095 (paused_successfully)

    // ===== CONTACT =====
    LEAVE_MESSAGE_INTRO: '033',  // ✅ קיים
    MESSAGE_SAVED_THANKS: '035',  // ✅ קיים

    // ===== ERRORS & COMMON =====
    INVALID_CHOICE_TRY_AGAIN: '024',  // ✅ קיים
    SYSTEM_ERROR: '081',  // ✅ wav.081 "אירעה תקלה במערכת"
    PHONE_NOT_IDENTIFIED: '077',  // ✅ wav.077 "לא זוהה מספר טלפון"
    REGISTRATION_ERROR: '079',  // ✅ wav.079 "שגיאה בהרשמה"
    SYSTEM_ERROR_TRY_LATER: 'system_error_try_later',  // ✅ קיים
} as const;

/**
 * Helper function to create file message for Yemot
 * @param filename Filename (with or without .wav extension)
 * @returns Message object for yemot-router2
 */
export function audioFile(filename: string) {
    // Remove .wav extension if present - yemot-router2 expects just the filename
    const cleanName = filename.replace('.wav', '');
    console.log(`[AUDIO] Loading file: ${cleanName}`);
    return { type: 'file' as const, data: cleanName };
}

/**
 * Helper function to create text message (for dynamic content)
 * Use sparingly - prefer pre-recorded audio files
 * @param text Text to be read by TTS
 * @returns Message object for yemot-router2
 */
export function textMsg(text: string) {
    return { type: 'text' as const, data: text };
}

/**
 * Helper function to create number message
 * Yemot will automatically read numbers in Hebrew
 * @param num Number to be read
 * @returns Message object for yemot-router2
 */
export function numberMsg(num: number | string) {
    return { type: 'number' as const, data: String(num) };
}

/**
 * Type for message arrays used in yemot-router2
 */
export type YemotMessage = ReturnType<typeof audioFile | typeof textMsg | typeof numberMsg>;
// Force update 01/19/2026 18:23:15
