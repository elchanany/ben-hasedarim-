
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PayPalContextType {
    isReady: boolean;
    clientId: string | null;
    mode: 'sandbox' | 'live';
    error: string | null; // NEW: Track errors
    refreshConfig: () => Promise<void>;
}

const PayPalContext = createContext<PayPalContextType>({
    isReady: false,
    clientId: null,
    mode: 'sandbox',
    error: null,
    refreshConfig: async () => { },
});

export const usePayPal = () => useContext(PayPalContext);

export const PayPalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [clientId, setClientId] = useState<string | null>(null);
    const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshConfig = async () => {
        try {
            // DEBUG: Log env vars at runtime
            console.log('[PayPal] Loading config...');
            console.log('[PayPal] VITE_PAYPAL_CLIENT_ID present:', !!import.meta.env.VITE_PAYPAL_CLIENT_ID);
            console.log('[PayPal] VITE_PAYPAL_MODE:', import.meta.env.VITE_PAYPAL_MODE);

            const envClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
            const envMode = import.meta.env.VITE_PAYPAL_MODE || 'sandbox';

            if (envClientId) {
                console.log('[PayPal] Client ID loaded from env, length:', envClientId.length);
                setClientId(envClientId);
                setMode(envMode as 'sandbox' | 'live');
                setIsReady(true);
                setError(null);
                return;
            }

            // Fallback: Try to get from Firestore config (public client ID can be stored there)
            console.log('[PayPal] No env var found, trying Firestore...');
            const docRef = doc(db, 'config', 'paymentSettings');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.paypalClientId) {
                    console.log('[PayPal] Client ID loaded from Firestore');
                    setClientId(data.paypalClientId);
                    setMode(data.paypalMode || 'sandbox');
                    setIsReady(true);
                    setError(null);
                    return;
                }
            }

            // No client ID found anywhere
            console.error('[PayPal] No client ID found in env or Firestore!');
            setError('PayPal Client ID חסר. נא להגדיר VITE_PAYPAL_CLIENT_ID בהגדרות Vercel.');
            setIsReady(false);

        } catch (e) {
            console.error("[PayPal] Failed to load config:", e);
            setError('שגיאה בטעינת הגדרות PayPal');
            setIsReady(false);
        }
    };

    useEffect(() => {
        refreshConfig();
    }, []);

    if (!clientId) {
        // Don't render PayPalScriptProvider until we have a client ID
        // Pass error state so UI can show meaningful message
        return <PayPalContext.Provider value={{ isReady, clientId, mode, error, refreshConfig }}>{children}</PayPalContext.Provider>;
    }

    const initialOptions = {
        clientId: clientId,
        currency: "USD", // Changed from ILS - ILS may not be enabled on PayPal account
        intent: "capture",
        locale: "he_IL", // Hebrew locale for Israeli users
    };

    return (
        <PayPalContext.Provider value={{ isReady, clientId, mode, error, refreshConfig }}>
            <PayPalScriptProvider options={initialOptions}>
                {children}
            </PayPalScriptProvider>
        </PayPalContext.Provider>
    );
};
