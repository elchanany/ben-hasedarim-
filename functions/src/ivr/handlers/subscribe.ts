/**
 * Subscribe Handler
 * 
 * Handles subscription to job notifications (tzintuk) with:
 * - Basic subscription (all jobs)
 * - Filtered subscription (by area, salary, age)
 * - Legal notice about cancellation rights
 * - Unsubscribe functionality
 */

import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { handleMainMenu } from './mainMenu';
import { AUDIO_FILES, audioFile } from '../audioFiles';
import { getUserTzintukLists, LIST_NAME_TO_HEBREW, CITY_TO_LIST_MAP } from '../utils/yemotTzintukAPI';

const TZINTUK_COLLECTION = 'tzintukSubscriptions';

interface SubscriptionFilters {
    area?: string;
    minSalary?: number;
    maxSalary?: number;
    minAge?: number;
    maxAge?: number;
}

// Note: SubscriptionData interface moved to type definition for future use
// when we need to strongly type subscription documents

export async function handleSubscribe(call: Call): Promise<any> {
    console.log('[IVR] ===== SUBSCRIBE TO ALERTS HANDLER =====');

    const callerPhone = call.ApiPhone || '';
    console.log(`[IVR] Caller phone: ${callerPhone}`);

    if (!callerPhone) {
        console.log('[IVR] No phone number detected');
        await call.id_list_message([
            { type: 'text', data: 'לא זוהה מספר טלפון. לא ניתן להירשם.' }
        ]);
        return handleMainMenu(call);
    }

    try {
        // Get Yemot API token from settings
        const db = admin.firestore();
        const settingsDoc = await db.collection('settings').doc('phoneSettings').get();

        if (!settingsDoc.exists) {
            console.log('[IVR] No settings found - cannot check subscriptions');
            // Proceed to new subscription anyway
            return handleNewSubscription(call, callerPhone);
        }

        const settings = settingsDoc.data();
        const systemNumber = settings?.yemotSystemNumber?.trim() || '';
        let token = settings?.yemotApiToken?.trim() || '';

        // Construct valid token: number:password
        if (token && !token.includes(':')) {
            token = `${systemNumber}:${token}`;
        }

        if (!token) {
            console.log('[IVR] No Yemot token - cannot check subscriptions');
            return handleNewSubscription(call, callerPhone);
        }

        // Check which tzintuk lists user is subscribed to
        const subscribedLists = await getUserTzintukLists(token, callerPhone);

        if (subscribedLists.length > 0) {
            console.log(`[IVR] User is subscribed to ${subscribedLists.length} lists`);
            return handleExistingSubscription(call, callerPhone, subscribedLists);
        }

        // New subscription flow
        return handleNewSubscription(call, callerPhone);

    } catch (error) {
        console.error('[IVR] Error in subscribe handler:', error);
        console.error('[IVR] Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
        });
        throw error;
    }
}

async function handleExistingSubscription(
    call: Call,
    callerPhone: string,
    subscribedLists: string[]
): Promise<any> {
    console.log('[IVR] === Handling Existing Subscription ===');
    console.log(`[IVR] User is subscribed to: ${subscribedLists.join(', ')}`);

    try {
        // Build TTS message announcing subscriptions
        const listNames = subscribedLists
            .map(listName => LIST_NAME_TO_HEBREW[listName] || listName)
            .join(', ');

        const message = `יש לך הרשמה פעילה לקבלת צינתוקים על עבודות ב: ${listNames}.`;

        // Announce existing subscriptions + offer options
        await call.id_list_message([
            { type: 'text', data: message },
            audioFile(AUDIO_FILES.UNSUBSCRIBE_MENU) // wav.099 "להסרה מהרשימה לחץ 2..."
        ]);

        const action = await call.read(
            [],
            'tap',
            { val_name: 'manage_action', max_digits: 1 }
        );

        console.log(`[IVR] User action: ${action}`);

        if (action === '2') {
            // User wants to unsubscribe
            // Confirm
            const confirmUnsubscribe = await call.read(
                [audioFile(AUDIO_FILES.UNSUBSCRIBE_PROMPT)], // wav.100 "לאישור להסרה לחץ 1"
                'tap',
                { val_name: 'confirm_unsubscribe', max_digits: 1 }
            );

            if (confirmUnsubscribe === '1') {
                console.log('[IVR] Transferring to unsubscribe - user will be forwarded to Yemot list');

                // Transfer to the FIRST list they're subscribed to (Yemot will let them unsubscribe)
                const firstList = subscribedLists[0];
                const extension = Object.keys(CITY_TO_LIST_MAP).find(
                    key => CITY_TO_LIST_MAP[key] === firstList
                );

                if (extension) {
                    console.log(`[IVR] Transferring to /3/${extension} for unsubscribe`);
                    return call.go_to_folder(`/3/${extension}`);
                } else {
                    // Fallback: just tell them the list name
                    await call.id_list_message([
                        { type: 'text', data: `להסרה מרשימת ${LIST_NAME_TO_HEBREW[firstList]}, אנא התקשר שוב ובחר את העיר המתאימה.` }
                    ]);
                }
            } else {
                console.log('[IVR] Unsubscribe cancelled');
            }
        }
    } catch (error) {
        console.log('[IVR] Error or timeout in existing subscription menu:', error);
    }

    return handleMainMenu(call);
}

async function handleNewSubscription(call: Call, callerPhone: string): Promise<any> {
    console.log('[IVR] === New Subscription Flow ===');

    // Show intro and get subscription type choice
    // Options: 1=all jobs, 2=filtered, 3=all+night
    const subscriptionType = await call.read(
        [audioFile(AUDIO_FILES.ALERTS_SUBSCRIBE_OPTIONS)],
        'tap',
        { val_name: 'subscription_type', max_digits: 1 }
    );

    console.log(`[IVR] Subscription type choice: ${subscriptionType}`);

    if (subscriptionType === '*') {
        console.log('[IVR] User cancelled subscription');
        return handleMainMenu(call);
    }

    // OPTION 1: Transfer immediately to Yemot's tzintuk extension for simple registration
    if (subscriptionType === '1') {
        console.log('[IVR] User chose option 1 - transferring directly to Yemot /3/1');
        return call.go_to_folder('/3/1');
    }

    // OPTION 5: Transfer immediately to test list (for testing multiple lists)
    if (subscriptionType === '5') {
        console.log('[IVR] User chose option 5 - transferring directly to Yemot /3/5 (test_list_2)');
        return call.go_to_folder('/3/5');
    }

    let filters: SubscriptionFilters = {};
    let allowNightTzintuk = false;

    if (subscriptionType === '3') {
        // All jobs + night mode
        console.log('[IVR] User chose all jobs + night mode');
        allowNightTzintuk = true;
    } else if (subscriptionType === '2') {
        // Filtered subscription
        console.log('[IVR] User chose filtered subscription');
        filters = await collectSubscriptionFilters(call);
        console.log('[IVR] Filters collected:', filters);

        // Ask if they also want night mode for filtered subscription
        try {
            const nightChoice = await call.read(
                [audioFile(AUDIO_FILES.NIGHT_MODE_QUESTION)],
                'tap',
                { val_name: 'night_mode', max_digits: 1 }
            );

            if (nightChoice === '1') {
                allowNightTzintuk = true;
                console.log('[IVR] User opted in for night tzintuk on filtered subscription');
            } else if (nightChoice === '*') {
                console.log('[IVR] User cancelled, returning to main menu');
                return handleMainMenu(call);
            }
        } catch (e) {
            console.log('[IVR] Night mode question skipped/timeout');
        }
    }
    // Option 1: regular subscription (no filters, no night)

    // Save subscription
    try {
        const db = admin.firestore();
        await db.collection(TZINTUK_COLLECTION).add({
            phone: callerPhone,
            isActive: true,
            filters: filters,
            hasFilters: subscriptionType === '2',
            allowNightTzintuk: allowNightTzintuk,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            consentGiven: true,
            consentDate: new Date().toISOString()
        });


        console.log('[IVR] Subscription saved successfully');

        // NOTE: Users are added to the Yemot tzintuk list via a DEDICATED IVR EXTENSION (type=tzintuk)
        // They need to call extension 3 of Yemot DIRECTLY (not through our system).
        // This saves their preferences in Firestore for filtering.

        // Play appropriate success message
        let successMessage: string = AUDIO_FILES.ALERTS_SUBSCRIBED;
        if (subscriptionType === '2') {
            successMessage = AUDIO_FILES.ALERTS_SUBSCRIBED_FILTERED;
        } else if (allowNightTzintuk) {
            successMessage = AUDIO_FILES.NIGHT_MODE_ENABLED;
        }

        await call.id_list_message([
            audioFile(successMessage),
            audioFile(AUDIO_FILES.ALERTS_LEGAL_NOTICE)
        ]);

        // Transfer to Yemot's native tzintuk extension for FREE self-registration
        // The user will hear Yemot's prompt and press 1 to confirm joining the list
        console.log('[IVR] Transferring call to Yemot extension /3 for tzintuk registration');

        await call.id_list_message([
            { type: 'text', data: 'כעת תועברו להרשמה סופית. לחצו 1 לאישור ההרשמה.' }
        ]);

        // Transfer to the tzintuk extension (configured in Yemot as type=tzintuk, list_tzintuk=test_tzintuk)
        return call.go_to_folder('/3');

    } catch (error) {
        console.error('[IVR] Error saving subscription:', error);
        await call.id_list_message([
            { type: 'text', data: 'שגיאה בהרשמה, אנא נסו שוב.' }
        ]);
        return handleMainMenu(call);
    }
}

async function collectSubscriptionFilters(call: Call): Promise<SubscriptionFilters> {
    console.log('[IVR] === Collecting Subscription Filters ===');

    const filterChoice = await call.read(
        [audioFile(AUDIO_FILES.ALERTS_FILTER_OPTIONS)],
        'tap',
        { val_name: 'filter_type', max_digits: 1 }
    );

    console.log(`[IVR] Filter type: ${filterChoice}`);

    const filters: SubscriptionFilters = {};

    // Reuse the same filter collection functions from jobsList
    // For simplicity, we'll implement basic versions here

    if (filterChoice === '1') {
        // Area filter
        const areaInput = await call.read(
            [audioFile(AUDIO_FILES.AREA_OPTIONS)],
            'tap',
            { val_name: 'alert_area', max_digits: 1 }
        );

        const areas = ['ירושלים', 'בני ברק', 'אשדוד', 'מודיעין עילית', 'ביתר עילית', 'אלעד', 'צפת', 'פתח תקווה', 'חיפה'];
        const areaIndex = parseInt(areaInput) - 1;
        if (areaIndex >= 0 && areaIndex < areas.length) {
            filters.area = areas[areaIndex];
        }

        console.log(`[IVR] Area filter: ${filters.area}`);
    }

    if (filterChoice === '2') {
        // Salary filter
        const minSalary = await call.read(
            [audioFile(AUDIO_FILES.ENTER_MIN_SALARY)],
            'tap',
            { val_name: 'alert_min_salary', block_asterisk_key: false }
        );

        const maxSalary = await call.read(
            [audioFile(AUDIO_FILES.ENTER_MAX_SALARY)],
            'tap',
            { val_name: 'alert_max_salary', block_asterisk_key: false }
        );

        filters.minSalary = parseInt(minSalary) || undefined;
        filters.maxSalary = parseInt(maxSalary) || undefined;

        console.log(`[IVR] Salary filter: ${filters.minSalary}-${filters.maxSalary}`);
    }

    if (filterChoice === '3') {
        // Age filter
        const minAge = await call.read(
            [audioFile(AUDIO_FILES.ENTER_MIN_AGE)],
            'tap',
            { val_name: 'alert_min_age', block_asterisk_key: false }
        );

        const maxAge = await call.read(
            [audioFile(AUDIO_FILES.ENTER_MAX_AGE)],
            'tap',
            { val_name: 'alert_max_age', block_asterisk_key: false }
        );

        filters.minAge = parseInt(minAge) || undefined;
        filters.maxAge = parseInt(maxAge) || undefined;

        console.log(`[IVR] Age filter: ${filters.minAge}-${filters.maxAge}`);
    }

    return filters;
}
