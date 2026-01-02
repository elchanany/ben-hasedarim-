
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { app, db } from '../lib/firebase';

const functions = getFunctions(app, 'us-central1'); // Region might need adjustment based on where you deploy

interface CreateOrderResponse {
    orderId: string;
    userId: string;
    planType: string;
}

interface CaptureOrderResponse {
    success: boolean;
    status: string;
    captureId: string;
}

export const paymentService = {
    /**
     * Calls the backend to create a PayPal order
     */
    createOrder: async (type: 'POST_JOB' | 'VIEW_SINGLE' | 'VIEW_SUBSCRIPTION', jobId?: string): Promise<string> => {
        try {
            // Direct HTTP call or Callable? Implementation plan said Callable but function code used onRequest
            // If using onRequest, we use fetch. If onCall, we use httpsCallable.
            // The backend code used `functions.https.onRequest` but implemented manual CORS and Auth check.
            // Ideally we should switch backend to onCall for simplicity, but given current backend:

            // Let's use fetch to call the http endpoint. 
            // Need the URL. For local dev it involves emulation. For prod it's the cloudfunctions.net URL.
            // To make this robust, we should probably stick to `onCall` in the backend or handle the URL dynamically.

            // WAIT: The backend code I wrote earlier used `functions.https.onRequest`.
            // Let's assume for now we use the emulator or deployed URL.
            // However, `httpsCallable` is much easier for Auth context transmission.
            // I will update the backend to `onCall` in the next step to simplify this, OR use `httpsCallable` wrapper if I change backend.

            // Let's UPDATE the backend to be `onCall` for `createPaymentOrder` and `capturePaymentOrder` as well. 
            // It's much safer and handles auth automatically.
            // But for now, defining this interface assuming I'll fix backend to be `onCall`.

            const createOrderFn = httpsCallable<{ type: string; jobId?: string }, CreateOrderResponse>(functions, 'createPaymentOrder');
            const result = await createOrderFn({ type, jobId });
            return result.data.orderId;
        } catch (error) {
            console.error('Payment Service Error (createOrder):', error);
            throw error;
        }
    },

    /**
     * Calls the backend to capture/finalize the payment
     */
    captureOrder: async (orderId: string, type: string, jobId?: string): Promise<CaptureOrderResponse> => {
        try {
            const captureOrderFn = httpsCallable<{ orderId: string; type: string; jobId?: string }, CaptureOrderResponse>(functions, 'capturePaymentOrder');
            const result = await captureOrderFn({ orderId, type, jobId });
            return result.data;
        } catch (error) {
            console.error('Payment Service Error (captureOrder):', error);
            throw error;
        }
    },

    /**
     * Securely fetch contact details
     */
    getSecureContactDetails: async (jobId: string, jobPosterId: string) => {
        const getContactFn = httpsCallable<{ jobId: string; jobPosterId: string }, any>(functions, 'getSecureContactDetails');
        const result = await getContactFn({ jobId, jobPosterId });
        return result.data;
    },

    /**
     * Log a successful transaction to Firestore for admin reporting
     */
    /**
     * Log a successful transaction to Firestore for admin reporting
     */
    logTransaction: async (transactionData: {
        userId: string;
        userEmail: string; // Required now
        amount: number;
        currency: string;
        paypalOrderId: string;
        paymentStatus: 'COMPLETED' | 'PENDING';
        itemType: string; // 'מנוי חודשי' | 'פתיחת מודעה בודדת' | 'פרסום מודעה'
        jobId?: string;
    }): Promise<void> => {
        try {
            const transactionsCol = collection(db, 'transactions');
            await addDoc(transactionsCol, {
                ...transactionData,
                timestamp: Timestamp.now()
            });
        } catch (error) {
            console.error("Error logging transaction:", error);
            // Don't throw, just log error, as payment was successful
        }
    },

    /**
     * Get all transactions for admin report
     */
    getTransactions: async (): Promise<any[]> => {
        try {
            const transactionsCol = collection(db, 'transactions');
            const q = query(transactionsCol, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching transactions:", error);
            return [];
        }
    }
};
