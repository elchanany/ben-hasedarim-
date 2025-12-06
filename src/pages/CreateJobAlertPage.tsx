
import React, { useState, useEffect, useCallback } from 'react';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { JobAlertPreference, JobDifficulty, PaymentType, PaymentMethod, JobDateType, JobAlertDeliveryMethods } from '../types';
import * as notificationService from '../services/notificationService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { CheckboxGroup } from '../components/CheckboxGroup';
import { RangeInputGroup } from '../components/RangeInputGroup';
import { HebrewDatePicker } from '../components/HebrewDatePicker';
import { BellIcon, PlusCircleIcon, SaveIcon } from '../components/icons';
import {
    ISRAELI_CITIES, JOB_DIFFICULTY_FILTER_OPTIONS, useDateTypeOptions, SUITABILITY_FOR_OPTIONS, PAYMENT_KIND_OPTIONS, PAYMENT_METHOD_FILTER_OPTIONS, DURATION_FLEXIBILITY_OPTIONS
} from '../constants';

const JobAlertFrequencyOptions = [
    { value: 'instant', label: 'מיידית (ברגע שמשרה מתאימה מתפרסמת)' },
    { value: 'daily', label: 'יומית (סיכום פעם ביום)' },
    { value: 'weekly', label: 'שבועית (סיכום פעם בשבוע)' },
];

const DAYS_OF_WEEK_OPTIONS = [
    { id: '0', value: '0', label: 'ראשון' },
    { id: '1', value: '1', label: 'שני' },
    { id: '2', value: '2', label: 'שלישי' },
    { id: '3', value: '3', label: 'רביעי' },
    { id: '4', value: '4', label: 'חמישי' },
    { id: '5', value: '5', label: 'שישי' },
];

const initialAlertFormData: Partial<Omit<JobAlertPreference, 'id' | 'userId' | 'lastChecked'>> = {
    name: '',
    location: '',
    difficulty: '',
    dateType: '',
    specificDateStart: null,
    specificDateEnd: null,
    minEstimatedDurationHours: '',
    maxEstimatedDurationHours: '',
    filterDurationFlexible: 'any',
    paymentKind: 'any',
    minHourlyRate: '',
    maxHourlyRate: '',
    minGlobalPayment: '',
    maxGlobalPayment: '',
    selectedPaymentMethods: new Set<PaymentMethod>(),
    minPeopleNeeded: '',
    maxPeopleNeeded: '',
    suitabilityFor: 'any',
    minAge: '',
    maxAge: '',
    frequency: 'daily',
    isActive: true,
    notificationDays: [0, 1, 2, 3, 4, 5],
    doNotDisturbHours: { start: "22:00", end: "07:00" },
    deliveryMethods: { site: true, email: false, whatsapp: false, tzintuk: false },
    alertEmail: '',
    alertWhatsappPhone: '',
    alertTzintukPhone: '',
};

export const CreateJobAlertPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
    const { user } = useAuth();
    const editingAlertId = pageParams?.alertId as string | undefined;
    const isEditMode = !!editingAlertId;

    const [alertFormData, setAlertFormData] = useState<Partial<Omit<JobAlertPreference, 'id' | 'userId' | 'lastChecked'>>>(initialAlertFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    
    useEffect(() => {
        const initialData = {
            ...initialAlertFormData,
            alertEmail: user?.email || '',
            alertWhatsappPhone: user?.whatsapp || user?.phone || '',
            alertTzintukPhone: user?.phone || '',
        };

        if (isEditMode && editingAlertId && user) {
            setIsLoading(true);
            notificationService.getJobAlertPreferences(user.id)
                .then(alerts => {
                    const alertToEdit = alerts.find(a => a.id === editingAlertId);
                    if (alertToEdit) {
                        setAlertFormData({
                            name: alertToEdit.name,
                            location: alertToEdit.location || '',
                            difficulty: alertToEdit.difficulty || '',
                            dateType: alertToEdit.dateType || '',
                            specificDateStart: alertToEdit.specificDateStart || null,
                            specificDateEnd: alertToEdit.specificDateEnd || null,
                            minEstimatedDurationHours: alertToEdit.minEstimatedDurationHours || '',
                            maxEstimatedDurationHours: alertToEdit.maxEstimatedDurationHours || '',
                            filterDurationFlexible: alertToEdit.filterDurationFlexible || 'any',
                            paymentKind: alertToEdit.paymentKind || 'any',
                            minHourlyRate: alertToEdit.minHourlyRate || '',
                            maxHourlyRate: alertToEdit.maxHourlyRate || '',
                            minGlobalPayment: alertToEdit.minGlobalPayment || '',
                            maxGlobalPayment: alertToEdit.maxGlobalPayment || '',
                            selectedPaymentMethods: new Set(alertToEdit.selectedPaymentMethods || []),
                            minPeopleNeeded: alertToEdit.minPeopleNeeded || '',
                            maxPeopleNeeded: alertToEdit.maxPeopleNeeded || '',
                            suitabilityFor: alertToEdit.suitabilityFor || 'any',
                            minAge: alertToEdit.minAge || '',
                            maxAge: alertToEdit.maxAge || '',
                            frequency: alertToEdit.frequency || 'daily',
                            isActive: alertToEdit.isActive === undefined ? true : alertToEdit.isActive,
                            notificationDays: alertToEdit.notificationDays || [0,1,2,3,4,5],
                            doNotDisturbHours: alertToEdit.doNotDisturbHours || {start: "22:00", end: "07:00"},
                            deliveryMethods: { site: true, email: false, whatsapp: false, tzintuk: false },
                            alertEmail: alertToEdit.alertEmail || user?.email || '',
                            alertWhatsappPhone: alertToEdit.alertWhatsappPhone || user?.whatsapp || user?.phone || '',
                            alertTzintukPhone: alertToEdit.alertTzintukPhone || user?.phone || '',
                        });
                    } else {
                        setPageError("ההתראה לעריכה לא נמצאה.");
                        setAlertFormData(initialData); // Fallback to initial if not found
                    }
                })
                .catch(err => {
                    console.error("Error fetching alert for editing:", err);
                    setPageError("שגיאה בטעינת ההתראה לעריכה.");
                    setAlertFormData(initialData); // Fallback on error
                })
                .finally(() => setIsLoading(false));
        } else {
            setAlertFormData(initialData);
        }
    }, [isEditMode, editingAlertId, user]);


    const handleAlertFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'doNotDisturbStart' || name === 'doNotDisturbEnd') {
            setAlertFormData(prev => ({
                ...prev,
                doNotDisturbHours: {
                    ...(prev.doNotDisturbHours || { start: '22:00', end: '07:00' }),
                    [name === 'doNotDisturbStart' ? 'start' : 'end']: value
                }
            }));
        } else if (type === 'checkbox' && name === 'isActive') {
            setAlertFormData(prev => ({ ...prev, isActive: checked }));
        }
         else { // Handles text inputs including alertEmail, alertWhatsappPhone, alertTzintukPhone
            setAlertFormData(prev => ({ ...prev, [name]: value }));
        }
    };
  
    const handleAlertPaymentMethodChange = (valueKey: string, checked: boolean) => {
        setAlertFormData(prev => {
            const newSet = new Set(prev.selectedPaymentMethods);
            if (checked) newSet.add(valueKey as PaymentMethod);
            else newSet.delete(valueKey as PaymentMethod);
            return { ...prev, selectedPaymentMethods: newSet };
        });
    };

    const handleAlertDateChange = (fieldName: 'specificDateStart' | 'specificDateEnd', date: string | null) => {
        setAlertFormData(prev => ({ ...prev, [fieldName]: date }));
    };
  
    const handleNotificationDaysChange = (dayValue: string, checked: boolean) => {
        const dayNumber = parseInt(dayValue, 10);
        setAlertFormData(prev => {
            const currentDays = prev.notificationDays || [];
            const newDays = checked 
                ? [...currentDays, dayNumber] 
                : currentDays.filter(d => d !== dayNumber);
            return { ...prev, notificationDays: Array.from(new Set(newDays)).sort((a,b) => a-b) };
        });
    };

    const handleSaveAlert = async () => {
        if (!user || !alertFormData.name) {
            setPageError("שם ההתראה הוא שדה חובה.");
            return;
        }
        setIsLoading(true);
        setPageError(null);

        const finalAlertData: Omit<JobAlertPreference, 'id' | 'userId' | 'lastChecked' > = {
            name: alertFormData.name || 'התראה ללא שם',
            location: alertFormData.location || '',
            difficulty: alertFormData.difficulty || '',
            dateType: alertFormData.dateType || '',
            specificDateStart: alertFormData.specificDateStart || null,
            specificDateEnd: alertFormData.specificDateEnd || null,
            minEstimatedDurationHours: alertFormData.minEstimatedDurationHours || '',
            maxEstimatedDurationHours: alertFormData.maxEstimatedDurationHours || '',
            filterDurationFlexible: alertFormData.filterDurationFlexible || 'any',
            paymentKind: alertFormData.paymentKind || 'any',
            minHourlyRate: alertFormData.minHourlyRate || '',
            maxHourlyRate: alertFormData.maxHourlyRate || '',
            minGlobalPayment: alertFormData.minGlobalPayment || '',
            maxGlobalPayment: alertFormData.maxGlobalPayment || '',
            selectedPaymentMethods: alertFormData.selectedPaymentMethods || new Set(),
            minPeopleNeeded: alertFormData.minPeopleNeeded || '',
            maxPeopleNeeded: alertFormData.maxPeopleNeeded || '',
            suitabilityFor: alertFormData.suitabilityFor || 'any',
            minAge: alertFormData.minAge || '',
            maxAge: alertFormData.maxAge || '',
            frequency: alertFormData.frequency || 'daily',
            isActive: alertFormData.isActive === undefined ? true : alertFormData.isActive,
            notificationDays: alertFormData.notificationDays || [0,1,2,3,4,5],
            doNotDisturbHours: alertFormData.doNotDisturbHours || {start: "22:00", end: "07:00"},
            deliveryMethods: { site: true, email: false, whatsapp: false, tzintuk: false }, // Forced
            alertEmail: alertFormData.alertEmail || '',
            alertWhatsappPhone: alertFormData.alertWhatsappPhone || '',
            alertTzintukPhone: alertFormData.alertTzintukPhone || '',
        };

        try {
          if (isEditMode && editingAlertId) {
            await notificationService.updateJobAlertPreference(user.id, editingAlertId, finalAlertData);
          } else {
            await notificationService.addJobAlertPreference(user.id, finalAlertData);
          }
          setCurrentPage('notifications', { tab: 'alerts' });
        } catch (error) {
          console.error("Error saving job alert:", error);
          setPageError("שגיאה בשמירת ההתראה. נסו שוב.");
        } finally {
            setIsLoading(false);
        }
    };
  
    const cityOptions = [{ value: '', label: 'כל הארץ' }, ...ISRAELI_CITIES.map(city => ({ value: city.name, label: city.name }))];

    if (isLoading && isEditMode) { 
        return <div className="text-center p-10">טוען נתוני התראה...</div>;
    }
    if (pageError && !isEditMode) { // Show page error more prominently if not loading for edit
        return <div className="text-center p-10 text-red-500">{pageError} <Button onClick={() => setCurrentPage('notifications', {tab: 'alerts'})}>חזור להתראות</Button></div>;
    }
    
    return (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-2xl my-8">
            <h1 className="text-3xl font-bold text-royal-blue mb-6 text-center border-b pb-4">
                {isEditMode ? "עריכת התראת עבודה" : "יצירת התראת עבודה חדשה"}
            </h1>
            {pageError && <p className="mb-4 text-center text-sm text-red-600 bg-red-100 p-3 rounded-md">{pageError}</p>}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveAlert(); }} className="space-y-6">
                <fieldset className="p-4 border border-light-blue/30 rounded-md bg-light-blue/10">
                    <legend className="text-lg font-semibold text-royal-blue mb-2 px-1">פרטי התראה בסיסיים</legend>
                    <Input label="שם ההתראה (לזיהוי אישי)" name="name" value={alertFormData.name || ''} onChange={handleAlertFormChange} required />
                    <Select label="תדירות קבלת התראות" name="frequency" options={JobAlertFrequencyOptions} value={alertFormData.frequency || 'daily'} onChange={handleAlertFormChange} />
                    <div className="flex items-center justify-end mt-3">
                        <label htmlFor="isActiveAlertPage" className="ml-2 rtl:mr-2 rtl:ml-0 text-sm text-gray-700">התראה פעילה</label>
                        <input type="checkbox" id="isActiveAlertPage" name="isActive" checked={alertFormData.isActive ?? true} onChange={handleAlertFormChange} className="h-4 w-4 text-royal-blue border-gray-300 rounded focus:ring-royal-blue"/>
                    </div>
                </fieldset>

                <fieldset className="p-4 border border-light-blue/30 rounded-md bg-light-blue/10">
                    <legend className="text-lg font-semibold text-royal-blue mb-2 px-1">סינון משרות</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="אזור" name="location" options={cityOptions} value={alertFormData.location || ''} onChange={handleAlertFormChange} />
                        <Select label="רמת קושי" name="difficulty" options={JOB_DIFFICULTY_FILTER_OPTIONS} value={alertFormData.difficulty || ''} onChange={handleAlertFormChange} />
                        <Select label="זמינות העבודה" name="dateType" options={useDateTypeOptions()} value={alertFormData.dateType || ''} onChange={handleAlertFormChange} />
                    </div>
                    {alertFormData.dateType === 'specificDate' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <HebrewDatePicker label="מתאריך" value={alertFormData.specificDateStart || null} onChange={(date) => handleAlertDateChange('specificDateStart', date)} id="alert_specificDateStart_page" />
                            <HebrewDatePicker label="עד תאריך" value={alertFormData.specificDateEnd || null} onChange={(date) => handleAlertDateChange('specificDateEnd', date)} id="alert_specificDateEnd_page" />
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <RangeInputGroup label="משך משוער (שעות)" minName="minEstimatedDurationHours" minValue={alertFormData.minEstimatedDurationHours || ''} onMinChange={handleAlertFormChange} maxName="maxEstimatedDurationHours" maxValue={alertFormData.maxEstimatedDurationHours || ''} onMaxChange={handleAlertFormChange} unitSymbol="שעות" disabled={alertFormData.filterDurationFlexible === 'yes'}/>
                        <Select label="האם משך הזמן גמיש?" name="filterDurationFlexible" options={DURATION_FLEXIBILITY_OPTIONS} value={alertFormData.filterDurationFlexible || 'any'} onChange={handleAlertFormChange} />
                        <Select label="סוג תשלום" name="paymentKind" options={PAYMENT_KIND_OPTIONS} value={alertFormData.paymentKind || 'any'} onChange={handleAlertFormChange} />
                    </div>
                    {(alertFormData.paymentKind === 'any' || alertFormData.paymentKind === PaymentType.HOURLY) && (
                        <RangeInputGroup containerClassName="mt-4" label="שכר שעתי" minName="minHourlyRate" minValue={alertFormData.minHourlyRate || ''} onMinChange={handleAlertFormChange} maxName="maxHourlyRate" maxValue={alertFormData.maxHourlyRate || ''} onMaxChange={handleAlertFormChange} unitSymbol="₪ לשעה"/>
                    )}
                    {(alertFormData.paymentKind === 'any' || alertFormData.paymentKind === PaymentType.GLOBAL) && (
                        <RangeInputGroup containerClassName="mt-4" label="שכר גלובלי" minName="minGlobalPayment" minValue={alertFormData.minGlobalPayment|| ''} onMinChange={handleAlertFormChange} maxName="maxGlobalPayment" maxValue={alertFormData.maxGlobalPayment || ''} onMaxChange={handleAlertFormChange} unitSymbol="₪ סהכ"/>
                    )}
                    <div className="mt-4">
                        <CheckboxGroup legend="אופן תשלום" name="alert_selectedPaymentMethods_page" options={PAYMENT_METHOD_FILTER_OPTIONS} selectedValues={alertFormData.selectedPaymentMethods || new Set()} onChange={handleAlertPaymentMethodChange} legendClassName="text-sm font-medium text-gray-700 mb-1 text-right" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <RangeInputGroup label="מספר אנשים דרושים" minName="minPeopleNeeded" minValue={alertFormData.minPeopleNeeded || ''} onMinChange={handleAlertFormChange} maxName="maxPeopleNeeded" maxValue={alertFormData.maxPeopleNeeded || ''} onMaxChange={handleAlertFormChange} unitSymbol="אנשים"/>
                        <Select label="מיועד ל..." name="suitabilityFor" options={SUITABILITY_FOR_OPTIONS} value={alertFormData.suitabilityFor || 'any'} onChange={handleAlertFormChange} />
                        <RangeInputGroup label="גיל המועמד" minName="minAge" minValue={alertFormData.minAge || ''} onMinChange={handleAlertFormChange} maxName="maxAge" maxValue={alertFormData.maxAge || ''} onMaxChange={handleAlertFormChange} unitSymbol="שנים"/>
                    </div>
                </fieldset>

                <fieldset className="p-4 border border-light-blue/30 rounded-md bg-light-blue/10">
                    <legend className="text-lg font-semibold text-royal-blue mb-2 px-1">תזמון קבלת התראות</legend>
                    <CheckboxGroup
                        legend="באילו ימים לקבל התראות?"
                        name="notificationDaysGroupPage"
                        options={DAYS_OF_WEEK_OPTIONS}
                        selectedValues={new Set((alertFormData.notificationDays || []).map(String))}
                        onChange={handleNotificationDaysChange}
                        legendClassName="text-sm font-medium text-gray-700 mb-1 text-right"
                    />
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שעות "נא לא להפריע" (התראות לא יישלחו בשעות אלו)</label>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <Input type="time" name="doNotDisturbStart" value={alertFormData.doNotDisturbHours?.start || "22:00"} onChange={handleAlertFormChange} containerClassName="mb-0 flex-1" />
                            <span className="text-gray-500">עד</span>
                            <Input type="time" name="doNotDisturbEnd" value={alertFormData.doNotDisturbHours?.end || "07:00"} onChange={handleAlertFormChange} containerClassName="mb-0 flex-1" />
                        </div>
                    </div>
                </fieldset>
          
                <fieldset className="p-4 border border-light-blue/30 rounded-md bg-light-blue/10">
                    <legend className="text-lg font-semibold text-royal-blue mb-2 px-1">אמצעי קבלת התראה (בנוסף לאתר)</legend>
                    <p className="text-xs text-gray-500 mb-3">ההתראות יופיעו תמיד באזור "התראות מערכת" באתר. אפשרויות נוספות בפיתוח ויופיעו כאן לבחירה.</p>
                    
                    {/* Email Alert Option */}
                    <div className="opacity-50 cursor-not-allowed p-3 border-b border-gray-200" title="אפשרות זו בפיתוח ואינה פעילה">
                        <label className="flex items-center justify-end cursor-not-allowed">
                            <span className="mr-3 rtl:ml-3 rtl:mr-0 text-sm text-gray-500">התראות באימייל</span>
                            <div className="relative inline-block w-10 align-middle select-none">
                                <input type="checkbox" checked={false} readOnly disabled className="sr-only peer"/>
                                <div className="block w-10 h-6 bg-gray-300 rounded-full"></div>
                                <div className="absolute top-0.5 left-0.5 rtl:right-0.5 rtl:left-auto w-5 h-5 bg-white rounded-full shadow-md"></div>
                            </div>
                        </label>
                        <Input label="כתובת אימייל לקבלת התראות אלו" name="alertEmail" type="email" value={alertFormData.alertEmail || ''} onChange={handleAlertFormChange} disabled containerClassName="mt-2" placeholder={user?.email || "your@email.com"} />
                        <p className="text-xs text-gray-400 mt-1 text-right">בפיתוח: תקבל אימייל עם רשימת משרות תואמות וקישורים.</p>
                    </div>

                    {/* WhatsApp Alert Option */}
                     <div className="opacity-50 cursor-not-allowed p-3 border-b border-gray-200" title="אפשרות זו בפיתוח ואינה פעילה">
                        <label className="flex items-center justify-end cursor-not-allowed">
                            <span className="mr-3 rtl:ml-3 rtl:mr-0 text-sm text-gray-500">התראות בוואטסאפ</span>
                             <div className="relative inline-block w-10 align-middle select-none">
                                <input type="checkbox" checked={false} readOnly disabled className="sr-only peer"/>
                                <div className="block w-10 h-6 bg-gray-300 rounded-full"></div>
                                <div className="absolute top-0.5 left-0.5 rtl:right-0.5 rtl:left-auto w-5 h-5 bg-white rounded-full shadow-md"></div>
                            </div>
                        </label>
                        <Input label="מספר וואטסאפ לקבלת התראות אלו" name="alertWhatsappPhone" type="tel" value={alertFormData.alertWhatsappPhone || ''} onChange={handleAlertFormChange} disabled containerClassName="mt-2" placeholder={user?.whatsapp || user?.phone || "05X-XXXXXXX"} />
                        <p className="text-xs text-gray-400 mt-1 text-right">בפיתוח: תקבל הודעת וואטסאפ עם רשימת משרות תואמות וקישורים.</p>
                    </div>

                    {/* Tzintuk Alert Option */}
                    <div className="opacity-50 cursor-not-allowed p-3" title="אפשרות זו בפיתוח ואינה פעילה">
                        <label className="flex items-center justify-end cursor-not-allowed">
                            <span className="mr-3 rtl:ml-3 rtl:mr-0 text-sm text-gray-500">התראות בצינתוק (שיחה קולית)</span>
                            <div className="relative inline-block w-10 align-middle select-none">
                                <input type="checkbox" checked={false} readOnly disabled className="sr-only peer"/>
                                <div className="block w-10 h-6 bg-gray-300 rounded-full"></div>
                                <div className="absolute top-0.5 left-0.5 rtl:right-0.5 rtl:left-auto w-5 h-5 bg-white rounded-full shadow-md"></div>
                            </div>
                        </label>
                        <Input label="מספר טלפון לקבלת צינתוקים" name="alertTzintukPhone" type="tel" value={alertFormData.alertTzintukPhone || ''} onChange={handleAlertFormChange} disabled containerClassName="mt-2" placeholder={user?.phone || "05X-XXXXXXX"} />
                        <p className="text-xs text-gray-400 mt-1 text-right">בפיתוח: תקבל שיחה קולית עם פרטי המשרות התואמות, כולל תפריט קולי לשמיעת פרטים.</p>
                    </div>
                    <p className="text-sm text-orange-600 mt-3 text-center bg-yellow-50 p-2 rounded-md border border-yellow-300">
                        אפשרויות קבלת התראה נוספות (אימייל, וואטסאפ, צינתוק) בפיתוח ויהיו זמינות בקרוב.
                    </p>
                </fieldset>

                <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentPage('notifications', { tab: 'alerts' })}>ביטול</Button>
                    <Button type="submit" variant="primary" isLoading={isLoading} icon={isEditMode ? <SaveIcon className="w-5 h-5" /> : <PlusCircleIcon className="w-5 h-5" />}>
                        {isLoading ? (isEditMode ? 'מעדכן...' : 'יוצר...') : (isEditMode ? "שמור שינויים" : "צור התראה")}
                    </Button>
                </div>
            </form>
        </div>
    );
};
