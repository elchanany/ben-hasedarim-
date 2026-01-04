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
    frequency?: 'daily' | 'instant' | 'weekly';
    emailFrequency?: 'instant' | 'daily' | 'weekly';
    lastEmailSent?: admin.firestore.Timestamp;
}

interface Job {
    id: string;
    title: string;
    location?: string;
    city?: string;
    area?: string; // CRITICAL: This is the actual field used in frontend
    difficulty?: string;
    paymentKind?: string;
    hourlyRate?: number;
    globalPayment?: number;
    createdAt: admin.firestore.Timestamp;
    isPosted: boolean;
}

/**
 * Main function to process email notifications (Scheduled Batch)
 */
export async function processEmailNotifications(): Promise<{ sent: number; errors: number }> {
    console.log('[EmailNotifications] Starting partial batch job alert processing...');

    let sentCount = 0;
    let errorCount = 0;

    try {
        const db = admin.firestore();

        // 1. Check settings
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data();

        if (!settings?.isEmailServiceActive) {
            return { sent: 0, errors: 0 };
        }

        // Determine frequency threshold in minutes
        let thresholdMinutes = 60; // Default hourly
        if (settings.defaultFrequency === 'daily') thresholdMinutes = 1440;
        else if (settings.defaultFrequency === 'custom') thresholdMinutes = settings.frequencyMinutes || 30;
        else if (settings.defaultFrequency === 'immediate') {
            // If immediate, the trigger handles it. Scheduled job is just a fallback/cleanup or specific overrides.
            // For simplicity, we skip batch processing if mode is global immediate 
            // (assuming triggers work reliably).
            console.log('[EmailNotifications] Global mode is immediate. Skipping batch process.');
            return { sent: 0, errors: 0 };
        }

        // 2. Get users with email notifications
        const usersSnapshot = await db.collection('users')
            .where('notificationPreferences.email', '==', true)
            .get();

        // 3. Process each user
        for (const userDoc of usersSnapshot.docs) {
            try {
                const user = userDoc.data();
                const userId = userDoc.id;

                const alertsSnapshot = await db.collection('users').doc(userId)
                    .collection('jobAlertPreferences')
                    .where('isActive', '==', true)
                    .where('deliveryMethods.email', '==', true)
                    .get();

                if (alertsSnapshot.empty) continue;

                for (const alertDoc of alertsSnapshot.docs) {
                    const alert = alertDoc.data() as JobAlertPreference;
                    alert.id = alertDoc.id;

                    // Check if enough time passed since last email
                    const lastSent = alert.lastEmailSent?.toDate() || new Date(0);
                    const diffMinutes = (Date.now() - lastSent.getTime()) / (1000 * 60);

                    // Determine User Preference Frequency
                    let userThresholdMinutes = 1440; // Default daily
                    const userFreq = alert.emailFrequency || 'instant'; // Default to instant if not set (or fallback to old logic)

                    if (userFreq === 'instant') userThresholdMinutes = 0;
                    else if (userFreq === 'daily') userThresholdMinutes = 1440;
                    else if (userFreq === 'weekly') userThresholdMinutes = 10080;

                    // Enforce Global Minimum (Floor)
                    // The user cannot get emails faster than the Admin allows.
                    // Effective Threshold = Max(Global, User)
                    const effectiveThresholdMinutes = Math.max(thresholdMinutes, userThresholdMinutes);

                    if (diffMinutes < effectiveThresholdMinutes) {
                        continue; // Not time yet
                    }

                    // Look for new jobs since last sent
                    const matchingJobs = await findMatchingJobs(db, alert, lastSent);

                    if (matchingJobs.length === 0) continue;

                    // Send digest email
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
                        // IMPORTANT: Update timestamp so we don't spam
                        await alertDoc.ref.update({
                            lastEmailSent: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`[EmailNotifications] Batch email sent to ${emailData.userEmail}`);
                        await updateEmailStats(db, 1);
                    } else {
                        errorCount++;
                        console.error(`[EmailNotifications] Failed to send batch email: ${result.error}`);
                    }
                }
            } catch (err) {
                console.error(`Error processing user ${userDoc.id}:`, err);
            }
        }

    } catch (error) {
        console.error('[EmailNotifications] Critical error:', error);
        throw error;
    }

    return { sent: sentCount, errors: errorCount };
}

/**
 * Process immediate alerts for a single new job (Real-time Trigger)
 */
export async function processNewJobAlert(jobId: string, jobData: any): Promise<{ sent: number; errors: number }> {
    console.log(`[EmailNotifications] Processing immediate alert for job ${jobId}`);
    const db = admin.firestore();

    try {
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data();

        if (!settings?.isEmailServiceActive) {
            return { sent: 0, errors: 0 };
        }

        // If global frequency is NOT immediate, we skip real-time sending.
        // The scheduled batch function will pick this job up later because 
        // it queries jobs created > lastEmailSent.
        // Global frequency check - we prioritize user preference now, but log the global state.
        // Global Frequency Check (The Floor)
        // If the Admin sets a minimum time (e.g. 30m), we CANNOT send instant emails.
        // We must rely on the scheduled batch job to respect the minimum time.
        if (settings.defaultFrequency !== 'immediate' && settings.defaultFrequency !== 'instant') {
            console.log(`[EmailNotifications] Global frequency is ${settings.defaultFrequency}. Skipping immediate trigger (will be handled by batch).`);
            return { sent: 0, errors: 0 };
        }

        // ... Existing Logic for Immediate Sending ...
        let sentCount = 0;
        let errorCount = 0;

        // DEBUG: Get ALL users first to see what we have
        const usersSnapshot = await db.collection('users').get();
        console.log(`[EmailNotifications] Found ${usersSnapshot.size} total users in system`);

        for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data();
            const userId = userDoc.id;

            // DEBUG: Log user email preferences
            const hasEmailPref = user.notificationPreferences?.email === true;
            console.log(`[EmailNotifications] User ${user.email || userId}: notificationPreferences.email = ${hasEmailPref}`);

            // Skip users without email preference enabled
            if (!hasEmailPref) {
                continue;
            }

            // DEBUG: Get ALL alerts for this user to see what exists
            const allAlertsSnapshot = await db.collection('users').doc(userId)
                .collection('jobAlertPreferences')
                .get();

            console.log(`[EmailNotifications] User ${user.email}: Found ${allAlertsSnapshot.size} total alerts in Firestore`);

            for (const alertDoc of allAlertsSnapshot.docs) {
                const alert = alertDoc.data() as JobAlertPreference;

                // DEBUG: Log each alert's settings
                console.log(`[EmailNotifications] Alert '${alert.name}': isActive=${alert.isActive}, deliveryMethods.email=${alert.deliveryMethods?.email}, emailFrequency=${alert.emailFrequency}`);

                // Check if alert should receive immediate emails
                if (!alert.isActive) {
                    console.log(`[EmailNotifications] Skipping alert '${alert.name}': not active`);
                    continue;
                }
                if (!alert.deliveryMethods?.email) {
                    console.log(`[EmailNotifications] Skipping alert '${alert.name}': email delivery not enabled`);
                    continue;
                }

                // Check User Preference
                // Only send if user explicitly wants 'instant'
                const userFreq = alert.emailFrequency || 'instant';
                console.log(`[EmailNotifications] Alert '${alert.name}': emailFrequency=${userFreq}`);
                if (userFreq !== 'instant') {
                    console.log(`[EmailNotifications] Skipping alert '${alert.name}': emailFrequency is not instant`);
                    continue;
                }

                // Basic matching logic repeated here...
                const job: Job = { id: jobId, ...jobData } as Job;
                console.log(`[EmailNotifications] Job data: id=${job.id}, title=${job.title}, area=${job.area}, city=${job.city}, difficulty=${job.difficulty}`);

                let isMatch = true;
                // CRITICAL FIX: Check both area and city fields (area is primary in frontend)
                const jobLocation = job.area || job.city || '';
                console.log(`[EmailNotifications] Matching: jobLocation='${jobLocation}' vs alertLocation='${alert.location}'`);

                if (alert.location && jobLocation && !jobLocation.includes(alert.location)) {
                    console.log(`[EmailNotifications] Job ${job.id} - Location mismatch`);
                    isMatch = false;
                }
                if (alert.difficulty && job.difficulty && job.difficulty !== alert.difficulty) {
                    console.log(`[EmailNotifications] Job ${job.id} - Difficulty mismatch`);
                    isMatch = false;
                }
                if (alert.paymentKind && alert.paymentKind !== 'any' && job.paymentKind !== alert.paymentKind) {
                    console.log(`[EmailNotifications] Job ${job.id} - Payment kind mismatch`);
                    isMatch = false;
                }

                console.log(`[EmailNotifications] Job ${job.id} final isMatch=${isMatch}`);

                if (isMatch) {
                    console.log(`[EmailNotifications] Job ${job.id} matches alert '${alert.name}' for user ${user.email}`);
                    const emailData: JobAlertEmail = {
                        userEmail: alert.alertEmail || user.email,
                        userName: user.fullName || 'משתמש יקר',
                        alertName: alert.name,
                        jobs: [{
                            id: job.id,
                            title: job.title,
                            location: job.location || job.city || 'לא צוין',
                            payment: formatPayment(job),
                            postedAt: formatDate(job.createdAt),
                        }],
                    };

                    const result = await emailService.sendJobAlertDigest(emailData);
                    if (result.success) {
                        sentCount++;
                        await updateEmailStats(db, 1);
                        // Also update lastEmailSent so batch doesn't send it again immediately (though batch checks time diff)
                        await alertDoc.ref.update({
                            lastEmailSent: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`[EmailNotifications] Immediate email sent to ${emailData.userEmail}`);
                    } else {
                        errorCount++;
                    }
                }
            }
        }
        return { sent: sentCount, errors: errorCount };

    } catch (error) {
        console.error('[EmailNotifications] Error in processNewJobAlert:', error);
        throw error;
    }
}

/**
 * Update email statistics in Firestore
 */
async function updateEmailStats(db: admin.firestore.Firestore, count: number) {
    const statsRef = db.collection('settings').doc('notifications');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = `${currentMonth}-${String(now.getDate()).padStart(2, '0')}`;

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(statsRef);
            const data = doc.data()?.stats || {};

            // Check for resets
            const isNewMonth = data.currentMonth !== currentMonth;
            const isNewDay = data.currentDay !== currentDay;

            t.set(statsRef, {
                stats: {
                    sentTotal: (data.sentTotal || 0) + count,
                    sentThisMonth: isNewMonth ? count : (data.sentThisMonth || 0) + count,
                    sentToday: isNewDay ? count : (data.sentToday || 0) + count,
                    currentMonth,
                    currentDay,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });
        });
    } catch (error) {
        console.error('[EmailNotifications] Failed to update stats:', error);
    }
}

/**
 * Find jobs matching an alert's criteria that were posted after lastEmailSent
 */
async function findMatchingJobs(db: admin.firestore.Firestore, alert: JobAlertPreference, since: Date): Promise<Job[]> {
    let query = db.collection('jobs')
        .where('isPosted', '==', true)
        .where('createdAt', '>', admin.firestore.Timestamp.fromDate(since))
        .orderBy('createdAt', 'desc')
        .limit(20); // Limit to prevent huge emails

    const snapshot = await query.get();
    const jobs: Job[] = [];

    for (const doc of snapshot.docs) {
        const job = { id: doc.id, ...doc.data() } as Job;

        // CRITICAL FIX: Check both area and city fields (area is primary in frontend)
        const jobLocation = job.area || job.city || '';
        if (alert.location && jobLocation && !jobLocation.includes(alert.location)) {
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
