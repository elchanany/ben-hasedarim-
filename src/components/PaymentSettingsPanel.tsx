
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PaymentSettings {
    masterSwitch: boolean;
    enablePosterPayment: boolean;
    enableViewerPayment: boolean;
}

// Simple Toggle Component (no external dependency)
const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-royal-blue focus:ring-offset-2 ${checked ? 'bg-royal-blue' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
    </button>
);

export const PaymentSettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState<PaymentSettings>({
        masterSwitch: false,
        enablePosterPayment: false,
        enableViewerPayment: false,
    });
    const [loading, setLoading] = useState(true);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'config', 'paymentSettings');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as PaymentSettings);
                } else {
                    // Initialize if not exists
                    await setDoc(docRef, settings);
                }
            } catch (error) {
                console.error('Error fetching payment settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const toggleSetting = async (key: keyof PaymentSettings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        try {
            await setDoc(doc(db, 'config', 'paymentSettings'), newSettings);
        } catch (error) {
            console.error('Error saving settings:', error);
            // Revert on error
            setSettings(settings);
        }
    };

    const ToggleRow = ({ label, description, settingKey }: { label: string, description: string, settingKey: keyof PaymentSettings }) => (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div>
                <h3 className="text-md font-bold text-gray-800">{label}</h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <Toggle
                checked={settings[settingKey]}
                onChange={() => toggleSetting(settingKey)}
            />
        </div>
    );

    if (loading) return <div className="text-gray-500">טוען הגדרות...</div>;

    return (
        <div className="space-y-2">
            <ToggleRow
                label="הפעלת מערכת תשלומים (Master Switch)"
                description="כיבוי מתג זה מנטרל את כל התשלומים באתר."
                settingKey="masterSwitch"
            />
            <div className={`pl-4 pr-4 border-l-4 border-gray-200 transition-opacity duration-300 ${settings.masterSwitch ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <ToggleRow
                    label="תשלום עבור פרסום משרה"
                    description="מפרסמים יצטרכו לשלם 10 ש״ח לפני שהמודעה עולה לאוויר."
                    settingKey="enablePosterPayment"
                />
                <ToggleRow
                    label="תשלום עבור צפייה בפרטים"
                    description="צופים יצטרכו לשלם 5 ש״ח (חד פעמי) או 15 ש״ח (מנוי) כדי לראות פרטים ולהסיר חסימת שם מפרסם."
                    settingKey="enableViewerPayment"
                />
            </div>
        </div>
    );
};
