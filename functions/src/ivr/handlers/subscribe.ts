/**
 * Subscribe Handler
 * 
 * Handles subscription to job notifications (tzintuk)
 */

import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { handleMainMenu } from './mainMenu';

const TZINTUK_COLLECTION = 'tzintukSubscriptions';

export async function handleSubscribe(call: Call): Promise<any> {
    const callerPhone = call.ApiPhone || '';

    if (!callerPhone) {
        await call.id_list_message([
            { type: 'text', data: 'לא זוהה מספר טלפון. לא ניתן להירשם.' }
        ]);
        return handleMainMenu(call);
    }

    const db = admin.firestore();

    // Check if already subscribed
    const existingQuery = await db.collection(TZINTUK_COLLECTION)
        .where('phone', '==', callerPhone)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        const subscription = existingQuery.docs[0].data();

        const action = await call.read(
            [
                { type: 'text', data: 'כבר רשום לצינתוקים.' },
                { type: 'text', data: subscription.isActive ? 'הרישום פעיל.' : 'הרישום מושהה.' },
                { type: 'text', data: 'לביטול ההרשמה הקש 9. לחזרה הקש כוכבית.' }
            ],
            'tap',
            { val_name: 'manage_action', max_digits: 1 }
        );

        if (action === '9') {
            await existingQuery.docs[0].ref.delete();
            await call.id_list_message([
                { type: 'text', data: 'ההרשמה בוטלה.' }
            ]);
        }

        return call.go_to_folder('/');
    }

    // New subscription - consent
    const consent = await call.read(
        [
            { type: 'text', data: 'ברוכים הבאים לצינתוקים.' },
            { type: 'text', data: 'תקבל שיחות כשעבודות חדשות מתפרסמות.' },
            { type: 'text', data: 'להמשך והסכמה הקש 1. לביטול הקש 2.' }
        ],
        'tap',
        { val_name: 'consent', max_digits: 1 }
    );

    if (consent !== '1') {
        await call.id_list_message([
            { type: 'text', data: 'בוטל.' }
        ]);
        return handleMainMenu(call);
    }

    // Save subscription
    try {
        await db.collection(TZINTUK_COLLECTION).add({
            phone: callerPhone,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            consentGiven: true,
            consentDate: new Date().toISOString()
        });

        await call.id_list_message([
            { type: 'text', data: 'נרשמת בהצלחה לצינתוקים!' }
        ]);

    } catch (error) {
        console.error('[IVR] Error creating subscription:', error);
        await call.id_list_message([
            { type: 'text', data: 'שגיאה בהרשמה.' }
        ]);
    }

    return handleMainMenu(call);
}
