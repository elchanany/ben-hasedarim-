import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PaymentSettings {
    masterSwitch: boolean;
    enablePosterPayment: boolean;
    enableViewerPayment: boolean;
    postJobPrice: number;
    subscriptionPrice: number;
    singleContactPrice: number;
    paypalClientId?: string;
    paypalMode?: 'sandbox' | 'live';
}

const DEFAULT_SETTINGS: PaymentSettings = {
    masterSwitch: false,
    enablePosterPayment: false,
    enableViewerPayment: false,
    postJobPrice: 10,
    subscriptionPrice: 15,
    singleContactPrice: 5,
};

export const usePaymentSettings = () => {
    const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const configRef = doc(db, 'config', 'paymentSettings');

        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Ensure values exist and are of correct type
                setSettings({
                    masterSwitch: data.masterSwitch ?? DEFAULT_SETTINGS.masterSwitch,
                    enablePosterPayment: data.enablePosterPayment ?? DEFAULT_SETTINGS.enablePosterPayment,
                    enableViewerPayment: data.enableViewerPayment ?? DEFAULT_SETTINGS.enableViewerPayment,
                    postJobPrice: Number(data.postJobPrice) || DEFAULT_SETTINGS.postJobPrice,
                    subscriptionPrice: Number(data.subscriptionPrice) || DEFAULT_SETTINGS.subscriptionPrice,
                    singleContactPrice: Number(data.singleContactPrice) || DEFAULT_SETTINGS.singleContactPrice,
                    paypalClientId: data.paypalClientId,
                    paypalMode: data.paypalMode,
                });
            } else {
                setSettings(DEFAULT_SETTINGS);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching payment settings:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { settings, loading, error };
};
