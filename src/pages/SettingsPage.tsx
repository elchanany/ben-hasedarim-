import React, { useState, useContext, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CheckboxGroup } from '../components/CheckboxGroup';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { User, ContactPreference } from '../types';
import { BellIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, TrashIcon, CalendarDaysIcon, CogIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import * as authService from '../services/authService';
import { AuthContext } from '../contexts/AuthContext';
import type { DateDisplayPreference } from '../utils/dateConverter';

export const SettingsPage: React.FC<PageProps> = ({ setCurrentPage }) => {
    const { user, updateUserContext, loadingAuth } = useAuth();
    const authCtx = useContext(AuthContext);

    // State for ad contact defaults
    const [contactPreference, setContactPreference] = useState<ContactPreference>({
        showPhone: false, showWhatsapp: false, showEmail: true, showChat: true, displayName: ''
    });
    // State for public profile visibility - separate from ads
    const [profileContactPreference, setProfileContactPreference] = useState<ContactPreference>({
        showPhone: false, showWhatsapp: false, showEmail: true, showChat: false, displayName: ''
    });
    const [datePref, setDatePref] = useState<DateDisplayPreference>(authCtx?.datePreference || 'hebrew');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', message: '', onConfirm: (() => { }) as (() => void | Promise<void>) | null, showCancel: false });

    // State for contact redirect modal (same as PostJobPage)
    const [showContactRedirectModal, setShowContactRedirectModal] = useState(false);
    const [contactRedirectMessage, setContactRedirectMessage] = useState('');
    const [onContactRedirectConfirm, setOnContactRedirectConfirm] = useState<(() => void) | null>(null);

    // Sync with global preference
    useEffect(() => {
        if (authCtx?.datePreference && authCtx.datePreference !== datePref) {
            setDatePref(authCtx.datePreference);
        }
    }, [authCtx?.datePreference]);

    useEffect(() => {
        if (user) {
            // Load ad contact preferences
            setContactPreference(user.contactPreference || { showPhone: false, showWhatsapp: false, showEmail: true, showChat: true, displayName: user.fullName });
            // Load profile visibility preferences (default to email only)
            setProfileContactPreference(user.profileContactPreference || { showPhone: false, showWhatsapp: false, showEmail: true, showChat: false, displayName: user.fullName });
        }
    }, [user]);

    const handleContactPreferenceChange = (value: string, checked: boolean) => {
        if (checked) {
            if (value === 'showPhone' && !user?.phone) {
                setContactRedirectMessage("חסר מספר טלפון בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותו?");
                setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
                setShowContactRedirectModal(true);
                return;
            }
            if (value === 'showWhatsapp' && !user?.whatsapp && !user?.phone) {
                setContactRedirectMessage("חסר מספר וואטסאפ בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותו?");
                setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
                setShowContactRedirectModal(true);
                return;
            }
            if (value === 'showEmail' && !user?.email) {
                setContactRedirectMessage("חסר כתובת אימייל בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותה?");
                setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
                setShowContactRedirectModal(true);
                return;
            }
        }
        setContactPreference(prev => ({ ...prev, [value]: checked }));
    };

    const handleProfileContactPreferenceChange = (value: string, checked: boolean) => {
        if (checked) {
            if (value === 'showPhone' && !user?.phone) {
                setContactRedirectMessage("חסר מספר טלפון בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותו?");
                setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
                setShowContactRedirectModal(true);
                return;
            }
            if (value === 'showWhatsapp' && !user?.whatsapp && !user?.phone) {
                setContactRedirectMessage("חסר מספר וואטסאפ בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותו?");
                setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
                setShowContactRedirectModal(true);
                return;
            }
        }
        setProfileContactPreference(prev => ({ ...prev, [value]: checked }));
    };

    const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContactPreference(prev => ({ ...prev, displayName: e.target.value }));
    };

    const openModal = (title: string, message: string, onConfirmCallback: (() => void | Promise<void>) | null = null, showCancelButton = false) => {
        setModalContent({ title, message, onConfirm: onConfirmCallback, showCancel: showCancelButton });
        setShowConfirmationModal(true);
    };

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsUpdatingProfile(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const updatedUserData = {
                ...user,
                contactPreference: { ...contactPreference, displayName: contactPreference.displayName || user.fullName },
                profileContactPreference: { ...profileContactPreference, displayName: profileContactPreference.displayName || user.fullName },
            } as User;

            const result = await authService.updateUserProfile(user.id, updatedUserData);
            updateUserContext(result);
            if (authCtx) authCtx.setDatePreference(datePref);
            openModal("הצלחה", "ההגדרות נשמרו בהצלחה!");
        } catch (err: any) {
            setErrorMessage(err.message || 'שגיאה בעדכון ההגדרות.');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleDeleteAccount = async () => {
        openModal(
            "מחיקת חשבון - פעולה בלתי הפיכה",
            "האם אתה בטוח שברצונך למחוק את החשבון שלך לצמיתות? כל הפרטים האישיים שלך, ההגדרות והמשרות שפרסמת יימחקו ולא יהיה ניתן לשחזר אותם.",
            async () => {
                try {
                    if (!user?.id) return;
                    await authService.deleteAccount(user.id);
                    setCurrentPage('home');
                } catch (error: any) {
                    console.error("Error deleting account:", error);
                    if (error.message === 'security-requires-recent-login') {
                        openModal("נדרשת התחברות מחדש", "למען אבטחתך, פעולה רגישה זו דורשת התחברות מחדש. אנא התנתק והתחבר שוב, ואז נסה שנית.");
                    } else {
                        openModal("שגיאה", "אירעה שגיאה במחיקת החשבון. אנא נסה שנית מאוחר יותר.");
                    }
                }
            },
            true
        );
    };

    const contactCheckboxes = [
        { id: 'showPhone', label: 'הצג טלפון', value: 'showPhone' },
        { id: 'showWhatsapp', label: 'הצג וואטסאפ', value: 'showWhatsapp' },
        { id: 'showEmail', label: 'הצג אימייל', value: 'showEmail' },
        { id: 'showChat', label: 'אפשר יצירת קשר דרך מערכת ההודעות', value: 'showChat' },
    ];

    if (loadingAuth || !user) {
        return <div className="text-center p-10">טוען נתוני משתמש...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
                <div className="flex items-center mb-6 pb-4 border-b">
                    <CogIcon className="w-10 h-10 text-royal-blue mr-4 rtl:ml-4 rtl:mr-0" />
                    <h1 className="text-3xl font-bold text-royal-blue">הגדרות מערכת</h1>
                </div>

                {errorMessage && <p className="mb-4 text-center text-sm text-red-600 bg-red-100 p-3 rounded-md">{errorMessage}</p>}
                {successMessage && <p className="mb-4 text-center text-sm text-green-600 bg-green-100 p-3 rounded-md">{successMessage}</p>}

                <div className="space-y-8 animate-fade-in">
                    <form onSubmit={handleSettingsSubmit} className="space-y-6" noValidate>

                        {/* Notification Settings Link */}
                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-royal-blue mb-1 flex items-center">
                                    <BellIcon className="w-5 h-5 ml-2" />
                                    ניהול התראות והודעות
                                </h3>
                                <p className="text-sm text-gray-600">בחר אילו עדכונים לקבל וכיצד</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => setCurrentPage('notifications')}
                                className="bg-white whitespace-nowrap"
                            >
                                למסך ההתראות
                            </Button>
                        </div>

                        {/* Job Alerts Settings Link */}
                        <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100 mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-yellow-800 mb-1 flex items-center">
                                    <BellIcon className="w-5 h-5 ml-2" />
                                    התראות על עבודות חדשות
                                </h3>
                                <p className="text-sm text-gray-600">הגדר התראות אוטומטיות לקבלת עבודות חדשות</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => setCurrentPage('createJobAlert')}
                                className="bg-white whitespace-nowrap"
                            >
                                להתראות עבודות
                            </Button>
                        </div>

                        {/* Date Preference */}
                        <fieldset className="p-4 border border-gray-200 rounded-md bg-white">
                            <legend className="text-lg font-medium text-gray-800 px-2 flex items-center">
                                <CalendarDaysIcon className="w-5 h-5 ml-2 text-gray-500" />
                                העדפת תאריך
                            </legend>
                            <div className="flex gap-3 mt-2">
                                <Button
                                    type="button"
                                    variant={datePref === 'hebrew' ? 'primary' : 'outline'}
                                    onClick={() => {
                                        setDatePref('hebrew');
                                        authCtx?.setDatePreference('hebrew');
                                        setSuccessMessage('העדפת תאריך עודכנה לעברי');
                                    }}
                                >
                                    עברי
                                </Button>
                                <Button
                                    type="button"
                                    variant={datePref === 'gregorian' ? 'primary' : 'outline'}
                                    onClick={() => {
                                        setDatePref('gregorian');
                                        authCtx?.setDatePreference('gregorian');
                                        setSuccessMessage('העדפת תאריך עודכנה ללועזי');
                                    }}
                                >
                                    לועזי
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">העדפה זו משפיעה על אופן תצוגת התאריכים ברחבי האתר.</p>
                        </fieldset>

                        {/* Contact Display Defaults for Ads */}
                        <fieldset className="p-4 border border-gray-200 rounded-md bg-white">
                            <legend className="text-lg font-medium text-gray-800 px-2">הגדרות תצוגת פרטי קשר במודעות</legend>
                            <p className="text-xs text-gray-500 mb-3">הגדרות אלו משפיעות על ברירת המחדל לתצוגת פרטי יצירת קשר במודעות שתפרסם.</p>
                            <Input
                                label="שם לתצוגה במודעות"
                                id="displayName"
                                name="displayName"
                                value={contactPreference.displayName || ''}
                                onChange={handleDisplayNameChange}
                                containerClassName="my-3"
                                required
                            />
                            <CheckboxGroup
                                legend="אילו פרטי התקשרות להציג במודעות?"
                                name="contactPreferenceGroup"
                                options={contactCheckboxes}
                                selectedValues={new Set(Object.entries(contactPreference).filter(([, val]) => val === true && typeof val === 'boolean').map(([key]) => key))}
                                onChange={handleContactPreferenceChange}
                            />
                            <p className="text-xs text-gray-500 mt-2 text-right">הערה: ניתן לשנות הגדרות אלו באופן פרטני לכל מודעה.</p>
                        </fieldset>

                        {/* Profile Visibility Settings */}
                        <fieldset id="profile-visibility" className="p-4 border border-gray-200 rounded-md bg-white">
                            <legend className="text-lg font-medium text-gray-800 px-2 flex items-center">
                                פרטי התקשרות בעמוד הפרופיל הציבורי
                            </legend>
                            <p className="text-sm text-gray-600 mb-4">
                                הגדרות אלו קובעות אילו פרטים יוצגו לאחרים כשהם נכנסים לעמוד הפרופיל שלך.
                            </p>
                            <CheckboxGroup
                                legend="אילו פרטים להציג בפרופיל הציבורי?"
                                name="profileContactGroup"
                                options={contactCheckboxes}
                                selectedValues={new Set(Object.entries(profileContactPreference).filter(([, val]) => val === true && typeof val === 'boolean').map(([key]) => key))}
                                onChange={handleProfileContactPreferenceChange}
                            />
                            <p className="text-xs text-gray-500 mt-3">
                                הפרטים שתבחר כאן יוצגו לכל מי שייכנס לפרופיל שלך.
                            </p>
                        </fieldset>

                        <Button type="submit" variant="primary" isLoading={isUpdatingProfile} className="w-full sm:w-auto">
                            {isUpdatingProfile ? 'שומר הגדרות...' : 'שמור הגדרות'}
                        </Button>
                    </form>

                </div>
            </div>

            <Modal
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                title={modalContent.title}
            >
                <div className="text-center p-6">
                    {modalContent.title.includes("הצלחה") && <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />}
                    {modalContent.title.includes("שגיאה") && <XCircleIcon className="w-20 h-20 text-red-600 mx-auto mb-6" />}
                    {!modalContent.title.includes("הצלחה") && !modalContent.title.includes("שגיאה") && <ExclamationCircleIcon className="w-20 h-20 text-red-600 mx-auto mb-6" />}
                    <p className="text-lg text-gray-800 font-medium mb-8 whitespace-pre-line">{modalContent.message}</p>
                    <div className="flex justify-center space-x-4 rtl:space-x-reverse">
                        {modalContent.onConfirm &&
                            <Button
                                onClick={() => {
                                    modalContent.onConfirm!();
                                    setShowConfirmationModal(false);
                                }}
                                variant="primary"
                                size="lg"
                                className="px-8 py-3 bg-red-600 hover:bg-red-700 border-transparent text-white"
                            >
                                כן, אני בטוח
                            </Button>
                        }
                        {(modalContent.showCancel || !modalContent.onConfirm) &&
                            <Button
                                onClick={() => setShowConfirmationModal(false)}
                                variant="outline"
                                size="lg"
                                className="px-8 py-3"
                            >
                                {modalContent.onConfirm ? "ביטול" : "סגור"}
                            </Button>
                        }
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showContactRedirectModal}
                onClose={() => setShowContactRedirectModal(false)}
                title="חסרים פרטי התקשרות"
            >
                <div className="text-center p-6">
                    <ExclamationCircleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <p className="text-lg text-gray-800 font-medium mb-8">{contactRedirectMessage}</p>
                    <div className="flex justify-center gap-6 rtl:space-x-reverse">
                        <Button
                            onClick={() => {
                                if (onContactRedirectConfirm) onContactRedirectConfirm();
                                setShowContactRedirectModal(false);
                            }}
                            variant="primary"
                        >
                            כן, עבור להגדרות הפרופיל
                        </Button>
                        <Button
                            onClick={() => setShowContactRedirectModal(false)}
                            variant="outline"
                        >
                            לא, תודה
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
