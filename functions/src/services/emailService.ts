/**
 * Email Service Abstraction Layer
 * 
 * This module provides an abstracted interface for sending emails.
 * Currently uses Resend, but can be easily swapped to AWS SES or other providers
 * by modifying only the sendEmailCore function.
 * 
 * Usage:
 *   import { emailService } from './services/emailService';
 *   await emailService.sendJobAlertDigest(userEmail, jobs);
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface JobAlertEmail {
    userEmail: string;
    userName: string;
    alertName: string;
    jobs: Array<{
        id: string;
        title: string;
        location: string;
        payment: string;
        postedAt: string;
    }>;
}

// ============================================
// CORE EMAIL SENDING FUNCTION
// To switch providers, modify ONLY this function
// ============================================

/**
 * Core email sending function - currently uses Resend
 * TO SWITCH TO AWS SES: Replace the implementation inside this function only
 */
async function sendEmailCore(
    to: string,
    subject: string,
    html: string,
    from?: string,
    replyTo?: string
): Promise<EmailResult> {
    // Get API key from environment variables (dotenv)
    const apiKey = process.env.RESEND_API_KEY || '';
    const fromEmail = from || process.env.EMAIL_FROM || 'noreply@ben-hasedarim.co.il';

    if (!apiKey) {
        console.error('[EmailService] RESEND_API_KEY not configured in environment variables');
        return { success: false, error: 'Email service not configured - missing API key' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromEmail,
                to: to,
                subject: subject,
                html: html,
                reply_to: replyTo,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[EmailService] Resend API error:', data);
            return { success: false, error: data.message || 'Failed to send email' };
        }

        console.log(`[EmailService] Email sent successfully to ${to}, messageId: ${data.id}`);
        return { success: true, messageId: data.id };
    } catch (error: any) {
        console.error('[EmailService] Error sending email:', error);
        return { success: false, error: error.message };
    }
}


// ============================================
// AWS SES IMPLEMENTATION (FOR FUTURE USE)
// To switch to SES: Replace sendEmailCore implementation above
// ============================================
/*
// Example AWS SES implementation for sendEmailCore:
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

async function sendEmailCore(...) {
    const client = new SESClient({
        region: process.env.AWS_REGION || 'eu-west-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    });
    
    const command = new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [to] },
        Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
    });
    
    const result = await client.send(command);
    return { success: true, messageId: result.MessageId };
}
*/

// ============================================
// EMAIL SERVICE CLASS
// Uses sendEmailCore for actual sending
// ============================================
class EmailService {
    /**
     * Send a raw email using the core function
     */
    async send(options: EmailOptions): Promise<EmailResult> {
        console.log(`[EmailService] Sending email to: ${options.to}, subject: ${options.subject}`);
        return sendEmailCore(
            options.to,
            options.subject,
            options.html,
            options.from,
            options.replyTo
        );
    }

    /**
     * Send a job alert digest email
     */
    async sendJobAlertDigest(data: JobAlertEmail): Promise<EmailResult> {
        const { generateJobAlertEmailTemplate } = await import('./emailTemplate');

        const html = generateJobAlertEmailTemplate({
            userName: data.userName,
            alertName: data.alertName,
            jobs: data.jobs,
        });

        return this.send({
            to: data.userEmail,
            subject: `🔔 ${data.jobs.length} משרות חדשות מתאימות להתראה שלך!`,
            html,
        });
    }

    /**
     * Send a welcome email
     */
    async sendWelcomeEmail(userEmail: string, userName: string): Promise<EmailResult> {
        const html = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">ברוך הבא ל-בין הסדרים!</h1>
                <p>שלום ${userName},</p>
                <p>תודה שהצטרפת אלינו! עכשיו אתה יכול:</p>
                <ul>
                    <li>לחפש משרות מתאימות</li>
                    <li>להגדיר התראות אוטומטיות</li>
                    <li>לפרסם משרות חדשות</li>
                </ul>
                <p>בהצלחה!</p>
            </div>
        `;

        return this.send({
            to: userEmail,
            subject: 'ברוכים הבאים ל-בין הסדרים! 🎉',
            html,
        });
    }
}

// Export singleton instance
export const emailService = new EmailService();
