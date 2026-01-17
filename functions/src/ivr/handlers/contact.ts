/**
 * Contact Handler
 * 
 * Handles contact options
 */

import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { handleMainMenu } from './mainMenu';

export async function handleContact(call: Call): Promise<any> {
    const choice = await call.read(
        [
            { type: 'text', data: 'יצירת קשר.' },
            { type: 'text', data: 'להשארת הודעה קולית הקש 1. לשמיעת פרטי יצירת קשר הקש 2. לחזרה הקש כוכבית.' }
        ],
        'tap',
        { val_name: 'contact_choice', max_digits: 1 }
    );

    if (choice === '1') {
        // Leave voice message
        const callerPhone = call.ApiPhone || 'לא ידוע';

        const message = await call.read(
            [{ type: 'text', data: 'השאר הודעה לאחר הצפצוף. לסיום הקש סולמית.' }],
            'record',
            { val_name: 'voice_message' }
        );

        if (message) {
            try {
                const db = admin.firestore();
                await db.collection('contactMessages').add({
                    phone: callerPhone,
                    messageRef: message,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    isRead: false,
                    source: 'phone'
                });

                await call.id_list_message([
                    { type: 'text', data: 'ההודעה נשמרה. נחזור אליך בהקדם.' }
                ]);
            } catch (error) {
                console.error('[IVR] Error saving message:', error);
            }
        }

    } else if (choice === '2') {
        await call.id_list_message([
            { type: 'text', data: 'פרטי יצירת קשר.' },
            { type: 'text', data: 'אתר האינטרנט: בין הסדרים נקודה קום.' }
        ]);
    }

    return handleMainMenu(call);
}
