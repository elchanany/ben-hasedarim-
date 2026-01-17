/**
 * Yemot HaMashiach IVR Router
 * 
 * Main router for handling phone calls via Yemot HaMashiach API.
 * Uses yemot-router2 for easier Express-like routing.
 */

import { YemotRouter, Call } from 'yemot-router2';
import { handleMainMenu } from './handlers/mainMenu';
import { handleJobsList } from './handlers/jobsList';
import { handlePostJob } from './handlers/postJob';
import { handleSubscribe } from './handlers/subscribe';
import { handleContact } from './handlers/contact';

// // import { FirestoreCallSession } from './firestoreSession';

// const sessionStore = new FirestoreCallSession();

// Create the router (YemotRouter is a factory function, not a class)
const yemotRouter = YemotRouter({
    timeout: 5 * 60 * 1000, // 5 minutes
    printLog: true,
    // store: sessionStore, // Add persistence
    defaults: {
        removeInvalidChars: true,
        id_list_message: {
            prependToNextAction: false,
            removeInvalidChars: true
        },
        read: {
            tap: {},
            stt: {},
            record: {}
        }
    },
    uncaughtErrorHandler: async (error: Error, call: Call) => {
        console.error('=== UNCAUGHT ERROR IN IVR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Call ID:', call.ApiCallId);
        console.error('Extension:', call.ApiExtension);
        console.error('Phone:', call.ApiPhone);
        console.error('=============================');

        // Using clean text without special characters just in case
        await call.id_list_message([{ type: 'text', data: 'אירעה תקלה במערכת אנא נסו שוב מאוחר יותר' }]);
        // Don't hangup here manually, let the router handle it or user hangup
    }
} as any);

// Main entry point - when call comes in
yemotRouter.all('/', async (call: Call) => {
    return handleMainMenu(call);
});

// Jobs list and filtering
yemotRouter.all('/jobs', async (call: Call) => {
    return handleJobsList(call);
});

// Post a new job
yemotRouter.all('/post', async (call: Call) => {
    return handlePostJob(call);
});

// Subscribe to job alerts (tzintuk)
yemotRouter.all('/subscribe', async (call: Call) => {
    return handleSubscribe(call);
});

// Contact us
yemotRouter.all('/contact', async (call: Call) => {
    return handleContact(call);
});

// Export the router middleware for Express
export const router = yemotRouter.asExpressRouter;
