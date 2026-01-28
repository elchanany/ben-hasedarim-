/**
 * Main Menu Handler
 * 
 * Handles the main IVR menu with 4 options:
 * 1. Listen to jobs
 * 2. Post a job
 * 3. Subscribe to alerts (tzintuk)
 * 4. Contact us / Leave message
 */

import { Call } from 'yemot-router2';
import { handleJobsList } from './jobsList';
import { handlePostJob } from './postJob';
import { handleSubscribe } from './subscribe';
import { handleContact } from './contact';
import { handleUnsubscribe } from './unsubscribe';
import { AUDIO_FILES, audioFile } from '../audioFiles';

export async function handleMainMenu(call: Call): Promise<any> {
    console.log('[IVR] ========================================');
    console.log('[IVR] ENTERING MAIN MENU');
    console.log('[IVR] ========================================');
    console.log(`[IVR] Call Details:`);
    console.log(`[IVR]   - ApiCallId: ${call.ApiCallId}`);
    console.log(`[IVR]   - ApiDID: ${call.ApiDID}`);
    console.log(`[IVR]   - ApiPhone: ${call.ApiPhone || 'N/A'}`);
    console.log(`[IVR]   - ApiExtension: ${call.ApiExtension || 'N/A'}`);

    try {
        console.log('[IVR] Playing welcome message and menu options...');

        const choice = await call.read(
            [
                audioFile(AUDIO_FILES.WELCOME),
                audioFile(AUDIO_FILES.MAIN_MENU_OPTIONS),
                audioFile(AUDIO_FILES.UNSUBSCRIBE_PROMPT)
            ],
            'tap',
            {
                val_name: 'menu_choice',
                max_digits: 1
            }
        );

        console.log(`[IVR] User selected option: "${choice}"`);

        switch (choice) {
            case '1':
                console.log('[IVR] Routing to: Jobs List Handler');
                return handleJobsList(call);

            case '2':
                console.log('[IVR] Routing to: Post Job Handler');
                return handlePostJob(call);

            case '3':
                console.log('[IVR] Routing to: Subscribe to Alerts Handler');
                return handleSubscribe(call);

            case '4':
                console.log('[IVR] Routing to: Contact/Leave Message Handler');
                return handleContact(call);

            case '9':
                console.log('[IVR] Routing to: Unsubscribe Handler');
                return handleUnsubscribe(call);

            default:
                console.log(`[IVR] Invalid choice received: "${choice}"`);
                console.log('[IVR] Playing error message and replaying menu...');

                await call.id_list_message([
                    audioFile(AUDIO_FILES.INVALID_CHOICE_TRY_AGAIN)
                ], { prependToNextAction: true });

                return handleMainMenu(call);
        }
    } catch (error) {
        console.error('[IVR] ========================================');
        console.error('[IVR] ERROR IN MAIN MENU');
        console.error('[IVR] ========================================');
        console.error('[IVR] Error type:', (error as Error).name);
        console.error('[IVR] Error message:', (error as Error).message);
        console.error('[IVR] Error stack:', (error as Error).stack);
        console.error('[IVR] Call details at error:', {
            ApiCallId: call.ApiCallId,
            ApiDID: call.ApiDID,
            ApiPhone: call.ApiPhone
        });

        // Try to play error message before throwing
        try {
            await call.id_list_message([
                audioFile(AUDIO_FILES.SYSTEM_ERROR_TRY_LATER)
            ]);
        } catch (msgError) {
            console.error('[IVR] Failed to play error message:', msgError);
        }

        throw error;
    }
}
