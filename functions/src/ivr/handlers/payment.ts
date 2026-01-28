/**
 * Payment Handler
 * 
 * Handles payment flow for both posters and viewers
 * Integrates with Yemot HaMashiach payment system
 */

import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { AUDIO_FILES, audioFile, numberMsg } from '../audioFiles';

interface PaymentSettings {
    masterSwitch: boolean;
    enablePosterPayment: boolean;
    enableViewerPayment: boolean;
    postJobPrice: number;
    subscriptionPrice: number;
    singleContactPrice: number;
}

/**
 * Handle payment for job posters
 * @returns true if payment successful or not required, false if cancelled
 */
export async function handlePosterPayment(call: Call): Promise<boolean> {
    console.log('[IVR] ===== POSTER PAYMENT FLOW =====');

    const settings = await getPaymentSettings();

    if (!settings.masterSwitch || !settings.enablePosterPayment) {
        console.log('[IVR] Poster payment disabled, allowing posting without payment');
        return true;
    }

    console.log(`[IVR] Poster payment required: ${settings.postJobPrice} NIS`);

    // Show payment intro and price
    await call.id_list_message([
        audioFile(AUDIO_FILES.PAYMENT_INTRO_POSTER),
        audioFile(AUDIO_FILES.POST_JOB_PRICE_DETAILS),
        numberMsg(settings.postJobPrice),
        audioFile(AUDIO_FILES.SHEKELS),
        audioFile(AUDIO_FILES.POST_PAYMENT_BENEFITS)
    ], { prependToNextAction: true });

    const choice = await call.read(
        [
            audioFile(AUDIO_FILES.TO_CONTINUE_PAYMENT_PRESS_1),
            audioFile(AUDIO_FILES.TO_CANCEL_PRESS_2)
        ],
        'tap',
        { val_name: 'payment_choice', max_digits: 1 }
    );

    if (choice === '2') {
        console.log('[IVR] User cancelled payment');
        await call.id_list_message([
            audioFile(AUDIO_FILES.PAYMENT_CANCELLED_BY_USER)
        ], { prependToNextAction: true });
        return false;
    }

    // Process payment
    const paymentResult = await processYemotPayment(call, settings.postJobPrice);

    if (paymentResult.success) {
        console.log('[IVR] Payment successful');
        await call.id_list_message([
            audioFile(AUDIO_FILES.PAYMENT_SUCCESSFUL_POSTER)
        ], { prependToNextAction: true });
        return true;
    } else {
        console.log('[IVR] Payment failed');
        await call.id_list_message([
            audioFile(AUDIO_FILES.PAYMENT_FAILED)
        ]);
        return false;
    }
}

/**
 * Handle payment for job viewers
 * @returns 'subscription' | 'single' | 'cancelled'
 */
export async function handleViewerPayment(
    call: Call,
    jobId: string
): Promise<'subscription' | 'single' | 'cancelled'> {
    console.log('[IVR] ===== VIEWER PAYMENT FLOW =====');
    console.log(`[IVR] Job ID: ${jobId}`);

    const settings = await getPaymentSettings();

    if (!settings.masterSwitch || !settings.enableViewerPayment) {
        console.log('[IVR] Viewer payment disabled, allowing access');
        return 'subscription';
    }

    // Check if user already has access
    const hasAccess = await checkUserAccess(call.ApiPhone || '', jobId);
    if (hasAccess) {
        console.log('[IVR] User already has access');
        return 'subscription';
    }

    console.log('[IVR] Payment required for contact details');

    // Show payment options
    await call.id_list_message([
        audioFile(AUDIO_FILES.PAYMENT_INTRO_VIEWER),
        audioFile(AUDIO_FILES.SUBSCRIPTION_OPTION_FULL),
        numberMsg(settings.subscriptionPrice),
        audioFile(AUDIO_FILES.SHEKELS_PER_MONTH),
        audioFile(AUDIO_FILES.SINGLE_PAYMENT_OPTION_FULL),
        numberMsg(settings.singleContactPrice),
        audioFile(AUDIO_FILES.SHEKELS)
    ], { prependToNextAction: true });

    const choice = await call.read(
        [audioFile(AUDIO_FILES.PAYMENT_CHOICE_PROMPT)],
        'tap',
        { val_name: 'payment_type', max_digits: 1 }
    );

    if (choice === '*') {
        console.log('[IVR] User cancelled payment');
        return 'cancelled';
    }

    const amount = choice === '1' ? settings.subscriptionPrice : settings.singleContactPrice;
    const type = choice === '1' ? 'subscription' : 'single';

    console.log(`[IVR] User chose: ${type}, amount: ${amount} NIS`);

    // Process payment
    const paymentResult = await processYemotPayment(call, amount);

    if (paymentResult.success) {
        console.log('[IVR] Payment successful');
        await call.id_list_message([
            audioFile(AUDIO_FILES.PAYMENT_SUCCESSFUL_VIEWER)
        ], { prependToNextAction: true });

        // Save payment record
        await savePaymentRecord(call.ApiPhone || '', jobId, type, amount);

        return type as 'subscription' | 'single';
    } else {
        console.log('[IVR] Payment failed');
        await call.id_list_message([
            audioFile(AUDIO_FILES.PAYMENT_FAILED)
        ]);
        return 'cancelled';
    }
}

async function getPaymentSettings(): Promise<PaymentSettings> {
    try {
        const db = admin.firestore();
        const doc = await db.collection('config').doc('paymentSettings').get();

        if (!doc.exists) {
            console.log('[IVR] Payment settings not found, using defaults');
            return {
                masterSwitch: false,
                enablePosterPayment: false,
                enableViewerPayment: false,
                postJobPrice: 10,
                subscriptionPrice: 15,
                singleContactPrice: 5
            };
        }

        const data = doc.data() as PaymentSettings;
        console.log('[IVR] Payment settings loaded:', data);
        return data;

    } catch (error) {
        console.error('[IVR] Error loading payment settings:', error);
        return {
            masterSwitch: false,
            enablePosterPayment: false,
            enableViewerPayment: false,
            postJobPrice: 10,
            subscriptionPrice: 15,
            singleContactPrice: 5
        };
    }
}

async function processYemotPayment(call: Call, amount: number): Promise<{ success: boolean }> {
    console.log(`[IVR] === Processing Yemot Payment: ${amount} NIS ===`);

    try {
        // Play instructions
        await call.id_list_message([
            audioFile(AUDIO_FILES.PAYMENT_INSTRUCTIONS)
        ], { prependToNextAction: true });

        // TODO: Integrate with actual Yemot payment API
        // For now, simulate payment processing
        // In production, this would call Yemot's payment endpoint

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // For testing, always return success
        // In production, check actual payment result
        console.log('[IVR] Payment processed (simulated success)');
        return { success: true };

    } catch (error) {
        console.error('[IVR] Error processing payment:', error);
        return { success: false };
    }
}

async function checkUserAccess(phone: string, jobId: string): Promise<boolean> {
    if (!phone) return false;

    try {
        const db = admin.firestore();
        const userQuery = await db.collection('users')
            .where('phoneNumber', '==', phone)
            .limit(1)
            .get();

        if (userQuery.empty) {
            console.log(`[IVR] No user found for phone: ${phone}`);
            return false;
        }

        const userData = userQuery.docs[0].data();

        // Check subscription
        if (userData.subscription?.active) {
            const expiresAt = new Date(userData.subscription.expiresAt);
            if (expiresAt > new Date()) {
                console.log('[IVR] User has active subscription');
                return true;
            }
        }

        // Check unlocked jobs
        if (userData.unlockedJobs?.includes(jobId)) {
            console.log(`[IVR] User has unlocked job: ${jobId}`);
            return true;
        }

        console.log('[IVR] User has no access');
        return false;

    } catch (error) {
        console.error('[IVR] Error checking user access:', error);
        return false;
    }
}

async function savePaymentRecord(
    phone: string,
    jobId: string,
    type: 'subscription' | 'single',
    amount: number
): Promise<void> {
    if (!phone) {
        console.error('[IVR] Cannot save payment record: no phone number');
        return;
    }

    try {
        const db = admin.firestore();
        const userQuery = await db.collection('users')
            .where('phoneNumber', '==', phone)
            .limit(1)
            .get();

        if (userQuery.empty) {
            console.error(`[IVR] User not found for payment record: ${phone}`);
            return;
        }

        const userRef = userQuery.docs[0].ref;

        if (type === 'subscription') {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

            await userRef.update({
                subscription: {
                    active: true,
                    startedAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: expiresAt.toISOString()
                }
            });

            console.log(`[IVR] Subscription saved for user: ${phone}, expires: ${expiresAt.toISOString()}`);

        } else {
            await userRef.update({
                unlockedJobs: admin.firestore.FieldValue.arrayUnion(jobId)
            });

            console.log(`[IVR] Job ${jobId} unlocked for user: ${phone}`);
        }

        // Save transaction record
        await db.collection('paymentTransactions').add({
            phone,
            jobId: type === 'single' ? jobId : null,
            type,
            amount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            source: 'phone-ivr'
        });

        console.log(`[IVR] Payment transaction recorded: ${type}, ${amount} NIS`);

    } catch (error) {
        console.error('[IVR] Error saving payment record:', error);
        console.error('[IVR] Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
        });
    }
}
