
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PayPalContextType {
    isReady: boolean;
    clientId: string | null;
    mode: 'sandbox' | 'live';
    refreshConfig: () => Promise<void>;
}

const PayPalContext = createContext<PayPalContextType>({
    isReady: false,
    clientId: null,
    mode: 'sandbox',
    refreshConfig: async () => { },
});

export const usePayPal = () => useContext(PayPalContext);

export const PayPalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [clientId, setClientId] = useState<string | null>(null);
    const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
    const [isReady, setIsReady] = useState(false);

    const refreshConfig = async () => {
        // In a real production app, we should fetch the *public* Client ID from a secure config endpoint
        // or from a public Firestore document if it's not considered secret (Client ID is public).
        // For now, let's assume we read it from environment variables or a public config doc.

        // Ideally, we don't store secrets in client code.
        // Client ID is semi-public (like Stripe Publishable Key).
        // Secret Key is absolutely private (Server only).

        try {
            // Option 1: Env Vars (Good for build time)
            const envClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
            const envMode = import.meta.env.VITE_PAYPAL_MODE || 'sandbox';

            if (envClientId) {
                setClientId(envClientId);
                setMode(envMode as 'sandbox' | 'live');
                setIsReady(true);
                return;
            }

            // Option 2: Config DB (Dynamic)
            // If we want to toggle sandbox/live dynamically from admin panel without rebuild
            const docRef = doc(db, 'config', 'paymentSettings');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // We'll need to store the client ID in this doc, viewable by users?
                // Or separate doc 'publicConfig'.
                // For simplify, let's stick to .env for keys as requested by user ("I will enter keys in .env")
            }
        } catch (e) {
            console.error("Failed to load PayPal config", e);
        }
    };

    useEffect(() => {
        refreshConfig();
    }, []);

    if (!clientId) {
        // Don't render PayPalScriptProvider until we have a client ID
        // But we render children so app works even if PayPal fails
        return <PayPalContext.Provider value={{ isReady, clientId, mode, refreshConfig }}>{children}</PayPalContext.Provider>;
    }

    const initialOptions = {
        clientId: clientId,
        currency: "ILS",
        intent: "capture",
        locale: "he_IL"
        // "data-client-token": "..." // Only needed for Advanced Credit Card Fields if using server-side auth generation
    };

    return (
        <PayPalContext.Provider value={{ isReady, clientId, mode, refreshConfig }}>
            <PayPalScriptProvider options={initialOptions}>
                {children}
            </PayPalScriptProvider>
        </PayPalContext.Provider>
    );
};
