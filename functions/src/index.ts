
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import { PayPalClient } from './paypal';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

admin.initializeApp();
const db = admin.firestore();

// CORS handler is handled automatically by onCall, but we keep imports if needed for other things.

// Valid plans and their prices
const PLANS = {
    POST_JOB: { price: '10.00', description: 'פרסום משרה חדשה' },
    VIEW_SINGLE: { price: '5.00', description: 'חשיפת פרטי קשר למשרה' },
    VIEW_SUBSCRIPTION: { price: '15.00', description: 'מנוי חודשי לצפייה במשרות' },
};

export const createPaymentOrder = functions.https.onCall(async (data, context) => {
    // 1. Verify Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const userId = context.auth.uid;

    // 2. Parse Request Body
    const { type, jobId } = data; // type: 'POST_JOB' | 'VIEW_SINGLE' | 'VIEW_SUBSCRIPTION'

    if (!type || !PLANS[type as keyof typeof PLANS]) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid payment type');
    }

    const plan = PLANS[type as keyof typeof PLANS];
    const paypal = new PayPalClient();

    try {
        // 3. Create Order
        const order = await paypal.createOrder(plan.price, plan.description);

        // 4. Return Order ID to Client
        return {
            orderId: order.id,
            userId: userId,
            planType: type,
            jobId: jobId // Passed back for tracking
        };
    } catch (error: any) {
        console.error('Error creating payment order:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Internal Server Error');
    }
});

export const capturePaymentOrder = functions.https.onCall(async (data, context) => {
    // 1. Verify Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const userId = context.auth.uid;

    // 2. Parse Request
    const { orderId, type, jobId } = data;

    if (!orderId || !type) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or payment type');
    }

    const paypal = new PayPalClient();

    try {
        // 3. Capture Order
        const captureData = await paypal.captureOrder(orderId);

        if (captureData.status !== 'COMPLETED') {
            throw new functions.https.HttpsError('aborted', 'Payment not completed', { details: captureData });
        }

        // 4. Fulfill Order (Update Database)
        const now = admin.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();

        if (type === 'POST_JOB') {
            if (!jobId) {
                throw new functions.https.HttpsError('invalid-argument', 'Missing jobId for POST_JOB');
            }
            const jobRef = db.collection('jobs').doc(jobId);
            batch.update(jobRef, {
                isPosted: true, // Make active
                paymentStatus: 'paid',
                paymentDetails: {
                    orderId: orderId,
                    amount: PLANS.POST_JOB.price,
                    paidAt: now,
                    userId: userId
                }
            });
        }
        else if (type === 'VIEW_SINGLE') {
            if (!jobId) {
                throw new functions.https.HttpsError('invalid-argument', 'Missing jobId for VIEW_SINGLE');
            }
            const userRef = db.collection('users').doc(userId);
            batch.update(userRef, {
                unlockedJobs: admin.firestore.FieldValue.arrayUnion(jobId)
            });
        }
        else if (type === 'VIEW_SUBSCRIPTION') {
            const userRef = db.collection('users').doc(userId);
            // Calculate expiry (30 days from now)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            batch.update(userRef, {
                subscription: {
                    isActive: true,
                    expiresAt: admin.firestore.Timestamp.fromDate(expiryDate),
                    plan: 'monthly',
                    startedAt: now,
                    lastPaymentId: orderId
                }
            });
        }

        await batch.commit();

        return { success: true, captureId: captureData.id, status: 'COMPLETED' };

    } catch (error: any) {
        console.error('Error capturing payment order:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Internal Server Error');
    }
});

// Secure callable to get contact details (phone/email) only if allowed
export const getSecureContactDetails = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = context.auth.uid;
    const { jobId, jobPosterId } = data;

    if (!jobId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing Job ID');
    }

    // 1. Check if User is Admin
    const userSnap = await db.collection('users').doc(userId).get();
    const userData = userSnap.data();

    if (userData?.role === 'admin' || userData?.role === 'super_admin') {
        // Admin gets access, fetch job/poster details
        return await fetchContactInfo(jobId, jobPosterId);
    }

    // 2. Check if User is Owner
    const jobRef = db.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
    }
    const jobData = jobSnap.data();
    if (jobData?.postedBy?.id === userId) {
        return await fetchContactInfo(jobId, jobPosterId);
    }

    // 3. Check Payment Settings
    const configSnap = await db.collection('config').doc('paymentSettings').get();
    const settings = configSnap.data();
    const isViewerPaymentEnabled = settings?.enableViewerPayment && settings?.masterSwitch;

    // If payment disabled, return info freely
    if (!isViewerPaymentEnabled) {
        return await fetchContactInfo(jobId, jobPosterId);
    }

    // 4. Check Subscription
    if (userData?.subscription?.isActive) {
        const expiry = userData.subscription.expiresAt.toDate();
        if (expiry > new Date()) {
            return await fetchContactInfo(jobId, jobPosterId);
        }
    }

    // 5. Check Single Unlock
    if (userData?.unlockedJobs && userData.unlockedJobs.includes(jobId)) {
        return await fetchContactInfo(jobId, jobPosterId);
    }

    // If we got here, access denied
    throw new functions.https.HttpsError('permission-denied', 'Payment required to view contact details');
});

async function fetchContactInfo(jobId: string, jobPosterId: string) {
    // If contact is in job doc
    const jobSnap = await db.collection('jobs').doc(jobId).get();
    const jobData = jobSnap.data();

    // Sometimes contact info is on the user profile of the poster
    // But usually in this app it seems to be in the job object (contactEmail, contactPhone)
    // We return what is normally hidden.

    // Also fetch poster name if privacy is on
    return {
        contactEmail: jobData?.contactEmail || null,
        contactPhone: jobData?.contactPhone || null,
        posterName: jobData?.postedBy?.posterDisplayName || "מפרסם"
    };
}
