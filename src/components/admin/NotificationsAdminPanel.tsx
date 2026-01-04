import React, { useState, useEffect } from 'react';
import {
    BellAlertIcon,
    EnvelopeIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import { db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationStats {
    sentTotal: number;
    sentThisMonth: number;
    sentToday: number;
    lastUpdated: any;
}

interface NotificationSettings {
    isEmailServiceActive: boolean;
    defaultFrequency: 'immediate' | 'hourly' | 'daily' | 'custom';
    frequencyMinutes?: number;
    stats?: NotificationStats;
}

const NotificationsAdminPanel: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [settings, setSettings] = useState<NotificationSettings>({
        isEmailServiceActive: true,
        defaultFrequency: 'immediate',
        frequencyMinutes: 30,
        stats: { sentTotal: 0, sentThisMonth: 0, sentToday: 0, lastUpdated: null }
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [customMinutes, setCustomMinutes] = useState<number>(30);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'notifications'), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as NotificationSettings;
                setSettings(data);
                if (data.frequencyMinutes) setCustomMinutes(data.frequencyMinutes);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleToggleService = async (checked: boolean) => {
        setUpdating(true);
        try {
            await setDoc(doc(db, 'settings', 'notifications'), {
                isEmailServiceActive: checked
            }, { merge: true });
        } catch (error) {
            console.error('Error updating settings:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleFrequencyChange = async (frequency: 'immediate' | 'hourly' | 'daily' | 'custom') => {
        setUpdating(true);
        try {
            await setDoc(doc(db, 'settings', 'notifications'), {
                defaultFrequency: frequency
            }, { merge: true });
        } catch (error) {
            console.error('Error updating frequency:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleCustomMinutesChange = async () => {
        if (customMinutes < 5) {
            alert('מינימום 5 דקות');
            return;
        }
        setUpdating(true);
        try {
            await setDoc(doc(db, 'settings', 'notifications'), {
                frequencyMinutes: customMinutes
            }, { merge: true });
        } catch (error) {
            console.error('Error updating minutes:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!currentUser?.email) return;
        setTestEmailStatus('sending');

        try {
            // Using the manual trigger URL
            const response = await fetch('https://europe-west1-jobs-site-fa310.cloudfunctions.net/manualEmailTrigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    test: true,
                    targetEmail: currentUser.email
                })
            });

            if (response.ok) {
                setTestEmailStatus('success');
            } else {
                console.error('Test email error response:', await response.text());
                setTestEmailStatus('error');
            }
        } catch (error) {
            console.error('Test email failed:', error);
            setTestEmailStatus('error');
        } finally {
            setTimeout(() => setTestEmailStatus('idle'), 3000);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">טוען הגדרות...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {/* Header & Toggle */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-royal-blue flex items-center">
                            <BellAlertIcon className="w-6 h-6 ml-2 text-royal-blue" />
                            ניהול מערכת התראות
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            שליטה על שליחת מיילים, תדירות וסטטיסטיקות
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className={`text-sm font-bold ${settings.isEmailServiceActive ? 'text-green-600' : 'text-gray-500'}`}>
                            {settings.isEmailServiceActive ? 'פעיל' : 'כבוי'}
                        </span>
                        <Switch
                            checked={settings.isEmailServiceActive}
                            onChange={handleToggleService}
                            className={`${settings.isEmailServiceActive ? 'bg-green-500' : 'bg-gray-200'
                                } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                        >
                            <span
                                className={`${settings.isEmailServiceActive ? 'translate-x-1' : 'translate-x-6'
                                    } inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm`}
                            />
                        </Switch>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-600 text-sm font-bold">נשלחו היום</span>
                            <div className="p-2 bg-blue-100/50 rounded-lg">
                                <ClockIcon className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {settings.stats?.sentToday || 0}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-600 text-sm font-bold">נשלחו החודש</span>
                            <div className="p-2 bg-purple-100/50 rounded-lg">
                                <EnvelopeIcon className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {settings.stats?.sentThisMonth || 0}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 text-sm font-bold">סה"כ נשלחו</span>
                            <div className="p-2 bg-gray-100/50 rounded-lg">
                                <PaperAirplaneIcon className="w-5 h-5 text-gray-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {settings.stats?.sentTotal || 0}
                        </div>
                    </div>
                </div>

                {/* Frequency Configuration */}
                <div className="border-t border-gray-100 pt-8">
                    <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center">
                        <AdjustmentsHorizontalIcon className="w-5 h-5 ml-2" />
                        הגדרות תדירות משלוח
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                            onClick={() => handleFrequencyChange('immediate')}
                            className={`p-4 rounded-xl border text-right transition-all relative overflow-hidden group ${settings.defaultFrequency === 'immediate'
                                ? 'border-royal-blue bg-blue-50/50 ring-1 ring-royal-blue shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold ${settings.defaultFrequency === 'immediate' ? 'text-royal-blue' : 'text-gray-900'}`}>מיידי (מומלץ)</span>
                                {settings.defaultFrequency === 'immediate' && (
                                    <CheckCircleIcon className="w-6 h-6 text-royal-blue" />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                התראות נשלחות בזמן אמת ברגע שמשרה מתפרסמת.
                            </p>
                        </button>

                        <button
                            onClick={() => handleFrequencyChange('hourly')}
                            className={`p-4 rounded-xl border text-right transition-all relative overflow-hidden ${settings.defaultFrequency === 'hourly'
                                ? 'border-royal-blue bg-blue-50/50 ring-1 ring-royal-blue shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold ${settings.defaultFrequency === 'hourly' ? 'text-royal-blue' : 'text-gray-900'}`}>כל שעה</span>
                                {settings.defaultFrequency === 'hourly' && (
                                    <CheckCircleIcon className="w-6 h-6 text-royal-blue" />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                ריכוז משרות חדשות שנשלח אחת לשעה עגולה.
                            </p>
                        </button>

                        <button
                            onClick={() => handleFrequencyChange('daily')}
                            className={`p-4 rounded-xl border text-right transition-all relative overflow-hidden ${settings.defaultFrequency === 'daily'
                                ? 'border-royal-blue bg-blue-50/50 ring-1 ring-royal-blue shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold ${settings.defaultFrequency === 'daily' ? 'text-royal-blue' : 'text-gray-900'}`}>פעם ביום</span>
                                {settings.defaultFrequency === 'daily' && (
                                    <CheckCircleIcon className="w-6 h-6 text-royal-blue" />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                סיכום יומי שנשלח בסוף היום.
                            </p>
                        </button>

                        <div className={`p-4 rounded-xl border text-right transition-all relative overflow-hidden flex flex-col ${settings.defaultFrequency === 'custom'
                            ? 'border-royal-blue bg-blue-50/50 ring-1 ring-royal-blue shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <button onClick={() => handleFrequencyChange('custom')} className="flex-grow w-full text-right">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`font-bold ${settings.defaultFrequency === 'custom' ? 'text-royal-blue' : 'text-gray-900'}`}>מותאם אישית</span>
                                    {settings.defaultFrequency === 'custom' && (
                                        <CheckCircleIcon className="w-6 h-6 text-royal-blue" />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    הגדר כל כמה דקות המערכת תשלח עדכונים.
                                </p>
                            </button>

                            {settings.defaultFrequency === 'custom' && (
                                <div className="mt-auto pt-2 border-t border-blue-100 flex gap-2 items-center animate-fade-in">
                                    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">כל:</span>
                                    <input
                                        type="number"
                                        min="5"
                                        max="1440"
                                        value={customMinutes}
                                        onChange={(e) => setCustomMinutes(Number(e.target.value))}
                                        className="w-16 h-8 text-center text-sm border-gray-300 rounded focus:ring-royal-blue focus:border-royal-blue"
                                    />
                                    <span className="text-xs font-medium text-gray-600">דק'</span>
                                    <button
                                        onClick={handleCustomMinutesChange}
                                        className="mr-auto text-xs bg-royal-blue text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                                    >
                                        שמור
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="border-t border-gray-100 pt-6 mt-8 flex justify-end">
                    <button
                        onClick={handleSendTestEmail}
                        className={`flex items-center px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-sm ${testEmailStatus === 'sending'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : testEmailStatus === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : testEmailStatus === 'error'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-royal-blue text-white hover:bg-blue-700 hover:shadow-md'
                            }`}
                        disabled={testEmailStatus === 'sending'}
                    >
                        {testEmailStatus === 'sending' ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 ml-2 animate-spin" />
                                שולח...
                            </>
                        ) : testEmailStatus === 'success' ? (
                            <>
                                <CheckCircleIcon className="w-5 h-5 ml-2" />
                                המייל נשלח בהצלחה!
                            </>
                        ) : testEmailStatus === 'error' ? (
                            <>
                                <XCircleIcon className="w-5 h-5 ml-2" />
                                שגיאה בשליחה
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="w-5 h-5 ml-2" />
                                שלח מייל בדיקה לעצמי
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationsAdminPanel;
