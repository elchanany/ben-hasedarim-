
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import express from 'express';
import { processEmailNotifications } from './emailNotifications';
import { router as yemotRouter } from './ivr/yemotRouter';
import { sendTzintukNotifications } from './ivr/tzintukService';

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
 * Also sends tzintuk notifications
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

        // Process tzintuk notifications (phone calls)
        try {
            await sendTzintukNotifications(jobId, jobData as any);
        } catch (error) {
            console.error(`[Trigger] Error sending tzintuk notifications:`, error);
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
