import React, { useState, useEffect } from 'react';
import {
    PhoneIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    BoltIcon,
    MoonIcon,
    CurrencyDollarIcon,
    Cog6ToothIcon,
    ArrowPathIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';

interface PhoneSettings {
    isPhoneServiceActive: boolean;
    checkFrequencyMinutes: number;
    sendMode: 'immediate' | 'batch';
    requirePaymentForPosters: boolean;
    posterPaymentAmount: number;
    requirePaymentForViewers: boolean;
    viewerPaymentAmount: number;
    yemotSystemNumber: string;
    yemotApiToken: string;
    maxTzintuksPerDay: number;  // 0 = unlimited
    quietHoursStart: number;
    quietHoursEnd: number;
    tzintuksSentToday?: number;
}

interface TzintukStats {
    isActive: boolean;
    todaySent: number;
    totalSent: number;
    pendingJobs: number;
}

const defaultSettings: PhoneSettings = {
    isPhoneServiceActive: false,
    checkFrequencyMinutes: 5,
    sendMode: 'batch',
    requirePaymentForPosters: false,
    posterPaymentAmount: 0,
    requirePaymentForViewers: false,
    viewerPaymentAmount: 0,
    yemotSystemNumber: '',
    yemotApiToken: '',
    maxTzintuksPerDay: 0,  // 0 = unlimited!
    quietHoursStart: 22,
    quietHoursEnd: 7,
};

/**
 * 📞 Phone Settings Admin Panel
 * 
 * הגדרות מערכת הצינתוקים (התראות טלפוניות)
 * 
 * הסבר ההגדרות:
 * - מספר מערכת: מספר הטלפון של המערכת בימות המשיח
 * - API Token: מפתח סודי לגישה ל-API של ימות
 * - שם רשימת צינתוק: שם הרשימה בימות שאליה נרשמים להתראות
 * - מספר שלוחה: השלוחה בה נמצא הצינתוק
 * - מצב שליחה: 
 *   - מיידי = ברגע שמפרסמים עבודה חדשה
 *   - באצווה = כל X דקות בודקים ושולחים לכולם
 * - שעות שקט: בין 22:00-07:00 לא שולחים (אלא אם נרשמו ללילה)
 */
export const PhoneSettingsSection: React.FC = () => {
    const [settings, setSettings] = useState<PhoneSettings>(defaultSettings);
    const [stats, setStats] = useState<TzintukStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'settings', 'phoneSettings'),
            (docSnap) => {
                if (docSnap.exists()) {
                    setSettings({ ...defaultSettings, ...docSnap.data() } as PhoneSettings);
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error loading phone settings:', err);
                setLoading(false);
            }
        );
        loadStats();
        return () => unsubscribe();
    }, []);

    const loadStats = async () => {
        try {
            const getTzintukStatus = httpsCallable(functions, 'getTzintukStatusFunc');
            const result = await getTzintukStatus();
            setStats(result.data as TzintukStats);
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };

    const handleToggleService = async (checked: boolean) => {
        setUpdating(true);
        try {
            await setDoc(doc(db, 'settings', 'phoneSettings'), {
                isPhoneServiceActive: checked
            }, { merge: true });
        } catch (error) {
            console.error('Error updating settings:', error);
        } finally {
            setUpdating(false);
        }
    };

    const updateSetting = async (key: keyof PhoneSettings, value: any) => {
        setUpdating(true);
        try {
            await setDoc(doc(db, 'settings', 'phoneSettings'), {
                [key]: value
            }, { merge: true });
        } catch (error) {
            console.error('Error updating setting:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleSendModeChange = async (mode: 'immediate' | 'batch') => {
        await updateSetting('sendMode', mode);
    };

    const setupExtension = async () => {
        setActionStatus('loading');
        try {
            const setup = httpsCallable(functions, 'setupTzintukFunc');
            const result: any = await setup();
            if (result.data.success) {
                setActionStatus('success');
            } else {
                setActionStatus('error');
            }
        } catch (err) {
            setActionStatus('error');
        }
        setTimeout(() => setActionStatus('idle'), 3000);
    };

    const forceSendTzintuk = async () => {
        setActionStatus('loading');
        try {
            const force = httpsCallable(functions, 'forceTzintukProcess');
            const result: any = await force({ bypassChecks: true }); // Always force per user request

            console.log('Force tzintuk result:', result.data);

            if (result.data.tzintukSent) {
                setActionStatus('success');
                alert(`נשלח בהצלחה!\n${result.data.message}`);
            } else {
                // Even if 'success' technically, if no tzintuk sent, show warning
                setActionStatus('error');
                alert(`לא נשלח:\n${result.data.message}`);
            }

            loadStats();
        } catch (err) {
            console.error('Error forcing tzintuk:', err);
            setActionStatus('error');
            alert(`שגיאה בשליחה: ${err}`);
        }
        setTimeout(() => setActionStatus('idle'), 3000);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">טוען הגדרות...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {/* Header & Toggle */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-royal-blue flex items-center">
                            <PhoneIcon className="w-6 h-6 ml-2 text-royal-blue" />
                            ניהול מערכת צינתוקים
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            התראות טלפוניות אוטומטיות למנויים כשיש עבודות חדשות
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className={`text-sm font-bold ${settings.isPhoneServiceActive ? 'text-green-600' : 'text-gray-500'}`}>
                            {settings.isPhoneServiceActive ? 'פעיל' : 'כבוי'}
                        </span>
                        <Switch
                            checked={settings.isPhoneServiceActive}
                            onChange={handleToggleService}
                            className={`${settings.isPhoneServiceActive ? 'bg-green-500' : 'bg-gray-200'
                                } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                        >
                            <span
                                className={`${settings.isPhoneServiceActive ? 'translate-x-1' : 'translate-x-6'
                                    } inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm`}
                            />
                        </Switch>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-600 text-sm font-bold">צינתוקים היום</span>
                            <div className="p-2 bg-blue-100/50 rounded-lg">
                                <ClockIcon className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {stats?.todaySent || settings.tzintuksSentToday || 0}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-600 text-sm font-bold">סה"כ נשלחו</span>
                            <div className="p-2 bg-purple-100/50 rounded-lg">
                                <PhoneIcon className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {stats?.totalSent || 0}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-white p-5 rounded-2xl border border-orange-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-orange-600 text-sm font-bold">עבודות ממתינות</span>
                            <div className="p-2 bg-orange-100/50 rounded-lg">
                                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {stats?.pendingJobs || 0}
                        </div>
                    </div>
                    <div className={`p-5 rounded-2xl border shadow-sm ${stats?.isActive || settings.isPhoneServiceActive
                        ? 'bg-gradient-to-br from-green-50 to-white border-green-100'
                        : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-bold ${stats?.isActive || settings.isPhoneServiceActive ? 'text-green-600' : 'text-gray-600'}`}>
                                סטטוס מערכת
                            </span>
                            <div className={`p-2 rounded-lg ${stats?.isActive || settings.isPhoneServiceActive ? 'bg-green-100/50' : 'bg-gray-100/50'}`}>
                                <CheckCircleIcon className={`w-5 h-5 ${stats?.isActive || settings.isPhoneServiceActive ? 'text-green-600' : 'text-gray-600'}`} />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {stats?.isActive || settings.isPhoneServiceActive ? '✓' : '✗'}
                        </div>
                    </div>
                </div>

                {/* Send Mode Configuration */}
                <div className="border-t border-gray-100 pt-8">
                    <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center">
                        <BoltIcon className="w-5 h-5 ml-2" />
                        מצב שליחה
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        <strong>מיידי:</strong> ברגע שמפרסמים עבודה → צינתוק מיד לכולם |
                        <strong> באצווה:</strong> כל X דקות בודקים אם יש עבודות חדשות ושולחים סיכום
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleSendModeChange('immediate')}
                            className={`p-4 rounded-xl border text-right transition-all ${settings.sendMode === 'immediate'
                                ? 'border-royal-blue bg-blue-50/50 ring-1 ring-royal-blue shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold ${settings.sendMode === 'immediate' ? 'text-royal-blue' : 'text-gray-900'}`}>
                                    ⚡ מיידי
                                </span>
                                {settings.sendMode === 'immediate' && <CheckCircleIcon className="w-6 h-6 text-royal-blue" />}
                            </div>
                            <p className="text-xs text-gray-500">צינתוק נשלח ברגע שעבודה מתפרסמת</p>
                        </button>

                        <button
                            onClick={() => handleSendModeChange('batch')}
                            className={`p-4 rounded-xl border text-right transition-all ${settings.sendMode === 'batch'
                                ? 'border-royal-blue bg-blue-50/50 ring-1 ring-royal-blue shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold ${settings.sendMode === 'batch' ? 'text-royal-blue' : 'text-gray-900'}`}>
                                    📦 באצווה
                                </span>
                                {settings.sendMode === 'batch' && <CheckCircleIcon className="w-6 h-6 text-royal-blue" />}
                            </div>
                            <p className="text-xs text-gray-500">בדיקה כל {settings.checkFrequencyMinutes} דקות וצינתוק מרוכז</p>
                        </button>
                    </div>
                </div>

                {/* Rate Limiting */}
                <div className="border-t border-gray-100 pt-8 mt-8">
                    <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center">
                        <MoonIcon className="w-5 h-5 ml-2" />
                        הגבלות ושעות שקט
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        בשעות שקט (ברירת מחדל: 22:00-07:00) לא נשלחים צינתוקים, אלא למי שנרשם גם ללילה
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <label className="text-sm font-medium text-gray-700 block mb-2">מקסימום ביום (0 = ללא הגבלה)</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0 = ללא הגבלה"
                                value={settings.maxTzintuksPerDay}
                                onChange={(e) => updateSetting('maxTzintuksPerDay', Number(e.target.value))}
                                className="w-full h-10 px-3 text-center border-gray-300 rounded-lg focus:ring-royal-blue focus:border-royal-blue"
                            />
                        </div>
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <label className="text-sm font-medium text-gray-700 block mb-2">שעות שקט - התחלה</label>
                            <input
                                type="number"
                                min={0}
                                max={23}
                                value={settings.quietHoursStart}
                                onChange={(e) => updateSetting('quietHoursStart', Number(e.target.value))}
                                className="w-full h-10 px-3 text-center border-gray-300 rounded-lg focus:ring-royal-blue focus:border-royal-blue"
                            />
                        </div>
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <label className="text-sm font-medium text-gray-700 block mb-2">שעות שקט - סיום</label>
                            <input
                                type="number"
                                min={0}
                                max={23}
                                value={settings.quietHoursEnd}
                                onChange={(e) => updateSetting('quietHoursEnd', Number(e.target.value))}
                                className="w-full h-10 px-3 text-center border-gray-300 rounded-lg focus:ring-royal-blue focus:border-royal-blue"
                            />
                        </div>
                    </div>
                </div>

                {/* Payment Settings */}
                <div className="border-t border-gray-100 pt-8 mt-8">
                    <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center">
                        <CurrencyDollarIcon className="w-5 h-5 ml-2" />
                        הגדרות תשלום
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-700">חייב מפרסמים</span>
                                <Switch
                                    checked={settings.requirePaymentForPosters}
                                    onChange={(val) => updateSetting('requirePaymentForPosters', val)}
                                    className={`${settings.requirePaymentForPosters ? 'bg-royal-blue' : 'bg-gray-200'
                                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                >
                                    <span className={`${settings.requirePaymentForPosters ? 'translate-x-1' : 'translate-x-6'
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </Switch>
                            </div>
                            {settings.requirePaymentForPosters && (
                                <input
                                    type="number"
                                    placeholder="סכום ב-₪"
                                    value={settings.posterPaymentAmount}
                                    onChange={(e) => updateSetting('posterPaymentAmount', Number(e.target.value))}
                                    className="w-full h-10 px-3 border-gray-300 rounded-lg text-center"
                                />
                            )}
                        </div>
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-700">חייב צופים</span>
                                <Switch
                                    checked={settings.requirePaymentForViewers}
                                    onChange={(val) => updateSetting('requirePaymentForViewers', val)}
                                    className={`${settings.requirePaymentForViewers ? 'bg-royal-blue' : 'bg-gray-200'
                                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                >
                                    <span className={`${settings.requirePaymentForViewers ? 'translate-x-1' : 'translate-x-6'
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </Switch>
                            </div>
                            {settings.requirePaymentForViewers && (
                                <input
                                    type="number"
                                    placeholder="סכום ב-₪"
                                    value={settings.viewerPaymentAmount}
                                    onChange={(e) => updateSetting('viewerPaymentAmount', Number(e.target.value))}
                                    className="w-full h-10 px-3 border-gray-300 rounded-lg text-center"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Yemot Configuration */}
                <div className="border-t border-gray-100 pt-8 mt-8">
                    <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center">
                        <Cog6ToothIcon className="w-5 h-5 ml-2" />
                        הגדרות ימות המשיח
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        פרטי ההתחברות למערכת ימות המשיח. הטוקן נמצא בלוח הבקרה של ימות.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <label className="text-sm font-medium text-gray-700 block mb-2">מספר מערכת</label>
                            <input
                                type="text"
                                placeholder="לדוגמה: 0773131234"
                                value={settings.yemotSystemNumber}
                                onChange={(e) => updateSetting('yemotSystemNumber', e.target.value)}
                                className="w-full h-10 px-3 border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <label className="text-sm font-medium text-gray-700 block mb-2">סיסמת מערכת (Token)</label>
                            <input
                                type="password"
                                placeholder="הסיסמה שלך לימות"
                                value={settings.yemotApiToken}
                                onChange={(e) => updateSetting('yemotApiToken', e.target.value)}
                                className="w-full h-10 px-3 border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                        💡 הרשמה לצינתוקים נשמרת ב-Firestore (לא ברשימה של ימות) - כך מתאפשר סינון מותאם אישית
                    </p>
                </div>

                {/* Actions Footer */}
                <div className="border-t border-gray-100 pt-6 mt-8 flex flex-wrap gap-4 justify-end">
                    <button
                        onClick={loadStats}
                        className="flex items-center px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        <ArrowPathIcon className="w-4 h-4 ml-2" />
                        רענן סטטיסטיקות
                    </button>
                    <button
                        onClick={setupExtension}
                        className="flex items-center px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        <Cog6ToothIcon className="w-4 h-4 ml-2" />
                        צור שלוחה בימות
                    </button>
                    <button
                        onClick={forceSendTzintuk}
                        className={`flex items-center px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-sm ${actionStatus === 'loading'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : actionStatus === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : actionStatus === 'error'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-royal-blue text-white hover:bg-blue-700 hover:shadow-md'
                            }`}
                        disabled={actionStatus === 'loading'}
                    >
                        {actionStatus === 'loading' ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 ml-2 animate-spin" />
                                שולח...
                            </>
                        ) : actionStatus === 'success' ? (
                            <>
                                <CheckCircleIcon className="w-5 h-5 ml-2" />
                                נשלח בהצלחה!
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="w-5 h-5 ml-2" />
                                שלח צינתוק עכשיו
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
