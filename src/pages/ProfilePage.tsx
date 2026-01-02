import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CheckboxGroup } from '../components/CheckboxGroup';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { User, ContactPreference, Job } from '../types';
import { UserIcon, BriefcaseIcon, BellIcon, PlusCircleIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, TrashIcon, EyeIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { gregSourceToHebrewString, formatGregorianString, formatDateByPreference } from '../utils/dateConverter';
import * as authService from '../services/authService';
import * as jobService from '../services/jobService';
import { AuthContext } from '../contexts/AuthContext';
import { useContext } from 'react';
import type { DateDisplayPreference } from '../utils/dateConverter';

export const ProfilePage: React.FC<PageProps> = ({ setCurrentPage }) => {
  const { user, updateUserContext, loadingAuth } = useAuth();
  const authCtx = useContext(AuthContext); // Still needed for date display in jobs


  const [formData, setFormData] = useState<Partial<User>>({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');


  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', onConfirm: (() => { }) as (() => void | Promise<void>) | null, showCancel: false });

  // State for posted jobs
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');


  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp || '',
      });
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


  const openModal = (title: string, message: string, onConfirmCallback: (() => void | Promise<void>) | null = null, showCancelButton = false) => {
    setModalContent({ title, message, onConfirm: onConfirmCallback, showCancel: showCancelButton });
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
      } as User;

      const result = await authService.updateUserProfile(user.id, updatedUserData);
      updateUserContext(result);
      openModal("הצלחה", "הפרופיל עודכן בהצלחה!");
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
      // This is a mock password check. In a real app, you'd call a service.
      if (currentPassword !== "mockOldPassword123") { // Replace with actual check if backend exists
        // For now, assume this is how an old password would be validated for demo purposes
        // Or, if using Firebase/similar, it would be an API call like reauthenticateWithCredential
        throw new Error("הסיסמה הנוכחית שגויה.");
      }
      // await authService.changePassword(user.id, currentPassword, newPassword); // Real call
      console.log("Password changed (mock)");
      // Update user context if needed (e.g. if token changes, though not typical for just password change)
      updateUserContext({ ...user, passwordHash: "newMockHash" } as any); // Mock update
      openModal("הצלחה", "הסיסמה שונתה בהצלחה!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'שגיאה בשינוי הסיסמה.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const contactCheckboxes = [
    { id: 'showPhone', label: 'הצג טלפון', value: 'showPhone' },
    { id: 'showWhatsapp', label: 'הצג וואטסאפ', value: 'showWhatsapp' },
    { id: 'showEmail', label: 'הצג אימייל', value: 'showEmail' },
    { id: 'showChat', label: 'אפשר יצירת קשר דרך מערכת ההודעות', value: 'showChat' },
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

  const handleDeleteJob = async (jobId: string) => {
    openModal(
      "אישור מחיקה",
      "האם אתה בטוח שברצונך למחוק משרה זו? לא ניתן לשחזר פעולה זו.",
      async () => {
        try {
          await jobService.deleteJob(jobId);
          fetchPostedJobs(); // Refresh the list
          openModal("הצלחה", "המשרה נמחקה בהצלחה.");
        } catch (error: any) {
          console.error("Error deleting job:", error);
          openModal("שגיאה", error.message || "אירעה שגיאה במחיקת המשרה.");
        }
      },
      true // Show cancel button for confirmation
    );
  };

  const handleDeleteAccount = async () => {
    openModal(
      "מחיקת חשבון - פעולה בלתי הפיכה",
      "האם אתה בטוח שברצונך למחוק את החשבון שלך לצמיתות? כל הפרטים האישיים שלך, ההגדרות והמשרות שפרסמת יימחקו ולא יהיה ניתן לשחזר אותם.",
      async () => {
        try {
          if (!user?.id) return;
          await authService.deleteAccount(user.id);
          // Redirect handled by auth state change usually, but we can force it
          setCurrentPage('home');
          // Force refresh or logout state update if needed, typically handled by useAuth listener
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


  if (loadingAuth || !user) {
    return <div className="text-center p-10">טוען נתוני משתמש...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6 sm:space-y-8">
      <div className="bg-white p-4 sm:p-8 rounded-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b">
          <div className="flex items-center mb-3 sm:mb-0">
            <UserIcon className="w-12 h-12 text-royal-blue mr-4 rtl:ml-4 rtl:mr-0" />
            <h1 className="text-2xl sm:text-3xl font-bold text-royal-blue">אזור אישי - {user.fullName}</h1>
          </div>

          <div className="flex space-x-2 rtl:space-x-reverse self-start sm:self-center bg-gray-100 p-1 rounded-lg invisible">
            {/* Holding space or remove entirely if not needed */}
          </div>
        </div>

        {successMessage && <p className="mb-4 text-center text-sm text-green-600 bg-green-100 p-3 rounded-md">{successMessage}</p>}

        <>
          <form onSubmit={handleProfileSubmit} className="space-y-6 mb-10" noValidate>
            <h2 className="text-xl font-semibold text-deep-pink border-b border-pink-200 pb-2 mb-4">עריכת פרטים אישיים</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="שם מלא" id="fullName" name="fullName" value={formData.fullName || ''} onChange={handleProfileChange} required />
              <Input label="אימייל (לא ניתן לשינוי)" id="email" name="email" type="email" value={formData.email || ''} readOnly disabled />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="טלפון" id="phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleProfileChange} required placeholder="05X-XXXXXXX" />
              <Input label="וואטסאפ (אם שונה מהטלפון)" id="whatsapp" name="whatsapp" type="tel" value={formData.whatsapp || ''} onChange={handleProfileChange} placeholder="05X-XXXXXXX" />
            </div>

            {errorMessage && <p className="mb-4 text-center text-sm text-red-600 bg-red-100 p-3 rounded-md animate-fade-in">{errorMessage}</p>}
            <Button type="submit" variant="primary" isLoading={isUpdatingProfile} className="w-full sm:w-auto">
              {isUpdatingProfile ? 'מעדכן פרופיל...' : 'שמור שינויים בפרופיל'}
            </Button>
          </form>

          <form onSubmit={handlePasswordSubmit} className="space-y-6 pt-6 border-t border-gray-200 mb-8" noValidate>
            <h2 className="text-xl font-semibold text-deep-pink border-b border-pink-200 pb-2 mb-4">שינוי סיסמה</h2>
            <Input label="סיסמה נוכחית" id="currentPassword" name="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="סיסמה חדשה (לפחות 6 תווים)" id="newPassword" name="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <Input label="אימות סיסמה חדשה" id="confirmNewPassword" name="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
            </div>
            {errorMessage && <p className="mb-4 text-center text-sm text-red-600 bg-red-100 p-3 rounded-md animate-fade-in">{errorMessage}</p>}
            <Button type="submit" variant="secondary" isLoading={isUpdatingPassword} className="w-full sm:w-auto">
              {isUpdatingPassword ? 'משנה סיסמה...' : 'שנה סיסמה'}
            </Button>
          </form>

          {/* Account Deletion Section */}
          <div className="pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-red-700 border-b border-red-200 pb-2 mb-4 flex items-center">
              <ExclamationCircleIcon className="w-6 h-6 ml-2" />
              מחיקת חשבון
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              מחיקת החשבון היא פעולה סופית ובלתי הפיכה. כל הנתונים שלך, כולל הפרופיל האישי, היסטוריית משרות והגדרות, יימחקו לצמיתות מהמערכת.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              className="flex items-center"
            >
              <TrashIcon className="w-4 h-4 ml-2" />
              מחק את החשבון שלי לצמיתות
            </Button>
          </div>
        </>
      </div>

      <div className="bg-light-blue/10 p-6 sm:p-8 rounded-xl shadow-2xl border border-light-blue/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-light-blue/30 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-royal-blue flex items-center">
            <BriefcaseIcon className="w-8 h-8 ml-3 rtl:mr-3 rtl:ml-0" />
            העבודות שפרסמתי
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">מיין לפי:</span>
            <Button size="sm" variant={sortOrder === 'newest' ? 'primary' : 'outline'} onClick={() => setSortOrder('newest')} className="whitespace-nowrap flex-grow sm:flex-grow-0">חדש לישן</Button>
            <Button size="sm" variant={sortOrder === 'oldest' ? 'primary' : 'outline'} onClick={() => setSortOrder('oldest')} className="whitespace-nowrap flex-grow sm:flex-grow-0">ישן לחדש</Button>
          </div>
        </div>
        {loadingJobs ? (
          <p className="text-center text-gray-500 py-8">טוען עבודות...</p>
        ) : sortedJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">עדיין לא פרסמת עבודות.</p>
            <Button variant="secondary" onClick={() => setCurrentPage('postJob')} icon={<PlusCircleIcon className="w-5 h-5" />}>
              פרסם עבודה ראשונה
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map(job => {
              const isActive = jobService.isJobDateValidForSearch(job);
              const displayId = job.serialNumber || (job.id && job.id.substring(0, 8));
              return (
                <div key={job.id} className={`p-4 border rounded-lg transition-all duration-300 hover:shadow-md ${isActive ? 'bg-green-50/80 border-green-200/60' : 'bg-light-pink/40 border-light-pink/60 opacity-75'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-grow min-w-0 w-full">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <h3 className="text-lg font-bold text-royal-blue hover:text-deep-pink cursor-pointer truncate max-w-[200px] sm:max-w-none" onClick={() => setCurrentPage('jobDetails', { jobId: job.id })}>{job.title}</h3>
                        <span className="text-xs text-gray-400 font-mono">#{displayId}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">פורסם ב: {formatDateByPreference(job.postedDate, authCtx?.datePreference || 'hebrew')}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <p className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isActive ? 'פעילה' : 'הסתיימה'}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <EyeIcon className="w-3.5 h-3.5 ml-1" />
                          {job.views || 0} צפיות
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto sm:self-center">
                      <Button size="sm" variant="outline" onClick={() => handleEditJob(job.id)} className="flex-1 sm:flex-none">ערוך</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteJob(job.id)} className="flex-1 sm:flex-none">מחק</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title={modalContent.title}
      >
        <div className="text-center p-6">
          {modalContent.title.includes("הצלחה") && <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />}
          {modalContent.title.includes("שגיאה") && <XCircleIcon className="w-20 h-20 text-red-600 mx-auto mb-6" />}
          {!modalContent.title.includes("הצלחה") && !modalContent.title.includes("שגיאה") && <BriefcaseIcon className="w-20 h-20 text-blue-600 mx-auto mb-6" />}
          <p className="text-2xl text-gray-800 font-medium mb-8">{modalContent.message}</p>
          <div className="flex justify-center space-x-4 rtl:space-x-reverse">
            {modalContent.onConfirm &&
              <Button
                onClick={() => {
                  modalContent.onConfirm!();
                  setShowConfirmationModal(false);
                }}
                variant="primary"
                size="lg"
                className="px-8 py-3"
              >
                אישור
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