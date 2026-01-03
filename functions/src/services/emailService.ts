/**
 * Email Service Abstraction Layer
 * 
 * This module provides an abstracted interface for sending emails.
 * Currently uses Resend, but can be easily swapped to AWS SES or other providers
 * by modifying only this file.
 * 
 * Usage:
 *   import { emailService } from './services/emailService';
 *   await emailService.sendJobAlertDigest(userEmail, jobs);
 */

import * as functions from 'firebase-functions';

// Email provider interface - define what any email provider must implement
interface EmailProvider {
    send(options: EmailOptions): Promise<EmailResult>;
}

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
// RESEND PROVIDER (Current Implementation)
// ============================================
class ResendProvider implements EmailProvider {
    private apiKey: string;
    private fromEmail: string;

    constructor() {
        // Get API key from Firebase config or environment
        this.apiKey = process.env.RESEND_API_KEY || functions.config().resend?.api_key || '';
        this.fromEmail = process.env.EMAIL_FROM || functions.config().email?.from || 'noreply@ben-hasedarim.co.il';
    }

    async send(options: EmailOptions): Promise<EmailResult> {
        if (!this.apiKey) {
            console.error('[EmailService] Resend API key not configured');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: options.from || this.fromEmail,
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                    reply_to: options.replyTo,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[EmailService] Resend error:', data);
                return { success: false, error: data.message || 'Failed to send email' };
            }

            return { success: true, messageId: data.id };
        } catch (error: any) {
            console.error('[EmailService] Error sending email:', error);
            return { success: false, error: error.message };
        }
    }
}

// ============================================
// AWS SES PROVIDER (For Future Use)
// To switch to SES: Uncomment this and change activeProvider
// ============================================
/*
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

class SESProvider implements EmailProvider {
    private client: SESClient;
    private fromEmail: string;

    constructor() {
        this.client = new SESClient({
            region: process.env.AWS_REGION || 'eu-west-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@ben-hasedarim.co.il';
    }

    async send(options: EmailOptions): Promise<EmailResult> {
        try {
            const command = new SendEmailCommand({
                Source: options.from || this.fromEmail,
                Destination: { ToAddresses: [options.to] },
                Message: {
                    Subject: { Data: options.subject, Charset: 'UTF-8' },
                    Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
                },
            });

            const result = await this.client.send(command);
            return { success: true, messageId: result.MessageId };
        } catch (error: any) {
            console.error('[EmailService] SES error:', error);
            return { success: false, error: error.message };
        }
    }
}
*/

// ============================================
// EMAIL SERVICE CLASS
// ============================================
class EmailService {
    private provider: EmailProvider;

    constructor() {
        // SWITCH PROVIDER HERE:
        // For Resend (current): new ResendProvider()
        // For AWS SES (future): new SESProvider()
        this.provider = new ResendProvider();
    }

    /**
     * Send a raw email
     */
    async send(options: EmailOptions): Promise<EmailResult> {
        console.log(`[EmailService] Sending email to: ${options.to}, subject: ${options.subject}`);
        return this.provider.send(options);
    }

    /**
     * Send a job alert digest email
     */
    async sendJobAlertDigest(data: JobAlertEmail): Promise<EmailResult> {
        const { generateJobAlertEmailTemplate } = await import('../emailTemplate');

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
