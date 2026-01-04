
/**
 * Email Templates Module
 * Provides clean, responsive, inline-styled HTML templates for emails.
 */

interface WelcomeEmailProps {
    userName: string;
    verificationLink?: string;
}

interface JobAlertProps {
    userName: string;
    alertName: string;
    jobs: Array<{
        id: string;
        title: string;
        location: string;
        area?: string;
        payment: string;
        postedAt: string;
        difficulty?: string;
    }>;
}

// Common Styles (Inline)
const styles = {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; direction: rtl; text-align: right;',
    header: 'background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;',
    logoText: 'color: #2563eb; font-size: 24px; font-weight: bold; margin: 0; text-decoration: none;',
    body: 'padding: 30px 20px;',
    heading: 'color: #1f2937; font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 16px;',
    text: 'color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 20px;',
    buttonContainer: 'text-align: center; margin: 30px 0;',
    button: 'background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;',
    buttonSecondary: 'background-color: #22c55e; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin-right: 10px;',
    jobCard: 'background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px;',
    jobTitle: 'color: #2563eb; font-size: 18px; font-weight: bold; margin: 0 0 8px 0; display: block; text-decoration: none;',
    jobDetail: 'color: #6b7280; font-size: 14px; margin: 4px 0;',
    jobButtons: 'margin-top: 12px; text-align: center;',
    footer: 'background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;',
    footerLink: 'color: #9ca3af; text-decoration: underline;'
};

/**
 * Generates the wrapper HTML structure
 */
function wrapHtml(title: string, content: string): string {
    return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f3f4f6;">
        <div style="${styles.container}">
            <!-- Header -->
            <div style="${styles.header}">
                <a href="https://bein-hasdorim.co.il" style="${styles.logoText}">בין הסדרים</a>
            </div>
            
            <!-- Content -->
            <div style="${styles.body}">
                ${content}
            </div>
            
            <!-- Footer -->
            <div style="${styles.footer}">
                <p style="margin: 0 0 8px 0;">בין הסדרים - פלטפורמת המשרות לחיילים משוחררים</p>
                <p style="margin: 0;">
                    קיבלת מייל זה כי יצרת התראה באתר. 
                    <a href="https://bein-hasdorim.co.il/settings" style="${styles.footerLink}">ניהול התראות</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate Welcome / Verification Email
 */
export function generateWelcomeEmail({ userName, verificationLink }: WelcomeEmailProps): string {
    const content = `
        <h1 style="${styles.heading}">ברוכים הבאים לבין הסדרים! 👋</h1>
        <p style="${styles.text}">שלום ${userName},</p>
        <p style="${styles.text}">
            שמחים שהצטרפת אלינו! כדי להתחיל להשתמש במערכת, לחפש משרות או לפרסם הצעות, אנא אמת את כתובת המייל שלך.
        </p>
        
        ${verificationLink ? `
        <div style="${styles.buttonContainer}">
            <a href="${verificationLink}" style="${styles.button}">אמת את המייל שלי</a>
        </div>
        ` : ''}
        
        <p style="${styles.text}">
            אם הקישור לא עובד, ניתן להעתיק את הכתובת הבאה לדפדפן:<br>
            <span style="font-size: 12px; color: #6b7280;">${verificationLink || '#'}</span>
        </p>
    `;

    return wrapHtml('ברוכים הבאים - בין הסדרים', content);
}

// Helper to translate area codes to Hebrew
function translateArea(area?: string): string {
    if (!area) return 'לא צוין';
    const areaMap: Record<string, string> = {
        'region_jerusalem': 'ירושלים והסביבה',
        'region_center': 'מרכז',
        'region_north': 'צפון',
        'region_south': 'דרום',
        'region_tel_aviv': 'תל אביב והמרכז',
        'region_haifa': 'חיפה והצפון',
        'all_country': 'כל הארץ',
    };
    return areaMap[area] || area;
}

/**
 * Generate Job Alert Email (Improved Design)
 */
export function generateJobAlertEmail({ userName, jobs, alertName }: JobAlertProps): string {
    const siteUrl = 'https://bein-hasdorim.co.il';

    const jobsHtml = jobs.map(job => {
        const location = job.area ? translateArea(job.area) : (job.location || 'לא צוין');
        const jobUrl = `${siteUrl}/#/jobDetails?jobId=${job.id}`;

        return `
        <div style="${styles.jobCard}">
            <a href="${jobUrl}" style="${styles.jobTitle}">${job.title}</a>
            <div style="${styles.jobDetail}">📍 מיקום: ${location}</div>
            <div style="${styles.jobDetail}">💰 תשלום: ${job.payment}</div>
            ${job.difficulty ? `<div style="${styles.jobDetail}">📊 רמת קושי: ${job.difficulty}</div>` : ''}
            <div style="${styles.jobDetail}">⏰ פורסם: ${job.postedAt}</div>
            <div style="${styles.jobButtons}">
                <a href="${jobUrl}" style="${styles.button}">צפה בעבודה</a>
            </div>
        </div>
    `}).join('');

    const firstJobTitle = jobs[0]?.title || 'עבודה חדשה';

    const content = `
        <h1 style="${styles.heading}">🔔 התראה חדשה על עבודה!</h1>
        <p style="${styles.text}">שלום ${userName},</p>
        <p style="${styles.text}">
            נמצאה עבודה חדשה שמתאימה להתראה <strong>"${alertName}"</strong>:
        </p>
        
        ${jobsHtml}
        
        <div style="${styles.buttonContainer}">
            <a href="${siteUrl}/#/jobs" style="${styles.button}">חפש עוד עבודות</a>
        </div>
    `;

    // Improved subject line with job title
    return wrapHtml(`עבודה חדשה: ${firstJobTitle} - בין הסדרים`, content);
}

