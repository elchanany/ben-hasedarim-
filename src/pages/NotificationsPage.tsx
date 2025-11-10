
import React, { useState, useEffect, useCallback } from 'react';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { Notification, JobAlertPreference, ChatThread } from '../types';
import * as notificationService from '../services/notificationService';
import * as chatService from '../services/chatService';
import { Button } from '../components/Button';
import { BellIcon, PlusCircleIcon, SearchIcon, BriefcaseIcon, ChatBubbleLeftEllipsisIcon, UserIcon, EditIcon, TrashIcon } from '../components/icons';
import { formatRelativePostedDate } from '../utils/dateConverter';

const JobAlertFrequencyOptions = [
    { value: 'instant', label: 'מיידית (ברגע שמשרה מתאימה מתפרסמת)' },
    { value: 'daily', label: 'יומית (סיכום פעם ביום)' },
    { value: 'weekly', label: 'שבועית (סיכום פעם בשבוע)' },
];

// DELIVERY_METHOD_OPTIONS is not currently used as these options are marked as "in development"
// const DELIVERY_METHOD_OPTIONS = [
//     { id: 'email', value: 'email', label: 'אימייל' },
//     { id: 'whatsapp', value: 'whatsapp', label: 'הודעת וואטסאפ' },
//     { id: 'tzintuk', value: 'tzintuk', label: 'צינתוק לנייד' },
// ];


const ChatThreadListItem: React.FC<{
  thread: ChatThread;
  currentUserId: string;
  onClick: (threadId: string, otherParticipantName: string, jobTitle?: string, jobId?: string) => void;
}> = ({ thread, currentUserId, onClick }) => {
  const otherParticipantId = thread.participantIds.find(id => id !== currentUserId);
  const otherParticipant = otherParticipantId ? thread.participants[otherParticipantId] : null;
  const unreadCount = thread.unreadMessages[currentUserId] || 0;

  if (!otherParticipant) return null;

  const lastMessageText = thread.lastMessage 
    ? `${thread.lastMessage.senderId === currentUserId ? "את/ה: " : ""}${thread.lastMessage.text}`
    : "אין הודעות עדיין";

  return (
    <li
      onClick={() => onClick(thread.id, otherParticipant.displayName, thread.jobTitle, thread.jobId)}
      className={`p-3 sm:p-4 rounded-lg border flex items-center space-x-3 rtl:space-x-reverse cursor-pointer transition-colors duration-150 hover:bg-light-blue/50
                  ${unreadCount > 0 ? 'bg-yellow-50 border-yellow-300 font-semibold' : 'bg-gray-50 border-gray-200'}`}
      role="button"
      tabIndex={0}
      aria-label={`פתח שיחה עם ${otherParticipant.displayName}${thread.jobTitle ? ` לגבי ${thread.jobTitle}` : ''}. ${unreadCount > 0 ? `${unreadCount} הודעות חדשות.` : ''}`}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(thread.id, otherParticipant.displayName, thread.jobTitle, thread.jobId)}
    >
      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-royal-blue text-white rounded-full flex items-center justify-center" aria-hidden="true">
        <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center">
          <h4 className={`text-base sm:text-lg truncate ${unreadCount > 0 ? 'text-deep-pink' : 'text-royal-blue'}`}>
            {otherParticipant.displayName}
          </h4>
          {thread.lastMessage && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2 rtl:mr-2 rtl:ml-0">
              {formatRelativePostedDate(thread.lastMessage.timestamp, authCtx?.datePreference || 'hebrew')}
            </span>
          )}
        </div>
        {thread.jobTitle && (
          <p className="text-xs sm:text-sm text-gray-500 truncate flex items-center">
            <BriefcaseIcon className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 text-gray-400" aria-hidden="true"/>
            {thread.jobTitle}
          </p>
        )}
        <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-700' : 'text-gray-600'}`}>
          {lastMessageText}
        </p>
      </div>
      {unreadCount > 0 && (
        <div className="flex-shrink-0 ml-2 rtl:mr-2 rtl:ml-0" aria-label={`${unreadCount} הודעות חדשות`}>
          <span className="px-2.5 py-1 bg-deep-pink text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      )}
    </li>
  );
};


export const NotificationsPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
  const { user, refreshTotalUnreadCount } = useAuth();
  const [activeTab, setActiveTab] = useState<'alerts' | 'messages'>(pageParams?.tab === 'messages' ? 'messages' : 'alerts'); 

  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);
  const [jobAlerts, setJobAlerts] = useState<JobAlertPreference[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);

  const [loadingSystemNotifications, setLoadingSystemNotifications] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingChatThreads, setLoadingChatThreads] = useState(true);

  const fetchSystemNotifications = useCallback(async () => {
    if (user && activeTab === 'alerts') {
      setLoadingSystemNotifications(true);
      try {
        await notificationService.generateJobAlertMatches(user.id);
        const fetchedNotifications = await notificationService.getNotifications(user.id);
        setSystemNotifications(fetchedNotifications);
        refreshTotalUnreadCount(); 
      } catch (error) {
        console.error("Error fetching system notifications:", error);
      }
      setLoadingSystemNotifications(false);
    }
  }, [user, refreshTotalUnreadCount, activeTab]);

  const fetchJobAlerts = useCallback(async () => {
    if (user && activeTab === 'alerts') {
      setLoadingAlerts(true);
      try {
        const fetchedAlerts = await notificationService.getJobAlertPreferences(user.id);
        setJobAlerts(fetchedAlerts);
      } catch (error) {
        console.error("Error fetching job alerts:", error);
      }
      setLoadingAlerts(false);
    }
  }, [user, activeTab]);

  const fetchChatThreads = useCallback(async () => {
    if (user && activeTab === 'messages') {
        setLoadingChatThreads(true);
        try {
            const threads = await chatService.getChatThreads(user.id);
            setChatThreads(threads);
            refreshTotalUnreadCount();
        } catch (error) {
            console.error("Error fetching chat threads:", error);
        }
        setLoadingChatThreads(false);
    }
  }, [user, activeTab, refreshTotalUnreadCount]);


  useEffect(() => {
    if (activeTab === 'alerts') {
        fetchSystemNotifications();
        fetchJobAlerts();
    } else if (activeTab === 'messages') {
        fetchChatThreads();
    }
  }, [activeTab, fetchSystemNotifications, fetchJobAlerts, fetchChatThreads]);
  
  useEffect(() => {
    if (pageParams?.tab && pageParams.tab !== activeTab && (pageParams.tab === 'alerts' || pageParams.tab === 'messages')) {
        setActiveTab(pageParams.tab);
    } else if (!pageParams?.tab && activeTab !== 'alerts') { // Default to alerts if no tab param or invalid
        setCurrentPage('notifications', { tab: 'alerts' });
    }
  }, [activeTab, pageParams, setCurrentPage]);


  const handleMarkAsRead = async (notificationId: string) => {
    if (user) {
      await notificationService.markNotificationAsRead(user.id, notificationId);
      fetchSystemNotifications();
    }
  };

  const handleMarkAllSystemNotificationsAsRead = async () => {
    if (user) {
      await notificationService.markAllNotificationsAsRead(user.id);
      fetchSystemNotifications();
    }
  };
  
  const openEditAlertPage = (alert: JobAlertPreference) => {
    setCurrentPage('createJobAlert', { alertId: alert.id });
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (user && window.confirm("האם אתה בטוח שברצונך למחוק התראה זו?")) {
        try {
            await notificationService.deleteJobAlertPreference(user.id, alertId);
            fetchJobAlerts();
        } catch (error) {
            console.error("Error deleting job alert:", error);
        }
    }
  }

  const handleChatThreadClick = (threadId: string, otherParticipantName: string, jobTitle?: string, jobId?: string) => {
    if (user) {
        setCurrentPage('chatThread', { threadId, otherParticipantName, jobTitle, jobId });
    }
  };
  

  const TabButton: React.FC<{id: string, label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, count?: number, controlsPanelId: string}> = 
  ({id, label, icon, isActive, onClick, count, controlsPanelId}) => (
    <button
      id={id}
      onClick={onClick}
      className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-medium border-b-4 transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color
                  ${isActive ? 'border-deep-pink text-deep-pink' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
      role="tab"
      aria-selected={isActive}
      aria-controls={controlsPanelId}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && (
         <span className={`ml-1.5 rtl:mr-1.5 rtl:ml-0 min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full flex items-center justify-center ${isActive ? 'bg-deep-pink text-white' : 'bg-gray-300 text-gray-700'}`} aria-hidden="true">
            {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );


  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-8 px-2 sm:px-0">
      <div className="flex justify-between items-center mb-4 sm:mb-6 px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-royal-blue flex items-center">
            <BellIcon className="w-8 h-8 mr-3 rtl:ml-3 rtl:mr-0 text-deep-pink" aria-hidden="true"/>
            התראות והודעות
          </h1>
      </div>
      
      <div role="tablist" aria-label="קטגוריות התראות והודעות" className="flex border-b border-gray-200 bg-white sm:rounded-t-lg shadow-sm">
        <TabButton 
            id="tab-alerts"
            label="התראות מערכת" 
            icon={<BellIcon className="w-5 h-5" aria-hidden="true"/>} 
            isActive={activeTab === 'alerts'} 
            onClick={() => setActiveTab('alerts')}
            count={systemNotifications.filter(n => !n.isRead).length}
            controlsPanelId="panel-alerts"
        />
        <TabButton 
            id="tab-messages"
            label="הודעות האתר" 
            icon={<ChatBubbleLeftEllipsisIcon className="w-5 h-5" aria-hidden="true"/>} 
            isActive={activeTab === 'messages'} 
            onClick={() => setActiveTab('messages')}
            count={chatThreads.reduce((sum, t) => sum + (t.unreadMessages[user?.id || ''] || 0) ,0)}
            controlsPanelId="panel-messages"
        />
      </div>

      <div 
        id="panel-alerts" 
        role="tabpanel" 
        aria-labelledby="tab-alerts" 
        className={`${activeTab === 'alerts' ? 'block' : 'hidden'} space-y-6 sm:space-y-8 animate-fade-in-down`}
      >
        <section aria-labelledby="system-notifications-heading" className="bg-white p-3 sm:p-6 rounded-b-xl sm:rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">
              <h2 id="system-notifications-heading" className="text-xl sm:text-2xl font-semibold text-royal-blue">התראות על עבודות חדשות</h2>
              {systemNotifications.some(n => !n.isRead) && (
                <Button onClick={handleMarkAllSystemNotificationsAsRead} variant="outline" size="sm">סמן הכל כנקרא</Button>
              )}
            </div>
            {loadingSystemNotifications ? (
              <p role="status" aria-live="polite" className="text-center text-gray-500 py-4">טוען התראות...</p>
            ) : systemNotifications.length === 0 ? (
              <p className="text-center text-gray-500 py-4">אין לך התראות מערכת או משרות כרגע.</p>
            ) : (
              <ul className="space-y-3">
                {systemNotifications.map(notif => (
                  <li key={notif.id} className={`p-3 sm:p-4 rounded-lg border ${notif.isRead ? 'bg-gray-50 border-gray-200' : 'bg-light-blue/30 border-royal-blue/50 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                        <h3 className={`font-semibold ${notif.isRead ? 'text-gray-700' : 'text-royal-blue'}`}>{notif.title}</h3>
                        <p className={`text-sm ${notif.isRead ? 'text-gray-600' : 'text-gray-800'}`}>{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatRelativePostedDate(notif.createdAt, authCtx?.datePreference || 'hebrew')}</p>
                      </div>
                      <div className="flex-shrink-0 ml-3 rtl:mr-3 rtl:ml-0 space-x-6 rtl:space-x-reverse self-center">
                        {!notif.isRead && (
                          <Button onClick={() => handleMarkAsRead(notif.id)} variant="outline" size="sm" className="!px-3 !py-1.5" aria-label={`סמן כנקרא: ${notif.title}`}>קראתי</Button>
                        )}
                        {notif.link && (
                          <Button onClick={() => { if(notif.link?.startsWith('#/')) { window.location.hash = notif.link; } else if (notif.link) { window.open(notif.link, '_blank', 'noopener,noreferrer');} if(!notif.isRead) handleMarkAsRead(notif.id); }} variant="secondary" size="sm" className="!px-3 !py-1.5">
                            {notif.type === 'job_alert_match' ? 'צפה במשרה' : 'פתח קישור'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section aria-labelledby="job-alerts-management-heading" className="bg-white p-3 sm:p-6 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">
              <h2 id="job-alerts-management-heading" className="text-xl sm:text-2xl font-semibold text-royal-blue flex items-center">
                <SearchIcon className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0 text-deep-pink" aria-hidden="true"/>
                ניהול התראות על משרות (סינונים שמורים)
              </h2>
              <Button onClick={() => setCurrentPage('createJobAlert')} variant="primary" icon={<PlusCircleIcon className="w-5 h-5"/>}>
                הוסף התראה
              </Button>
            </div>
            {loadingAlerts ? (
              <p role="status" aria-live="polite" className="text-center text-gray-500 py-4">טוען הגדרות התראה...</p>
            ) : jobAlerts.length === 0 ? (
              <p className="text-center text-gray-500 py-4">עדיין לא הגדרת התראות על משרות. לחץ על "הוסף התראה" כדי להתחיל.</p>
            ) : (
              <ul className="space-y-4">
                {jobAlerts.map(alert => (
                  <li key={alert.id} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start">
                        <div className="flex-grow mb-3 sm:mb-0">
                            <h4 className="font-semibold text-royal-blue text-lg">{alert.name} {alert.isActive ? <span className="text-xs text-green-600">(פעילה)</span> : <span className="text-xs text-red-600">(לא פעילה)</span>}</h4>
                            <div className="text-sm text-gray-600 space-y-0.5 mt-1">
                                {alert.location && <p><strong>אזור:</strong> {alert.location}</p>}
                                {alert.difficulty && <p><strong>קושי:</strong> {alert.difficulty}</p>}
                                <p><strong>תדירות:</strong> {JobAlertFrequencyOptions.find(f => f.value === alert.frequency)?.label || alert.frequency}</p>
                                <p className="text-xs text-gray-500"><strong>אמצעי קבלה:</strong> אתר בלבד (אפשרויות נוספות בפיתוח)</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">בדיקה אחרונה: {alert.lastChecked ? formatRelativePostedDate(alert.lastChecked, authCtx?.datePreference || 'hebrew') : 'טרם נבדק'}</p>
                        </div>
                        <div className="flex space-x-3 rtl:space-x-reverse self-start sm:self-center flex-shrink-0">
                            <Button onClick={() => openEditAlertPage(alert)} size="sm" variant="outline" icon={<EditIcon className="w-4 h-4"/>} aria-label={`ערוך התראת משרות ${alert.name}`}>ערוך</Button>
                            <Button onClick={() => handleDeleteAlert(alert.id)} size="sm" variant="danger" icon={<TrashIcon className="w-4 h-4"/>} aria-label={`מחק התראת משרות ${alert.name}`}>מחק</Button>
                        </div>
                    </div>
                  </li>  
                ))}
              </ul>
            )}
        </section>
      </div>

      <div 
        id="panel-messages" 
        role="tabpanel" 
        aria-labelledby="tab-messages" 
        className={`${activeTab === 'messages' ? 'block' : 'hidden'} bg-white p-3 sm:p-6 rounded-b-xl sm:rounded-xl shadow-xl animate-fade-in-down`}
      >
        <h2 className="text-xl sm:text-2xl font-semibold text-royal-blue mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">ההודעות שלי</h2>
        {loadingChatThreads ? (
            <p role="status" aria-live="polite" className="text-center text-gray-500 py-4">טוען הודעות...</p>
        ) : chatThreads.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין לך הודעות עדיין.</p>
        ) : (
            <ul className="space-y-3">
                {chatThreads.map(thread => (
                    <ChatThreadListItem 
                        key={thread.id}
                        thread={thread}
                        currentUserId={user!.id} // User must exist to see this tab
                        onClick={handleChatThreadClick}
                    />
                ))}
            </ul>
        )}
      </div>
    </div>
  );
};
