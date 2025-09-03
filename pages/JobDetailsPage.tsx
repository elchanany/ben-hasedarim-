import React, { useEffect, useState, useCallback } from 'react';
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
import { gregSourceToHebrewString, getTodayGregorianISO, formatJobPostedDateTimeDetails } from '../utils/dateConverter';
import * as jobService from '../services/jobService';
import * as chatService from '../services/chatService';

interface JobDetailsPageProps extends PageProps {
  jobId: string;
}

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }> = ({ icon, label, value, className }) => (
  <div className={`flex items-start space-x-3 rtl:space-x-reverse ${className}`}>
    <div className="flex-shrink-0 text-deep-pink pt-1">{icon}</div>
    <div>
      <h3 className="text-sm font-semibold text-gray-500">{label}</h3>
      <p className="text-lg text-dark-text">{value}</p>
    </div>
  </div>
);

// FIX: Added export to the component to resolve the module resolution error in App.tsx.
// Completed the component's implementation.
export const JobDetailsPage: React.FC<JobDetailsPageProps> = ({ setCurrentPage, jobId }) => {
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const contactModalTitleId = `contact-modal-title-${jobId}`;

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedJob = await jobService.getJobById(jobId);
      if (fetchedJob) {
        setJob(fetchedJob);
        if (!user || user.id !== fetchedJob.postedBy.id) {
          await jobService.incrementJobView(jobId);
        }
      } else {
        setError("המשרה לא נמצאה או שהיא הוסרה.");
      }
    } catch (e) {
      console.error("Error fetching job details:", e);
      setError("אירעה שגיאה בטעינת פרטי המשרה.");
    }
    setLoading(false);
  }, [jobId, user]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleContactClick = () => {
    if (!user) {
        setCurrentPage('login', { message: 'עליך להתחבר כדי לראות פרטי יצירת קשר.' });
        return;
    }
    setShowContactModal(true);
    if(job) {
        jobService.incrementJobContactAttempt(job.id);
    }
  };
  
  const handleStartChat = async () => {
    if (!user || !job) return;

    if (user.id === job.postedBy.id) {
        alert("אינך יכול/ה להתחיל צ'אט על משרה שפרסמת.");
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

  const isOwner = user?.id === job?.postedBy.id;

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
        <header className="border-b pb-6 mb-6">
          <p className="text-sm text-gray-500">פורסם {formatJobPostedDateTimeDetails(job.postedDate)} על ידי {job.postedBy.posterDisplayName}</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-royal-blue mt-2">{job.title}</h1>
          <div className="flex items-center text-gray-600 mt-4 space-x-4 rtl:space-x-reverse">
            <span className="flex items-center"><MapPinIcon className="w-5 h-5 ml-1.5 rtl:mr-1.5 rtl:ml-0 text-red-500"/>{job.area}</span>
            <span className="flex items-center"><EyeIcon className="w-5 h-5 ml-1.5 rtl:mr-1.5 rtl:ml-0 text-gray-400"/>{job.views} צפיות</span>
            <span className="flex items-center"><ChatBubbleLeftEllipsisIcon className="w-5 h-5 ml-1.5 rtl:mr-1.5 rtl:ml-0 text-gray-400"/>{job.contactAttempts} פניות</span>
          </div>
        </header>

        <main className="space-y-6">
          {/* תיאור המשרה */}
          <div className="bg-gradient-to-r from-royal-blue to-deep-pink p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">תיאור המשרה</h2>
            <p className="text-lg text-white/90 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* פרטי המשרה */}
          <div className="bg-light-pink p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-royal-blue mb-6 text-center">פרטי המשרה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem icon={<CalendarDaysIcon className="w-7 h-7"/>} label="תאריך וזמן" value={gregSourceToHebrewString(job.specificDate) + (job.startTime ? `, החל מ-${job.startTime}` : '')} />
            <DetailItem icon={<ClockIcon className="w-7 h-7"/>} label="משך משוער" value={job.estimatedDurationIsFlexible ? 'גמיש' : `${job.estimatedDurationHours || 'לא צוין'} שעות`} />
            <DetailItem icon={<CashIcon className="w-7 h-7"/>} label="תשלום" value={getPaymentInfo()} />
            <DetailItem icon={<BriefcaseIcon className="w-7 h-7"/>} label="אופן תשלום" value={job.paymentMethod || 'לא צוין'} />
            <DetailItem icon={<ChartBarIcon className="w-7 h-7"/>} label="רמת קושי" value={job.difficulty} />
            <DetailItem icon={<UsersIcon className="w-7 h-7"/>} label="התאמה" value={suitabilityText} />
            <DetailItem icon={<UserIcon className="w-7 h-7"/>} label="דרושים" value={`${job.numberOfPeopleNeeded || 1} אנשים`} />
            {job.specialRequirements && <DetailItem icon={<PlusCircleIcon className="w-7 h-7"/>} label="דרישות מיוחדות" value={job.specialRequirements} className="md:col-span-2"/>}
            </div>
          </div>

          {/* פרטי יצירת קשר */}
          <div className="bg-yellow-50 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-royal-blue mb-6 text-center">פרטי יצירת קשר</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem icon={<UserIcon className="w-7 h-7"/>} label="שם איש קשר" value={job.contactDisplayName || 'לא צוין'} />
              <DetailItem icon={<PhoneIcon className="w-7 h-7"/>} label="טלפון" value={job.contactPhone || 'לא צוין'} />
              <DetailItem icon={<MailIcon className="w-7 h-7"/>} label="אימייל" value={job.contactEmail || 'לא צוין'} />
              <DetailItem icon={<PhoneIcon className="w-7 h-7"/>} label="וואטסאפ" value={job.contactWhatsapp || 'לא צוין'} />
            </div>
          </div>
        </main>

        <footer className="mt-8 p-6 bg-neutral-gray rounded-xl shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!isOwner && (
            <>
              <Button onClick={handleContactClick} variant="primary" size="lg" icon={<PhoneIcon className="w-6 h-6"/>}>הצג פרטי יצירת קשר</Button>
              {job.preferredContactMethods.allowSiteMessages && (
                  <Button onClick={handleStartChat} variant="secondary" size="lg" icon={<ChatBubbleLeftEllipsisIcon className="w-6 h-6"/>}>שלח הודעה באתר</Button>
              )}
            </>
          )}
          {isOwner && (
              <div className="flex items-center gap-4">
                  <p className="text-lg text-gray-600">זוהי משרה שאת/ה פרסמת.</p>
                  <Button onClick={() => setCurrentPage('postJob', { editJobId: job.id })} variant="outline" size="lg" icon={<EditIcon className="w-5 h-5"/>}>ערוך משרה</Button>
              </div>
          )}
          </div>
        </footer>
      </div>

      <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="פרטי יצירת קשר" titleId={contactModalTitleId} size="sm">
        <div className="p-4 space-y-4">
            <h3 className="text-xl font-bold text-royal-blue text-center">{job.contactDisplayName}</h3>
            <ul className="space-y-3">
                {job.preferredContactMethods.phone && job.contactPhone && <li><a href={`tel:${job.contactPhone}`} className="flex items-center text-lg text-dark-text hover:text-deep-pink"><PhoneIcon className="w-6 h-6 ml-3 rtl:mr-3 rtl:ml-0 text-gray-400"/>{job.contactPhone}</a></li>}
                {job.preferredContactMethods.whatsapp && job.contactWhatsapp && <li><a href={`https://wa.me/${job.contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-lg text-dark-text hover:text-deep-pink"><ChatBubbleLeftEllipsisIcon className="w-6 h-6 ml-3 rtl:mr-3 rtl:ml-0 text-gray-400"/>{job.contactWhatsapp} (WhatsApp)</a></li>}
                {job.preferredContactMethods.email && job.contactEmail && <li><a href={`mailto:${job.contactEmail}`} className="flex items-center text-lg text-dark-text hover:text-deep-pink"><MailIcon className="w-6 h-6 ml-3 rtl:mr-3 rtl:ml-0 text-gray-400"/>{job.contactEmail}</a></li>}
            </ul>
             <Button onClick={() => setShowContactModal(false)} variant="primary" className="w-full mt-4">סגור</Button>
        </div>
      </Modal>
    </>
  );
};