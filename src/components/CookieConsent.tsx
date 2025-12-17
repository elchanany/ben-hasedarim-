import React, { useState, useEffect } from 'react';
import { initAnalytics } from '../lib/firebase';

export const COOKIE_CONSENT_KEY = 'user_cookie_consent_v2'; // Versioned key

export interface CookiePreferences {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
}

interface CookieConsentProps {
    onPrivacyPolicyClick: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onPrivacyPolicyClick }) => {
    const [showBanner, setShowBanner] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>({
        essential: true,
        analytics: false,
        marketing: false
    });
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (storedConsent) {
            try {
                const parsed = JSON.parse(storedConsent);
                setPreferences(parsed);
                if (parsed.analytics) {
                    initAnalytics();
                }
            } catch (error) {
                console.error("Error parsing cookie consent:", error);
                // If parsing fails, reset to default (show banner)
                localStorage.removeItem(COOKIE_CONSENT_KEY);
                setShowBanner(true);
            }
        } else {
            setShowBanner(true);
        }
    }, []);

    const savePreferences = (prefs: CookiePreferences) => {
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
        setPreferences(prefs);
        setShowBanner(false);
        setShowSettings(false);

        if (prefs.analytics) {
            initAnalytics();
        } else {
            // Note: Firebase Analytics cannot be easily "stopped" once started without page reload, 
            // but effectively we just don't init it. If user revokes, a reload might be needed for full clean state,
            // or we rely on the fact that we won't log further events.
            window.location.reload(); // Simplest way to ensure scripts stop if they were running
        }
    };

    const handleAcceptAll = () => {
        savePreferences({ essential: true, analytics: true, marketing: true });
    };

    const handleRejectAll = () => {
        savePreferences({ essential: true, analytics: false, marketing: false });
    };

    const handleSaveSettings = () => {
        savePreferences(preferences);
    };

    if (!showBanner) return null;

    if (showSettings) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 dir-rtl">
                <div className="bg-white text-gray-900 p-6 rounded-xl shadow-2xl max-w-lg w-full">
                    <h3 className="text-xl font-bold mb-4 text-royal-blue">הגדרות עוגיות</h3>
                    <p className="mb-4 text-sm text-gray-600">בחר אילו עוגיות ברצונך לאפשר:</p>

                    <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <span className="font-semibold block">עוגיות הכרחיות</span>
                                <span className="text-xs text-gray-500">נדרשות לתפעול האתר (לא ניתן לביטול)</span>
                            </div>
                            <input type="checkbox" checked={true} disabled className="h-5 w-5 text-royal-blue" />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
                            <div>
                                <span className="font-semibold block">עוגיות אנליטיות</span>
                                <span className="text-xs text-gray-500">עוזרות לנו לשפר את האתר ע"י איסוף נתונים אנונימיים</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={preferences.analytics}
                                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                                className="h-5 w-5 text-royal-blue focus:ring-royal-blue cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
                            <div>
                                <span className="font-semibold block">עוגיות שיווקיות</span>
                                <span className="text-xs text-gray-500">משמשות להתאמת פרסומות ותוכן שיווקי</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={preferences.marketing}
                                onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                                className="h-5 w-5 text-royal-blue focus:ring-royal-blue cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700 font-medium">ביטול</button>
                        <button onClick={handleSaveSettings} className="bg-royal-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">שמור העדפות</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.4)] p-5 z-50 dir-rtl md:flex md:items-center md:justify-between gap-6 px-4 md:px-8 pl-20 md:pl-24 border-t border-gray-700">
            <div className="text-sm text-gray-200 flex-1 mb-4 md:mb-0">
                <p className="font-bold text-white text-lg mb-2">🍪 הגדרות פרטיות</p>
                <p className="leading-relaxed">
                    אנו משתמשים בעוגיות כדי לשפר את חווית הגלישה שלך.
                    חלקן הכרחיות, ואחרות משמשות לסטטיסטיקה ושיווק.
                    למידע נוסף, קרא את
                    <button onClick={onPrivacyPolicyClick} className="text-blue-300 hover:text-blue-100 hover:underline mx-1 font-medium bg-transparent border-none p-0 cursor-pointer transition-colors">מדיניות הפרטיות</button>
                    שלנו.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
                <button
                    onClick={() => setShowSettings(true)}
                    className="text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-600 hover:border-gray-400"
                >
                    הגדרות
                </button>
                <button
                    onClick={handleRejectAll}
                    className="text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-500 hover:border-gray-300"
                >
                    דחה הכל
                </button>
                <button
                    onClick={handleAcceptAll}
                    className="bg-royal-blue hover:bg-blue-600 text-white px-8 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-900/50 transform hover:-translate-y-0.5"
                >
                    קבל הכל
                </button>
            </div>
        </div>
    );
};
