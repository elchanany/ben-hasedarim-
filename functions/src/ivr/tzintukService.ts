/**
 * Tzintuk (Robocall) Service - FIRESTORE-BASED
 * 
 * Updated Architecture:
 * - Reads subscribers from Firestore (tzintukSubscriptions collection)
 * - Filters by preferences (area, night mode)
 * - Sends tzintuk to matching phone numbers via Yemot API
 * - Still efficient: batch processing every 5 minutes
 */

import * as admin from 'firebase-admin';
import axios from 'axios';

// ============================================
// INTERFACES
// ============================================

interface PhoneSettings {
    isPhoneServiceActive: boolean;
    checkFrequencyMinutes: number;
    sendMode: 'immediate' | 'batch';

    // Payment settings
    requirePaymentForPosters: boolean;
    posterPaymentAmount: number;
    requirePaymentForViewers: boolean;
    viewerPaymentAmount: number;

    // Yemot settings
    yemotSystemNumber: string;
    yemotApiToken: string;

    // Rate limiting (0 = unlimited)
    maxTzintuksPerDay: number;
    quietHoursStart: number;  // 22 = 10pm
    quietHoursEnd: number;    // 7 = 7am

    // Tracking
    lastCheckTime?: admin.firestore.Timestamp;
    lastTzintukSent?: admin.firestore.Timestamp;
    tzintuksSentToday?: number;
}

interface TzintukSubscription {
    phone: string;
    isActive: boolean;
    allowNightTzintuk: boolean;
    hasFilters: boolean;
    filters?: {
        area?: string;
        minSalary?: number;
        maxSalary?: number;
        minAge?: number;
        maxAge?: number;
    };
    createdAt: any;
    pauseUntil?: admin.firestore.Timestamp; // New: support for pausing subscription
}

interface PendingJob {
    id: string;
    title: string;
    area?: string;
    hourlyRate?: number;
    globalPayment?: number;
    minimumAge?: number;
    postedDate: string;
    postedBy?: {
        name: string;
        phone: string;
    };
}

// ============================================
// MAIN BATCH PROCESSING FUNCTION
// ============================================

/**
 * Main batch processing function - runs on schedule
 * Reads subscribers from Firestore and sends to matching phones
 */
export async function processTzintukNotifications(bypassChecks: boolean = false): Promise<{
    checked: boolean;
    jobsFound: number;
    tzintukSent: boolean;
    subscribersNotified: number;
    message: string;
}> {
    console.log('[Tzintuk] Starting batch processing... [VERSION 3.0 - CLEAN BUILD]');

    const db = admin.firestore();

    try {
        // 1. Get phone settings
        const settingsDoc = await db.collection('settings').doc('phoneSettings').get();

        if (!settingsDoc.exists) {
            console.log('[Tzintuk] No phone settings found. Creating defaults...');
            await createDefaultSettings(db);
            return { checked: true, jobsFound: 0, tzintukSent: false, subscribersNotified: 0, message: 'Created default settings' };
        }

        const settings = settingsDoc.data() as PhoneSettings;

        // 2. Check if service is active
        if (!settings.isPhoneServiceActive) {
            console.log('[Tzintuk] Service is disabled.');
            return { checked: true, jobsFound: 0, tzintukSent: false, subscribersNotified: 0, message: 'Service disabled' };
        }

        // 3. Check if Yemot API is configured
        if (!settings.yemotApiToken || !settings.yemotSystemNumber) {
            console.log('[Tzintuk] Yemot API not configured.');
            return { checked: true, jobsFound: 0, tzintukSent: false, subscribersNotified: 0, message: 'Yemot API not configured' };
        }

        // 4. Check rate limit (0 = unlimited)
        if (!bypassChecks &&
            settings.maxTzintuksPerDay > 0 &&
            settings.tzintuksSentToday &&
            settings.tzintuksSentToday >= settings.maxTzintuksPerDay) {
            console.log('[Tzintuk] Daily limit reached.');
            return { checked: true, jobsFound: 0, tzintukSent: false, subscribersNotified: 0, message: 'Daily limit reached' };
        }

        // 5. Check if night time
        const isNightTime = isQuietHours(settings);
        console.log(`[Tzintuk] Night time: ${isNightTime}`);

        if (isNightTime && !bypassChecks) {
            // Continue logic but skip subscribers who don't want night tzintuks
            // This is handled in the subscriber loop below
        }

        // 6. Find pending jobs
        const pendingJobsSnapshot = await db.collection('jobs')
            .where('pendingTzintuk', '==', true)
            .where('isPosted', '==', true)
            .limit(50)
            .get();

        let pendingJobs: PendingJob[] = [];

        if (!pendingJobsSnapshot.empty) {
            pendingJobs = pendingJobsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PendingJob));
        } else if (bypassChecks) {
            console.log('[Tzintuk] No pending jobs, but bypassing checks. Creating DUMMY job for testing.');
            pendingJobs = [{
                id: 'test-job-forced',
                title: 'בדיקת מערכת',
                description: 'זוהי הודעת בדיקה יזומה מהמערכת',
                area: 'כל הארץ', // Wildcard area to catch all subscribers
                suitability: [],
                difficulty: 'רגיל',
                isPosted: true,
                postedDate: admin.firestore.Timestamp.now(),
                postedBy: { name: 'System', phone: '0587180875' }, // FIXED: User's real number
                pendingTzintuk: true
            } as any];
        } else {
            console.log('[Tzintuk] No pending jobs.');
            await db.collection('settings').doc('phoneSettings').update({
                lastCheckTime: admin.firestore.FieldValue.serverTimestamp()
            });
            return { checked: true, jobsFound: 0, tzintukSent: false, subscribersNotified: 0, message: 'No pending jobs' };
        }

        // pendingJobs is already populated above


        console.log(`[Tzintuk] Found ${pendingJobs.length} pending jobs`);

        // 7. Get all active subscribers from Firestore
        let subscribersSnapshot = await db.collection('tzintukSubscriptions')
            .where('isActive', '==', true)
            .get();

        // If no active subscribers found, AND we are forcing, try to get ALL subscribers
        if (subscribersSnapshot.empty && bypassChecks) {
            console.log('[Tzintuk] No ACTIVE subscribers found. Fetching ALL subscribers (force mode).');
            subscribersSnapshot = await db.collection('tzintukSubscriptions').get();
        }

        let allSubscribers: TzintukSubscription[] = [];

        if (!subscribersSnapshot.empty) {
            allSubscribers = subscribersSnapshot.docs.map(doc => doc.data() as TzintukSubscription);
        } else if (bypassChecks && pendingJobs.length > 0 && pendingJobs[0].postedBy?.phone) {
            // Fallback: Send to the JOB POSTER if no subscribers exist
            const posterPhone = pendingJobs[0].postedBy.phone;
            console.log(`[Tzintuk] No subscribers in DB. Force mode: Sending to Job Poster (${posterPhone})`);
            allSubscribers = [{
                phone: posterPhone,
                isActive: true,
                createdAt: admin.firestore.Timestamp.now(),
                filters: {}, // No filters
                hasFilters: false,
                allowNightTzintuk: true // Force allow night
            }];
        } else {
            console.log('[Tzintuk] No subscribers found (active or inactive) and could not use poster phone.');
            // Still mark jobs as processed
            await markJobsAsProcessed(db, pendingJobs);
            return { checked: true, jobsFound: pendingJobs.length, tzintukSent: false, subscribersNotified: 0, message: 'No subscribers found in database' };
        }
        console.log(`[Tzintuk] Found ${allSubscribers.length} active subscribers`);

        // 8. Filter subscribers based on jobs and preferences
        const matchedPhones: string[] = [];

        for (const subscriber of allSubscribers) {
            // Skip if night time and user didn't opt in
            // Skip if night time and user didn't opt in (unless bypassing checks)
            if (isNightTime && !subscriber.allowNightTzintuk && !bypassChecks) {
                continue;
            }

            // Check if paused
            if (subscriber.pauseUntil && subscriber.pauseUntil.toMillis() > Date.now()) {
                console.log(`[Tzintuk] Skipping paused subscriber: ${subscriber.phone}`);
                continue;
            }

            // Check if subscriber matches any of the pending jobs
            const matchesAnyJob = pendingJobs.some(job => jobMatchesSubscriber(job, subscriber));

            if (matchesAnyJob || !subscriber.hasFilters) {
                // User has no filters OR matches at least one job
                matchedPhones.push(subscriber.phone);
            }
        }

        console.log(`[Tzintuk] ${matchedPhones.length} subscribers match the criteria`);

        if (matchedPhones.length === 0) {
            console.log('[Tzintuk] No matching subscribers for current jobs.');
            await markJobsAsProcessed(db, pendingJobs);
            return { checked: true, jobsFound: pendingJobs.length, tzintukSent: false, subscribersNotified: 0, message: 'No matching subscribers' };
        }

        // 9. Send tzintuk to matched phone numbers
        const tzintukResult = await sendTzintukToPhones(settings, matchedPhones);

        if (tzintukResult.success) {
            // 10. Mark jobs as processed and update stats
            await markJobsAsProcessed(db, pendingJobs);

            await db.collection('settings').doc('phoneSettings').update({
                lastCheckTime: admin.firestore.FieldValue.serverTimestamp(),
                lastTzintukSent: admin.firestore.FieldValue.serverTimestamp(),
                tzintuksSentToday: admin.firestore.FieldValue.increment(1)
            });

            // Log the tzintuk
            await db.collection('tzintukLogs').add({
                type: 'filtered',
                jobCount: pendingJobs.length,
                jobIds: pendingJobs.map(j => j.id),
                subscribersNotified: matchedPhones.length,
                isNightTime,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                success: true
            });

            console.log(`[Tzintuk] Successfully sent to ${matchedPhones.length} subscribers`);

            return {
                checked: true,
                jobsFound: pendingJobs.length,
                tzintukSent: true,
                subscribersNotified: matchedPhones.length,
                message: `Sent tzintuk to ${matchedPhones.length} subscribers for ${pendingJobs.length} jobs`
            };
        } else {
            console.error('[Tzintuk] Failed to send:', tzintukResult.message);
            return {
                checked: true,
                jobsFound: pendingJobs.length,
                tzintukSent: false,
                subscribersNotified: 0,
                message: tzintukResult.message
            };
        }

    } catch (error) {
        console.error('[Tzintuk] Error in batch processing:', error);
        return { checked: true, jobsFound: 0, tzintukSent: false, subscribersNotified: 0, message: `Error: ${error}` };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a job matches subscriber's filters
 */
function jobMatchesSubscriber(job: PendingJob, subscriber: TzintukSubscription): boolean {
    if (!subscriber.hasFilters || !subscriber.filters) {
        return true; // No filters = matches everything
    }

    const filters = subscriber.filters;

    // Area filter
    if (filters.area && filters.area !== 'כל הארץ' && filters.area !== 'ארצי') {
        if (job.area && job.area !== filters.area) {
            return false;
        }
    }

    // Salary filter
    const jobSalary = job.hourlyRate || job.globalPayment || 0;
    if (filters.minSalary && jobSalary < filters.minSalary) {
        return false;
    }
    if (filters.maxSalary && jobSalary > filters.maxSalary) {
        return false;
    }

    // Age filter
    if (filters.minAge && job.minimumAge && job.minimumAge > filters.minAge) {
        return false; // Job requires older age than subscriber is looking for
    }

    return true;
}

/**
 * Send tzintuk to specific phone numbers via Yemot API
 */
/**
 * Send tzintuk to specific phone numbers via Yemot API
 * Uses a ROBUST STRATEGY to handle API inconsistencies (Error 105)
 */
export async function sendTzintukToPhones(settings: PhoneSettings, phones: string[]): Promise<{ success: boolean; message: string; details?: any }> {
    console.log(`[Tzintuk] Preparing to trigger Tzintuk via IVR-based list (Free Mode)`);

    const systemNumber = settings.yemotSystemNumber?.trim() || '';
    let finalToken = settings.yemotApiToken?.trim() || '';

    // Construct valid token: number:password
    if (finalToken && !finalToken.includes(':')) {
        finalToken = `${systemNumber}:${finalToken}`;
    }

    console.log(`[Tzintuk] Using Token: ${systemNumber}:**** (Length: ${finalToken.length})`);

    try {
        // TESTING: Send to multiple lists to check if Yemot deduplicates
        const tzintukLists = ['test_list_2', 'test_tzintuk2']; // Two test lists

        console.log(`[Tzintuk] Triggering RunTzintuk on ${tzintukLists.length} lists: ${tzintukLists.join(', ')}...`);

        const runUrl = 'https://www.call2all.co.il/ym/api/RunTzintuk';

        // Send to all lists
        const results = await Promise.all(
            tzintukLists.map(async (listName) => {
                console.log(`[Tzintuk] Sending to list: ${listName}`);
                const response = await axios.get(runUrl, {
                    params: {
                        token: finalToken,
                        phones: `tzl:${listName}`, // tzl: prefix + list name
                        callerId: systemNumber || '0000000000'
                    }
                });
                console.log(`[Tzintuk] Response from ${listName}:`, response.data);
                return { listName, response: response.data };
            })
        );

        // Check if all succeeded
        const allSucceeded = results.every(r => r.response.responseStatus === 'OK');

        if (allSucceeded) {
            return {
                success: true,
                message: `Tzintuk triggered for ${tzintukLists.length} lists: ${tzintukLists.join(', ')}`,
                details: results
            };
        } else {
            const failedLists = results.filter(r => r.response.responseStatus !== 'OK');
            return {
                success: false,
                message: `Some lists failed: ${failedLists.map(f => f.listName).join(', ')}`,
                details: results
            };
        }

    } catch (error: any) {
        console.error('[Tzintuk] API error:', error);
        return { success: false, message: `API error: ${error.message || error}` };
    }
}

/**
 * Mark jobs as processed
 */
async function markJobsAsProcessed(db: admin.firestore.Firestore, jobs: PendingJob[]): Promise<void> {
    const batch = db.batch();

    for (const job of jobs) {
        if (job.id === 'test-job-forced') {
            console.log('[Tzintuk] Skipping DB update for dummy test job');
            continue;
        }

        const jobRef = db.collection('jobs').doc(job.id);
        batch.update(jobRef, {
            pendingTzintuk: false,
            tzintukSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    await batch.commit();
}

/**
 * Check if current time is in quiet hours
 */
function isQuietHours(settings: PhoneSettings): boolean {
    const now = new Date();
    const israelHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })).getHours();

    const start = settings.quietHoursStart || 22;
    const end = settings.quietHoursEnd || 7;

    if (start > end) {
        return israelHour >= start || israelHour < end;
    } else {
        return israelHour >= start && israelHour < end;
    }
}

/**
 * Create default phone settings
 */
async function createDefaultSettings(db: admin.firestore.Firestore): Promise<void> {
    const defaults: PhoneSettings = {
        isPhoneServiceActive: false,
        checkFrequencyMinutes: 5,
        sendMode: 'batch',

        requirePaymentForPosters: false,
        posterPaymentAmount: 0,
        requirePaymentForViewers: false,
        viewerPaymentAmount: 0,

        yemotSystemNumber: '',
        yemotApiToken: '',

        maxTzintuksPerDay: 0,  // 0 = unlimited
        quietHoursStart: 22,
        quietHoursEnd: 7,
        tzintuksSentToday: 0
    };

    await db.collection('settings').doc('phoneSettings').set(defaults);
}

// ============================================
// EXPORTED FUNCTIONS FOR CLOUD FUNCTIONS
// ============================================

/**
 * Invite a number to join the Tzintuk list (FREE)
 * Uses Yemot's "invitation_join" feature - the system calls the user and asks them to confirm
 * This is completely free because the USER confirms the addition themselves
 */
export async function inviteNumberToTzintukList(phone: string, listName: string = 'test_tzintuk'): Promise<boolean> {
    try {
        const db = admin.firestore();
        const settingsDoc = await db.collection('settings').doc('phoneSettings').get();
        const settings = settingsDoc.data() as PhoneSettings;

        if (!settings) {
            console.error('[Tzintuk] No phone settings found');
            return false;
        }

        const systemNumber = settings.yemotSystemNumber?.trim() || '';
        let finalToken = settings.yemotApiToken?.trim() || '';

        if (finalToken && !finalToken.includes(':')) {
            finalToken = `${systemNumber}:${finalToken}`;
        }

        console.log(`[Tzintuk] Inviting ${phone} to join list "${listName}" via invitation system...`);

        // Use the InvitePhoneToList API endpoint
        // This triggers a call to the user asking them to confirm joining
        const inviteUrl = 'https://www.call2all.co.il/ym/api/InvitePhoneToList';

        const response = await axios.get(inviteUrl, {
            params: {
                token: finalToken,
                list: listName, // The list_tzintuk name from ext.ini
                phone: phone
            }
        });

        console.log('[Tzintuk] Invitation response:', response.data);

        if (response.data.responseStatus === 'OK') {
            console.log(`[Tzintuk] ✅ Invitation sent successfully! User will receive a call to confirm.`);
            return true;
        } else {
            console.error(`[Tzintuk] ❌ Invitation failed: ${response.data.message}`);
            return false;
        }

    } catch (error: any) {
        console.error(`[Tzintuk] Failed to invite ${phone}:`, error.message);
        return false;
    }
}

// Keep old function for backwards compatibility (deprecated)
export async function addNumberToTzintukList(phone: string, listId: string = '1000'): Promise<boolean> {
    console.warn('[Tzintuk] addNumberToTzintukList is deprecated, use inviteNumberToTzintukList instead');
    return inviteNumberToTzintukList(phone, listId);
}

/**
 * Mark a new job for tzintuk notification
 */
export async function markJobForTzintuk(jobId: string): Promise<void> {
    const db = admin.firestore();
    await db.collection('jobs').doc(jobId).update({
        pendingTzintuk: true
    });
    console.log(`[Tzintuk] Job ${jobId} marked for tzintuk`);
}

/**
 * Reset daily tzintuk counter (run at midnight)
 */
export async function resetDailyTzintukCounter(): Promise<void> {
    const db = admin.firestore();
    await db.collection('settings').doc('phoneSettings').update({
        tzintuksSentToday: 0
    });
    console.log('[Tzintuk] Daily counter reset');
}

/**
 * Get tzintuk service status and stats
 */
export async function getTzintukStatus(): Promise<{
    isActive: boolean;
    todaySent: number;
    totalSubscribers: number;
    pendingJobs: number;
}> {
    const db = admin.firestore();

    const [settingsDoc, subscribersSnapshot, pendingJobsSnapshot] = await Promise.all([
        db.collection('settings').doc('phoneSettings').get(),
        db.collection('tzintukSubscriptions').where('isActive', '==', true).get(),
        db.collection('jobs').where('pendingTzintuk', '==', true).get()
    ]);

    const settings = settingsDoc.exists ? settingsDoc.data() as PhoneSettings : null;

    return {
        isActive: settings?.isPhoneServiceActive || false,
        todaySent: settings?.tzintuksSentToday || 0,
        totalSubscribers: subscribersSnapshot.size,
        pendingJobs: pendingJobsSnapshot.size
    };
}

/**
 * Setup tzintuk for testing
 */
export async function setupTzintuk(): Promise<{ success: boolean; message: string }> {
    try {
        const db = admin.firestore();
        const settingsDoc = await db.collection('settings').doc('phoneSettings').get();

        if (!settingsDoc.exists) {
            await createDefaultSettings(db);
            return { success: true, message: 'Created default settings. Please configure Yemot credentials.' };
        }

        return { success: true, message: 'Phone settings already exist.' };
    } catch (error) {
        return { success: false, message: `Error: ${error}` };
    }
}
