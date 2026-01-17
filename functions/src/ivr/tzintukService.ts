/**
 * Tzintuk (Robocall) Service
 * 
 * Handles sending tzintuk notifications via Yemot HaMashiach API
 * when new jobs are posted that match user subscriptions
 */

import * as admin from 'firebase-admin';
import axios from 'axios';

const TZINTUK_COLLECTION = 'tzintukSubscriptions';

interface TzintukSubscription {
    phone: string;
    isActive: boolean;
    filters?: {
        city?: string;
        paymentType?: string;
        minHourlyRate?: number;
    };
}

interface JobData {
    title: string;
    area?: string;
    city?: string;
    paymentType?: string;
    hourlyRate?: number;
    globalPayment?: number;
    isPosted: boolean;
}

/**
 * Send tzintuk notifications for a new job
 * This function is called when a new job is created
 */
export async function sendTzintukNotifications(
    jobId: string,
    jobData: JobData
): Promise<{ sent: number; errors: number }> {
    console.log(`[Tzintuk] Processing notifications for job ${jobId}`);

    const db = admin.firestore();
    let sentCount = 0;
    let errorCount = 0;

    try {
        // Get Yemot credentials from settings
        const settingsDoc = await db.collection('settings').doc('yemot').get();
        const yemotSettings = settingsDoc.data();

        if (!yemotSettings?.apiToken || !yemotSettings?.systemNumber) {
            console.log('[Tzintuk] Yemot API not configured. Skipping tzintuk notifications.');
            return { sent: 0, errors: 0 };
        }

        if (!yemotSettings.tzintukEnabled) {
            console.log('[Tzintuk] Tzintuk notifications disabled.');
            return { sent: 0, errors: 0 };
        }

        // Get all active subscriptions
        const subscriptionsSnapshot = await db.collection(TZINTUK_COLLECTION)
            .where('isActive', '==', true)
            .get();

        if (subscriptionsSnapshot.empty) {
            console.log('[Tzintuk] No active subscriptions found.');
            return { sent: 0, errors: 0 };
        }

        console.log(`[Tzintuk] Found ${subscriptionsSnapshot.size} active subscriptions`);

        // Check each subscription
        for (const doc of subscriptionsSnapshot.docs) {
            const subscription = doc.data() as TzintukSubscription;

            // Check if job matches subscription filters
            if (!jobMatchesFilters(jobData, subscription.filters)) {
                console.log(`[Tzintuk] Job doesn't match filters for ${subscription.phone}`);
                continue;
            }

            // Send tzintuk
            try {
                await sendTzintuk(
                    yemotSettings.apiToken,
                    yemotSettings.systemNumber,
                    subscription.phone,
                    yemotSettings.tzintukExtension || '1' // Default extension for tzintuk
                );
                sentCount++;
                console.log(`[Tzintuk] Sent to ${subscription.phone}`);

                // Log the tzintuk
                await db.collection('tzintukLogs').add({
                    jobId,
                    phone: subscription.phone,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    success: true
                });

            } catch (error) {
                errorCount++;
                console.error(`[Tzintuk] Failed to send to ${subscription.phone}:`, error);

                await db.collection('tzintukLogs').add({
                    jobId,
                    phone: subscription.phone,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    success: false,
                    error: (error as Error).message
                });
            }
        }

    } catch (error) {
        console.error('[Tzintuk] Error processing notifications:', error);
        throw error;
    }

    console.log(`[Tzintuk] Completed: ${sentCount} sent, ${errorCount} errors`);
    return { sent: sentCount, errors: errorCount };
}

/**
 * Check if a job matches subscription filters
 */
function jobMatchesFilters(
    job: JobData,
    filters?: TzintukSubscription['filters']
): boolean {
    // No filters = match all
    if (!filters) {
        return true;
    }

    // City filter
    if (filters.city) {
        const jobLocation = job.area || job.city || '';
        if (!jobLocation.includes(filters.city)) {
            return false;
        }
    }

    // Payment type filter
    if (filters.paymentType && job.paymentType !== filters.paymentType) {
        return false;
    }

    // Minimum hourly rate filter
    if (filters.minHourlyRate && job.hourlyRate) {
        if (job.hourlyRate < filters.minHourlyRate) {
            return false;
        }
    }

    return true;
}

/**
 * Send a single tzintuk via Yemot HaMashiach API
 * 
 * @param token API token for Yemot
 * @param systemNumber Your Yemot system number
 * @param targetPhone Phone number to call
 * @param extension Extension to route to (what the caller hears)
 */
async function sendTzintuk(
    token: string,
    systemNumber: string,
    targetPhone: string,
    extension: string
): Promise<void> {
    // Yemot HaMashiach API endpoint for tzintuk
    const apiUrl = 'https://www.call2all.co.il/ym/api/RunTzintuk';

    try {
        const response = await axios.get(apiUrl, {
            params: {
                token: token,
                Rone: systemNumber,
                SendTo: targetPhone,
                AddToExtension: extension
            }
        });

        if (response.data.responseStatus !== 'OK') {
            throw new Error(`Yemot API error: ${response.data.responseStatus}`);
        }

    } catch (error) {
        console.error('[Tzintuk] API call failed:', error);
        throw error;
    }
}

/**
 * Get tzintuk statistics
 */
export async function getTzintukStats(): Promise<{
    totalSent: number;
    sentToday: number;
    activeSubscriptions: number;
}> {
    const db = admin.firestore();

    // Count active subscriptions
    const subscriptionsSnapshot = await db.collection(TZINTUK_COLLECTION)
        .where('isActive', '==', true)
        .count()
        .get();

    // Count total sent
    const totalSnapshot = await db.collection('tzintukLogs')
        .where('success', '==', true)
        .count()
        .get();

    // Count sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySnapshot = await db.collection('tzintukLogs')
        .where('success', '==', true)
        .where('sentAt', '>=', admin.firestore.Timestamp.fromDate(today))
        .count()
        .get();

    return {
        totalSent: totalSnapshot.data().count,
        sentToday: todaySnapshot.data().count,
        activeSubscriptions: subscriptionsSnapshot.data().count
    };
}
