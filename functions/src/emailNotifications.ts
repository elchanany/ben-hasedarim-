/**
 * Job Alert Email Notification System
 * 
 * Scheduled Cloud Function that runs hourly to:
 * 1. Find users with email notifications enabled
 * 2. Check their job alert preferences
 * 3. Find matching new jobs
 * 4. Send digest emails
 */

import * as admin from 'firebase-admin';
import { emailService, JobAlertEmail } from './services/emailService';

const db = admin.firestore();

interface JobAlertPreference {
    id: string;
    name: string;
    location?: string;
    difficulty?: string;
    paymentKind?: string;
    isActive: boolean;
    deliveryMethods: {
        site: boolean;
        email: boolean;
        whatsapp: boolean;
        tzintuk: boolean;
    };
    alertEmail?: string;
    lastEmailSent?: admin.firestore.Timestamp;
}

interface Job {
    id: string;
    title: string;
    location?: string;
    city?: string;
    difficulty?: string;
    paymentKind?: string;
    hourlyRate?: number;
    globalPayment?: number;
    createdAt: admin.firestore.Timestamp;
    isPosted: boolean;
}

/**
 * Main function to process email notifications
 */
export async function processEmailNotifications(): Promise<{ sent: number; errors: number }> {
    console.log('[EmailNotifications] Starting hourly job alert email processing...');

    let sentCount = 0;
    let errorCount = 0;

    try {
        // 1. Check if email service is enabled
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data();

        if (!settings?.isEmailServiceActive) {
            console.log('[EmailNotifications] Email service is disabled. Skipping.');
            return { sent: 0, errors: 0 };
        }

        // 2. Get all users with notification preferences that include email
        const usersSnapshot = await db.collection('users')
            .where('notificationPreferences.email', '==', true)
            .get();

        console.log(`[EmailNotifications] Found ${usersSnapshot.size} users with email notifications enabled`);

        // 3. Process each user
        for (const userDoc of usersSnapshot.docs) {
            try {
                const user = userDoc.data();
                const userId = userDoc.id;

                // Get user's job alert preferences that have email delivery enabled
                const alertsSnapshot = await db.collection('users').doc(userId)
                    .collection('jobAlertPreferences')
                    .where('isActive', '==', true)
                    .where('deliveryMethods.email', '==', true)
                    .get();

                if (alertsSnapshot.empty) {
                    continue; // No email alerts for this user
                }

                // Process each alert
                for (const alertDoc of alertsSnapshot.docs) {
                    const alert = alertDoc.data() as JobAlertPreference;
                    alert.id = alertDoc.id;

                    // Determine time window for new jobs
                    const lastEmailSent = alert.lastEmailSent?.toDate() || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24h ago

                    // Find matching jobs
                    const matchingJobs = await findMatchingJobs(alert, lastEmailSent);

                    if (matchingJobs.length === 0) {
                        console.log(`[EmailNotifications] No new jobs for alert "${alert.name}" (user: ${userId})`);
                        continue;
                    }

                    console.log(`[EmailNotifications] Found ${matchingJobs.length} matching jobs for alert "${alert.name}"`);

                    // Send email
                    const emailData: JobAlertEmail = {
                        userEmail: alert.alertEmail || user.email,
                        userName: user.fullName || 'משתמש יקר',
                        alertName: alert.name,
                        jobs: matchingJobs.map(job => ({
                            id: job.id,
                            title: job.title,
                            location: job.location || job.city || 'לא צוין',
                            payment: formatPayment(job),
                            postedAt: formatDate(job.createdAt),
                        })),
                    };

                    const result = await emailService.sendJobAlertDigest(emailData);

                    if (result.success) {
                        sentCount++;
                        // Update lastEmailSent
                        await alertDoc.ref.update({
                            lastEmailSent: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`[EmailNotifications] Email sent to ${emailData.userEmail} (messageId: ${result.messageId})`);
                    } else {
                        errorCount++;
                        console.error(`[EmailNotifications] Failed to send email to ${emailData.userEmail}: ${result.error}`);
                    }
                }
            } catch (userError) {
                console.error(`[EmailNotifications] Error processing user ${userDoc.id}:`, userError);
                errorCount++;
            }
        }

    } catch (error) {
        console.error('[EmailNotifications] Critical error:', error);
        throw error;
    }

    console.log(`[EmailNotifications] Completed. Sent: ${sentCount}, Errors: ${errorCount}`);
    return { sent: sentCount, errors: errorCount };
}

/**
 * Find jobs matching an alert's criteria that were posted after lastEmailSent
 */
async function findMatchingJobs(alert: JobAlertPreference, since: Date): Promise<Job[]> {
    let query = db.collection('jobs')
        .where('isPosted', '==', true)
        .where('createdAt', '>', admin.firestore.Timestamp.fromDate(since))
        .orderBy('createdAt', 'desc')
        .limit(20); // Limit to prevent huge emails

    const snapshot = await query.get();
    const jobs: Job[] = [];

    for (const doc of snapshot.docs) {
        const job = { id: doc.id, ...doc.data() } as Job;

        // Apply filters based on alert criteria
        if (alert.location && job.city && !job.city.includes(alert.location)) {
            continue;
        }
        if (alert.difficulty && job.difficulty && job.difficulty !== alert.difficulty) {
            continue;
        }
        if (alert.paymentKind && alert.paymentKind !== 'any' && job.paymentKind !== alert.paymentKind) {
            continue;
        }

        jobs.push(job);
    }

    return jobs;
}

/**
 * Format payment for display
 */
function formatPayment(job: Job): string {
    if (job.hourlyRate) {
        return `₪${job.hourlyRate}/שעה`;
    }
    if (job.globalPayment) {
        return `₪${job.globalPayment} (גלובלי)`;
    }
    return 'לא צוין';
}

/**
 * Format date for display in Hebrew
 */
function formatDate(timestamp: admin.firestore.Timestamp): string {
    const date = timestamp.toDate();
    return date.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
}
