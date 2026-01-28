/**
 * Contact Handler
 * 
 * Handles leaving a voice message for the system administrator
 */

import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { handleMainMenu } from './mainMenu';
import { AUDIO_FILES, audioFile } from '../audioFiles';

export async function handleContact(call: Call): Promise<any> {
    console.log('[IVR] ===== CONTACT/LEAVE MESSAGE =====');
    console.log(`[IVR] Caller phone: ${call.ApiPhone || 'Unknown'}`);

    try {
        const callerPhone = call.ApiPhone || 'Unknown';

        console.log('[IVR] Prompting user to leave voice message...');

        const message = await call.read(
            [audioFile(AUDIO_FILES.LEAVE_MESSAGE_INTRO)],
            'record',
            { val_name: 'voice_message' }
        );

        if (message) {
            console.log(`[IVR] Voice message recorded: ${message}`);

            try {
                const db = admin.firestore();
                const docRef = await db.collection('contactMessages').add({
                    phone: callerPhone,
                    messageRef: message,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    isRead: false,
                    source: 'phone'
                });

                console.log(`[IVR] Message saved to Firestore: ${docRef.id}`);

                await call.id_list_message([
                    audioFile(AUDIO_FILES.MESSAGE_SAVED_THANKS)
                ], { prependToNextAction: true });

            } catch (error) {
                console.error('[IVR] Error saving message to Firestore:', error);
                console.error('[IVR] Error details:', {
                    name: (error as Error).name,
                    message: (error as Error).message,
                    stack: (error as Error).stack
                });

                // Still thank the user even if save failed
                await call.id_list_message([
                    audioFile(AUDIO_FILES.MESSAGE_SAVED_THANKS)
                ], { prependToNextAction: true });
            }
        } else {
            console.log('[IVR] No message recorded');
        }

        console.log('[IVR] Returning to main menu');
        return handleMainMenu(call);

    } catch (error) {
        console.error('[IVR] Error in contact handler:', error);
        console.error('[IVR] Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
        });
        throw error;
    }
}

