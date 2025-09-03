
import React, { useState } from 'react';
import { Job, JobDifficulty, PaymentType, JobDateType } from '../types';
import type { Page } from '../App';
import { ClockIcon, UsersIcon, MapPinIcon, CalendarDaysIcon, CashIcon, EyeIcon, ChatBubbleLeftEllipsisIcon, ChartBarIcon, EditIcon, TrashIcon } from './icons';
import { gregSourceToHebrewString, getTodayGregorianISO, formatRelativePostedDate } from '../utils/dateConverter';
import { Button } from './Button';
import { Modal } from './Modal';
import { useAuth } from '../hooks/useAuth';

interface JobCardProps {
  job: Job;
  setCurrentPage: (page: Page, params?: Record<string, any>) => void;
  isHotJob?: boolean;
  onJobDeleted?: (jobId: string) => void; // Callback for when a job is deleted
}

const InfoItem: React.FC<{
  icon: React.ReactNode;
  text: string;
  iconColor: string;
  textColor?: string;
  textFont?: string;
  className?: string
}> = ({ icon, text, iconColor, textColor = "text-royal-blue/90", textFont = "font-assistant", className = '' }) => (
  <div className={`flex items-center space-x-1.5 rtl:space-x-reverse ${className}`}>
    <span className={iconColor} aria-hidden="true">{icon}</span>
    <span className={`truncate ${textFont} ${textColor}`} title={text}>{text}</span>
  </div>
);

interface TagProps {
  label: string;
  onClick: () => void;
  ariaLabel: string;
}

const Tag: React.FC<TagProps> = ({ label, onClick, ariaLabel }) => (
  <button
    onClick={(e) => {
      e.stopPropagation(); 
      onClick();
    }}
    className="bg-light-blue/70 text-royal-blue px-2.5 py-1 text-sm font-semibold rounded-full hover:bg-royal-blue hover:text-white transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue/50 tap-highlight-transparent"
    aria-label={ariaLabel}
  >
    {label}
  </button>
);


export const JobCard: React.FC<JobCardProps> = ({ job, setCurrentPage, isHotJob = false, onJobDeleted }) => {
  const { user } = useAuth();
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const modalTitleId = `delete-confirm-modal-title-${job.id}`;

  const isOwner = user?.id === job.postedBy.id;

  const getPaymentInfo = () => {
    if (job.paymentType === PaymentType.HOURLY && job.hourlyRate) {
      return `₪${job.hourlyRate} לשעה`;
    }
    if (job.paymentType === PaymentType.GLOBAL && job.globalPayment) {
      return `₪${job.globalPayment} סה"כ`;
    }
    return 'תשלום יסוכם';
  };

  const formatJobEventDate = () => {
    const todayISO = getTodayGregorianISO();
    switch(job.dateType) {
        case 'today':
            if (job.specificDate) {
                if (job.specificDate === todayISO) {
                    return `היום, ${gregSourceToHebrewString(job.specificDate)}`;
                }
                const jobDay = new Date(job.specificDate);
                jobDay.setHours(0,0,0,0);
                
                const todayDay = new Date(todayISO);
                todayDay.setHours(0,0,0,0);

                const yesterdayDay = new Date(todayDay);
                yesterdayDay.setDate(todayDay.getDate() - 1);

                if (jobDay.getTime() === yesterdayDay.getTime()) {
                    return `אתמול, ${gregSourceToHebrewString(job.specificDate)}`;
                }
                return gregSourceToHebrewString(job.specificDate); 
            }
            return `היום, ${gregSourceToHebrewString(todayISO)} (תאריך לא סופק)`; 
        case 'specificDate':
            return job.specificDate ? gregSourceToHebrewString(job.specificDate) : 'תאריך ספציפי';
        case 'comingWeek':
            return 'לשבוע הקרוב';
        case 'flexibleDate':
            return 'תאריך גמיש';
        default:
            return 'לא צוין';
    }
  };

  const formatDuration = () => {
    if (job.estimatedDurationIsFlexible) return 'גמיש';
    if (job.estimatedDurationHours) return `${job.estimatedDurationHours} שעות`;
    return 'לא צוין';
  };
  
  const formatSuitabilityWithNeeded = () => {
    const parts = [];
    if (job.suitability.men) parts.push("גברים");
    if (job.suitability.women) parts.push("נשים");
    if (job.suitability.general) parts.push("כללי");
    
    let suitabilityText = parts.join('/');
    if (parts.length === 0 && job.suitability.minAge) suitabilityText = `מגיל ${job.suitability.minAge}`;
    else if (parts.length > 0 && job.suitability.minAge) suitabilityText += `, מגיל ${job.suitability.minAge}`;
    else if (parts.length === 0) suitabilityText = 'לא צוין';
    
    if (job.numberOfPeopleNeeded && job.numberOfPeopleNeeded > 0) { 
        return `${suitabilityText} (דרושים: ${job.numberOfPeopleNeeded})`;
    }
    return suitabilityText;
  }

  const handleCardClick = () => {
    setCurrentPage('jobDetails', { jobId: job.id });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage('postJob', { editJobId: job.id });
  };

  const handleDeleteRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteJob = async () => {
    setIsDeleting(true);
    try {
      // Assuming jobService.deleteJob exists and works with Firestore
      const jobServiceModule = await import('../services/jobService');
      await jobServiceModule.deleteJob(job.id);
      setShowDeleteConfirmModal(false);
      if (onJobDeleted) {
        onJobDeleted(job.id);
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      // Handle error display to user, maybe with a toast/notification
    } finally {
      setIsDeleting(false);
    }
  };


  const cardBaseClasses = "rounded-xl overflow-hidden transform transition-all hover:-translate-y-1 duration-300 ease-in-out flex flex-col cursor-pointer w-full max-w-[320px] sm:max-w-[340px] min-h-[560px]";
  const hotJobClasses = isHotJob ? "bg-orange-100 border border-orange-400 shadow-xl hover:shadow-2xl" : "bg-white shadow-lg hover:shadow-2xl";

  const jobTags: TagProps[] = [];

  if (job.area) {
    jobTags.push({
      label: job.area,
      onClick: () => setCurrentPage('searchResults', { location: job.area }),
      ariaLabel: `סנן לפי אזור: ${job.area}`,
    });
  }
  
  if (job.paymentType) {
       jobTags.push({
          label: job.paymentType,
          onClick: () => setCurrentPage('searchResults', { paymentKind: job.paymentType }),
          ariaLabel: `סנן לפי סוג תשלום: ${job.paymentType}`
      });
  }

  let dateTypeTagLabel = '';
  let dateTypeTagValue: JobDateType | '' = '';
  if (job.dateType === 'today') {
      dateTypeTagLabel = `להיום`;
      dateTypeTagValue = 'today';
  } else if (job.dateType === 'flexibleDate') {
      dateTypeTagLabel = 'תאריך גמיש';
      dateTypeTagValue = 'flexibleDate';
  } else if (job.dateType === 'comingWeek') {
      dateTypeTagLabel = 'שבוע קרוב';
      dateTypeTagValue = 'comingWeek';
  }
  if (dateTypeTagLabel && dateTypeTagValue) {
      jobTags.push({
          label: dateTypeTagLabel,
          onClick: () => setCurrentPage('searchResults', { dateType: dateTypeTagValue }),
          ariaLabel: `סנן לפי תאריך: ${dateTypeTagLabel}`
      });
  }
  
  if (job.suitability.men && !job.suitability.women && !job.suitability.general) {
      jobTags.push({
          label: "לגברים",
          onClick: () => setCurrentPage('searchResults', { suitabilityFor: 'men' }),
          ariaLabel: `סנן למתאימים לגברים`
      });
  } else if (job.suitability.women && !job.suitability.men && !job.suitability.general) {
      jobTags.push({
          label: "לנשים",
          onClick: () => setCurrentPage('searchResults', { suitabilityFor: 'women' }),
          ariaLabel: `סנן למתאימים לנשים`
      });
  } else if (job.suitability.general) {
       jobTags.push({
          label: "לכללי",
          onClick: () => setCurrentPage('searchResults', { suitabilityFor: 'general' }),
          ariaLabel: `סנן למתאימים לכללי`
      });
  }

  return (
    <>
    <div
      onClick={handleCardClick}
      className={`${cardBaseClasses} ${hotJobClasses} relative`}
      role="button"
      tabIndex={0}
      aria-label={`צפה בפרטי המשרה: ${job.title}, באזור ${job.area}`}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      <span className="absolute top-3 left-3 text-xs font-mono text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow z-10" aria-hidden="true">
        #{job.id.substring(0,6)}
      </span>

      <div className="p-6 pb-4">
        <div className="flex items-baseline space-x-2 rtl:space-x-reverse mb-3">
            <h3 className="text-2xl sm:text-3xl font-bold text-royal-blue truncate" title={job.title}>
              {job.title}
            </h3>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-lg sm:text-xl mb-4">
          <InfoItem 
            icon={<MapPinIcon className="w-7 h-7" />} 
            text={job.area} 
            iconColor="text-red-500"
            textFont="font-assistant"
            textColor="text-royal-blue/90"
          />
          <InfoItem 
            icon={<CalendarDaysIcon className="w-7 h-7" />} 
            text={formatJobEventDate()}
            iconColor="text-emerald-600"
            textFont="font-assistant"
            textColor="text-royal-blue/90"
          />
          <InfoItem 
            icon={<UsersIcon className="w-7 h-7" />} 
            text={formatSuitabilityWithNeeded()}
            iconColor="text-indigo-600"
            textFont="font-assistant"
            textColor="text-royal-blue/90"
          />
          <InfoItem 
            icon={<ClockIcon className="w-7 h-7" />} 
            text={formatDuration()}
            iconColor="text-amber-600"
            textFont="font-assistant"
            textColor="text-royal-blue/90"
          />
           <InfoItem 
            icon={<ChartBarIcon className="w-7 h-7" />} 
            text={`קושי: ${job.difficulty}`}
            iconColor="text-teal-600"
            textFont="font-assistant"
            textColor="text-royal-blue/90"
          />
        </div>
      </div>

      <div className="px-6 mb-4 flex-grow">
        <p className="text-xl text-gray-700 line-clamp-3" title={job.description}>{job.description}</p>
      </div>

      {jobTags.length > 0 && (
        <div className="px-4 pt-1 pb-3 flex flex-wrap gap-2 justify-center" aria-label="תגיות סינון למשרה">
          {jobTags.slice(0, 4).map((tag, index) => (
            <Tag key={index} label={tag.label} onClick={tag.onClick} ariaLabel={tag.ariaLabel} />
          ))}
        </div>
      )}
      
      <div className="mt-auto"> {/* This div wraps owner actions and below */}
        {isOwner && (
          <div className="px-4 pt-3 pb-2 flex justify-between items-center border-t border-gray-200/70 bg-light-blue/20">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditClick}
              icon={<EditIcon className="w-4 h-4" />}
              className="!px-2 !py-1 text-xs"
              aria-label={`ערוך משרה: ${job.title}`}
            >
              ערוך
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteRequest}
              icon={<TrashIcon className="w-4 h-4" />}
              className="!px-2 !py-1 text-xs"
              aria-label={`מחק משרה: ${job.title}`}
            >
              מחק
            </Button>
          </div>
        )}

        <div className="px-6">
          <div className={`flex justify-between items-center text-lg text-gray-500 mb-2 pt-2 ${isOwner ? 'border-t border-gray-200/70' : ''}`}>
            <span aria-label={`פורסם ${formatRelativePostedDate(job.postedDate)}`}>{formatRelativePostedDate(job.postedDate)}</span>
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <span className="flex items-center" aria-label={`${job.views || 0} צפיות`}>
                <EyeIcon className="w-5 h-5 mr-1 rtl:ml-1 rtl:mr-0 text-gray-400" aria-hidden="true"/>
                {job.views || 0}
              </span>
              <span className="flex items-center" aria-label={`${job.contactAttempts || 0} פניות`}>
                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-1 rtl:ml-1 rtl:mr-0 text-gray-400" aria-hidden="true"/>
                {job.contactAttempts || 0}
              </span>
            </div>
          </div>
          <p className="text-center text-base text-royal-blue/80 group-hover:text-deep-pink transition-colors py-2" aria-hidden="true">
            לחצו לפרטים נוספים
          </p>
        </div>

        <div className={`p-4 text-center border-t bg-royal-blue ${isHotJob ? 'border-orange-300' : 'border-gray-200'}`}>
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <CashIcon className="w-8 h-8 sm:w-9 sm:h-9 text-white/90" aria-hidden="true"/>
            <p className="text-2xl sm:text-3xl font-extrabold text-white" aria-label={`תשלום: ${getPaymentInfo()}`}>{getPaymentInfo()}</p>
          </div>
        </div>
      </div>
    </div>

    <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="אישור מחיקת משרה"
        titleId={modalTitleId}
        size="sm"
    >
        <div className="text-center p-4">
        <TrashIcon className="w-16 h-16 text-red-500 mx-auto mb-4" aria-hidden="true"/>
        <p className="text-lg text-gray-700 mb-6">
            האם אתה בטוח שברצונך למחוק את המשרה "{job.title}"? לא ניתן לשחזר פעולה זו.
        </p>
        <div className="flex justify-center space-x-3 rtl:space-x-reverse">
            <Button variant="outline" onClick={() => setShowDeleteConfirmModal(false)} aria-label="ביטול מחיקת משרה">
            ביטול
            </Button>
            <Button variant="danger" onClick={confirmDeleteJob} isLoading={isDeleting} aria-label={`אישור מחיקת המשרה ${job.title}`}>
            {isDeleting ? 'מוחק...' : 'כן, מחק משרה'}
            </Button>
        </div>
        </div>
    </Modal>
    </>
  );
};
