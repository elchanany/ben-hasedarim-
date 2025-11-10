
import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CheckboxGroup } from '../components/CheckboxGroup';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { User, ContactPreference, Job } from '../types'; 
import { updateUserProfile } from '../services/authService'; 
import * as jobService from '../services/jobService';
import { UserIcon, BriefcaseIcon, BellIcon, PlusCircleIcon, EditIcon, TrashIcon } from '../components/icons'; 
import { Modal } from '../components/Modal';
import { Select } from '../components/Select'; 
import { gregSourceToHebrewString, formatRelativePostedDate, formatGregorianString, formatDateByPreference } from '../utils/dateConverter';
import { AuthContext } from '../contexts/AuthContext';

export const ProfilePage: React.FC<PageProps> = ({ setCurrentPage }) => {
  const { user, updateUserContext, loadingAuth } = useAuth();
  const authCtx = useContext(AuthContext);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [contactPreference, setContactPreference] = useState<ContactPreference>({
    showPhone: true, showWhatsapp: false, showEmail: false, displayName: ''
  });
  const [currentPassword, setCurrentPassword] = useState(''); 
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalContent, setModalContent] = useState({title: '', message: '', onConfirm: (() => {}) as (() => void | Promise<void>) | null, confirmText: 'אישור', showCancel: false, titleId: 'confirmation-modal-title' });

  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const labelTextClass = 'text-dark-text';
  const legendTextClass = 'text-dark-text';

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp || '',
      });
      setContactPreference(user.contactPreference || { showPhone: true, showWhatsapp: false, showEmail: false, displayName: user.fullName });
    }
  }, [user]);

  const fetchPostedJobs = useCallback(async () => {
    if (user?.id) {
      setLoadingJobs(true);
      try {
        const jobs = await jobService.getJobsByUserId(user.id);
        setPostedJobs(jobs);
      } catch (err) {
        console.error("Error fetching posted jobs:", err);
        setErrorMessage("שגיאה בטעינת העבודות שפרסמת.");
      } finally {
        setLoadingJobs(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPostedJobs();
  }, [fetchPostedJobs]);


  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleContactPreferenceChange = (value: string, checked: boolean) => {
    setContactPreference(prev => ({ ...prev, [value]: checked }));
  };
  
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactPreference(prev => ({ ...prev, displayName: e.target.value }));
  };

  const openModal = (title: string, message: string, onConfirmCallback: (() => void | Promise<void>) | null = null, showCancelButton = false, confirmButtonText = 'אישור', titleId = 'confirmation-modal-title') => {
    setModalContent({ title, message, onConfirm: onConfirmCallback, showCancel: showCancelButton, confirmText: confirmButtonText, titleId });
    setShowConfirmationModal(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    setSuccessMessage('');
    setErrorMessage('');

    const phoneRegex = /^(05\d|0[2-4,8,9,77])(-?\d){7}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
        setErrorMessage('מספר טלפון לא תקין.');
        setIsUpdatingProfile(false);
        return;
    }
     if (formData.whatsapp && !phoneRegex.test(formData.whatsapp)) {
        setErrorMessage('מספר וואטסאפ לא תקין.');
        setIsUpdatingProfile(false);
        return;
    }

    try {
      const updatedUserData = {
        ...user,
        ...formData,
        whatsapp: formData.whatsapp || formData.phone, 
        contactPreference: {...contactPreference, displayName: contactPreference.displayName || formData.fullName || user.fullName},
      } as User; 

      const result = await updateUserProfile(user.id, updatedUserData); 
      await updateUserContext(result); 
      openModal("הצלחה", "הפרופיל עודכן בהצלחה!", () => setShowConfirmationModal(false), false, "הבנתי", "profile-update-success-title");
    } catch (err: any) {
      setErrorMessage(err.message || 'שגיאה בעדכון הפרופיל.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingPassword(true);
    setSuccessMessage('');
    setErrorMessage('');

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('הסיסמאות החדשות אינן תואמות.');
      setIsUpdatingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('הסיסמה החדשה חייבת להכיל לפחות 6 תווים.');
      setIsUpdatingPassword(false);
      return;
    }

    try {
      // In a real app, replace with actual Firebase password change logic
      // This would involve re-authenticating the user if the action is sensitive.
      // For demonstration, we'll simulate a successful change.
      console.log("Password change attempt (mocked). Current pass:", currentPassword);
      openModal("הצלחה", "הסיסמה שונתה בהצלחה (הדגמה - לא בוצע שינוי אמיתי)!", () => setShowConfirmationModal(false), false, "הבנתי", "password-change-success-title");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'שגיאה בשינוי הסיסמה (הדגמה).');
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  
  const contactCheckboxes = [
    { id: 'profileShowPhone', label: 'הצג טלפון כברירת מחדל', value: 'showPhone' },
    { id: 'profileShowWhatsapp', label: 'הצג וואטסאפ כברירת מחדל', value: 'showWhatsapp' },
    { id: 'profileShowEmail', label: 'הצג אימייל כברירת מחדל', value: 'showEmail' },
  ];

  const sortedJobs = useMemo(() => {
    return [...postedJobs].sort((a, b) => {
      const dateA = new Date(a.postedDate).getTime();
      const dateB = new Date(b.postedDate).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [postedJobs, sortOrder]);

  const handleEditJob = (jobId: string) => {
    setCurrentPage('postJob', { editJobId: jobId });
  };

  const handleDeleteJob = async (job: Job) => {
    openModal(
      "אישור מחיקה",
      `האם אתה בטוח שברצונך למחוק את המשרה "${job.title}"? לא ניתן לשחזר פעולה זו.`,
      async () => {
        try {
          await jobService.deleteJob(job.id);
          fetchPostedJobs(); 
          openModal("הצלחה", "המשרה נמחקה בהצלחה.", () => setShowConfirmationModal(false), false, "הבנתי", "job-delete-success-title");
        } catch (error: any) {
          console.error("Error deleting job:", error);
          openModal("שגיאה", error.message || "אירעה שגיאה במחיקת המשרה.", () => setShowConfirmationModal(false), false, "הבנתי", "job-delete-error-title");
        }
      },
      true,
      "כן, מחק משרה",
      "job-delete-confirm-title"
    );
  };


  if (loadingAuth || !user) {
    return <div role="status" aria-live="polite" className="text-center p-10 text-dark-text">טוען נתוני משתמש...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b">
            <div className="flex items-center mb-3 sm:mb-0">
                <UserIcon className="w-12 h-12 text-royal-blue mr-4 rtl:ml-4 rtl:mr-0" aria-hidden="true"/>
                <h1 className="text-3xl font-bold text-royal-blue">אזור אישי - {user.fullName}</h1>
            </div>
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage('notifications')}
                icon={<BellIcon className="w-4 h-4"/>}
                className="self-start sm:self-center"
                aria-label="עבור לדף התראות והודעות"
            >
                ניהול התראות והודעות
            </Button>
        </div>

        {errorMessage && <p id="profile-error-summary" className="mb-4 text-center text-sm text-red-700 bg-red-100 p-3 rounded-md" role="alert" aria-live="assertive">{errorMessage}</p>}
        {successMessage && <p className="mb-4 text-center text-sm text-green-700 bg-green-100 p-3 rounded-md" role="status" aria-live="polite">{successMessage}</p>}
        
        <form onSubmit={handleProfileSubmit} className="space-y-6 mb-10" aria-labelledby="profile-details-heading" aria-describedby={errorMessage ? "profile-error-summary" : undefined}>
          <h2 id="profile-details-heading" className="text-xl font-semibold text-deep-pink border-b border-pink-200 pb-2 mb-4">עריכת פרטים אישיים</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="שם מלא" id="profileFullName" name="fullName" value={formData.fullName || ''} onChange={handleProfileChange} required labelClassName={labelTextClass} />
            <Input label="אימייל (לא ניתן לשינוי)" id="profileEmail" name="email" type="email" value={formData.email || ''} readOnly disabled labelClassName={labelTextClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="טלפון" id="profilePhone" name="phone" type="tel" value={formData.phone || ''} onChange={handleProfileChange} required placeholder="05X-XXXXXXX" labelClassName={labelTextClass}/>
            <Input label="וואטסאפ (אם שונה מהטלפון)" id="profileWhatsapp" name="whatsapp" type="tel" value={formData.whatsapp || ''} onChange={handleProfileChange} placeholder="05X-XXXXXXX" labelClassName={labelTextClass}/>
          </div>
          
          <fieldset className="p-4 border border-gray-200 rounded-md">
            <legend className={`text-lg font-medium ${legendTextClass} px-2`}>הגדרות תצוגת פרטי קשר (ברירת מחדל)</legend>
             <Input 
                label="שם לתצוגה במודעות (ברירת מחדל)" 
                id="profileDisplayName" 
                name="displayName" 
                value={contactPreference.displayName || ''} 
                onChange={handleDisplayNameChange}
                containerClassName="my-3"
                required
                labelClassName={labelTextClass} 
            />
            <CheckboxGroup
                legend="אילו פרטי התקשרות להציג במודעות שתפרסם?"
                name="contactPreferenceGroupProfile"
                options={contactCheckboxes}
                selectedValues={new Set(Object.entries(contactPreference).filter(([, val]) => val === true && typeof val === 'boolean').map(([key]) => key))}
                onChange={handleContactPreferenceChange}
                legendClassName={`sr-only ${legendTextClass}`}
                optionLabelClassName={labelTextClass}
            />
             <p className="text-xs text-medium-text mt-2 text-right">הערה: תוכל לשנות הגדרות אלו פרטנית לכל מודעה בעת הפרסום.</p>
          </fieldset>

          <Button type="submit" variant="primary" isLoading={isUpdatingProfile} className="w-full sm:w-auto">
            {isUpdatingProfile ? 'מעדכן פרופיל...' : 'שמור שינויים בפרופיל'}
          </Button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="space-y-6 pt-6 border-t border-gray-200" aria-labelledby="change-password-heading" aria-describedby={errorMessage ? "profile-error-summary" : undefined}>
          <h2 id="change-password-heading" className="text-xl font-semibold text-deep-pink border-b border-pink-200 pb-2 mb-4">שינוי סיסמה</h2>
          <Input label="סיסמה נוכחית" id="currentPassword" name="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required labelClassName={labelTextClass}/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="סיסמה חדשה (לפחות 6 תווים)" id="newPassword" name="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required labelClassName={labelTextClass}/>
            <Input label="אימות סיסמה חדשה" id="confirmNewPassword" name="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required labelClassName={labelTextClass}/>
          </div>
          <Button type="submit" variant="secondary" isLoading={isUpdatingPassword} className="w-full sm:w-auto">
            {isUpdatingPassword ? 'משנה סיסמה...' : 'שנה סיסמה'}
          </Button>
        </form>
      </div>

      <section aria-labelledby="posted-jobs-heading" className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b">
            <h2 id="posted-jobs-heading" className="text-2xl font-bold text-royal-blue flex items-center mb-3 sm:mb-0">
                <BriefcaseIcon className="w-8 h-8 mr-3 rtl:ml-3 rtl:mr-0" aria-hidden="true"/>
                העבודות שפרסמתי
            </h2>
            <div className="flex items-center space-x-2 rtl:space-x-reverse self-start sm:self-center">
                <label htmlFor="job-sort-order" className="text-sm text-dark-text">מיין לפי:</label>
                <Select
                    id="job-sort-order"
                    options={[
                        { value: 'newest', label: 'חדש לישן' },
                        { value: 'oldest', label: 'ישן לחדש' }
                    ]}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    selectClassName="py-1 text-xs !mt-0"
                    containerClassName="mb-0"
                />
            </div>
        </div>
        {loadingJobs ? (
            <p role="status" aria-live="polite" className="text-center text-medium-text py-8">טוען עבודות...</p>
        ) : sortedJobs.length === 0 ? (
            <div className="text-center py-8">
                <p className="text-medium-text mb-4">עדיין לא פרסמת עבודות.</p>
                <Button variant="secondary" onClick={() => setCurrentPage('postJob')} icon={<PlusCircleIcon className="w-5 h-5"/>}>
                    פרסם עבודה ראשונה
                </Button>
            </div>
        ) : (
            <ul className="space-y-4">
                {sortedJobs.map(job => {
                    const isActive = jobService.isJobDateValidForSearch(job);
                    return (
                        <li key={job.id} className={`p-4 border rounded-lg ${isActive ? 'bg-green-50 border-green-300' : 'bg-gray-100 border-gray-300 opacity-75'}`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start">
                                <div className="flex-grow">
                                    <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                                        <h3 className="text-lg font-semibold text-royal-blue">
                                          <button onClick={() => setCurrentPage('jobDetails', { jobId: job.id })} className="hover:text-deep-pink focus:outline-none focus-visible:underline">
                                            {job.title}
                                          </button>
                                        </h3>
                                        <span className="text-sm text-gray-400 font-mono" aria-hidden="true">#{job.id.substring(0,6)}..</span>
                                    </div>
                                    <p className="text-sm text-medium-text">פורסם ב: {formatDateByPreference(job.postedDate, authCtx?.datePreference || 'hebrew')}</p>
                                    <p className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-red-700'}`}>
                                        סטטוס: {isActive ? 'פעילה' : 'לא רלוונטית / הסתיימה'}
                                    </p>
                                    <p className="text-xs text-medium-text">צפיות: {job.views || 0}</p>
                                </div>
                                <div className="flex space-x-2 rtl:space-x-reverse mt-3 sm:mt-0 self-start sm:self-center flex-shrink-0">
                                    <Button size="sm" variant="outline" onClick={() => handleEditJob(job.id)} icon={<EditIcon className="w-4 h-4"/>} aria-label={`ערוך משרה ${job.title}`}>ערוך</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDeleteJob(job)} icon={<TrashIcon className="w-4 h-4"/>} aria-label={`מחק משרה ${job.title}`}>מחק</Button>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        )}
      </section>

       <Modal 
          isOpen={showConfirmationModal} 
          onClose={() => setShowConfirmationModal(false)} 
          title={modalContent.title}
          titleId={modalContent.titleId}
        >
        <div className="text-center p-6">
            <p className="text-2xl text-gray-800 font-medium mb-8">{modalContent.message}</p>
            <div className="flex justify-center space-x-4 rtl:space-x-reverse">
                 {modalContent.onConfirm && 
                    <Button 
                        onClick={() => {
                            modalContent.onConfirm!();
                            // setShowConfirmationModal(false); // Confirmation modals for success/error now handle their own closing
                        }} 
                        variant="primary"
                        size="lg"
                        className="px-8 py-3"
                    >
                        {modalContent.confirmText}
                    </Button>
                 }
                 {(modalContent.showCancel || !modalContent.onConfirm) && 
                     <Button 
                        onClick={() => setShowConfirmationModal(false)} 
                        variant={modalContent.onConfirm ? "outline" : "primary"}
                        size="lg"
                        className="px-8 py-3"
                    >
                        {modalContent.onConfirm ? "ביטול" : "הבנתי"}
                    </Button>
                 }
            </div>
        </div>
      </Modal>
    </div>
  );
};
