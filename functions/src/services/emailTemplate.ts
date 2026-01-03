/**
 * Email Template for Job Alert Digest
 * Hebrew RTL template for sending job alert notifications
 */

interface JobForEmail {
    id: string;
    title: string;
    location: string;
    payment: string;
    postedAt: string;
}

interface JobAlertTemplateData {
    userName: string;
    alertName: string;
    jobs: JobForEmail[];
}

export function generateJobAlertEmailTemplate(data: JobAlertTemplateData): string {
    const { userName, alertName, jobs } = data;

    const jobsHtml = jobs.map(job => `
        <tr>
            <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                <a href="https://ben-hasedarim.vercel.app/#/job/${job.id}" 
                   style="color: #2563eb; text-decoration: none; font-weight: bold; font-size: 16px;">
                    ${job.title}
                </a>
                <div style="margin-top: 8px; color: #6b7280; font-size: 14px;">
                    <span>📍 ${job.location}</span>
                    <span style="margin-right: 16px;">💰 ${job.payment}</span>
                </div>
                <div style="margin-top: 4px; color: #9ca3af; font-size: 12px;">
                    פורסם: ${job.postedAt}
                </div>
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>משרות חדשות מתאימות להתראה שלך</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f3f4f6; direction: rtl;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 32px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                🔔 בין הסדרים
                            </h1>
                            <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 16px;">
                                משרות חדשות מחכות לך!
                            </p>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 32px 24px 16px;">
                            <p style="margin: 0; font-size: 18px; color: #1f2937;">
                                שלום <strong>${userName || 'משתמש יקר'}</strong>,
                            </p>
                            <p style="margin: 12px 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                                מצאנו <strong style="color: #2563eb;">${jobs.length} משרות חדשות</strong> 
                                שמתאימות להתראה "<strong>${alertName}</strong>" שלך!
                            </p>
                        </td>
                    </tr>

                    <!-- Jobs List -->
                    <tr>
                        <td style="padding: 0 24px;">
                            <table style="width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
                                ${jobsHtml}
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 32px 24px; text-align: center;">
                            <a href="https://ben-hasedarim.vercel.app/#/jobs" 
                               style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); 
                                      color: #ffffff; text-decoration: none; padding: 14px 32px; 
                                      border-radius: 8px; font-size: 16px; font-weight: bold;
                                      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
                                צפה בכל המשרות
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                                קיבלת מייל זה כי הפעלת התראות במייל באתר בין הסדרים.
                            </p>
                            <a href="https://ben-hasedarim.vercel.app/#/notifications" 
                               style="color: #2563eb; text-decoration: underline; font-size: 14px;">
                                לניהול התראות לחץ כאן
                            </a>
                            <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">
                                © ${new Date().getFullYear()} בין הסדרים - כל הזכויות שמורות
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}
