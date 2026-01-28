
import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { handleMainMenu } from './mainMenu';
import { AUDIO_FILES, audioFile } from '../audioFiles';

const TZINTUK_COLLECTION = 'tzintukSubscriptions';

export async function handleUnsubscribe(call: Call): Promise<any> {
    console.log('[IVR] ===== UNSUBSCRIBE HANDLER =====');

    const callerPhone = call.ApiPhone || '';
    if (!callerPhone) {
        console.log('[IVR] No phone number detected');
        return handleMainMenu(call);
    }

    try {
        const db = admin.firestore();
        const subQuery = await db.collection(TZINTUK_COLLECTION)
            .where('phone', '==', callerPhone)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (subQuery.empty) {
            console.log('[IVR] User not subscribed or already inactive');
            await call.id_list_message([
                audioFile(AUDIO_FILES.NOT_SUBSCRIBED)
            ]);
            return handleMainMenu(call);
        }

        const subDoc = subQuery.docs[0];

        // Play menu: 1=Perm, 2=Month, 3=Week, *=Return
        const choice = await call.read(
            [audioFile(AUDIO_FILES.UNSUBSCRIBE_MENU)],
            'tap',
            { val_name: 'unsubscribe_action', max_digits: 1 }
        );

        console.log(`[IVR] Unsubscribe choice: ${choice}`);

        const now = admin.firestore.Timestamp.now();

        if (choice === '1') {
            // Permanent unsubscribe
            await subDoc.ref.update({
                isActive: false,
                unsubscribedAt: now,
                unsubscribeReason: 'user_request_ivr'
            });
            await call.id_list_message([
                audioFile(AUDIO_FILES.UNSUBSCRIBED_SUCCESSFULLY)
            ]);
        }
        else if (choice === '2') {
            // Pause for 1 month
            const pauseUntil = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await subDoc.ref.update({ pauseUntil });
            await call.id_list_message([
                audioFile(AUDIO_FILES.PAUSED_SUCCESSFULLY)
            ]);
        }
        else if (choice === '3') {
            // Pause for 1 week
            const pauseUntil = admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await subDoc.ref.update({ pauseUntil });
            await call.id_list_message([
                audioFile(AUDIO_FILES.PAUSED_SUCCESSFULLY)
            ]);
        }
        else {
            // Cancel / Return
            return handleMainMenu(call);
        }

    } catch (error) {
        console.error('[IVR] Error in unsubscribe handler:', error);
        await call.id_list_message([
            { type: 'text', data: 'שגיאה במערכת, אנא נסו מאוחר יותר.' }
        ]);
    }

    return handleMainMenu(call);
}
