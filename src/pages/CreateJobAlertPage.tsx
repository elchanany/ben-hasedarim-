
import React, { useState, useEffect } from 'react';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { JobAlertPreference, PaymentType, PaymentMethod } from '../types';
import * as notificationService from '../services/notificationService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { RangeInputGroup } from '../components/RangeInputGroup';
import { HebrewDatePicker } from '../components/HebrewDatePicker';
import { SearchableSelect } from '../components/SearchableSelect';
import { SelectionChips } from '../components/SelectionChips';
import { CheckboxGroup } from '../components/CheckboxGroup';
import {
    CheckCircleIcon,
    ArrowRightIcon,
    MapPinIcon,
    ClockIcon,
    CashIcon,
    BriefcaseIcon,
    ExclamationCircleIcon,
    BellIcon,
    CalendarDaysIcon,
    ArrowTopRightOnSquareIcon
} from '../components/icons';
import {
    ISRAELI_CITIES,
    JOB_DIFFICULTY_FILTER_OPTIONS,
    useDateTypeOptions,
    SUITABILITY_FOR_OPTIONS,
    PAYMENT_KIND_OPTIONS,
    PAYMENT_METHOD_FILTER_OPTIONS,
    getCityOptions
} from '../constants';
import { Modal } from '../components/Modal';

const JobAlertFrequencyOptions = [
    { value: 'instant', label: 'מיידית', icon: <BellIcon className="w-4 h-4" /> },
    { value: 'daily', label: 'פעם ביום', icon: <CalendarDaysIcon className="w-4 h-4" /> },
    { value: 'weekly', label: 'פעם בשבוע', icon: <CalendarDaysIcon className="w-4 h-4" /> },
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
    frequency: 'instant',
    isActive: true,
    notificationDays: [0, 1, 2, 3, 4, 5],
    doNotDisturbHours: undefined, // Default off
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
    const [currentStep, setCurrentStep] = useState(1);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [doNotDisturbEnabled, setDoNotDisturbEnabled] = useState(false);

    const totalSteps = 2;

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
                            notificationDays: alertToEdit.notificationDays || [0, 1, 2, 3, 4, 5],
                            doNotDisturbHours: alertToEdit.doNotDisturbHours,
                            deliveryMethods: { site: true, email: false, whatsapp: false, tzintuk: false },
                            alertEmail: alertToEdit.alertEmail || user?.email || '',
                            alertWhatsappPhone: alertToEdit.alertWhatsappPhone || user?.whatsapp || user?.phone || '',
                            alertTzintukPhone: alertToEdit.alertTzintukPhone || user?.phone || '',
                        });
                        setDoNotDisturbEnabled(!!alertToEdit.doNotDisturbHours);
                    } else {
                        setPageError("ההתראה לעריכה לא נמצאה.");
                        setAlertFormData(initialData);
                        setDoNotDisturbEnabled(false);
                    }
                })
                .catch(err => {
                    console.error("Error fetching alert for editing:", err);
                    setPageError("שגיאה בטעינת ההתראה לעריכה.");
                    setAlertFormData(initialData);
                })
                .finally(() => setIsLoading(false));
        } else {
            setAlertFormData(initialData);
            setDoNotDisturbEnabled(false);
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
        else {
            setAlertFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleValueChange = (name: string, value: any) => {
        setAlertFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAlertPaymentMethodChange = (valueKey: string) => {
        setAlertFormData(prev => {
            const newSet = new Set(prev.selectedPaymentMethods);
            if (newSet.has(valueKey as PaymentMethod)) {
                newSet.delete(valueKey as PaymentMethod);
            } else {
                newSet.add(valueKey as PaymentMethod);
            }
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
            return { ...prev, notificationDays: Array.from(new Set(newDays)).sort((a, b) => a - b) };
        });
    };

    const handleNextStep = () => {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSaveAlert = async () => {
        if (!user) return;

        // Generate generic name if missing
        let alertName = alertFormData.name;
        if (!alertName || alertName.trim() === '') {
            const loc = alertFormData.location || 'כל הארץ';
            // Shorten logic for generic name relies on some defaults
            alertName = `התראה: ${loc}`;
        }

        setIsLoading(true);
        setPageError(null);

        const finalAlertData: Omit<JobAlertPreference, 'id' | 'userId' | 'lastChecked'> = {
            name: alertName,
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
            frequency: alertFormData.frequency || 'instant',
            isActive: alertFormData.isActive === undefined ? true : alertFormData.isActive,
            notificationDays: alertFormData.notificationDays || [0, 1, 2, 3, 4, 5],
            doNotDisturbHours: doNotDisturbEnabled ? (alertFormData.doNotDisturbHours || { start: "22:00", end: "07:00" }) : undefined,
            deliveryMethods: { site: true, email: false, whatsapp: false, tzintuk: false },
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
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error saving job alert:", error);
            setPageError("שגיאה בשמירת ההתראה. נסו שוב.");
        } finally {
            setIsLoading(false);
        }
    };

    const cityOptions = getCityOptions();
    const dateTypeOptions = useDateTypeOptions();

    if (isLoading && isEditMode) {
        return <div className="text-center p-10">טוען נתוני התראה...</div>;
    }
    if (pageError && !isEditMode) {
        return <div className="text-center p-10 text-red-500">{pageError} <Button onClick={() => setCurrentPage('notifications', { tab: 'alerts' })}>חזור להתראות</Button></div>;
    }

    const royalBlueLabelClassName = "block text-sm font-medium text-royal-blue mb-2 text-right";

    return (
        <div className="max-w-3xl mx-auto bg-white p-4 sm:p-8 rounded-xl shadow-2xl my-4 sm:my-8 min-h-[500px] flex flex-col relative">
            <h1 className="text-2xl sm:text-3xl font-bold text-royal-blue mb-6 text-center">
                {isEditMode ? "עריכת התראה" : "יצירת התראה חדשה"}
            </h1>



            {/* Custom Animations for Stepper */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }
                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
                .animate-pulse-ring {
                    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            {/* Stepper */}
            <div className="flex justify-between items-center mb-10 relative px-6 sm:px-24">
                {/* Grey background track */}
                <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-100 rounded-full -z-0 mx-12 sm:mx-28 overflow-hidden shadow-inner"></div>

                {/* Animated Gradient Progress Track */}
                <div
                    className="absolute top-1/2 h-2 rounded-full -z-0 transition-all duration-700 ease-in-out shadow-lg shadow-blue-500/20 animate-gradient-x right-[3rem] left-[3rem] sm:right-[7rem] sm:left-[7rem]"
                    style={{
                        marginRight: '2px', // Slight adjustment for alignment
                        marginLeft: '2px',
                        width: currentStep === 2 ? 'auto' : '0%',
                        background: 'linear-gradient(270deg, #3b82f6, #6366f1, #8b5cf6, #3b82f6)' // Blue -> Indigo -> Purple -> Blue
                    }}
                ></div>

                {[1, 2].map((step) => (
                    <div key={step} className={`relative z-10 flex flex-col items-center cursor-pointer group ${step <= currentStep ? 'text-royal-blue' : 'text-gray-400'}`}>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-[3px] font-bold text-xl transition-all duration-500 transform
                                ${step === currentStep
                                ? 'border-transparent text-white bg-gradient-to-br from-blue-600 to-indigo-600 animate-pulse-ring scale-110 shadow-xl'
                                : step < currentStep
                                    ? 'border-transparent bg-green-500 text-white shadow-lg scale-100'
                                    : 'border-gray-200 bg-white text-gray-300 group-hover:border-blue-200 group-hover:text-blue-300'
                            }`}
                        >
                            {step < currentStep ? (
                                <CheckCircleIcon className="w-8 h-8 animate-fade-in" />
                            ) : (
                                <span>{step}</span>
                            )}
                        </div>
                        <span className={`absolute -bottom-8 w-max text-sm font-bold tracking-wide transition-all duration-300 transform ${step === currentStep ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 scale-105' : step < currentStep ? 'text-green-600' : 'text-gray-400 group-hover:text-blue-400'}`}>
                            {step === 1 ? 'פרטי התראה' : 'הגדרות נוספות'}
                        </span>
                    </div>
                ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); }} className="flex-grow space-y-6" noValidate>
                {/* Step 1: Matching Criteria */}
                {currentStep === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <section className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPinIcon className="w-5 h-5 text-deep-pink" />
                                <h3 className="text-lg font-bold text-royal-blue">אזור וסוג עבודה</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <SearchableSelect
                                        label="אזור (עיר)"
                                        options={cityOptions}
                                        value={alertFormData.location || ''}
                                        onChange={(val) => handleValueChange('location', val)}
                                        placeholder="בחר עיר..."
                                    />
                                </div>
                                <div>
                                    <SelectionChips
                                        label="רמת קושי"
                                        options={JOB_DIFFICULTY_FILTER_OPTIONS}
                                        selectedValues={alertFormData.difficulty || ''}
                                        onChange={(val) => handleValueChange('difficulty', val)}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <SelectionChips
                                            label="למי מתאים?"
                                            options={SUITABILITY_FOR_OPTIONS}
                                            selectedValues={alertFormData.suitabilityFor || 'any'}
                                            onChange={(val) => handleValueChange('suitabilityFor', val)}
                                        />
                                        <RangeInputGroup
                                            label="גילאים"
                                            minName="minAge"
                                            minValue={alertFormData.minAge || ''}
                                            onMinChange={handleAlertFormChange}
                                            maxName="maxAge"
                                            maxValue={alertFormData.maxAge || ''}
                                            onMaxChange={handleAlertFormChange}
                                            unitSymbol=""
                                            labelClassName={royalBlueLabelClassName}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <ClockIcon className="w-5 h-5 text-deep-pink" />
                                <h3 className="text-lg font-bold text-royal-blue">זמינות</h3>
                            </div>
                            <SelectionChips
                                label="מתי לעבוד?"
                                options={dateTypeOptions}
                                selectedValues={alertFormData.dateType || ''}
                                onChange={(val) => handleValueChange('dateType', val)}
                            />
                            {alertFormData.dateType === 'specificDate' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <HebrewDatePicker label="מתאריך" value={alertFormData.specificDateStart || null} onChange={(date) => handleAlertDateChange('specificDateStart', date)} id="alert_specificDateStart_page" />
                                    <HebrewDatePicker label="עד תאריך" value={alertFormData.specificDateEnd || null} onChange={(date) => handleAlertDateChange('specificDateEnd', date)} id="alert_specificDateEnd_page" />
                                </div>
                            )}
                        </section>

                        <section className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <CashIcon className="w-5 h-5 text-deep-pink" />
                                <h3 className="text-lg font-bold text-royal-blue">תשלום</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <SelectionChips
                                    label="סוג תשלום"
                                    options={PAYMENT_KIND_OPTIONS}
                                    selectedValues={alertFormData.paymentKind || 'any'}
                                    onChange={(val) => handleValueChange('paymentKind', val)}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(alertFormData.paymentKind === 'any' || alertFormData.paymentKind === PaymentType.HOURLY) && (
                                        <RangeInputGroup label="שכר שעתי (₪)" minName="minHourlyRate" minValue={alertFormData.minHourlyRate || ''} onMinChange={handleAlertFormChange} maxName="maxHourlyRate" maxValue={alertFormData.maxHourlyRate || ''} onMaxChange={handleAlertFormChange} unitSymbol="₪" labelClassName={royalBlueLabelClassName} />
                                    )}
                                    {(alertFormData.paymentKind === 'any' || alertFormData.paymentKind === PaymentType.GLOBAL) && (
                                        <RangeInputGroup label="שכר גלובלי (₪)" minName="minGlobalPayment" minValue={alertFormData.minGlobalPayment || ''} onMinChange={handleAlertFormChange} maxName="maxGlobalPayment" maxValue={alertFormData.maxGlobalPayment || ''} onMaxChange={handleAlertFormChange} unitSymbol="₪" labelClassName={royalBlueLabelClassName} />
                                    )}
                                </div>
                            </div>
                            <div className="mt-4">
                                <SelectionChips
                                    label="אופן תשלום מועדף"
                                    options={PAYMENT_METHOD_FILTER_OPTIONS}
                                    selectedValues={alertFormData.selectedPaymentMethods || new Set()}
                                    onChange={handleAlertPaymentMethodChange}
                                    multiSelect={true}
                                />
                            </div>
                        </section>
                    </div>
                )}


                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <Input
                            label="שם ההתראה (אופציונלי)"
                            name="name"
                            value={alertFormData.name || ''}
                            onChange={handleAlertFormChange}
                            labelClassName={royalBlueLabelClassName}
                            placeholder="השאר ריק לשם אוטומטי"
                        />

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-lg font-bold text-royal-blue mb-3">תדירות עדכונים</h3>
                            <SelectionChips
                                options={JobAlertFrequencyOptions}
                                selectedValues={alertFormData.frequency || 'instant'}
                                onChange={(val) => handleValueChange('frequency', val)}
                                labelClassName={royalBlueLabelClassName}
                            />
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-lg font-bold text-royal-blue mb-3">תזמון וזמנים</h3>
                            <CheckboxGroup
                                legend="באילו ימים לקבל התראות?"
                                name="notificationDaysGroupPage"
                                options={DAYS_OF_WEEK_OPTIONS}
                                selectedValues={new Set((alertFormData.notificationDays || []).map(String))}
                                onChange={handleNotificationDaysChange}
                                legendClassName="text-sm font-medium text-gray-700 mb-2 block"
                            />

                            <div className="mt-4 border-t pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="block text-sm font-medium text-gray-700">לא להפריע לי בשעות הלילה?</span>
                                        {/* Updated Toggle with better text positioning */}
                                        <label className="inline-flex items-center cursor-pointer flex-shrink-0 gap-3" dir="rtl">
                                            <div className="relative inline-flex items-center" dir="ltr">
                                                <input
                                                    type="checkbox"
                                                    checked={doNotDisturbEnabled}
                                                    onChange={(e) => setDoNotDisturbEnabled(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-[44px] h-[24px] bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-royal-blue shadow-inner"></div>
                                            </div>
                                        </label>
                                    </div>

                                    {doNotDisturbEnabled && (
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <Input type="time" name="doNotDisturbStart" value={alertFormData.doNotDisturbHours?.start || '22:00'} onChange={handleAlertFormChange} containerClassName="mb-0 flex-1" />
                                            <span>עד</span>
                                            <Input type="time" name="doNotDisturbEnd" value={alertFormData.doNotDisturbHours?.end || '07:00'} onChange={handleAlertFormChange} containerClassName="mb-0 flex-1" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                <span className="text-royal-blue font-bold text-lg">סטטוס התראה</span>
                                <label className="inline-flex items-center cursor-pointer flex-shrink-0 gap-3" dir="rtl">
                                    <span className={`text-sm font-bold transition-colors ${alertFormData.isActive ? 'text-royal-blue' : 'text-gray-400'}`}>
                                        {alertFormData.isActive ? 'פעילה' : 'מושהית'}
                                    </span>
                                    <div className="relative inline-flex items-center" dir="ltr">
                                        <input type="checkbox" name="isActive" checked={alertFormData.isActive ?? true} onChange={handleAlertFormChange} className="sr-only peer" />
                                        <div className="w-[44px] h-[24px] bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-royal-blue shadow-md"></div>
                                    </div>
                                </label>
                            </div>

                            {pageError && <p className="text-red-600 text-center font-bold bg-red-50 p-2 rounded">{pageError}</p>}
                        </div>
                    </div>
                )}
            </form>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center bg-white sticky bottom-0 z-20 pb-2">
                {currentStep > 1 ? (
                    <Button onClick={handlePrevStep} variant="outline" className="flex items-center gap-2" icon={<ArrowRightIcon className="w-4 h-4" />}>
                        חזור
                    </Button>
                ) : (
                    <Button onClick={() => setCurrentPage('notifications', { tab: 'job_alerts' })} variant="outline" className="text-gray-500 hover:text-red-500 border-gray-200 hover:border-red-200">
                        ביטול
                    </Button>
                )}

                {currentStep < totalSteps ? (
                    <Button onClick={handleNextStep} variant="primary" className="flex items-center gap-2 bg-royal-blue pl-6 pr-4">
                        המשך <ArrowRightIcon className="w-4 h-4 rotate-180" />
                    </Button>
                ) : (
                    <Button onClick={handleSaveAlert} variant="secondary" className="flex items-center gap-2 bg-deep-pink text-white hover:bg-pink-700 pl-8 pr-8" isLoading={isLoading}>
                        {isEditMode ? 'עדכן התראה' : 'צור התראה'} <CheckCircleIcon className="w-5 h-5" />
                    </Button>
                )}
            </div>

            <Modal
                isOpen={showSuccessModal}
                onClose={() => { setShowSuccessModal(false); setCurrentPage('notifications', { tab: 'alerts' }); }}
                title={isEditMode ? "ההתראה עודכנה!" : "ההתראה נוצרה בהצלחה!"}
            >
                <div className="text-center p-6">
                    <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />
                    <p className="text-gray-700 mb-6">
                        {isEditMode ? 'שינויים נשמרו בהצלחה.' : 'כעת תקבל עדכונים שוטפים על משרות המתאימות לקריטריונים שהגדרת.'}
                    </p>
                    <Button onClick={() => { setShowSuccessModal(false); setCurrentPage('notifications', { tab: 'alerts' }); }} variant="primary" className="w-full justify-center">
                        מעולה, תודה!
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
