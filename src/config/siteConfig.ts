/**
 * Site Configuration
 * 
 * מספר הטלפון המרכזי של הקו נשמר כאן
 * כל מקום באתר ישתמש בקבוע הזה
 */

// מספר הטלפון של קו ימות המשיח
export const PHONE_LINE_NUMBER = '*6090';

// You can also use the full number format if needed
export const PHONE_LINE_NUMBER_FULL = '0773182610';

// Display format for different contexts
export const getPhoneDisplayNumber = () => PHONE_LINE_NUMBER;
export const getPhoneDialLink = () => `tel:${PHONE_LINE_NUMBER}`;
