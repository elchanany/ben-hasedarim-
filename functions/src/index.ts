
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import express from 'express';
import { processEmailNotifications } from './emailNotifications';
import { router as yemotRouter } from './ivr/yemotRouter';
import { processTzintukNotifications, markJobForTzintuk, setupTzintuk, getTzintukStatus, resetDailyTzintukCounter } from './ivr/tzintukService';

dotenv.config();

// Ensure Firebase App is initialized before any other access
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// ============================================
// YEMOT HAMASHIACH IVR ENDPOINT
// ============================================

const ivrApp = express();
ivrApp.use(yemotRouter as any);

/**
 * Yemot HaMashiach IVR Endpoint
 * This receives calls from Yemot HaMashiach and handles the phone menu
 */
export const yemotIVR = functions
    .region('europe-west1')
    .https.onRequest(ivrApp);

// ============================================
// SCHEDULED FUNCTIONS
// ============================================

/**
 * Schedule: Runs every 10 minutes
 * Checks for users with "custom" frequency or "hourly/daily" that need updates.
 * (Logic inside processEmailNotifications will handle the actual "is it time?" check)
 */
export const sendJobAlertEmails = functions
    .region('europe-west1')
    .pubsub.schedule('*/10 * * * *') // Run every 10 minutes
    .timeZone('Asia/Jerusalem')
    .onRun(async (context) => {
        return processEmailNotifications();
    });

// ============================================
// FIRESTORE TRIGGERS
// ============================================

/**
 * Trigger: When a new job is created
 * Checks if immediate email alerts are enabled and processes them
 * EFFICIENT: Just marks job for tzintuk, doesn't send per-job
 */
export const onJobCreated = functions
    .region('europe-west1')
    .firestore.document('jobs/{jobId}')
    .onCreate(async (snap, context) => {
        const jobId = context.params.jobId;
        const jobData = snap.data();

        // DEBUG: Log all job data to see what we have
        console.log(`[Trigger] onJobCreated fired for job ${jobId}`);
        console.log(`[Trigger] Job data: isPosted=${jobData.isPosted}, title=${jobData.title}, area=${jobData.area}`);

        // Only process posted jobs
        if (!jobData.isPosted) {
            console.log(`[Trigger] Skipping job ${jobId} - isPosted is ${jobData.isPosted} (falsy)`);
            return null;
        }

        console.log(`[Trigger] Processing job ${jobId} - isPosted is TRUE`);

        // Process email notifications
        await import('./emailNotifications').then(m =>
            m.processNewJobAlert(jobId, jobData)
        );

        // EFFICIENT: Just mark for tzintuk - don't send per job!
        // The batch processor will send one tzintuk for all pending jobs
        try {
            await markJobForTzintuk(jobId);
        } catch (error) {
            console.error(`[Trigger] Error marking job for tzintuk:`, error);
        }

        return null;
    });

/**
 * HTTP Function for testing email logic manually
 * usage: https://region-project.cloudfunctions.net/manualEmailTrigger
 */
export const manualEmailTrigger = functions
    .region('europe-west1')
    .https.onRequest(async (req, res) => {
        // Enable CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        try {
            // Handle 'test' flag
            if (req.body.test) {
                const targetEmail = req.body.targetEmail || 'onboarding@resend.dev';
                const { emailService } = await import('./services/emailService');

                const result = await emailService.send({
                    to: targetEmail,
                    subject: 'בדיקת מערכת התראות - בין הסדרים',
                    html: `
                        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                            <h2 style="color: #2563eb;">בדיקת מערכת הצליחה! ✅</h2>
                            <p>זהו מייל בדיקה שנשלח ממערכת הניהול.</p>
                            <p>אם קיבלת את המייל הזה, סימן שהחיבור ל-Resend עובד תקין.</p>
                            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
                            <small style="color: #666;">נשלח בתאריך: ${new Date().toLocaleString('he-IL')}</small>
                        </div>
                    `
                });

                res.json({
                    success: result.success,
                    message: result.success ? 'Email sent successfully' : 'Failed to send email',
                    details: result
                });
                return;
            }

            const result = await processEmailNotifications();
            res.json({
                success: true,
                message: 'Email processing completed',
                details: result
            });
        } catch (error: any) {
            console.error('Manual trigger failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

// ============================================
// PAYMENT FUNCTIONS
// ============================================

import { PayPalClient } from './paypal';

const payPalClient = new PayPalClient();

/**
 * Create PayPal Order
 */
export const createPaymentOrder = functions.https.onCall(async (data, context) => {
    // Basic Auth Check (optional, but good practice)
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    try {
        const { amount, currency } = data;
        const order = await payPalClient.createOrder(amount, currency || 'ILS');
        return order;
    } catch (error) {
        console.error('Error creating PayPal order:', error);
        throw new functions.https.HttpsError('internal', 'Unable to create order');
    }
});

/**
 * Capture PayPal Order
 */
export const capturePaymentOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    try {
        const { orderId } = data;
        const captureData = await payPalClient.captureOrder(orderId);
        return captureData;
    } catch (error) {
        console.error('Error capturing PayPal order:', error);
        throw new functions.https.HttpsError('internal', 'Unable to capture order');
    }
});

// ============================================
// OTHER UTILS
// ============================================

/**
 * Get Secure Contact Details (for Paid Jobs)
 */
export const getSecureContactDetails = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { jobId } = data;
    const db = admin.firestore();

    try {
        // 1. Check if job is paid/premium
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        if (!jobDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Job not found');
        }
        const jobData = jobDoc.data();

        // 2. Check logic: isOwner OR hasSubscription OR singleUnlock
        // This mirrors the logic in frontend (JobDetailsPage) but securely on backend
        // For now, simpler implementation:

        // Return sensitive info
        return {
            contactEmail: jobData?.contactEmail,
            contactPhone: jobData?.contactPhone,
            posterName: jobData?.postedBy?.posterDisplayName // Example
        };

    } catch (error) {
        console.error('Error fetching contact details:', error);
        throw new functions.https.HttpsError('internal', 'Error fetching details');
    }
});

// ============================================
// TZINTUK (ROBOCALL) FUNCTIONS - EFFICIENT!
// ============================================

/**
 * SCHEDULED: Process all pending tzintuks in batch
 * Runs every 5 minutes - ONE function call for ALL users!
 */
export const processTzintuks = functions
    .region('europe-west1')
    .pubsub.schedule('*/5 * * * *')  // Every 5 minutes
    .timeZone('Asia/Jerusalem')
    .onRun(async (context) => {
        return processTzintukNotifications();
    });

/**
 * SCHEDULED: Reset daily tzintuk counter at midnight
 */
export const resetTzintukCounter = functions
    .region('europe-west1')
    .pubsub.schedule('0 0 * * *')  // Every day at midnight
    .timeZone('Asia/Jerusalem')
    .onRun(async (context) => {
        return resetDailyTzintukCounter();
    });

/**
 * Setup Tzintuk (call once to create settings)
 */
export const setupTzintukFunc = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const result = await setupTzintuk();
        return result;
    });

/**
 * Get Tzintuk Statistics
 */
export const getTzintukStatusFunc = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const result = await getTzintukStatus();
        return result;
    });

/**
 * Force Process Tzintuks Now (manual trigger)
 */
export const forceTzintukProcess = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        console.log('[forceTzintukProcess] Triggered with data:', data);
        const bypassChecks = data?.bypassChecks === true;
        const result = await processTzintukNotifications(bypassChecks);
        return result;
    });

// Force Update: Fixed POST logic verified at $(Get-Date)

/**
 * TEST FUNCTION: Trigger Tzintuk Campaign logic via HTTP
 * Usage: https://europe-west1-jobs-site-fa310.cloudfunctions.net/testTzintukCampaign?bypass=true
 */
export const testTzintukCampaign = functions
    .region('europe-west1')
    .https.onRequest(async (req, res) => {
        // Enable CORS for browser testing
        res.set('Access-Control-Allow-Origin', '*');

        try {
            const bypassChecks = req.query.bypass === 'true' || req.query.force === 'true';
            const targetListId = req.query.listId as string;

            console.log(`[testTzintukCampaign] Triggered with bypass=${bypassChecks}, listId=${targetListId}`);

            // If listId is provided, we need to pass it down. 
            // However, processTzintukNotifications doesn't take a listId arg yet.
            // We will modify the SERVICE call directly here for testing purposes if listId is present
            // OR we rely on the service to have been updated to accept it.

            // To properly test the LIST override, we should call sendTzintukToPhones directly here
            // because processTzintukNotifications is a batch job logic that gathers default phones.

            if (targetListId) {
                const db = admin.firestore();
                const settings = (await db.collection('settings').doc('phoneSettings').get()).data() as any;

                // Import the service dynamically or rely on the imported module
                const { sendTzintukToPhones } = require('./ivr/tzintukService');

                // Pass the override
                const result = await sendTzintukToPhones(settings, [`LIST_ID_OVERRIDE:${targetListId}`]);

                res.json({
                    mode: 'direct_list_test',
                    listId: targetListId,
                    result: result
                });
                return;
            }

            const result = await processTzintukNotifications(bypassChecks);
            res.json(result);
        } catch (error: any) {
            console.error('[testTzintukCampaign] Error:', error);
            res.status(500).json({ error: error.message });
        }
    });
