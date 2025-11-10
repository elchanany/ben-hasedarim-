import React, { useState } from 'react';
import { Job, JobDifficulty, PaymentType, JobDateType } from '../types';
import type { Page } from '../App';
import { ClockIcon, UsersIcon, MapPinIcon, CalendarDaysIcon, CashIcon, EyeIcon, ChatBubbleLeftEllipsisIcon, ChartBarIcon, EditIcon, TrashIcon } from './icons';
import { gregSourceToHebrewString, getTodayGregorianISO, formatRelativePostedDate, formatGregorianString } from '../utils/dateConverter';
import { Button } from './Button';
import { Modal } from './Modal';
import { useAuth } from '../hooks/useAuth';
import * as jobService from '../services/jobService';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

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
    className="bg-royal-blue text-white px-2 py-0.5 text-xs font-semibold rounded-full hover:bg-deep-pink hover:text-white transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue/50 tap-highlight-transparent"
    aria-label={ariaLabel}
  >
    {label}
  </button>
);


export const JobCard: React.FC<JobCardProps> = ({ job, setCurrentPage, isHotJob = false, onJobDeleted }) => {
  const { user } = useAuth();
  const authCtx = useContext(AuthContext);
  const fmt = (iso?: string) => authCtx?.datePreference === 'gregorian' ? formatGregorianString(iso || '') : gregSourceToHebrewString(iso || '');
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
                    return `היום, ${fmt(job.specificDate)}`;
                }
                const jobDay = new Date(job.specificDate);
                jobDay.setHours(0,0,0,0);
                
                const todayDay = new Date(todayISO);
                todayDay.setHours(0,0,0,0);

                const yesterdayDay = new Date(todayDay);
                yesterdayDay.setDate(todayDay.getDate() - 1);

                if (jobDay.getTime() === yesterdayDay.getTime()) {
                    return `אתמול, ${fmt(job.specificDate)}`;
                }
                return fmt(job.specificDate); 
            }
            return `היום, ${fmt(todayISO)} (תאריך לא סופק)`; 
        case 'specificDate':
            return job.specificDate ? fmt(job.specificDate) : 'תאריך ספציפי';
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
      await jobService.deleteJob(job.id);
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


  const cardBaseClasses = "rounded-xl overflow-hidden transform transition-all hover:-translate-y-1 duration-300 ease-in-out flex flex-col cursor-pointer w-full max-w-[200px] sm:max-w-[220px] min-h-[240px]";
  const hotJobClasses = isHotJob ? "bg-yellow-100 border border-yellow-400 shadow-xl hover:shadow-2xl" : "bg-light-blue/20 border border-light-blue/30 shadow-lg hover:shadow-2xl";

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

      <div className="p-2 pb-1">
        {/* כותרת העבודה */}
        <div className="mb-2 p-2 bg-gradient-to-r from-royal-blue to-deep-pink rounded-lg">
            <h3 className="text-lg sm:text-xl font-black text-white leading-tight break-words" title={job.title}>
              {job.title}
            </h3>
        </div>
        
        {/* פרטי העבודה */}
        <div className="mb-2 p-2 bg-light-pink/60 rounded-lg">
          {/* פרטים חשובים - גדולים */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
            <InfoItem 
              icon={<MapPinIcon className="w-5 h-5" />} 
              text={job.area} 
              iconColor="text-red-500"
              textFont="font-assistant"
              textColor="text-royal-blue"
            />
            <InfoItem 
              icon={<CalendarDaysIcon className="w-5 h-5" />} 
              text={formatJobEventDate()}
              iconColor="text-emerald-600"
              textFont="font-assistant"
              textColor="text-royal-blue"
            />
          </div>
          
          {/* פרטים פחות חשובים - קטנים */}
          <div className="grid grid-cols-3 gap-x-1 gap-y-1 text-xs">
            <div className="flex items-center text-gray-600">
              <UsersIcon className="w-3 h-3 mr-1 text-indigo-600" />
              <span className="truncate" title={formatSuitabilityWithNeeded()}>
                {formatSuitabilityWithNeeded().length > 8 ? formatSuitabilityWithNeeded().substring(0, 8) + '...' : formatSuitabilityWithNeeded()}
              </span>
            </div>
            <div className="flex items-center text-gray-600">
              <ClockIcon className="w-3 h-3 mr-1 text-amber-600" />
              <span className="truncate" title={formatDuration()}>
                {formatDuration().length > 6 ? formatDuration().substring(0, 6) + '...' : formatDuration()}
              </span>
            </div>
            <div className="flex items-center text-gray-600">
              <ChartBarIcon className="w-3 h-3 mr-1 text-teal-600" />
              <span className="truncate" title={job.difficulty}>
                {job.difficulty}
              </span>
            </div>
          </div>
        </div>
        
        {/* תיאור העבודה */}
        <div className="mb-2 p-2 bg-yellow-100/70 rounded-lg flex-grow">
          <p className="text-xs text-gray-700 line-clamp-2" title={job.description}>{job.description}</p>
        </div>
      </div>

      {jobTags.length > 0 && (
        <div className="px-2 py-1 bg-neutral-gray rounded-lg mx-3 mb-1">
          <div className="flex flex-wrap gap-0.5 justify-center" aria-label="תגיות סינון למשרה">
            {jobTags.slice(0, 3).map((tag, index) => (
              <Tag key={index} label={tag.label} onClick={tag.onClick} ariaLabel={tag.ariaLabel} />
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-auto"> {/* This div wraps owner actions and below */}
        {isOwner && (
          <div className="px-2 pt-1.5 pb-1.5 flex justify-between items-center border-t border-light-pink/50 bg-light-pink/40">
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

        {/* מידע נוסף */}
        <div className="px-2 py-1 bg-neutral-gray/80 rounded-lg mx-3 mb-1">
          <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
            <span aria-label={`פורסם ${formatRelativePostedDate(job.postedDate, authCtx?.datePreference || 'hebrew')}`}>{formatRelativePostedDate(job.postedDate, authCtx?.datePreference || 'hebrew')}</span>
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <span className="flex items-center" aria-label={`${job.views || 0} צפיות`}>
                <EyeIcon className="w-3 h-3 mr-0.5 rtl:ml-0.5 rtl:mr-0 text-gray-400" aria-hidden="true"/>
                {job.views || 0}
              </span>
              <span className="flex items-center" aria-label={`${job.contactAttempts || 0} פניות`}>
                <ChatBubbleLeftEllipsisIcon className="w-3 h-3 mr-0.5 rtl:ml-0.5 rtl:mr-0 text-gray-400" aria-hidden="true"/>
                {job.contactAttempts || 0}
              </span>
            </div>
          </div>
          <p className="text-center text-xs text-royal-blue/80 group-hover:text-deep-pink transition-colors" aria-hidden="true">
            לחצו לפרטים נוספים
          </p>
        </div>

        {/* תשלום */}
        <div className={`p-2 text-center bg-gradient-to-r from-royal-blue to-deep-pink ${isHotJob ? 'border-orange-300' : 'border-gray-200'}`}>
          <div className="flex items-center justify-center space-x-1 rtl:space-x-reverse">
            <CashIcon className="w-4 h-4 text-white/90" aria-hidden="true"/>
            <p className="text-sm font-extrabold text-white" aria-label={`תשלום: ${getPaymentInfo()}`}>{getPaymentInfo()}</p>
          </div>
        </div>
      </div>
    </div>

    <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="אישור מחיקת משרה"
        titleId={modalTitleId}
        size="md"
    >
        <div className="text-center p-6">
        <TrashIcon className="w-16 h-16 text-red-600 mx-auto mb-4" aria-hidden="true"/>
        <p className="text-lg text-gray-800 font-medium mb-6">
            האם אתה בטוח שברצונך למחוק את המשרה "{job.title}"? לא ניתן לשחזר פעולה זו.
        </p>
        <div className="flex justify-center space-x-3 rtl:space-x-reverse">
            <Button variant="outline" onClick={() => setShowDeleteConfirmModal(false)} aria-label="ביטול מחיקת משרה" size="lg" className="px-6 py-2">
            ביטול
            </Button>
            <Button variant="danger" onClick={confirmDeleteJob} isLoading={isDeleting} aria-label={`אישור מחיקת המשרה ${job.title}`} size="lg" className="px-6 py-2">
            {isDeleting ? 'מוחק...' : 'כן, מחק משרה'}
            </Button>
        </div>
        </div>
    </Modal>
    </>
  );
};