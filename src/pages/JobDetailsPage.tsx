import React, { useEffect, useState, useCallback, useRef, useContext } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PaymentType, PaymentMethod, JobDifficulty, Job, JobSuitability, JobDateType } from '../types';
import { usePaymentSettings } from '../hooks/usePaymentSettings';
import { REGION_MAPPINGS } from '../constants';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  BriefcaseIcon, UserIcon, PlusCircleIcon, SearchIcon, ClockIcon, UsersIcon, CashIcon,
  PhoneIcon, MailIcon, ChatBubbleLeftEllipsisIcon, MapPinIcon, CalendarDaysIcon, EyeIcon,
  ArrowTopRightOnSquareIcon, LoginIcon, EditIcon, TrashIcon, ChartBarIcon, CopyIcon, CheckCircleIcon
} from '../components/icons';
import { gregSourceToHebrewString, getTodayGregorianISO, formatJobPostedDateTimeDetails, formatGregorianString, formatDateByPreference } from '../utils/dateConverter';
import { Button } from '../components/Button';
import * as jobService from '../services/jobService';
import * as chatService from '../services/chatService';
import * as reportService from '../services/reportService';
import { ReportModal } from '../components/ReportModal';
import { TimeAgo } from '../components/TimeAgo';
import { AuthContext } from '../contexts/AuthContext';
// import { PaymentModal } from '../components/PaymentModal'; // Removed
import { PricingModal } from '../components/PricingModal';
import { PHONE_LINE_NUMBER, getPhoneDialLink } from '../config/siteConfig';
import { unlockJobForUser, addUserSubscription } from '../services/userService';

interface JobDetailsPageProps extends PageProps {
  jobId: string;
}

const DetailItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
  animationType?: 'money' | 'clock' | 'calendar' | 'star' | 'default';
  onClick?: () => void;
}> = ({ icon, label, value, className, animationType = 'default', onClick }) => {
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleClick = () => {
    if (onClick) {
      setIsAnimating(true);
      onClick();
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const getAnimationClasses = () => {
    if (!isAnimating) return '';

    switch (animationType) {
      case 'money':
        return 'animate-bounce animate-pulse';
      case 'clock':
        return 'animate-spin';
      case 'calendar':
        return 'animate-pulse animate-bounce';
      case 'star':
        return 'animate-pulse animate-ping';
      default:
        return 'animate-pulse';
    }
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-sm border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:shadow-md transition-all duration-300 hover:scale-[1.02] transform cursor-pointer ${className} ${getAnimationClasses()}`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3 rtl:space-x-reverse">
        <div className="flex-shrink-0 text-blue-600 pt-1 transition-colors duration-300">
          {icon}
        </div>
        <div className="flex-grow">
          <h3 className="text-sm font-semibold text-gray-600 mb-1">{label}</h3>
          <p className="text-lg font-medium text-dark-text">{value}</p>
        </div>
      </div>
    </div>
  );
};

export const JobDetailsPage: React.FC<JobDetailsPageProps> = ({ setCurrentPage, pageParams, jobId: propJobId }) => {
  const { user, refreshTotalUnreadCount } = useAuth();
  const { settings: paymentSettings, loading: loadingPaymentSettings } = usePaymentSettings();
  const authCtx = useContext(AuthContext);
  // jobId is now available as propJobId, but we'll use it in useEffect logic primarily
  // or we can assign it here for convenience if needed later outside useEffect
  const jobId = propJobId || pageParams?.jobId as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'success' | 'info';
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'info',
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const contactModalTitleId = `contact-modal-title-${jobId}`;
  const hasIncrementedView = useRef(false);
  const hasIncrementedContact = useRef(false);
  const [copiedEmail, setCopiedEmail] = useState(false);



  // Payment Logic State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showPhonePostModal, setShowPhonePostModal] = useState(false); // For phone-posted jobs info
  // const [showPaymentModal, setShowPaymentModal] = useState(false); // Removed
  // const [selectedPlan, setSelectedPlan] = useState<'single' | 'monthly'>('single');
  // const [paymentAmount, setPaymentAmount] = useState(0);

  // Real-time listener for job updates
  useEffect(() => {
    // Prioritize the direct jobId prop, then fall back to pageParams
    const effectiveJobId = jobId || pageParams?.jobId || (pageParams as any)?.id;

    if (!effectiveJobId) {
      console.warn("No job ID found in props or pageParams");
      setError("מזהה משרה לא תקין.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const jobRef = doc(db, 'jobs', effectiveJobId);
      const unsubscribe = onSnapshot(jobRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const convertedJob = {
            id: docSnap.id,
            ...data,
            postedDate: data.postedDate?.toDate?.()?.toISOString() || data.postedDate,
          } as Job;

          setJob(convertedJob);
          setError(null);
        } else {
          console.error("Job document not found for ID:", effectiveJobId);
          setError("המשרה לא נמצאה או שהיא הוסרה.");
          setJob(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Error fetching job realtime:", err);
        setError("אירעה שגיאה בטעינת פרטי המשרה.");
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Invalid job ID or other error:", err);
      setError("שגיאה במזהה המשרה.");
      setLoading(false);
    }
  }, [pageParams]); // Changed dependency to pageParams to catch updates

  // View count logic - runs only once per jobId
  useEffect(() => {
    const incrementView = async () => {
      // Skip if already incremented this session
      if (hasIncrementedView.current) return;

      const viewedJobsKey = 'viewedJobs';
      const viewedJobs = JSON.parse(sessionStorage.getItem(viewedJobsKey) || '[]');

      // Skip if this job was already viewed in this session
      if (viewedJobs.includes(jobId)) return;

      // Mark as incrementing to prevent race conditions
      hasIncrementedView.current = true;

      await jobService.incrementJobView(jobId);
      viewedJobs.push(jobId);
      sessionStorage.setItem(viewedJobsKey, JSON.stringify(viewedJobs));
    };

    if (jobId) {
      incrementView();
    }
  }, [jobId]); // Only depend on jobId, NOT on job object

  // Handle contact attempt with application tracking
  const handleContactAttempt = useCallback(async () => {
    if (!job) return;

    if (!hasIncrementedContact.current) {
      await jobService.incrementJobContactAttempt(jobId);
      hasIncrementedContact.current = true;
    }

    const appliedJobsKey = 'appliedJobs';
    const appliedJobs = JSON.parse(localStorage.getItem(appliedJobsKey) || '[]');

    if (!appliedJobs.includes(jobId)) {
      await jobService.incrementApplicationCount(jobId);
      appliedJobs.push(jobId);
      localStorage.setItem(appliedJobsKey, JSON.stringify(appliedJobs));
    }

    setShowContactDetails(true);
  }, [job, jobId]);

  const handleContactClick = () => {
    if (!user) {
      setCurrentPage('login', { message: 'עליך להתחבר כדי לראות פרטי יצירת קשר.' });
      return;
    }

    // Explicitly enabling admin bypass per user request
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.email?.toLowerCase() === 'eyceyceyc139@gmail.com';

    // Check centralized payment settings
    const isPaymentRequired = paymentSettings.masterSwitch && paymentSettings.enableViewerPayment;

    const isOwner = user.id === job?.postedBy?.id;
    const hasSingleUnlock = user.unlockedJobs?.includes(jobId);

    // Check for active subscription
    const hasActiveSubscription = user.subscription?.isActive &&
      new Date(user.subscription.expiresAt) > new Date();

    // If payment is NOT required (feature disabled), OR user owns job, OR already unlocked, OR has subscription, OR is ADMIN
    // Then show contact details immediately
    if (!isPaymentRequired || isOwner || hasSingleUnlock || hasActiveSubscription || isAdmin) {
      setShowContactDetails(true); // Show inline instead of modal
      handleContactAttempt();
    } else {
      // Payment IS required and user hasn't paid/subscribed, show pricing modal
      setShowPricingModal(true);
    }
  };

  const handleSelectPlan = (plan: 'single' | 'monthly') => {
    setShowPricingModal(false);
    // Navigate to payment page instead of opening modal
    const amount = plan === 'single'
      ? (paymentSettings.singleContactPrice || 5)
      : (paymentSettings.subscriptionPrice || 15);
    const type = plan === 'single' ? 'view_contact' : 'subscription';

    setCurrentPage('payment', {
      type,
      jobId,
      jobTitle: job?.title,
      amount
    });
  };

  // handlePaymentSuccess removed - handled by PaymentPage logic now

  const handleStartChat = async () => {
    if (!user || !job) return;
    if (job.postedBy && user.id === job.postedBy.id) {
      setConfirmModal({
        isOpen: true,
        title: 'שגיאה',
        message: 'אינך יכול/ה להתחיל שיחה דרך מערכת ההודעות על משרה שפרסמת.',
        confirmText: 'אישור',
        type: 'info',
        onConfirm: closeConfirmModal
      });
      return;
    }

    handleContactAttempt();

    try {
      const isAnonymous = job.contactInfoSource === 'anonymous';
      const thread = await chatService.getOrCreateChatThread(
        user.id,
        job.postedBy?.id || 'unknown',
        job.id,
        job.title,
        isAnonymous,
        job.postedBy?.id || 'unknown'
      );
      setCurrentPage('chatThread', {
        threadId: thread.id,
        otherParticipantName: isAnonymous ? "משתמש אנונימי" : (job.postedBy?.posterDisplayName || "משתמש"),
        jobTitle: job.title,
        jobId: job.id,
      });
    } catch (err) {
      console.error("Error starting chat:", err);
      setError("שגיאה ביצירת שיחה חדשה.");
    }
  };

  const handleCopyEmail = (email: string) => {
    handleContactAttempt();
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  };

  const handleEditJob = () => {
    setCurrentPage('postJob', { editJobId: jobId });
  };

  const handleDeleteRequest = () => {
    setConfirmModal({
      isOpen: true,
      title: 'מחיקת משרה',
      message: `האם אתה בטוח שברצונך למחוק את המשרה "${job?.title}"? לא ניתן לשחזר פעולה זו.`,
      confirmText: 'מחק משרה',
      cancelText: 'ביטול',
      type: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await jobService.deleteJob(jobId);
          closeConfirmModal();
          setCurrentPage('home');
        } catch (error) {
          console.error("Error deleting job:", error);
          setError("שגיאה במחיקת המשרה.");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!job || !user) return;

    setConfirmModal({
      isOpen: true,
      title: 'מחיקת משרה',
      message: "האם אתה בטוח שברצונך למחוק משרה זו כמנהל? פעולה זו תירשם בהיסטוריה.",
      confirmText: 'מחק משרה',
      type: 'danger',
      onConfirm: async () => {
        const reason = window.prompt("נא להזין סיבת מחיקה (חובה):");
        if (!reason?.trim()) {
          alert("חובה להזין סיבה למחיקה.");
          closeConfirmModal();
          return;
        }

        setIsDeleting(true);
        try {
          if (user.role === 'admin' || user.role === 'super_admin') {
            await jobService.deleteJob(job.id, {
              adminId: user.id,
              adminName: user.fullName || 'Admin',
              action: 'delete_job',
              targetId: job.id,
              targetType: 'job',
              reason: reason
            });
          } else {
            await jobService.deleteJob(job.id);
          }
          closeConfirmModal();
          alert("המשרה נמחקה בהצלחה.");
          setCurrentPage('admin', { tab: 'jobs' });
        } catch (err) {
          console.error("Error deleting job:", err);
          setError("שגיאה במחיקת המשרה.");
          alert("שגיאה במחיקת המשרה.");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const handleReportSubmit = async (reason: string) => {
    if (!user || !job) return;
    try {
      await reportService.submitReport({
        reporterId: user.id,
        reportedEntityId: job.id,
        entityType: 'job',
        reason: reason
      });
      alert('הדיווח נשלח בהצלחה.');
    } catch (error) {
      console.error("Error submitting report:", error);
      alert('שגיאה בשליחת הדיווח.');
    }
  };

  const isOwner = user?.id === job?.postedBy?.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.email?.toLowerCase() === 'eyceyceyc139@gmail.com';

  // Check if user can view poster info (for hiding behind paywall)
  const isPaymentRequired = paymentSettings.masterSwitch && paymentSettings.enableViewerPayment;
  const hasSingleUnlock = user?.unlockedJobs?.includes(jobId);
  const hasActiveSubscription = user?.subscription?.isActive &&
    new Date(user?.subscription?.expiresAt || 0) > new Date();
  const canViewPosterInfo = !isPaymentRequired || isOwner || hasSingleUnlock || hasActiveSubscription || isAdmin;

  if (loading) {
    return <div className="text-center p-10 text-xl" role="status" aria-live="polite">טוען פרטי משרה...</div>;
  }

  if (error || !job) {
    return <div className="text-center p-10 text-xl text-red-600" role="alert">{error || "המשרה לא נמצאה."}</div>;
  }

  const getPaymentInfo = () => {
    // Handle both enum values and legacy string values
    const paymentTypeStr = String(job.paymentType);
    const isHourly = paymentTypeStr === PaymentType.HOURLY || paymentTypeStr === 'hourly' || paymentTypeStr === 'לפי שעה';
    const isGlobal = paymentTypeStr === PaymentType.GLOBAL || paymentTypeStr === 'global' || paymentTypeStr === 'גלובלי';

    if (isHourly && job.hourlyRate) return `₪${job.hourlyRate} לשעה`;
    if (isGlobal && job.globalPayment) return `₪${job.globalPayment} סה"כ`;
    return 'יסוכם עם המעסיק';
  };

  const suitabilityParts = [];
  const suit = job.suitability || { men: false, women: false, general: false };
  if (suit.men) suitabilityParts.push("גברים");
  if (suit.women) suitabilityParts.push("נשים");
  if (suit.general) suitabilityParts.push("כללי");
  let suitabilityText = suitabilityParts.length > 0 ? suitabilityParts.join(' / ') : 'לכולם';
  if (suit.minAge) {
    suitabilityText += `, מגיל ${suit.minAge}`;
  }


  return (
    <>
      <div className="max-w-4xl mx-auto bg-white p-4 sm:p-8 rounded-xl shadow-2xl my-4 sm:my-8 animate-fade-in-down">
        <header className="relative border-b pb-6 mb-6">
          {isOwner && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 font-medium text-sm flex items-center">
                <BriefcaseIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
                עבודה זו פורסמה על ידך
              </p>
            </div>
          )}

          <h1 className="text-2xl sm:text-5xl font-extrabold text-royal-blue mb-4 leading-tight break-words max-w-[90%]">
            <span className="text-xl sm:text-2xl text-gray-400 font-mono block mb-2">
              #{job.serialNumber ? job.serialNumber : job.id.substring(0, 8)}
            </span>
            <span className="whitespace-normal block line-clamp-2">{job.title}</span>
          </h1>

          {isOwner && (
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditJob}
                icon={<EditIcon className="w-4 h-4" />}
                className="!px-3 !py-2 !text-sm"
              >
                ערוך משרה
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteRequest}
                icon={<TrashIcon className="w-4 h-4" />}
                className="!px-3 !py-2 !text-sm"
              >
                מחק משרה
              </Button>
            </div>
          )}

          {isAdmin && !isOwner && (
            <div className="flex gap-2 mb-4">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                icon={<TrashIcon className="w-4 h-4" />}
                isLoading={isDeleting}
                className="!px-3 !py-2 !text-sm border-2 border-red-500 bg-red-50 text-red-700 hover:bg-red-100"
              >
                מחק משרה (מנהל)
              </Button>
            </div>
          )}

          {!isOwner && user && (
            <div className="absolute top-0 left-0 mt-4 ml-4">
              <button
                onClick={() => setShowReportModal(true)}
                className="text-gray-400 hover:text-red-500 text-sm flex items-center transition-colors"
              >
                <span className="ml-1">🚩</span> דווח
              </button>
            </div>
          )}

          <div className="space-y-2 text-sm text-gray-600">
            {/* Special display for phone-posted jobs */}
            {job.postedVia === 'phone' ? (
              <p className="flex items-center">
                <PhoneIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 text-green-500" />
                <span className="mr-1">פורסם בקו הטלפוני על ידי </span>
                <button
                  onClick={() => setShowPhonePostModal(true)}
                  className="font-medium text-green-600 hover:underline focus:outline-none"
                >
                  📞 {job.callerPhone || job.contactPhone || 'מפרסם טלפוני'}
                </button>
              </p>
            ) : (
              /* Regular user display */
              canViewPosterInfo ? (
                job.contactInfoSource !== 'anonymous' ? (
                  <p className="flex items-center">
                    <UserIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 text-gray-400" />
                    פורסם ע"י <button
                      onClick={() => setCurrentPage('publicProfile', { userId: job.postedBy?.id || 'unknown' })}
                      className="mr-1 font-medium text-royal-blue hover:underline focus:outline-none"
                    >
                      {job.postedBy?.posterDisplayName || 'משתמש לא ידוע'}
                    </button>
                  </p>
                ) : (
                  <p className="flex items-center">
                    <UserIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 text-gray-400" />
                    פורסם ע"י <span className="mr-1 font-medium text-gray-500">משתמש אנונימי</span>
                  </p>
                )
              ) : (
                <p className="flex items-center">
                  <UserIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 text-gray-400" />
                  <span className="mr-1 font-medium text-gray-500">פרטי המפרסם יוצגו לאחר תשלום</span>
                </p>
              )
            )}
            <p className="flex items-center">
              <ClockIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 text-gray-400" />
              פורסם <TimeAgo date={job.postedDate} format={(d: string) => formatJobPostedDateTimeDetails(d, authCtx?.datePreference || 'hebrew')} className="mr-1" />
            </p>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <span className="flex items-center"><EyeIcon className="w-4 h-4 ml-1.5 rtl:mr-1.5 rtl:ml-0 text-gray-400" />{job.views} צפיות</span>
              <span className="flex items-center"><ChatBubbleLeftEllipsisIcon className="w-4 h-4 ml-1.5 rtl:mr-1.5 rtl:ml-0 text-gray-400" />{job.contactAttempts} פניות</span>
            </div>
          </div>
        </header>

        <main className="space-y-6">
          {/* תיאור המשרה */}
          <div className="bg-gradient-to-r from-royal-blue to-deep-pink p-4 sm:p-6 rounded-xl shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">תיאור המשרה</h2>
            <p className="text-lg text-white/90 whitespace-pre-wrap">
              {job.description || (job.postedVia === 'phone' ? '📞 עבודה זו פורסמה באמצעות קו הטלפון של האתר.' : 'לא צוין תיאור.')}
            </p>
          </div>

          {/* פרטי המשרה */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-royal-blue text-center mb-6">פרטי המשרה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem
                icon={<MapPinIcon className="w-7 h-7" />}
                label="מיקום"
                value={(() => {
                  const region = REGION_MAPPINGS.find(r => r.value === job.area);
                  return region ? region.label : job.area;
                })()}
                animationType="default"
              />
              {(job.address || job.area) && (
                <div className="md:col-span-2 p-4 rounded-lg shadow-sm border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:shadow-md transition-all duration-300 hover:scale-[1.02] transform cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3 rtl:space-x-reverse">
                      <div className="flex-shrink-0 text-red-500 pt-1 transition-colors duration-300">
                        <MapPinIcon className="w-7 h-7" />
                      </div>
                      <div>
                        {(() => {
                          const region = REGION_MAPPINGS.find(r => r.value === job.area);
                          const displayArea = region ? region.label : job.area;
                          // If we have a specific address, show "Exact Address" header, otherwise "Area/City" header
                          const title = job.address ? 'כתובת מדוייקת' : 'אזור/עיר';
                          const displayContent = job.address || displayArea || 'לא צוין';

                          return (
                            <>
                              <h3 className="text-sm font-semibold text-gray-600 mb-1">{title}</h3>
                              <p className="text-lg font-medium text-dark-text break-words max-w-[200px] sm:max-w-md">{displayContent}</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Smart Navigation Handler

                        // Resolve Region Label for Navigation Query
                        const region = REGION_MAPPINGS.find(r => r.value === job.area);
                        const areaForNav = region ? region.label : (job.area || '');

                        // If job.address exists, navigate to "Address, City". 
                        // If not, simply navigate to "City" (center).
                        const fullAddress = job.address ? `${job.address}, ${areaForNav}` : areaForNav;
                        const query = encodeURIComponent(fullAddress);

                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

                        if (isMobile) {
                          // Try opening Waze App directly, fallback to web handled by OS usually
                          window.open(`https://waze.com/ul?q=${query}&navigate=yes`, '_blank');
                        } else {
                          // Desktop: Go straight to Google Maps which is much more reliable on PC
                          window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                        }
                      }}
                      className="flex-shrink-0 flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 whitespace-nowrap mr-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <span className="hidden sm:inline">ניווט</span>
                      <span className="sm:hidden">נווט</span>
                    </button>
                  </div>
                </div>
              )}
              <DetailItem
                icon={<CalendarDaysIcon className="w-7 h-7" />}
                label="תאריך וזמן"
                value={(() => {
                  if (job.dateType === 'flexibleDate') return 'תאריך גמיש';
                  if (job.dateType === 'comingWeek') return 'בשבוע הקרוב';
                  if (job.dateType === 'today' && !job.specificDate) return 'היום';

                  const dateStr = formatDateByPreference(job.specificDate, authCtx?.datePreference || 'hebrew');
                  return dateStr + (job.startTime ? `, החל מ-${job.startTime}` : '');
                })()}
                animationType="calendar"
              />
              <DetailItem
                icon={<ClockIcon className="w-7 h-7" />}
                label="משך משוער"
                value={job.estimatedDurationIsFlexible ? 'גמיש' : `${job.estimatedDurationHours || 'לא צוין'} שעות`}
                animationType="clock"
              />
              <DetailItem
                icon={<BriefcaseIcon className="w-7 h-7" />}
                label="אופן תשלום"
                value={job.paymentMethod || 'לא צוין'}
                animationType="default"
              />
              <DetailItem
                icon={<ChartBarIcon className="w-7 h-7" />}
                label="רמת קושי"
                value={job.difficulty}
                animationType="star"
              />
              <DetailItem
                icon={<UsersIcon className="w-7 h-7" />}
                label="התאמה"
                value={suitabilityText}
                animationType="default"
              />
              <DetailItem
                icon={<UserIcon className="w-7 h-7" />}
                label="דרושים"
                value={`${job.numberOfPeopleNeeded || 1} אנשים`}
                animationType="default"
              />
              {job.specialRequirements && (
                <DetailItem
                  icon={<PlusCircleIcon className="w-7 h-7" />}
                  label="דרישות מיוחדות"
                  value={job.specialRequirements}
                  className="md:col-span-2"
                  animationType="default"
                />
              )}
            </div>
          </div>

          {/* סקשן תשלום מודגש */}
          <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-light-pink border-2 border-deep-pink rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <CashIcon className="w-10 h-10 sm:w-12 sm:h-12 text-deep-pink mr-3 animate-pulse" />
                <h3 className="text-2xl sm:text-3xl font-bold text-royal-blue">פרטי התשלום</h3>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-deep-pink mb-2 drop-shadow-sm">
                {getPaymentInfo()}
              </div>
              {job.paymentMethod && (
                <div className="text-xl text-medium-text">
                  אופן תשלום: {job.paymentMethod === 'אחר' && job.customPaymentMethod ? job.customPaymentMethod : job.paymentMethod}
                </div>
              )}
            </div>
          </div>

          {/* פרטי יצירת קשר */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-royal-blue text-center mb-6">פרטי יצירת קשר</h2>

            {!user ? (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-4">
                  <p className="text-lg text-gray-700 mb-4">כדי לראות את פרטי יצירת הקשר, אנא התחבר לחשבון שלך</p>
                  <button
                    onClick={() => setCurrentPage('login')}
                    className="bg-royal-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300 font-semibold"
                  >
                    התחבר עכשיו
                  </button>
                </div>
              </div>
            ) : !showContactDetails ? (
              <div className="text-center py-8">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
                  <p className="text-lg text-gray-700 mb-4">לחץ על הכפתור כדי לראות את פרטי יצירת הקשר</p>
                  <button
                    onClick={handleContactClick}
                    className="bg-deep-pink text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors duration-300 font-semibold"
                  >
                    הצג פרטי איש קשר
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {job.contactDisplayName && (
                  <DetailItem
                    icon={<UserIcon className="w-7 h-7" />}
                    label="שם איש קשר"
                    value={job.contactDisplayName}
                    animationType="default"
                  />
                )}
                {/* Show phone if preferredContactMethods.phone is true OR if job was posted via phone */}
                {(job.preferredContactMethods?.phone || job.postedVia === 'phone') && job.contactPhone && (
                  <DetailItem
                    icon={<PhoneIcon className="w-7 h-7" />}
                    label="טלפון"
                    value={
                      <a
                        href={`tel:${job.contactPhone}`}
                        onClick={handleContactAttempt}
                        className="inline-block px-4 py-2 bg-deep-pink text-white rounded-lg hover:bg-pink-600 transition-colors duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 no-underline"
                      >
                        {job.contactPhone}
                      </a>
                    }
                    animationType="default"
                  />
                )}
                {job.preferredContactMethods?.email && job.contactEmail && (
                  <DetailItem
                    icon={<MailIcon className="w-7 h-7" />}
                    label="אימייל"
                    value={
                      <div className="flex items-center gap-2 relative">
                        <a
                          href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`בנוגע למשרה: ${job.title}`)}`}
                          onClick={handleContactAttempt}
                          className="inline-block px-4 py-2 bg-deep-pink text-white rounded-lg hover:bg-pink-600 transition-colors duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 no-underline flex-grow sm:flex-grow-0"
                        >
                          {job.contactEmail}
                        </a>
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyEmail(job.contactEmail || '');
                            }}
                            className="p-2 text-gray-400 hover:text-royal-blue hover:bg-blue-50 rounded-lg transition-colors duration-300 flex-shrink-0"
                            title="העתק אימייל"
                          >
                            {copiedEmail ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                          </button>
                          {copiedEmail && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap animate-fade-in-up">
                              המייל הועתק בהצלחה!
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    }
                    animationType="default"
                  />
                )}
                {user && job.postedBy && user.id !== job.postedBy.id && job.preferredContactMethods?.allowSiteMessages && (
                  <DetailItem
                    icon={<ChatBubbleLeftEllipsisIcon className="w-7 h-7" />}
                    label="מערכת ההודעות של האתר"
                    value={
                      <button
                        onClick={handleStartChat}
                        className="inline-block px-4 py-2 bg-royal-blue text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        התחל שיחה
                      </button>
                    }
                    animationType="default"
                  />
                )}
                {job.preferredContactMethods?.whatsapp && job.contactWhatsapp && (
                  <DetailItem
                    icon={<PhoneIcon className="w-7 h-7" />}
                    label="וואטסאפ"
                    value={
                      <a
                        href={`https://wa.me/${job.contactWhatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleContactAttempt}
                        className="inline-block px-4 py-2 bg-deep-pink text-white rounded-lg hover:bg-pink-600 transition-colors duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 no-underline"
                      >
                        {job.contactWhatsapp}
                      </a>
                    }
                    animationType="default"
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="פרטי יצירת קשר" titleId={contactModalTitleId} size="sm">
        <div className="p-4 space-y-4">
          <h3 className="text-xl font-bold text-royal-blue text-center mb-4">{job.contactDisplayName}</h3>
          <div className="space-y-3">
            {job.preferredContactMethods.phone && job.contactPhone && (
              <DetailItem
                icon={<PhoneIcon className="w-6 h-6" />}
                label="טלפון"
                value={
                  <a href={`tel:${job.contactPhone}`} onClick={handleContactAttempt} className="text-lg text-dark-text hover:text-royal-blue transition-colors">
                    {job.contactPhone}
                  </a>
                }
                animationType="default"
              />
            )}
            {job.preferredContactMethods.whatsapp && job.contactWhatsapp && (
              <DetailItem
                icon={<ChatBubbleLeftEllipsisIcon className="w-6 h-6" />}
                label="וואטסאפ"
                value={
                  <a href={`https://wa.me/${job.contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={handleContactAttempt} className="text-lg text-dark-text hover:text-green-600 transition-colors">
                    {job.contactWhatsapp} (WhatsApp)
                  </a>
                }
                animationType="default"
              />
            )}
            {job.preferredContactMethods.email && job.contactEmail && (
              <DetailItem
                icon={<MailIcon className="w-6 h-6" />}
                label="אימייל"
                value={
                  <div className="flex items-center gap-3 relative">
                    <a href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`בנוגע למשרה: ${job.title}`)}`} onClick={handleContactAttempt} className="text-lg text-dark-text hover:text-royal-blue transition-colors break-all">
                      {job.contactEmail}
                    </a>
                    <div className="relative flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyEmail(job.contactEmail || '');
                        }}
                        className="p-1.5 text-gray-400 hover:text-royal-blue transition-colors flex-shrink-0"
                        title="העתק"
                      >
                        {copiedEmail ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                      </button>
                      {copiedEmail && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap animate-fade-in-up">
                          הועתק!
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      )}
                    </div>
                  </div>
                }
                animationType="default"
              />
            )}
            {user && job.postedBy && user.id !== job.postedBy.id && job.preferredContactMethods?.allowSiteMessages && (
              <DetailItem
                icon={<ChatBubbleLeftEllipsisIcon className="w-6 h-6" />}
                label="מערכת ההודעות של האתר"
                value={
                  <button
                    onClick={handleStartChat}
                    className="inline-block px-4 py-2 bg-royal-blue text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    התחל שיחה
                  </button>
                }
                animationType="default"
              />
            )}
          </div>
          <Button onClick={() => setShowContactModal(false)} variant="primary" className="w-full mt-4">סגור</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        title="דיווח על משרה"
      />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSelectPlan={handleSelectPlan}
        singlePrice={paymentSettings.singleContactPrice || 5}
        subscriptionPrice={paymentSettings.subscriptionPrice || 15}
      />

      {/* PaymentModal removed */}

      {/* Phone Posted Job Info Modal */}
      <Modal isOpen={showPhonePostModal} onClose={() => setShowPhonePostModal(false)} title="📞 עבודה מקו הטלפון">
        <div className="text-center space-y-4">
          <div className="text-6xl">📞</div>
          <h3 className="text-xl font-bold text-gray-800">עבודה זו פורסמה בקו הטלפון</h3>
          <p className="text-gray-600">
            העבודה פורסמה על ידי מפרסם טלפוני במספר:<br />
            <span className="font-bold text-lg text-royal-blue">{job?.callerPhone || job?.contactPhone || 'לא ידוע'}</span>
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">רוצה גם לפרסם בקו הטלפון?</p>
            <p className="text-green-600 text-sm mt-1">
              התקשר למספר הקו שלנו:
            </p>
            <a href={getPhoneDialLink()} className="text-2xl font-bold text-green-700 hover:text-green-800">{PHONE_LINE_NUMBER}</a>
          </div>
          <Button onClick={() => setShowPhonePostModal(false)} variant="primary" className="w-full">סגור</Button>
        </div>
      </Modal>
    </>
  );
};