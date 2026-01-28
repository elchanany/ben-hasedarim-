import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Job, JobDifficulty, PaymentType, JobSuitability, PreferredContactMethods, JobPosterInfo, JobDateType, PaymentMethod } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Select } from '../components/Select';
import { CheckboxGroup } from '../components/CheckboxGroup';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { CustomSelect } from '../components/CustomSelect'; // Import CustomSelect
import { SearchableSelect } from '../components/SearchableSelect';
import { ISRAELI_CITIES, DEFAULT_USER_DISPLAY_NAME, getCityOptions, useTodayLabel } from '../constants';
import { Modal } from '../components/Modal';
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusCircleIcon,
  SaveIcon,
  LightBulbIcon,
  EyeIcon,
  XCircleIcon
} from '../components/icons';
// import { PaymentModal } from '../components/PaymentModal'; // Removed
import { HebrewDatePicker } from '../components/HebrewDatePicker';
import { getTodayGregorianISO, gregSourceToHebrewString, formatGregorianString } from '../utils/dateConverter';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { usePaymentSettings } from '../hooks/usePaymentSettings';
import * as jobService from '../services/jobService';

// ... (existing helper functions)

// ... (existing helper functions)


// ...




const PAYMENT_METHOD_OPTIONS = Object.values(PaymentMethod).map(pm => ({ value: pm, label: pm }));

const SUITABILITY_OPTIONS_SINGLE_SELECT = [
  { label: 'גברים', value: 'men' },
  { label: 'נשים', value: 'women' },
  { label: 'כללי', value: 'general' },
];

const PREFERRED_CONTACT_METHOD_OPTIONS_GROUP = [
  { id: 'phone', label: 'טלפון', value: 'phone' },
  { id: 'whatsapp', label: 'וואטסאפ', value: 'whatsapp' },
  { id: 'email', label: 'אימייל', value: 'email' },
];

const fieldLabels: Record<string, string> = {
  title: 'כותרת העבודה',
  area: 'עיר',
  description: 'פירוט העבודה',
  paymentType: 'סוג תשלום',
  hourlyRate: 'שכר שעתי',
  globalPayment: 'סכום גלובלי',
  suitability: 'למי העבודה מיועדת',
  minAge: 'גיל מינימלי',
  difficulty: 'רמת קושי',
  numberOfPeopleNeeded: 'מספר אנשים דרושים',
  estimatedDurationHours: 'משך העבודה בשעות',
  dateType: 'מתי העבודה דרושה',
  specificDate: 'תאריך ספציפי',
  paymentMethod: 'אופן תשלום',
  contactInfoSource: 'מקור פרטי יצירת קשר',
  contactDisplayName: 'שם איש קשר',
  contactPhone: 'טלפון ליצירת קשר',
  contactWhatsapp: 'וואטסאפ ליצירת קשר',
  contactEmail: 'אימייל ליצירת קשר',
  preferredContactMethods: 'דרכי התקשרות מועדפות',
  otherContactDetails: 'פרטי יצירת קשר (אחר/אנונימי)',
  specialRequirements: "דרישות מיוחדות",
  startTime: "שעת התחלה",
  paymentDueDate: "תאריך תשלום משוער",
  customPaymentMethod: "פירוט אמצעי תשלום",
  allowSiteMessages: "אפשר פנייה דרך מערכת ההודעות של האתר"
};


// Validation function
const validateJobForm = (formData: Partial<Job>, userFullName?: string): Record<string, string> => {
  const errors: Record<string, string> = {};
  const PHONE_REGEX = /^(0(?:5\d|7[2-9]|[2-489]))-?\d{7}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!formData.title || formData.title.length > 70 || formData.title.length < 3) errors.title = 'כותרת העבודה חייבת להכיל 3-70 תווים.';
  if (!formData.area) errors.area = 'יש לבחור עיר.';
  if (!formData.description || formData.description.length < 10) errors.description = 'פירוט העבודה חייב להכיל לפחות 10 תווים.';
  if (!formData.paymentType) errors.paymentType = 'יש לבחור סוג תשלום (שעתי/גלובלי).';
  if (formData.paymentType === PaymentType.HOURLY && (formData.hourlyRate === undefined || formData.hourlyRate <= 0)) errors.hourlyRate = 'יש להזין שכר שעתי חוקי.';
  if (formData.paymentType === PaymentType.GLOBAL && (formData.globalPayment === undefined || formData.globalPayment <= 0)) errors.globalPayment = 'יש להזין סכום גלובלי חוקי.';

  const suitability = formData.suitability;
  if (suitability) {
    const selectedCount = [suitability.men, suitability.women, suitability.general].filter(Boolean).length;
    if (selectedCount !== 1) {
      errors.suitability = 'יש לבחור בדיוק אפשרות אחת למי העבודה מיועדת (גברים, נשים או כללי).';
    }
  } else {
    errors.suitability = 'יש לבחור למי העבודה מיועדת.';
  }
  if (suitability && suitability.minAge && (suitability.minAge < 14 || suitability.minAge > 99)) errors.minAge = 'גיל מינימלי חייב להיות בין 14 ל-99.';

  if (!formData.difficulty) errors.difficulty = 'יש לבחור רמת קושי.';
  if (formData.numberOfPeopleNeeded === undefined || formData.numberOfPeopleNeeded <= 0) errors.numberOfPeopleNeeded = 'יש להזין מספר אנשים דרושים (לפחות 1).';

  if (!formData.estimatedDurationIsFlexible && (formData.estimatedDurationHours === undefined || formData.estimatedDurationHours <= 0)) {
    errors.estimatedDurationHours = 'יש להזין מספר שעות או לסמן "גמיש".';
  }

  if (!formData.dateType) errors.dateType = 'יש לבחור מתי העבודה דרושה.';
  if (formData.dateType === 'specificDate' && !formData.specificDate) errors.specificDate = 'יש לבחור תאריך ספציפי.';

  if (!formData.paymentMethod) errors.paymentMethod = 'יש לבחור אופן תשלום.';
  if (formData.paymentMethod === PaymentMethod.OTHER && !formData.customPaymentMethod?.trim()) {
    errors.customPaymentMethod = 'יש לפרט את אופן התשלום.';
  }

  if (!formData.contactInfoSource) errors.contactInfoSource = "יש לבחור מקור פרטי יצירת קשר."

  if (formData.contactInfoSource === 'other') {
    if (!formData.contactDisplayName) errors.contactDisplayName = "שם איש קשר (אחר) הוא שדה חובה.";
    if (!formData.contactPhone && !formData.contactWhatsapp && !formData.contactEmail && !formData.preferredContactMethods?.allowSiteMessages) {
      errors.otherContactDetails = "עבור איש קשר אחר, יש למלא לפחות טלפון, וואטסאפ, אימייל או לאפשר פנייה בהודעות האתר.";
    }
    if (formData.contactPhone && !PHONE_REGEX.test(formData.contactPhone)) {
      errors.contactPhone = "מספר טלפון (אחר) אינו תקין. יש להזין מספר ישראלי חוקי (לדוגמה: 0501234567).";
    }
    if (formData.contactWhatsapp && !PHONE_REGEX.test(formData.contactWhatsapp)) {
      errors.contactWhatsapp = "מספר וואטסאפ (אחר) אינו תקין. יש להזין מספר ישראלי חוקי (לדוגמה: 0501234567).";
    }
    if (formData.contactEmail && !EMAIL_REGEX.test(formData.contactEmail)) {
      errors.contactEmail = "כתובת אימייל (אחר) אינה תקינה. יש להזין כתובת חוקית (לדוגמה: example@mail.com).";
    }
  } else if (formData.contactInfoSource === 'currentUser') {
    if (!formData.contactDisplayName && !userFullName) errors.contactDisplayName = "שם איש קשר (משתמש נוכחי) חסר בפרופיל.";

    // Strict validation: If user selected a specific method, we must have that data in the profile
    if (formData.preferredContactMethods?.phone && !formData.contactPhone) {
      errors.preferredContactMethods = "בחרת ליצור קשר טלפוני, אך אין מספר טלפון בפרופיל שלך. אנא עדכן את הפרופיל או בחר דרך אחרת.";
    }
    if (formData.preferredContactMethods?.whatsapp && !formData.contactWhatsapp && !formData.contactPhone) {
      errors.preferredContactMethods = "בחרת ליצור קשר בוואטסאפ, אך אין מספר בפרופיל שלך. אנא עדכן את הפרופיל.";
    }
    if (formData.preferredContactMethods?.email && !formData.contactEmail) {
      errors.preferredContactMethods = "בחרת ליצור קשר במייל, אך אין כתובת מייל בפרופיל שלך.";
    }
  }


  const hasSelectedDirectMethod = formData.preferredContactMethods && (formData.preferredContactMethods.phone || formData.preferredContactMethods.whatsapp || formData.preferredContactMethods.email || formData.preferredContactMethods.allowSiteMessages);

  if (!hasSelectedDirectMethod) {
    errors.preferredContactMethods = "יש לבחור לפחות דרך אחת ליצירת קשר (טלפון, וואטסאפ, אימייל או הודעות באתר).";
  }

  if (formData.contactInfoSource === 'anonymous') {
    if (formData.preferredContactMethods?.phone && !formData.contactPhone) {
      errors.contactPhone = "יש למלא מספר טלפון אם נבחר כדרך יצירת קשר אנונימית.";
    } else if (formData.preferredContactMethods?.phone && formData.contactPhone && !PHONE_REGEX.test(formData.contactPhone)) {
      errors.contactPhone = "מספר טלפון אנונימי אינו תקין.";
    }
    if (formData.preferredContactMethods?.whatsapp && !formData.contactWhatsapp) {
      errors.contactWhatsapp = "יש למלא מספר וואטסאפ אם נבחר כדרך יצירת קשר אנונימית.";
    } else if (formData.preferredContactMethods?.whatsapp && formData.contactWhatsapp && !PHONE_REGEX.test(formData.contactWhatsapp)) {
      errors.contactWhatsapp = "מספר וואטסאפ אנונימי אינו תקין.";
    }
    if (formData.preferredContactMethods?.email && !formData.contactEmail) {
      errors.contactEmail = "יש למלא כתובת אימייל אם נבחרה כדרך יצירת קשר אנונימית.";
    } else if (formData.preferredContactMethods?.email && formData.contactEmail && !EMAIL_REGEX.test(formData.contactEmail)) {
      errors.contactEmail = "כתובת אימייל אנונימית אינה תקינה.";
    }
    if (!formData.preferredContactMethods?.phone && !formData.preferredContactMethods?.whatsapp && !formData.preferredContactMethods?.email && !formData.preferredContactMethods?.allowSiteMessages) {
      errors.preferredContactMethods = "בפרסום אנונימי, יש לבחור לפחות דרך התקשרות אחת (טלפון, וואטסאפ, אימייל או הודעות באתר).";
    }
  }
  return errors;
};


export const PostJobPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
  const authCtx = useContext(AuthContext);
  const { user } = useAuth();
  const editJobId = pageParams?.editJobId as string | undefined;
  const isEditMode = !!editJobId;
  const [submissionCompletedSuccessfully, setSubmissionCompletedSuccessfully] = useState(false);

  // IMPORTANT: All hooks must be called before any early returns
  const { settings: paymentSettings, loading: loadingPaymentSettings } = usePaymentSettings();
  /* Memoize city options to prevent unnecessary re-renders in SearchableSelect */
  const cityOptions = useMemo(() => getCityOptions(), []);
  const todayLabel = useTodayLabel(); // Custom hook

  const getInitialFormData = useCallback((): Partial<Job> => {
    const defaultPreferredContacts: PreferredContactMethods = { phone: true, whatsapp: false, email: false, allowSiteMessages: true };
    const baseData: Partial<Job> = {
      title: '',
      area: '',
      description: '',
      paymentType: PaymentType.HOURLY,
      hourlyRate: undefined,
      globalPayment: undefined,
      suitability: { men: false, women: false, general: true, minAge: undefined },
      difficulty: JobDifficulty.MEDIUM,
      numberOfPeopleNeeded: 1,
      estimatedDurationHours: undefined,
      estimatedDurationIsFlexible: false,
      dateType: 'today',
      specificDate: undefined,
      paymentMethod: PaymentMethod.CASH_ON_COMPLETION,
      customPaymentMethod: '',
      paymentDueDate: undefined,
      specialRequirements: '',
      contactInfoSource: 'currentUser',
      preferredContactMethods: { ...defaultPreferredContacts }
    };

    if (user && !isEditMode) {
      baseData.contactInfoSource = 'currentUser';
      baseData.contactDisplayName = user.contactPreference?.displayName || user.fullName || DEFAULT_USER_DISPLAY_NAME;
      baseData.contactPhone = user.phone;
      baseData.contactWhatsapp = user.whatsapp || '';
      baseData.contactEmail = user.email;
      baseData.preferredContactMethods = {
        phone: user.contactPreference?.showPhone ?? defaultPreferredContacts.phone,
        whatsapp: user.contactPreference?.showWhatsapp ?? defaultPreferredContacts.whatsapp,
        email: user.contactPreference?.showEmail ?? defaultPreferredContacts.email,
        allowSiteMessages: user.contactPreference?.showChat ?? defaultPreferredContacts.allowSiteMessages,
      };
    } else if (!user && !isEditMode) {
      baseData.contactInfoSource = 'other';
      baseData.contactDisplayName = '';
      baseData.contactPhone = '';
      baseData.contactWhatsapp = '';
      baseData.contactEmail = '';
      baseData.preferredContactMethods = { ...defaultPreferredContacts };
    }
    return baseData;
  }, [user, isEditMode]);

  const [formData, setFormData] = useState<Partial<Job>>(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPostedJobId, setLastPostedJobId] = useState<string | null>(null);
  const [lastPostedJobTitle, setLastPostedJobTitle] = useState<string>('');

  const [pageTitle, setPageTitle] = useState('פרסום עבודה חדשה');
  const [submitButtonText, setSubmitButtonText] = useState('פרסם את העבודה');
  const [loadingJobData, setLoadingJobData] = useState(false);
  const [globalErrorSummary, setGlobalErrorSummary] = useState<string>('');

  // New state for validation modal
  const [showContactRedirectModal, setShowContactRedirectModal] = useState(false);
  const [contactRedirectMessage, setContactRedirectMessage] = useState('');
  const [onContactRedirectConfirm, setOnContactRedirectConfirm] = useState<(() => void) | null>(null);
  const [pendingContactMethodKey, setPendingContactMethodKey] = useState<'phone' | 'whatsapp' | 'email' | null>(null);

  // Payment State (Handled by PaymentPage now)
  // const [showPaymentModal, setShowPaymentModal] = useState(false);
  // const [pendingJobData, setPendingJobData] = useState<any>(null);

  // Address logic
  const [showAddressField, setShowAddressField] = useState(false);

  /* State for notice banner - MUST be before early returns */
  const [showNoticeBanner, setShowNoticeBanner] = useState(false);

  useEffect(() => {
    if ((isEditMode || submissionCompletedSuccessfully) && formData.address) {
      setShowAddressField(true);
    }
  }, [isEditMode, submissionCompletedSuccessfully, formData.address]);

  // Custom handler for CustomSelect
  const handleDifficultyChange = (value: string | number) => {
    setFormData(prev => ({ ...prev, difficulty: value as JobDifficulty }));
    if (errors.difficulty) setErrors(prev => ({ ...prev, difficulty: '' }));
    if (globalErrorSummary) setGlobalErrorSummary('');
  };


  useEffect(() => {
    if (isEditMode && editJobId) {
      setSubmissionCompletedSuccessfully(false);
      setPageTitle('עריכת משרה');
      setSubmitButtonText('עדכן משרה');
      setLoadingJobData(true);
      const fetchJobData = async () => {
        try {
          const jobToEdit = await jobService.getJobById(editJobId);
          if (jobToEdit) {
            const preferredContacts = jobToEdit.preferredContactMethods || { phone: true, whatsapp: false, email: false, allowSiteMessages: false };
            if (typeof preferredContacts.allowSiteMessages === 'undefined') {
              preferredContacts.allowSiteMessages = false;
            }
            setFormData({
              ...getInitialFormData(),
              ...jobToEdit,
              preferredContactMethods: preferredContacts,
            });
            setLastPostedJobTitle(jobToEdit.title);
          } else {
            setErrors({ form: 'שגיאה: לא ניתן למצוא את העבודה לעריכה.' });
          }
        } catch (error) {
          console.error("Error fetching job for editing:", error);
          setErrors({ form: 'שגיאה בטעינת נתוני העבודה לעריכה.' });
        } finally {
          setLoadingJobData(false);
        }
      };
      fetchJobData();
    } else if (!submissionCompletedSuccessfully) {
      setPageTitle('פרסום עבודה חדשה');
      setSubmitButtonText('פרסם את העבודה');
      setFormData(getInitialFormData());
      setLastPostedJobTitle('');
      setLastPostedJobId(null);
    }
  }, [isEditMode, editJobId, getInitialFormData, submissionCompletedSuccessfully]);


  useEffect(() => {
    if (!isEditMode && user) {
      if (formData.contactInfoSource === 'currentUser') {
        setFormData(prev => ({
          ...prev,
          contactDisplayName: user.contactPreference?.displayName || user.fullName || DEFAULT_USER_DISPLAY_NAME,
          contactPhone: user.phone,
          contactWhatsapp: user.whatsapp || '',
          contactEmail: user.email,
          preferredContactMethods: {
            phone: user.contactPreference?.showPhone ?? true,
            whatsapp: user.contactPreference?.showWhatsapp ?? false,
            email: user.contactPreference?.showEmail ?? false,
            allowSiteMessages: user.contactPreference?.showChat ?? true,
          },
        }));
      } else if (formData.contactInfoSource === 'other' || formData.contactInfoSource === 'anonymous') {
        // When switching to 'other' or 'anonymous', align preferred methods with user settings too, 
        // but clear the actual contact details fields.
        setFormData(prev => ({
          ...prev,
          // Keep display name empty for 'other', specific text for 'anonymous' might be handled elsewhere or just blank
          contactDisplayName: prev.contactInfoSource === 'anonymous' ? 'אנונימי' : '',
          contactPhone: '',
          contactWhatsapp: '',
          contactEmail: '',
          preferredContactMethods: {
            phone: user.contactPreference?.showPhone ?? true,
            whatsapp: user.contactPreference?.showWhatsapp ?? false,
            email: user.contactPreference?.showEmail ?? false,
            allowSiteMessages: user.contactPreference?.showChat ?? true,
          },
        }));
      }
    }
  }, [user, formData.contactInfoSource, isEditMode]);

  // Notice banner effect - MUST be before early returns
  useEffect(() => {
    // Check local storage for banner status
    try {
      const isPermanentlyDismissed = localStorage.getItem('job_post_notice_dismissed');
      const viewCount = parseInt(localStorage.getItem('job_post_notice_views') || '0', 10);

      if (!isPermanentlyDismissed && viewCount < 5) {
        setShowNoticeBanner(true);
        localStorage.setItem('job_post_notice_views', (viewCount + 1).toString());
      }
    } catch (error) {
      console.error("Error accessing localStorage (banner logic):", error);
    }
  }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      if (name === 'estimatedDurationIsFlexible') {
        setFormData(prev => ({ ...prev, estimatedDurationIsFlexible: checked, estimatedDurationHours: checked ? undefined : prev.estimatedDurationHours }));
      } else if (name === 'allowSiteMessagesToggle') {
        setFormData(prev => ({
          ...prev,
          preferredContactMethods: { ...(prev.preferredContactMethods as PreferredContactMethods), allowSiteMessages: checked }
        }));
      }
      else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else if (name === 'minAge') {
      setFormData(prev => ({
        ...prev,
        suitability: {
          ...(prev.suitability as JobSuitability),
          minAge: value ? parseInt(value) : undefined
        }
      }));
    } else if (['numberOfPeopleNeeded', 'estimatedDurationHours', 'hourlyRate', 'globalPayment'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'paymentMethod' && value === PaymentMethod.CASH_ON_COMPLETION) {
      setFormData(prev => ({ ...prev, paymentMethod: value as PaymentMethod, paymentDueDate: undefined }));
    } else if (name === 'paymentMethod') {
      setFormData(prev => ({ ...prev, paymentMethod: value as PaymentMethod }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (globalErrorSummary) setGlobalErrorSummary('');
  };

  const handleDateChange = (isoDate: string | null) => {
    setFormData(prev => ({ ...prev, specificDate: isoDate || undefined }));
    if (errors.specificDate) {
      setErrors(prev => ({ ...prev, specificDate: '' }));
    }
    if (globalErrorSummary) setGlobalErrorSummary('');
  };

  const handlePaymentDueDateChange = (isoDate: string | null) => {
    setFormData(prev => ({ ...prev, paymentDueDate: isoDate || undefined }));
    if (globalErrorSummary) setGlobalErrorSummary('');
  };

  const handleSuitabilitySingleChange = (selectedValue: 'men' | 'women' | 'general') => {
    setFormData(prev => ({
      ...prev,
      suitability: {
        men: selectedValue === 'men',
        women: selectedValue === 'women',
        general: selectedValue === 'general',
        minAge: prev.suitability?.minAge
      }
    }));
    if (errors.suitability) setErrors(prev => ({ ...prev, suitability: '' }));
    if (globalErrorSummary) setGlobalErrorSummary('');
  };


  const handlePreferredContactGroupChange = (valueKey: string, checked: boolean) => {
    if (checked && formData.contactInfoSource === 'currentUser') {
      if (valueKey === 'phone' && (!user?.phone || user.phone.trim() === '')) {
        setContactRedirectMessage("לא קיים מספר טלפון בפרופיל שלך. האם תרצה לעבור להגדרות הפרופיל כדי להוסיף אותו?");
        setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
        setPendingContactMethodKey('phone');
        setShowContactRedirectModal(true);
        return; // Don't set toggle until user decides
      }
      if (valueKey === 'whatsapp' && (!user?.whatsapp || user.whatsapp.trim() === '') && (!user?.phone || user.phone.trim() === '')) {
        setContactRedirectMessage("לא קיים מספר וואטסאפ (או טלפון) בפרופיל שלך. האם תרצה לעבור להגדרות הפרופיל כדי להוסיף אותו?");
        setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
        setPendingContactMethodKey('whatsapp');
        setShowContactRedirectModal(true);
        return; // Don't set toggle until user decides
      }
      if (valueKey === 'email' && (!user?.email || user.email.trim() === '')) {
        setContactRedirectMessage("לא קיימת כתובת אימייל בפרופיל שלך. האם תרצה לעבור להגדרות הפרופיל כדי להוסיף אותה?");
        setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
        setPendingContactMethodKey('email');
        setShowContactRedirectModal(true);
        return; // Don't set toggle until user decides
      }
    }

    setFormData(prev => ({
      ...prev,
      preferredContactMethods: { ...(prev.preferredContactMethods as PreferredContactMethods), [valueKey]: checked }
    }));
    if (errors.preferredContactMethods) setErrors(prev => ({ ...prev, preferredContactMethods: '' }));
    if (globalErrorSummary) setGlobalErrorSummary('');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrors({ form: 'עליך להיות מחובר כדי לפרסם או לעדכן עבודה.' });
      setGlobalErrorSummary('');
      return;
    }

    setIsLoading(true);
    setGlobalErrorSummary('');

    // Pre-submission check for missing profile details (triggers modal instead of just error)
    if (formData.contactInfoSource === 'currentUser') {
      const methods = formData.preferredContactMethods;
      if (methods?.phone && (!user.phone || user.phone.trim() === '')) {
        setIsLoading(false);
        setContactRedirectMessage("בחרת לפרסם עם טלפון, אך חסר מספר טלפון בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותו?");
        setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
        setShowContactRedirectModal(true);
        return;
      }
      if (methods?.whatsapp && (!user.whatsapp || user.whatsapp.trim() === '') && (!user.phone || user.phone.trim() === '')) {
        setIsLoading(false);
        setContactRedirectMessage("בחרת לפרסם עם וואטסאפ, אך חסר מספר בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותו?");
        setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
        setShowContactRedirectModal(true);
        return;
      }
      if (methods?.email && (!user.email || user.email.trim() === '')) {
        setIsLoading(false);
        setContactRedirectMessage("בחרת לפרסם עם אימייל, אך חסר כתובת אימייל בפרופיל שלך. האם ברצונך לעבור להגדרות הפרופיל כדי לעדכן אותה?");
        setOnContactRedirectConfirm(() => () => setCurrentPage('profile'));
        setShowContactRedirectModal(true);
        return;
      }
    }

    const currentErrors = validateJobForm(formData, user.fullName);
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
      const errorFields = Object.keys(currentErrors)
        .map(key => fieldLabels[key] || key)
        .filter((value, index, self) => self.indexOf(value) === index);

      setGlobalErrorSummary(`אנא תקן את השגיאות הבאות: ${errorFields.join(', ')}.`);
      setIsLoading(false);
      return;
    }

    let tempJobId: string | null = null;
    try {
      const jobPosterInfo: JobPosterInfo = {
        id: user.id,
        posterDisplayName: user.contactPreference?.displayName || user.fullName || DEFAULT_USER_DISPLAY_NAME,
      };

      let jobSpecificDate: string | undefined = undefined;
      if (formData.dateType === 'today') {
        jobSpecificDate = getTodayGregorianISO();
      } else if (formData.dateType === 'specificDate') {
        jobSpecificDate = formData.specificDate;
      }

      let finalContactDisplayName = '';
      let finalContactPhone: string | undefined = undefined;
      let finalContactWhatsapp: string | undefined = undefined;
      let finalContactEmail: string | undefined = undefined;
      let finalPreferredContactMethods: PreferredContactMethods;

      const currentPreferredMethods = formData.preferredContactMethods || { phone: false, whatsapp: false, email: false, allowSiteMessages: false };


      if (formData.contactInfoSource === 'currentUser') {
        finalContactDisplayName = user.contactPreference?.displayName || user.fullName || DEFAULT_USER_DISPLAY_NAME;
        finalContactPhone = user.phone;
        finalContactWhatsapp = user.whatsapp;
        finalContactEmail = user.email;
        finalPreferredContactMethods = currentPreferredMethods;
      } else if (formData.contactInfoSource === 'other') {
        finalContactDisplayName = formData.contactDisplayName!;
        finalContactPhone = formData.contactPhone;
        finalContactWhatsapp = formData.contactWhatsapp;
        finalContactEmail = formData.contactEmail;
        finalPreferredContactMethods = currentPreferredMethods;
      } else {
        finalContactDisplayName = "אנונימי";
        finalContactPhone = formData.contactPhone;
        finalContactWhatsapp = formData.contactWhatsapp;
        finalContactEmail = formData.contactEmail;
        finalPreferredContactMethods = {
          ...currentPreferredMethods,
        };
        if (currentPreferredMethods.allowSiteMessages && !currentPreferredMethods.phone && !currentPreferredMethods.whatsapp && !currentPreferredMethods.email) {
          finalContactPhone = undefined;
          finalContactWhatsapp = undefined;
          finalContactEmail = undefined;
        }
      }

      const jobPayload: Partial<Job> = {
        title: formData.title!,
        area: formData.area!.trim(),
        description: formData.description!,
        paymentType: formData.paymentType!,
        hourlyRate: formData.paymentType === PaymentType.HOURLY ? formData.hourlyRate : undefined,
        globalPayment: formData.paymentType === PaymentType.GLOBAL ? formData.globalPayment : undefined,
        suitability: formData.suitability!,
        difficulty: formData.difficulty!,
        numberOfPeopleNeeded: formData.numberOfPeopleNeeded,
        estimatedDurationHours: formData.estimatedDurationIsFlexible ? undefined : formData.estimatedDurationHours,
        estimatedDurationIsFlexible: formData.estimatedDurationIsFlexible,
        dateType: formData.dateType as JobDateType,
        specificDate: jobSpecificDate,
        startTime: formData.startTime,
        paymentMethod: formData.paymentMethod,
        customPaymentMethod: formData.paymentMethod === PaymentMethod.OTHER ? formData.customPaymentMethod : undefined,
        paymentDueDate: formData.paymentMethod === PaymentMethod.CASH_ON_COMPLETION ? undefined : formData.paymentDueDate,
        specialRequirements: formData.specialRequirements,

        contactInfoSource: formData.contactInfoSource!,
        contactDisplayName: finalContactDisplayName,
        contactPhone: finalContactPhone,
        contactWhatsapp: finalContactWhatsapp,
        contactEmail: finalContactEmail,
        preferredContactMethods: finalPreferredContactMethods,
        address: formData.address,
      };

      setLastPostedJobTitle(jobPayload.title || 'עבודה זו');

      if (isEditMode && editJobId) {
        await jobService.updateJob(editJobId, jobPayload);
        tempJobId = editJobId;
        setLastPostedJobId(tempJobId);
        setShowSuccessModal(true);
        setErrors({});
        setGlobalErrorSummary('');
      } else {
        const newJobDataPrePayment = {
          ...jobPayload,
          title: jobPayload.title || '',
          area: jobPayload.area || '',
          description: jobPayload.description || '',
          suitability: jobPayload.suitability || [],
          difficulty: jobPayload.difficulty || JobDifficulty.EASY,
          postedBy: jobPosterInfo,
        };

        // Check if payment is required based on centralized settings
        // Admins and Super Admins bypass payment requirement
        const isUserAdmin = user.role === 'admin' || user.role === 'super_admin' || user.email?.toLowerCase() === 'eyceyceyc139@gmail.com';
        const isPaymentRequired = paymentSettings.masterSwitch && paymentSettings.enablePosterPayment && !isUserAdmin;

        if (!isPaymentRequired) {
          // Free posting for everyone (or admin bypass)
          try {
            const docRef = await jobService.addJob(newJobDataPrePayment);
            tempJobId = docRef.id;
            setLastPostedJobId(tempJobId);
            setShowSuccessModal(true);
            setErrors({});
            setGlobalErrorSummary('');
            setSubmissionCompletedSuccessfully(true);
          } catch (postError) {
            console.error('Error posting job (free):', postError);
            setErrors({ form: 'אירעה שגיאה בפרסום העבודה. נסה שוב.' });
          } finally {
            setIsLoading(false);
          }
        } else {
          // Payment required (for everyone, including subscribers)
          localStorage.setItem('pendingJobDraft', JSON.stringify(newJobDataPrePayment));
          setIsLoading(false);
          setCurrentPage('payment', {
            type: 'post_job',
            jobTitle: jobPayload.title,
            amount: paymentSettings.postJobPrice || 10
          });
        }
      }
      return;
    }

    catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'posting'} job:`, error);
      setErrors({ form: `אירעה שגיאה ב${isEditMode ? 'עדכון' : 'פרסום'} העבודה. נסה שוב.` });
    } finally {
      if (isEditMode) setIsLoading(false);
    }
  };

  // --- Persistence Hooks ---
  // Load saved draft on mount (only for new job)
  useEffect(() => {
    if (!isEditMode && !submissionCompletedSuccessfully && !editJobId) {
      const savedDraft = localStorage.getItem('savedJobPostDraft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Error loading saved draft", e);
        }
      }
    }
  }, [isEditMode, submissionCompletedSuccessfully, editJobId]);

  // Save draft on change
  useEffect(() => {
    if (!isEditMode && !submissionCompletedSuccessfully) {
      const handler = setTimeout(() => {
        localStorage.setItem('savedJobPostDraft', JSON.stringify(formData));
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [formData, isEditMode, submissionCompletedSuccessfully]);

  // Clear draft on success
  useEffect(() => {
    if (submissionCompletedSuccessfully) {
      localStorage.removeItem('savedJobPostDraft');
    }
  }, [submissionCompletedSuccessfully]);



  // Removed handlePaymentSuccess - logic moved to PaymentPage


  const difficultyOptions = Object.values(JobDifficulty).map(d => ({ value: d, label: d }));
  // todayLabel is now defined at top of component with other hooks
  const dateTypeOptions = [
    { value: 'today', label: todayLabel },
    { value: 'comingWeek', label: 'בשבוע הקרוב' },
    { value: 'flexibleDate', label: 'לא משנה (תאריך גמיש)' },
    { value: 'specificDate', label: 'לתאריך ספציפי' },
  ];

  const royalBlueLabelClassName = "block text-sm font-medium text-royal-blue mb-1 text-right";
  const royalBlueLegendClassName = "text-lg font-semibold text-royal-blue mb-3 text-right";


  if (!user && formData.contactInfoSource === 'currentUser' && !isEditMode) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-red-600 mb-4">נדרשת התחברות</h2>
        <p className="text-gray-700 mb-6">עליך להתחבר לחשבונך כדי לפרסם עבודה חדשה.</p>
        <Button onClick={() => setCurrentPage('login')} variant="primary">התחברות</Button>
      </div>
    );
  }

  if (loadingJobData) {
    return <div className="text-center p-10">טוען נתוני עבודה לעריכה...</div>;
  }

  const contactSourceButtonStyle = (source: 'currentUser' | 'other' | 'anonymous') =>
    `w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50
    ${formData.contactInfoSource === source
      ? 'bg-royal-blue text-white border-royal-blue shadow-lg ring-royal-blue/70'
      : 'bg-white text-royal-blue border-gray-300 hover:border-royal-blue hover:shadow-md disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed'
    }`;

  // handleDismissNotice function - not a hook so can be here
  const handleDismissNotice = () => {
    try {
      localStorage.setItem('job_post_notice_dismissed', 'true');
      setShowNoticeBanner(false);
    } catch (error) {
      console.error("Error setting localStorage (dismiss banner):", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 sm:p-8 rounded-xl shadow-2xl my-4 sm:my-8">
      <style>{`
        .tap-highlight-transparent {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
      <h1 className="text-2xl sm:text-3xl font-bold text-royal-blue mb-6 text-center border-b pb-4">{pageTitle}</h1>

      {/* הודעה חשובה */}
      {showNoticeBanner && (
        <div className="bg-gradient-to-r from-royal-blue to-deep-pink p-4 sm:p-6 rounded-xl mb-8 text-white shadow-lg animate-fade-in-down">
          <div className="flex items-start">
            <ClockIcon className="w-8 h-8 ml-3 rtl:mr-3 rtl:ml-0 text-white flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm leading-relaxed mb-4">
                <strong>לתשומת לבכם:</strong> פלטפורמת 'בין הסדורים' מיועדת לפרסום עבודות זמניות, חד-פעמיות או מזדמנות בלבד, ולא למשרות קבועות או ארוכות טווח. אנא הקפידו על כך.
              </p>
              <Button
                onClick={handleDismissNotice}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/40 !py-1 !px-4 text-xs backdrop-blur-sm"
              >
                הבנתי
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* הודעה על קו טלפוני */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex items-start gap-3">
        <div className="text-2xl">📞</div>
        <div>
          <p className="text-emerald-800 text-sm font-medium">
            <strong>חדש!</strong> המודעה שלך תפורסם גם בקו הטלפוני שלנו, כך שגם מי שאין לו גישה לאינטרנט יוכל למצוא אותה.
          </p>
          <p className="text-emerald-600 text-xs mt-1">
            ניתן להאזין לעבודות בטלפון: <span className="font-mono font-bold">073-318-2610</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>

        {/* פרטי העבודה הבסיסיים */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-xl sm:text-2xl font-bold text-royal-blue mb-6 text-center">פרטי העבודה הבסיסיים</h2>
          <div className="space-y-4">
            <Input label="כותרת העבודה" id="title" name="title" value={formData.title || ''} onChange={handleChange} error={errors.title} maxLength={70} required labelClassName={royalBlueLabelClassName} inputClassName="text-base" />

            <div>
              <SearchableSelect
                label="באיזו עיר מדובר?"
                options={cityOptions}
                value={formData.area || ''}
                onChange={(val) => handleChange({ target: { name: 'area', value: val } } as any)}
                placeholder="התחל להקליד או בחר מהרשימה..."
                className="mb-1"
              />
              {errors.area && <p className="mt-1 text-xs text-red-600 text-right">{errors.area}</p>}
            </div>

            <div className="md:col-span-2">
              {!showAddressField ? (
                <button
                  type="button"
                  onClick={() => setShowAddressField(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-royal-blue text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-royal-blue transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-royal-blue/20"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  הוסף כתובת מדוייקת (אופציונלי)
                </button>
              ) : (
                <div className="animate-fade-in space-y-2">
                  <Input
                    label="כתובת מדוייקת (אופציונלי)"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    placeholder="לדוגמה: רחוב הרצל 15"
                    inputClassName="text-base"
                    labelClassName={royalBlueLabelClassName}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressField(false);
                      setFormData(prev => ({ ...prev, address: '' }));
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 text-xs font-medium bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors duration-150"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    הסר כתובת
                  </button>
                </div>
              )}
            </div>

            <Textarea label="פירוט של העבודה (מה היא דורשת בדיוק)" id="description" name="description" value={formData.description || ''} onChange={handleChange} error={errors.description} required rows={8} labelClassName={royalBlueLabelClassName} textareaClassName="!min-h-[200px] !bg-white border-2 border-gray-300 text-base" />
          </div>
        </div>

        {/* תשלום */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-xl sm:text-2xl font-bold text-royal-blue mb-6 text-center">תשלום</h2>
          <fieldset className="p-4 border border-gray-200 rounded-md">
            <legend className={royalBlueLegendClassName}>סוג תשלום</legend>
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-3 sm:gap-4 mt-2 mb-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentType: PaymentType.HOURLY }))}
                className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 w-full sm:w-auto px-6
                  ${formData.paymentType === PaymentType.HOURLY
                    ? 'bg-royal-blue text-white border-royal-blue shadow-lg transform sm:scale-105 ring-royal-blue/70'
                    : 'bg-white text-royal-blue border-gray-300 hover:border-royal-blue hover:shadow-md'
                  }`}
              >
                {PaymentType.HOURLY}
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentType: PaymentType.GLOBAL }))}
                className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 w-full sm:w-auto px-6
                  ${formData.paymentType === PaymentType.GLOBAL
                    ? 'bg-royal-blue text-white border-royal-blue shadow-lg transform sm:scale-105 ring-royal-blue/70'
                    : 'bg-white text-royal-blue border-gray-300 hover:border-royal-blue hover:shadow-md'
                  }`}
              >
                {PaymentType.GLOBAL}
              </button>
            </div>
            {formData.paymentType === PaymentType.HOURLY &&
              <div className="relative mt-1">
                <Input type="number" label="סכום לשעה" id="hourlyRate" name="hourlyRate" value={formData.hourlyRate || ''} onChange={handleChange} error={errors.hourlyRate} min="0" step="0.5" labelClassName={`${royalBlueLabelClassName} mb-0.5`} inputClassName="pr-7 rtl:pl-7 rtl:pr-3 py-2.5 text-base" containerClassName="mb-0" />
                <span className="absolute right-3 rtl:left-3 rtl:right-auto top-9 text-gray-500 text-base">₪</span>
              </div>
            }
            {formData.paymentType === PaymentType.GLOBAL &&
              <div className="relative mt-1">
                <Input type="number" label="סכום כולל" id="globalPayment" name="globalPayment" value={formData.globalPayment || ''} onChange={handleChange} error={errors.globalPayment} min="0" labelClassName={`${royalBlueLabelClassName} mb-0.5`} inputClassName="pr-7 rtl:pl-7 rtl:pr-3 py-2.5 text-base" containerClassName="mb-0" />
                <span className="absolute right-3 rtl:left-3 rtl:right-auto top-9 text-gray-500 text-base">₪</span>
              </div>
            }
            {errors.paymentType && <p className="mt-2 text-xs text-red-600 text-right">{errors.paymentType}</p>}
          </fieldset>

          <fieldset className="p-4 border border-gray-200 rounded-md mt-6">
            <legend className={royalBlueLegendClassName}>למי העבודה מיועדת</legend>
            <div className="flex flex-wrap justify-end gap-3 mb-3">
              {SUITABILITY_OPTIONS_SINGLE_SELECT.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSuitabilitySingleChange(opt.value as 'men' | 'women' | 'general')}
                  className={`flex-grow sm:flex-grow-0 px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50
                    ${formData.suitability && formData.suitability[opt.value as keyof JobSuitability]
                      ? 'bg-royal-blue text-white border-royal-blue shadow-lg ring-royal-blue/70'
                      : 'bg-white text-royal-blue border-gray-300 hover:border-royal-blue hover:shadow-md'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.suitability && <p className="text-xs text-red-600 text-right mb-2">{errors.suitability}</p>}
            <Input type="number" label="מגיל (אופציונלי, לדוגמה: 18)" id="minAge" name="minAge" value={formData.suitability?.minAge || ''} onChange={handleChange} error={errors.minAge} min="14" max="99" containerClassName="mt-3" labelClassName={royalBlueLabelClassName} inputClassName="text-royal-blue text-base" />
          </fieldset>

          <CustomSelect
            id="difficulty"
            label="קושי העבודה"
            options={difficultyOptions}
            value={formData.difficulty}
            onChange={handleDifficultyChange}
            error={errors.difficulty}
            placeholder="בחר רמת קושי"
            required
            labelClassName={royalBlueLabelClassName}
          />

          <Input type="number" label="כמה אנשים דרושים?" id="numberOfPeopleNeeded" name="numberOfPeopleNeeded" value={formData.numberOfPeopleNeeded || ''} onChange={handleChange} error={errors.numberOfPeopleNeeded} required min="1" labelClassName={royalBlueLabelClassName} />

          <Input type="time" label="שעת התחלה (אופציונלי, לדוגמה: 14:00)" id="startTime" name="startTime" value={formData.startTime || ''} onChange={handleChange} labelClassName={royalBlueLabelClassName} inputClassName="text-royal-blue" />

          <fieldset className="p-4 border border-gray-200 rounded-md">
            <legend className={royalBlueLegendClassName}>כמה זמן תימשך העבודה?</legend>
            <Input type="number" label="מספר שעות (אם לא גמיש)" id="estimatedDurationHours" name="estimatedDurationHours" value={formData.estimatedDurationHours || ''} onChange={handleChange} error={errors.estimatedDurationHours} min="0.5" step="0.5" disabled={formData.estimatedDurationIsFlexible} labelClassName={royalBlueLabelClassName} />

            <div className="flex items-center justify-end mt-3">
              <label htmlFor="estimatedDurationIsFlexible" className="flex items-center cursor-pointer tap-highlight-transparent">
                <span className="mr-3 rtl:ml-3 rtl:mr-0 text-sm text-dark-text">הזמן גמיש / לא ידוע מראש</span>
                <div className="relative inline-block w-10 align-middle select-none">
                  <input
                    type="checkbox"
                    id="estimatedDurationIsFlexible"
                    name="estimatedDurationIsFlexible"
                    checked={!!formData.estimatedDurationIsFlexible}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-royal-blue transition-colors duration-150"></div>
                  <div className="absolute top-0.5 left-0.5 rtl:right-0.5 rtl:left-auto w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-150 transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4"></div>
                </div>
              </label>
            </div>
          </fieldset>
        </div>

        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className={royalBlueLegendClassName}>מתי העבודה דרושה?</legend>
          <CustomSelect
            id="dateType"
            label="מתי העבודה דרושה?"
            options={dateTypeOptions}
            value={formData.dateType || ''}
            onChange={(val) => handleChange({ target: { name: 'dateType', value: val } } as any)}
            error={errors.dateType}
            placeholder="בחר מתי העבודה דרושה"
            required
            labelClassName="sr-only"
          />
          {formData.dateType === 'specificDate' && (
            <HebrewDatePicker label="בחר תאריך ספציפי" id="specificDate" value={formData.specificDate || null} onChange={handleDateChange} error={errors.specificDate} containerClassName="mt-3" required labelClassName={royalBlueLabelClassName} />
          )}
        </fieldset>

        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className={royalBlueLegendClassName}>אופן ומועד התשלום</legend>
          <CustomSelect
            id="paymentMethod"
            label="אופן התשלום"
            options={PAYMENT_METHOD_OPTIONS}
            value={formData.paymentMethod || ''}
            onChange={(val) => handleChange({ target: { name: 'paymentMethod', value: val } } as any)}
            error={errors.paymentMethod}
            placeholder="בחר אופן תשלום"
            required
            labelClassName={royalBlueLabelClassName}
          />

          {formData.paymentMethod === PaymentMethod.OTHER && (
            <div className="animate-fade-in-down mt-2">
              <Input
                label="פירוט אופן התשלום"
                name="customPaymentMethod"
                value={formData.customPaymentMethod || ''}
                onChange={handleChange}
                placeholder="לדוגמה: צ'ק, העברה בנקאית, ביט..."
                error={errors.customPaymentMethod}
                labelClassName={royalBlueLabelClassName}
              />
            </div>
          )}

          {formData.paymentMethod !== PaymentMethod.CASH_ON_COMPLETION && (
            <HebrewDatePicker
              label="תאריך תשלום משוער (אופציונלי)"
              id="paymentDueDate"
              value={formData.paymentDueDate || null}
              onChange={handlePaymentDueDateChange}
              containerClassName="mt-4"
              labelClassName={royalBlueLabelClassName}
            />
          )}
        </fieldset>

        <Textarea label="דרישות מיוחדות (שדה טקסט חופשי)" id="specialRequirements" name="specialRequirements" value={formData.specialRequirements || ''} onChange={handleChange} error={errors.specialRequirements} rows={3} labelClassName={royalBlueLabelClassName} />

        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className={royalBlueLegendClassName}>פרטי יצירת קשר למודעה</legend>
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2 mb-3">
            <button
              type="button"
              onClick={() => {
                if (!user) return;
                setFormData(prev => ({
                  ...prev,
                  contactInfoSource: 'currentUser',
                  contactDisplayName: user.contactPreference?.displayName || user.fullName || DEFAULT_USER_DISPLAY_NAME,
                  contactPhone: user.phone,
                  contactWhatsapp: user.whatsapp || '',
                  contactEmail: user.email,
                  preferredContactMethods: {
                    phone: user.contactPreference?.showPhone ?? true,
                    whatsapp: user.contactPreference?.showWhatsapp ?? false,
                    email: user.contactPreference?.showEmail ?? false,
                    allowSiteMessages: prev.preferredContactMethods?.allowSiteMessages ?? true,
                  },
                }));
                setErrors(prev => ({ ...prev, contactInfoSource: '', contactDisplayName: '', contactPhone: '', contactWhatsapp: '', contactEmail: '', otherContactDetails: '', preferredContactMethods: '' }));
                if (globalErrorSummary) setGlobalErrorSummary('');
              }}
              disabled={!user}
              className={contactSourceButtonStyle('currentUser')}
            >
              השתמש בפרטים שלי
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  contactInfoSource: 'other',
                  contactDisplayName: '',
                  contactPhone: '',
                  contactWhatsapp: '',
                  contactEmail: '',
                  preferredContactMethods: { phone: true, whatsapp: false, email: false, allowSiteMessages: true },
                }));
                setErrors(prev => ({ ...prev, contactInfoSource: '', contactDisplayName: '', contactPhone: '', contactWhatsapp: '', contactEmail: '', otherContactDetails: '', preferredContactMethods: '' }));
                if (globalErrorSummary) setGlobalErrorSummary('');
              }}
              className={contactSourceButtonStyle('other')}
            >
              פרטים של איש קשר אחר
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  contactInfoSource: 'anonymous',
                  contactDisplayName: "אנונימי",
                  contactPhone: '',
                  contactWhatsapp: '',
                  contactEmail: '',
                  preferredContactMethods: { phone: false, whatsapp: false, email: false, allowSiteMessages: true },
                }));
                setErrors(prev => ({ ...prev, contactInfoSource: '', contactDisplayName: '', contactPhone: '', contactWhatsapp: '', contactEmail: '', otherContactDetails: '', preferredContactMethods: '' }));
                if (globalErrorSummary) setGlobalErrorSummary('');
              }}
              className={contactSourceButtonStyle('anonymous')}
            >
              פרסום אנונימי
            </button>
          </div>
          {errors.contactInfoSource && <p className="mt-1 text-xs text-red-600 text-right">{errors.contactInfoSource}</p>}

          {formData.contactInfoSource === 'other' && (
            <div className="space-y-4 mt-3 p-3 border rounded-md bg-light-blue animate-fade-in-down">
              <Input label="שם איש קשר (כפי שיופיע במודעה)" id="contactDisplayNameOther" name="contactDisplayName" value={formData.contactDisplayName || ''} onChange={handleChange} error={errors.contactDisplayName} required labelClassName={royalBlueLabelClassName} placeholder="" />
              <Input label="טלפון (איש קשר אחר)" id="contactPhoneOther" name="contactPhone" type="tel" value={formData.contactPhone || ''} onChange={handleChange} error={errors.contactPhone} labelClassName={royalBlueLabelClassName} />
              <Input label="וואטסאפ (איש קשר אחר)" id="contactWhatsappOther" name="contactWhatsapp" type="tel" value={formData.contactWhatsapp || ''} onChange={handleChange} error={errors.contactWhatsapp} labelClassName={royalBlueLabelClassName} />
              <Input label="אימייל (איש קשר אחר)" id="contactEmailOther" name="contactEmail" type="email" value={formData.contactEmail || ''} onChange={handleChange} error={errors.contactEmail} labelClassName={royalBlueLabelClassName} />
              {errors.otherContactDetails && <p className="mt-1 text-xs text-red-600 text-right">{errors.otherContactDetails}</p>}
            </div>
          )}
          {formData.contactInfoSource === 'currentUser' && user && (
            <div className="mt-3 p-3 border border-light-blue/30 rounded-md bg-light-blue/10 animate-fade-in-down">
              <p className="text-sm text-gray-700"><strong>שם לתצוגה במודעה:</strong> {formData.contactDisplayName || (user.contactPreference?.displayName || user.fullName)}</p>
              <p className="text-sm text-gray-700"><strong>טלפון:</strong> {user.phone}</p>
              {user.whatsapp && <p className="text-sm text-gray-700"><strong>וואטסאפ:</strong> {user.whatsapp}</p>}
              <p className="text-sm text-gray-700"><strong>אימייל:</strong> {user.email}</p>
              <p className="text-xs text-gray-500 mt-1">פרטים אלו יילקחו מהפרופיל שלך. ניתן לשנות את ברירות המחדל באזור האישי.</p>
            </div>
          )}
          {formData.contactInfoSource === 'anonymous' && (
            <div className="space-y-4 mt-3 p-3 border border-light-blue/30 rounded-md bg-light-blue/10 animate-fade-in-down">
              <p className="text-sm text-gray-700 font-semibold text-right">
                המודעה תפורסם תחת השם "אנונימי".
                הזן למטה את פרטי ההתקשרות הישירים (טלפון, וואטסאפ, אימייל) שיוצגו במודעה זו בלבד, או אשר קבלת פניות דרך מערכת ההודעות של האתר.
                פרטי הפרופיל האישיים שלך לא ישותפו.
              </p>
              <Input label="טלפון (יוצג במודעה האנונימית)" id="contactPhoneAnonymous" name="contactPhone" type="tel" value={formData.contactPhone || ''} onChange={handleChange} error={errors.contactPhone} labelClassName={royalBlueLabelClassName} />
              <Input label="וואטסאפ (יוצג במודעה האנונימית)" id="contactWhatsappAnonymous" name="contactWhatsapp" type="tel" value={formData.contactWhatsapp || ''} onChange={handleChange} error={errors.contactWhatsapp} labelClassName={royalBlueLabelClassName} />
              <Input label="אימייל (יוצג במודעה האנונימית)" id="contactEmailAnonymous" name="contactEmail" type="email" value={formData.contactEmail || ''} onChange={handleChange} error={errors.contactEmail} labelClassName={royalBlueLabelClassName} />
            </div>
          )}


          <fieldset className="mt-4">
            <legend className={`${royalBlueLabelClassName} mb-1`}>איך תרצו שיפנו אליכם?</legend>
            <CheckboxGroup
              name="preferredContactGroup"
              options={PREFERRED_CONTACT_METHOD_OPTIONS_GROUP}
              selectedValues={new Set(['phone', 'whatsapp', 'email'].filter((k) => (formData.preferredContactMethods as PreferredContactMethods)?.[k as keyof PreferredContactMethods] === true))}
              onChange={handlePreferredContactGroupChange}
              legendClassName="sr-only"
              optionLabelClassName="text-sm text-dark-text"
            />

            <label
              htmlFor="allowSiteMessagesToggle"
              className="flex items-center cursor-pointer justify-end tap-highlight-transparent mt-3"
            >
              <span className="text-sm text-dark-text mr-3 rtl:ml-3 rtl:mr-0">אפשר פנייה דרך מערכת ההודעות של האתר</span>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  id="allowSiteMessagesToggle"
                  name="allowSiteMessagesToggle"
                  checked={formData.preferredContactMethods?.allowSiteMessages ?? false}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-royal-blue transition-colors duration-150 ease-in-out"></div>
                <div className="absolute top-0.5 left-0.5 rtl:right-0.5 rtl:left-auto w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-150 ease-in-out transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4"></div>
              </div>
            </label>
            {formData.contactInfoSource === 'anonymous' && formData.preferredContactMethods?.allowSiteMessages && (
              <p className="text-xs text-gray-500 mt-1 mr-1 rtl:ml-1 rtl:mr-0 text-right">
                בבחירה זו, ההתכתבות תתבצע גם היא בצורה אנונימית והצד השני לא יראה את פרטיך.
              </p>
            )}
          </fieldset>

          {errors.preferredContactMethods && <p className="mt-1 text-xs text-red-700 text-right bg-red-50 p-2 rounded-md">{errors.preferredContactMethods}</p>}
        </fieldset>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-6 mb-4 flex items-start text-blue-800 shadow-sm">
          <LightBulbIcon className="w-7 h-7 ml-3 rtl:mr-3 rtl:ml-0 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>שימו לב:</strong> לאחר שהעבודה נתפסה או שאינה רלוונטית עוד, חשוב מאוד למחוק את המודעה דרך 'העבודות שפרסמתי' בפרופיל האישי. כך נשמור יחד על מאגר עבודות עדכני ויעיל לכולם.
          </p>
        </div>

        {globalErrorSummary && <p className="mb-4 text-center text-sm text-red-700 bg-red-50 p-4 rounded-lg border border-red-200 animate-fade-in">{globalErrorSummary}</p>}
        {errors.form && <p className="text-center text-sm text-red-700 bg-red-50 p-4 rounded-lg border border-red-200 mt-2 animate-fade-in">{errors.form}</p>}

        <Button type="submit" variant="secondary" size="lg" className="w-full" isLoading={isLoading} icon={isEditMode ? <SaveIcon className="w-6 h-6" /> : <PlusCircleIcon className="w-6 h-6" />}>
          {isLoading ? (isEditMode ? 'מעדכן...' : 'מפרסם...') : submitButtonText}
        </Button>
      </form>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setLastPostedJobId(null);
          setSubmissionCompletedSuccessfully(false);
        }}
        title={isEditMode ? "עדכון הושלם!" : "פרסום הושלם בהצלחה!"}
        titleId="post-job-success-modal-title"
      >
        <div className="text-center p-6">
          <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />
          <p className="text-2xl text-gray-800 font-medium mb-8">
            העבודה "{lastPostedJobTitle}" {isEditMode ? 'עודכנה' : 'פורסמה'} בהצלחה!
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 w-full">
            {isEditMode ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    const jobIdToNavigate = lastPostedJobId;
                    setShowSuccessModal(false);
                    setLastPostedJobId(null);
                    setSubmissionCompletedSuccessfully(false);
                    if (jobIdToNavigate) setCurrentPage('jobDetails', { jobId: jobIdToNavigate });
                  }}
                  icon={<EyeIcon className="w-5 h-5" />}
                  size="lg"
                  className="flex-1 px-4 py-3 justify-center w-full"
                >
                  צפה במודעה
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLastPostedJobId(null);
                    setSubmissionCompletedSuccessfully(false);
                    setCurrentPage('profile');
                  }}
                  size="lg"
                  className="flex-1 px-4 py-3 justify-center w-full"
                >
                  חזור לפרופיל
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    const jobIdToNavigate = lastPostedJobId;
                    setShowSuccessModal(false);
                    setLastPostedJobId(null);
                    setSubmissionCompletedSuccessfully(false);
                    if (jobIdToNavigate) {
                      setCurrentPage('jobDetails', { jobId: jobIdToNavigate });
                    } else {
                      console.error("View Ad (New Job): lastPostedJobId was null. Cannot navigate.");
                      setCurrentPage('home'); // Fallback if ID is missing
                    }
                  }}
                  icon={<EyeIcon className="w-5 h-5" />}
                  size="lg"
                  className="flex-1 px-4 py-3 justify-center w-full shadow-lg hover:scale-105 transition-transform"
                >
                  צפה במודעה
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLastPostedJobId(null);
                    setSubmissionCompletedSuccessfully(false);
                    setFormData(getInitialFormData());
                  }}
                  size="lg"
                  className="flex-1 px-4 py-3 justify-center w-full hover:bg-blue-50 transition-colors border-2"
                >
                  פרסם עבודה נוספת
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLastPostedJobId(null);
                    setSubmissionCompletedSuccessfully(false);
                    setCurrentPage('home');
                  }}
                  size="lg"
                  className="flex-1 px-4 py-3 justify-center w-full shadow-md hover:bg-pink-700 transition-colors"
                >
                  חזרה לדף הבית
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showContactRedirectModal}
        onClose={() => setShowContactRedirectModal(false)}
        title="חסרים פרטי התקשרות"
      >
        <div className="text-center p-6">
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
              onClick={() => {
                // User said No - do NOT enable the toggle, just close the modal
                // (toggle was never set because we returned early in handlePreferredContactGroupChange)
                setPendingContactMethodKey(null);
                setShowContactRedirectModal(false);
              }}
              variant="outline"
            >
              לא, תודה
            </Button>
          </div>
        </div>
      </Modal>

      {/* PaymentModal removed - using PaymentPage instead */}
    </div>
  );
};