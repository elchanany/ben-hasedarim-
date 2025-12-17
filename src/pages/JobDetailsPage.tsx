import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Job, PaymentType, JobDifficulty, JobPosterInfo, JobDateType, PaymentMethod } from '../types';
import { Button } from '../components/Button';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/Modal';
import {
  BriefcaseIcon, UserIcon, PlusCircleIcon, SearchIcon, ClockIcon, UsersIcon, CashIcon,
  PhoneIcon, MailIcon, ChatBubbleLeftEllipsisIcon, MapPinIcon, CalendarDaysIcon, EyeIcon,
  ArrowTopRightOnSquareIcon, LoginIcon, EditIcon, TrashIcon, ChartBarIcon
} from '../components/icons';
import { gregSourceToHebrewString, getTodayGregorianISO, formatJobPostedDateTimeDetails, formatGregorianString, formatDateByPreference } from '../utils/dateConverter';
import * as jobService from '../services/jobService';
import * as chatService from '../services/chatService';
import * as reportService from '../services/reportService';
import { ReportModal } from '../components/ReportModal';
import { TimeAgo } from '../components/TimeAgo';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

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

// FIX: Added export to the component to resolve the module resolution error in App.tsx.
// Completed the component's implementation.
export const JobDetailsPage: React.FC<JobDetailsPageProps> = ({ setCurrentPage, jobId }) => {
  const { user } = useAuth();
  const authCtx = useContext(AuthContext);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const contactModalTitleId = `contact-modal-title-${jobId}`;
  const deleteModalTitleId = `delete-confirm-modal-title-${jobId}`;
  const hasIncrementedView = useRef(false);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedJob = await jobService.getJobById(jobId);
      if (fetchedJob) {
        setJob(fetchedJob);
      } else {
        setError("המשרה לא נמצאה או שהיא הוסרה.");
      }
    } catch (e) {
      console.error("Error fetching job details:", e);
      setError("אירעה שגיאה בטעינת פרטי המשרה.");
    }
    setLoading(false);
  }, [jobId]);

  // טעינת המשרה
  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // ספירת צפיות - רק פעם אחת
  useEffect(() => {
    const incrementView = async () => {
      if (!job) {
        return;
      }

      // רק אם המשתמש הוא המפרסם, לא נספור
      if (user && user.id === job.postedBy.id) {
        return;
      }

      const viewedJobsKey = 'viewedJobs';
      const viewedJobs = JSON.parse(sessionStorage.getItem(viewedJobsKey) || '[]');
      if (!viewedJobs.includes(jobId) && !hasIncrementedView.current) {
        await jobService.incrementJobView(jobId);
        viewedJobs.push(jobId);
        sessionStorage.setItem(viewedJobsKey, JSON.stringify(viewedJobs));
        hasIncrementedView.current = true;
      }
    };

    incrementView();
  }, [job, user, jobId]);

  // אפס את הספירה כשעוברים למשרה אחרת
  useEffect(() => {
    hasIncrementedView.current = false;
  }, [jobId]);

  const handleContactClick = () => {
    if (!user) {
      setCurrentPage('login', { message: 'עליך להתחבר כדי לראות פרטי יצירת קשר.' });
      return;
    }
    setShowContactModal(true);
    if (job) {
      jobService.incrementJobContactAttempt(job.id);
    }
  };

  const handleStartChat = async () => {
    if (!user || !job) return;

    if (user.id === job.postedBy.id) {
      alert("אינך יכול/ה להתחיל שיחה דרך מערכת ההודעות על משרה שפרסמת.");
      return;
    }

    try {
      const thread = await chatService.getOrCreateChatThread(user.id, job.postedBy.id, job.id, job.title);
      setCurrentPage('chatThread', {
        threadId: thread.id,
        otherParticipantName: job.postedBy.posterDisplayName,
        jobTitle: job.title,
        jobId: job.id,
      });
    } catch (err) {
      console.error("Error starting chat:", err);
      setError("שגיאה ביצירת שיחה חדשה.");
    }
  };

  const handleEditJob = () => {
    setCurrentPage('postJob', { editJobId: jobId });
  };

  const handleDeleteRequest = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteJob = async () => {
    setIsDeleting(true);
    try {
      await jobService.deleteJob(jobId);
      setShowDeleteConfirmModal(false);
      setCurrentPage('home');
    } catch (error) {
      console.error("Error deleting job:", error);
      setError("שגיאה במחיקת המשרה.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק משרה זו כמנהל? פעולה זו תירשם בהיסטוריה.")) return;

    const reason = window.prompt("נא להזין סיבת מחיקה (חובה):");
    if (!reason?.trim()) {
      alert("חובה להזין סיבה למחיקה.");
      return;
    }

    setIsDeleting(true);
    try {
      await jobService.deleteJob(jobId, {
        adminId: user?.id || 'unknown',
        adminName: user?.fullName || 'Admin',
        action: 'delete_job',
        targetId: jobId,
        targetType: 'job',
        reason: reason
      });
      alert("המשרה נמחקה בהצלחה.");
      setCurrentPage('admin', { tab: 'jobs' });
    } catch (error) {
      console.error("Error deleting job (admin):", error);
      alert("שגיאה במחיקת המשרה.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = user?.id === job?.postedBy.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  if (loading) {
    return <div className="text-center p-10 text-xl" role="status" aria-live="polite">טוען פרטי משרה...</div>;
  }

  if (error || !job) {
    return <div className="text-center p-10 text-xl text-red-600" role="alert">{error || "המשרה לא נמצאה."}</div>;
  }

  const getPaymentInfo = () => {
    if (job.paymentType === PaymentType.HOURLY && job.hourlyRate) return `₪${job.hourlyRate} לשעה`;
    if (job.paymentType === PaymentType.GLOBAL && job.globalPayment) return `₪${job.globalPayment} סה"כ`;
    return 'יסוכם עם המעסיק';
  };

  const suitabilityParts = [];
  if (job.suitability.men) suitabilityParts.push("גברים");
  if (job.suitability.women) suitabilityParts.push("נשים");
  if (job.suitability.general) suitabilityParts.push("כללי");
  let suitabilityText = suitabilityParts.join(' / ');
  if (job.suitability.minAge) {
    suitabilityText += `, מגיל ${job.suitability.minAge}`;
  }


  return (
    <>
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-2xl my-8 animate-fade-in-down">
        <header className="relative border-b pb-6 mb-6">
          {isOwner && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 font-medium text-sm flex items-center">
                <BriefcaseIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
                עבודה זו פורסמה על ידך
              </p>
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-extrabold text-royal-blue mb-4 leading-tight break-words max-w-[90%]">
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
                onClick={handleAdminDelete}
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
          <div className="bg-gradient-to-r from-royal-blue to-deep-pink p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">תיאור המשרה</h2>
            <p className="text-lg text-white/90 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* פרטי המשרה */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-royal-blue text-center mb-6">פרטי המשרה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem
                icon={<MapPinIcon className="w-7 h-7" />}
                label="מיקום"
                value={job.area}
                animationType="default"
                onClick={() => console.log('Location clicked!')}
              />
              <DetailItem
                icon={<CalendarDaysIcon className="w-7 h-7" />}
                label="תאריך וזמן"
                value={formatDateByPreference(job.specificDate, authCtx?.datePreference || 'hebrew') + (job.startTime ? `, החל מ-${job.startTime}` : '')}
                animationType="calendar"
                onClick={() => console.log('Calendar clicked!')}
              />
              <DetailItem
                icon={<ClockIcon className="w-7 h-7" />}
                label="משך משוער"
                value={job.estimatedDurationIsFlexible ? 'גמיש' : `${job.estimatedDurationHours || 'לא צוין'} שעות`}
                animationType="clock"
                onClick={() => console.log('Clock clicked!')}
              />
              <DetailItem
                icon={<BriefcaseIcon className="w-7 h-7" />}
                label="אופן תשלום"
                value={job.paymentMethod || 'לא צוין'}
                animationType="default"
                onClick={() => console.log('Payment method clicked!')}
              />
              <DetailItem
                icon={<ChartBarIcon className="w-7 h-7" />}
                label="רמת קושי"
                value={job.difficulty}
                animationType="star"
                onClick={() => console.log('Difficulty clicked!')}
              />
              <DetailItem
                icon={<UsersIcon className="w-7 h-7" />}
                label="התאמה"
                value={suitabilityText}
                animationType="default"
                onClick={() => console.log('Suitability clicked!')}
              />
              <DetailItem
                icon={<UserIcon className="w-7 h-7" />}
                label="דרושים"
                value={`${job.numberOfPeopleNeeded || 1} אנשים`}
                animationType="default"
                onClick={() => console.log('People needed clicked!')}
              />
              {job.specialRequirements && (
                <DetailItem
                  icon={<PlusCircleIcon className="w-7 h-7" />}
                  label="דרישות מיוחדות"
                  value={job.specialRequirements}
                  className="md:col-span-2"
                  animationType="default"
                  onClick={() => console.log('Special requirements clicked!')}
                />
              )}
            </div>
          </div>

          {/* סקשן תשלום מודגש */}
          <div className="mt-8 p-6 bg-light-pink border-2 border-deep-pink rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <CashIcon className="w-12 h-12 text-deep-pink mr-3 animate-pulse" />
                <h3 className="text-3xl font-bold text-royal-blue">פרטי התשלום</h3>
              </div>
              <div className="text-4xl font-bold text-deep-pink mb-2 drop-shadow-sm">
                {getPaymentInfo()}
              </div>
              {job.paymentMethod && (
                <div className="text-xl text-medium-text">
                  אופן תשלום: {job.paymentMethod}
                </div>
              )}
            </div>
          </div>

          {/* פרטי יצירת קשר */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-royal-blue text-center mb-6">פרטי יצירת קשר</h2>

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
                    onClick={() => setShowContactDetails(true)}
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
                    onClick={() => console.log('Contact name clicked!')}
                  />
                )}
                {job.preferredContactMethods?.phone && job.contactPhone && (
                  <DetailItem
                    icon={<PhoneIcon className="w-7 h-7" />}
                    label="טלפון"
                    value={
                      <a
                        href={`tel:${job.contactPhone}`}
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
                      <a
                        href={`mailto:${job.contactEmail}`}
                        className="inline-block px-4 py-2 bg-deep-pink text-white rounded-lg hover:bg-pink-600 transition-colors duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 no-underline"
                      >
                        {job.contactEmail}
                      </a>
                    }
                    animationType="default"
                  />
                )}
                {user && user.id !== job.postedBy.id && job.preferredContactMethods?.allowSiteMessages && (
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
                  <a href={`tel:${job.contactPhone}`} className="text-lg text-dark-text hover:text-royal-blue transition-colors">
                    {job.contactPhone}
                  </a>
                }
                animationType="default"
                onClick={() => console.log('Phone clicked!')}
              />
            )}
            {job.preferredContactMethods.whatsapp && job.contactWhatsapp && (
              <DetailItem
                icon={<ChatBubbleLeftEllipsisIcon className="w-6 h-6" />}
                label="וואטסאפ"
                value={
                  <a href={`https://wa.me/${job.contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-lg text-dark-text hover:text-green-600 transition-colors">
                    {job.contactWhatsapp} (WhatsApp)
                  </a>
                }
                animationType="default"
                onClick={() => console.log('WhatsApp clicked!')}
              />
            )}
            {job.preferredContactMethods.email && job.contactEmail && (
              <DetailItem
                icon={<MailIcon className="w-6 h-6" />}
                label="אימייל"
                value={
                  <a href={`mailto:${job.contactEmail}`} className="text-lg text-dark-text hover:text-royal-blue transition-colors">
                    {job.contactEmail}
                  </a>
                }
                animationType="default"
                onClick={() => console.log('Email clicked!')}
              />
            )}
            {user && user.id !== job.postedBy.id && job.preferredContactMethods?.allowSiteMessages && (
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="אישור מחיקת משרה"
        titleId={deleteModalTitleId}
        size="md"
      >
        <div className="text-center p-6">
          <TrashIcon className="w-16 h-16 text-red-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-lg text-gray-800 font-medium mb-6">
            האם אתה בטוח שברצונך למחוק את המשרה "{job?.title}"? לא ניתן לשחזר פעולה זו.
          </p>
          <div className="flex justify-center space-x-3 rtl:space-x-reverse">
            <Button variant="outline" onClick={() => setShowDeleteConfirmModal(false)} aria-label="ביטול מחיקת משרה" size="lg" className="px-6 py-2">
              ביטול
            </Button>
            <Button variant="danger" onClick={confirmDeleteJob} isLoading={isDeleting} aria-label={`אישור מחיקת המשרה ${job?.title}`} size="lg" className="px-6 py-2">
              {isDeleting ? 'מוחק...' : 'כן, מחק משרה'}
            </Button>
          </div>
        </div>
      </Modal>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (reason) => {
          if (!job || !user) return;
          await reportService.submitReport({
            reporterId: user.id,
            reportedEntityId: job.id,
            entityType: 'job',
            reason,
          });
          alert('הדיווח נשלח בהצלחה');
        }}
      />
    </>
  );
};