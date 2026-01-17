/**
 * Main Menu Handler
 * 
 * Handles the main IVR menu with 4 options:
 * 1. Listen to jobs
 * 2. Post a job
 * 3. Subscribe to alerts (tzintuk)
 * 4. Contact us
 */

import { Call } from 'yemot-router2';
import { handleJobsList } from './jobsList';
import { handlePostJob } from './postJob';
import { handleSubscribe } from './subscribe';
import { handleContact } from './contact';

const MAIN_MENU_INTRO = 'שלום וברוכים הבאים לקו העבודות של בין הסדרים';
const MAIN_MENU_OPTIONS = 'לשמיעת עבודות חדשות הקש 1. לפרסום עבודה הקש 2. להרשמה לצינתוקים הקש 3. ליצירת קשר הקש 4.';

export async function handleMainMenu(call: Call): Promise<any> {
    console.log('[IVR] Entering handleMainMenu');
    try {
        const choice = await call.read(
            [
                { type: 'text', data: MAIN_MENU_INTRO },
                { type: 'text', data: MAIN_MENU_OPTIONS }
            ],
            'tap',
            {
                val_name: 'menu_choice',
                max_digits: 1
            }
        );

        console.log(`[IVR] Main menu choice: ${choice}`);

        switch (choice) {
            case '1':
                return handleJobsList(call);
            case '2':
                return handlePostJob(call);
            case '3':
                return handleSubscribe(call);
            case '4':
                return handleContact(call);
            default:
                // Invalid choice - replay menu
                await call.id_list_message([
                    { type: 'text', data: 'בחירה לא תקינה.' }
                ]);
                return handleMainMenu(call);
        }
    } catch (error) {
        console.error('[IVR] Error in main menu:', error);
        throw error;
    }
}
