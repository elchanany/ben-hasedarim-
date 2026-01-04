import React, { useState, useEffect, useCallback } from 'react';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { Notification as AppNotification, JobAlertPreference, ChatThread, JobAlertDeliveryMethods } from '../types';
import * as notificationService from '../services/notificationService';
import { Button } from '../components/Button';
import { BellIcon, PlusCircleIcon, SearchIcon, BriefcaseIcon, ChatBubbleLeftEllipsisIcon, UserIcon, EditIcon, TrashIcon, CheckCircleIcon, ClockIcon } from '../components/icons';
import { formatRelativePostedDate, formatDateByPreference } from '../utils/dateConverter';
import * as chatService from '../services/chatService';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';



const JobAlertFrequencyOptions = [
  { value: 'instant', label: 'מיידית (ברגע שמשרה מתאימה מתפרסמת)' },
  { value: 'daily', label: 'יומית (סיכום פעם ביום)' },
  { value: 'weekly', label: 'שבועית (סיכום פעם בשבוע)' },
];

const DELIVERY_METHOD_OPTIONS = [
  { id: 'email', value: 'email', label: 'אימייל' },
  { id: 'whatsapp', value: 'whatsapp', label: 'הודעת וואטסאפ' },
  { id: 'tzintuk', value: 'tzintuk', label: 'צינתוק לנייד' },
];


const ChatThreadListItem: React.FC<{
  thread: ChatThread;
  currentUserId: string;
  onClick: (threadId: string, otherParticipantName: string, jobTitle?: string, jobId?: string) => void;
  onDelete: (threadId: string) => void;
}> = ({ thread, currentUserId, onClick, onDelete }) => {
  const authCtx = useContext(AuthContext);
  try {
    if (!thread || !thread.participantIds || !Array.isArray(thread.participantIds)) {
      console.warn("Invalid thread data:", thread);
      return null;
    }

    const otherParticipantId = thread.participantIds.find(id => id !== currentUserId);
    const otherParticipant = otherParticipantId && thread.participants && thread.participants[otherParticipantId]
      ? thread.participants[otherParticipantId]
      : null;
    const unreadCount = (thread.unreadMessages && thread.unreadMessages[currentUserId] && typeof thread.unreadMessages[currentUserId] === 'number')
      ? thread.unreadMessages[currentUserId]
      : 0;

    if (!otherParticipant) {
      console.warn("No other participant found for thread:", thread.id);
      return null;
    }

    const lastMessageText = thread.lastMessage && thread.lastMessage.text
      ? `${thread.lastMessage.senderId === currentUserId ? "את/ה: " : ""}${thread.lastMessage.text}`
      : "אין הודעות עדיין";

    return (
      <li
        onClick={() => onClick(thread.id, otherParticipant.displayName || "משתתף", thread.jobTitle, thread.jobId)}
        className={`relative p-3 sm:p-4 rounded-xl border flex items-start space-x-3 rtl:space-x-reverse cursor-pointer transition-all duration-200 hover:shadow-md group min-h-[5.5rem]
                  ${unreadCount > 0 ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100'}`}
        role="button"
        tabIndex={0}
        aria-label={`פתח שיחה עם ${otherParticipant.displayName || "משתתף"}${thread.jobTitle ? ` לגבי ${thread.jobTitle}` : ''}. ${unreadCount > 0 ? `${unreadCount} הודעות חדשות.` : ''}`}
      >
        <div className="flex-shrink-0 w-12 h-12 bg-royal-blue text-white rounded-full flex items-center justify-center shadow-sm mt-1">
          <UserIcon className="w-6 h-6" />
        </div>

        <div className="flex-grow min-w-0 pr-0 sm:pr-2 flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-start pl-8  rtl:pr-0 rtl:pl-8">
              {/* Name on Right (RTL), Time on Left (RTL) - pl-8 to avoid overlapping trash icon if it was absolute, but here we flex */}
              <h4 className={`text-base sm:text-lg font-bold truncate max-w-[70%] ${unreadCount > 0 ? 'text-royal-blue' : 'text-gray-800'}`}>
                {otherParticipant.displayName || "משתתף"}
              </h4>
              <span className="text-[11px] sm:text-xs text-gray-400 absolute top-4 left-4">
                {/* Positioned absolutely top-left */}
                {thread.lastMessage && thread.lastMessage.timestamp &&
                  formatRelativePostedDate(thread.lastMessage.timestamp, authCtx?.datePreference || 'hebrew')
                }
              </span>
            </div>

            {thread.jobTitle && (
              <p className="text-xs text-gray-500 truncate flex items-center mt-1">
                <BriefcaseIcon className="w-3 h-3 ml-1 rtl:mr-1 rtl:ml-0 text-gray-400" />
                <span className="truncate">{thread.jobTitle}</span>
              </p>
            )}

            <p className={`text-sm truncate mt-1 ${unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
              {lastMessageText}
            </p>
          </div>
        </div>

        {/* Actions & Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-royal-blue text-white text-[10px] sm:text-xs font-bold rounded-full shadow-sm animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(thread.id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
            title="מחק שיחה"
            aria-label="מחק שיחה"
          >
            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </li>
    );
  } catch (error) {
    console.error("Error in ChatThreadListItem:", error, { thread, currentUserId });
    return (
      <li className="p-3 sm:p-4 rounded-lg border bg-red-50 border-red-200">
        <p className="text-red-600 text-sm">שגיאה בטעינת שיחה</p>
      </li>
    );
  }
};


export const NotificationsPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
  const { user, refreshTotalUnreadCount } = useAuth();
  const authCtx = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'messages' | 'job_alerts' | 'system'>('messages');

  // Early return if user is not logged in... (lines 114-123 kept same)
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-8 px-2 sm:px-0">
        <div className="text-center p-10">
          <h1 className="text-2xl font-bold text-royal-blue mb-4">התראות והודעות</h1>
          <p className="text-gray-600">עליך להתחבר כדי לצפות בהתראות ובהודעות שלך.</p>
        </div>
      </div>
    );
  }

  // State hooks...
  const [systemNotifications, setSystemNotifications] = useState<AppNotification[]>([]);
  const [jobAlerts, setJobAlerts] = useState<JobAlertPreference[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);

  const [loadingSystemNotifications, setLoadingSystemNotifications] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingChatThreads, setLoadingChatThreads] = useState(true);

  // Search and filter state for Messages tab
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSortOrder, setChatSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [chatFilterUnread, setChatFilterUnread] = useState(false);
  const [isChatFilterOpen, setIsChatFilterOpen] = useState(false);

  // Pagination for job alert notifications
  const [visibleJobAlertCount, setVisibleJobAlertCount] = useState(10);

  // Helper for date formatting handles both Firestore Timestamp and strings
  const formatNotificationDate = (timestamp: any) => {
    return formatDateByPreference(timestamp, authCtx?.datePreference || 'hebrew');
  };

  // Modal State...
  const [selectedSystemNotification, setSelectedSystemNotification] = useState<AppNotification | null>(null);
  const [showSystemNotificationModal, setShowSystemNotificationModal] = useState(false);

  // Sub-tab state for Job Alerts
  const [jobAlertSubTab, setJobAlertSubTab] = useState<'notifications' | 'settings'>('notifications');

  const handleViewSystemNotification = async (notification: AppNotification) => {
    if (!notification.isRead) {
      setSystemNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      // TODO: Call backend service to mark as read
      try {
        if (notificationService.markNotificationAsRead && user) {
          await notificationService.markNotificationAsRead(user.id, notification.id);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    setSelectedSystemNotification(notification);
    if (notification.type === 'system_update') {
      setShowSystemNotificationModal(true);
    }
  };

  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Fetch functions... (lines 138-185 kept same)
  const fetchSystemNotifications = useCallback(async () => {
    if (user) {
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
  }, [user, refreshTotalUnreadCount]);

  const fetchJobAlerts = useCallback(async () => {
    if (user) {
      setLoadingAlerts(true);
      try {
        const fetchedAlerts = await notificationService.getJobAlertPreferences(user.id);
        setJobAlerts(fetchedAlerts);
      } catch (error) {
        console.error("Error fetching job alerts:", error);
      }
      setLoadingAlerts(false);
    }
  }, [user]);

  const fetchChatThreads = useCallback(async () => {
    if (user) {
      setLoadingChatThreads(true);
      try {
        const threads = await chatService.getChatThreads(user.id);
        if (Array.isArray(threads)) {
          setChatThreads(threads);
        } else {
          setChatThreads([]);
        }
        refreshTotalUnreadCount();
      } catch (error) {
        console.error("Error fetching chat threads:", error);
        setChatThreads([]);
      } finally {
        setLoadingChatThreads(false);
      }
    }
  }, [user, refreshTotalUnreadCount]);

  // Effects... (lines 188-210)
  // Load initial data
  useEffect(() => {
    if (user) {
      try {
        fetchSystemNotifications();
        fetchJobAlerts();
        fetchChatThreads();
      } catch (error) {
        console.error("Error in initial data fetch:", error);
      }
    }
  }, [user, fetchSystemNotifications, fetchJobAlerts, fetchChatThreads, authCtx?.totalUnreadCount]);

  useEffect(() => {
    // Determine active tab from params or defaults
    try {
      if (pageParams?.tab && pageParams.tab !== activeTab && ['messages', 'job_alerts', 'system'].includes(pageParams.tab)) {
        setActiveTab(pageParams.tab as any);
      }
    } catch (error) {
      console.error("Error in tab change effect:", error);
    }
  }, [pageParams?.tab]);

  // Handlers... (lines 213-280 kept same)
  const handleMarkAsRead = async (notificationId: string) => {
    if (user) {
      try {
        await notificationService.markNotificationAsRead(user.id, notificationId);
        fetchSystemNotifications();
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const handleMarkAllSystemNotificationsAsRead = async () => {
    if (user) {
      try {
        await notificationService.markAllNotificationsAsRead(user.id);
        fetchSystemNotifications();
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
      }
    }
  };

  const openEditAlertPage = (alert: JobAlertPreference) => {
    setCurrentPage('createJobAlert', { alertId: alert.id });
  };

  const handleDeleteAlert = (alertId: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'מחיקת התראה',
      message: 'האם אתה בטוח שברצונך למחוק התראה זו לצמיתות?',
      confirmText: 'כן, מחק',
      isDestructive: true,
      onConfirm: async () => {
        if (user) {
          try {
            await notificationService.deleteJobAlertPreference(user.id, alertId);
            fetchJobAlerts();
            setConfirmationModal(prev => ({ ...prev, isOpen: false }));
          } catch (error) {
            console.error("Error deleting job alert:", error);
          }
        }
      }
    });
  }

  const handleToggleAlertActive = async (alert: JobAlertPreference) => {
    if (user) {
      try {
        const updatedAlert = { ...alert, isActive: !alert.isActive };
        // Use updateJobAlertPreference but exclude id/userId/lastChecked which are not in the payload type usually, 
        // but checking usage in CreateJobAlertPage, it passes a partial object.
        // We need to pass the full object minus the read-only fields.
        // Actually service updateJobAlertPreference takes (userId, alertId, updates).
        const { id, userId, lastChecked, ...updates } = updatedAlert;
        await notificationService.updateJobAlertPreference(user.id, alert.id, updates);
        fetchJobAlerts();
      } catch (error) {
        console.error("Error toggling alert active status:", error);
      }
    }
  };

  const handleChatThreadClick = (threadId: string, otherParticipantName: string, jobTitle?: string, jobId?: string) => {
    if (user) {
      try {
        setCurrentPage('chatThread', { threadId, otherParticipantName, jobTitle, jobId });
      } catch (error) {
        console.error("Error navigating to chat thread:", error);
      }
    }
  };

  const handleDeleteChat = (threadId: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'מחיקת שיחה לצמיתות',
      message: 'האם אתה בטוח שברצונך למחוק את השיחה הזו לצמיתות? פעולה זו תמחק את כל ההודעות בשיחה עבור שני המשתתפים ולא ניתן יהיה לשחזר אותה.',
      confirmText: 'מחק לצמיתות',
      isDestructive: true,
      onConfirm: async () => {
        if (user) {
          try {
            // Hard delete as per user request ("delete from both sides")
            // In a real app we might ask, but here the requirement is specific
            await chatService.deleteChatThread(threadId, user.id, true);
            fetchChatThreads();
            setConfirmationModal(prev => ({ ...prev, isOpen: false }));
          } catch (error) {
            console.error("Error deleting chat thread:", error);
          }
        }
      }
    });
  };

  const handleDisableAlertById = (alertId: string, alertName: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'ביטול התראה',
      message: `האם ברצונך להפסיק לקבל התראות עבור "${alertName}"?`,
      confirmText: 'כן, בטל התראה',
      isDestructive: false,
      onConfirm: async () => {
        if (user) {
          try {
            await notificationService.updateJobAlertPreference(user.id, alertId, { isActive: false });
            fetchJobAlerts(); // Refresh alerts list
            setConfirmationModal(prev => ({ ...prev, isOpen: false }));
          } catch (error) {
            console.error("Error disabling alert:", error);
          }
        }
      }
    });
  };

  /* Mark messages as read handler */
  const handleMarkAllMessagesAsRead = async () => {
    const unreadThreads = chatThreads.filter(t => t.unreadMessages[user?.id || ''] > 0);
    if (!user || unreadThreads.length === 0) return;

    // Optimistic update
    setChatThreads(prev => prev.map(t => ({
      ...t,
      unreadMessages: { ...t.unreadMessages, [user.id]: 0 }
    })));

    try {
      await Promise.all(unreadThreads.map(t => chatService.markThreadAsRead(t.id, user.id)));
      refreshTotalUnreadCount();
    } catch (error) {
      console.error("Error marking all messages as read:", error);
      // Revert in case of critical failure if needed, or just let next fetch sync it
    }
  };

  const handleDeleteAllChats = () => {
    if (!user || chatThreads.length === 0) return;

    setConfirmationModal({
      isOpen: true,
      title: 'מחיקת כל ההודעות',
      message: 'האם אתה בטוח שברצונך למחוק את כל ההודעות שלך? פעולה זו תמחק את כל השיחות ולא ניתן יהיה לשחזר אותן.',
      confirmText: 'כן, מחק הכל',
      cancelText: 'ביטול',
      isDestructive: true,
      onConfirm: async () => {
        try {
          // Optimistic update
          setChatThreads([]);

          // Delete all threads
          await Promise.all(chatThreads.map(t => chatService.deleteChatThread(t.id, user.id, true)));

          refreshTotalUnreadCount();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Error deleting all chats:", error);
          fetchChatThreads(); // Revert on error
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  /* Mark all job alerts as read handler */
  const handleMarkAllAlertsAsRead = async () => {
    const unreadAlerts = systemNotifications.filter(n => !n.isRead && n.type === 'job_alert_match');
    if (!user || unreadAlerts.length === 0) return;

    // Optimistic update
    setSystemNotifications(prev => prev.map(n =>
      (n.type === 'job_alert_match' && !n.isRead) ? { ...n, isRead: true } : n
    ));

    try {
      if (notificationService.markAllNotificationsAsRead) {
        await notificationService.markAllNotificationsAsRead(user.id);
      }

      // Also loop for Firestore persistence if the service only does local
      const unreadIds = unreadAlerts.map(n => n.id);
      if (unreadIds.length > 0) {
        // Fire and forget for UX speed
        Promise.all(unreadIds.map(id => notificationService.markNotificationAsRead(user!.id, id))).catch(console.error);
      }

      // Sync navbar badge count
      refreshTotalUnreadCount();
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
  };

  /* Clear all job alert notifications handler */
  const handleClearAllAlerts = async () => {
    const jobAlertNotifs = systemNotifications.filter(n => n.type === 'job_alert_match');
    if (!user || jobAlertNotifs.length === 0) return;

    // Optimistic UI update - remove all job_alert_match notifications
    setSystemNotifications(prev => prev.filter(n => n.type !== 'job_alert_match'));

    // Clear from localStorage (notificationService uses localStorage)
    try {
      // Mark all as read first, then remove from local storage
      // For now, clearing means marking all as read and removing from the displayed list.
      // A more thorough approach would involve a deleteNotification service, but for MVP, this works.
      await notificationService.markAllNotificationsAsRead(user.id);
      refreshTotalUnreadCount();
    } catch (error) {
      console.error('Error clearing all alerts:', error);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (notif.link) {
      window.open(notif.link, '_blank');
    }
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
  };

  const TabButton: React.FC<{ label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, count?: number }> =
    ({ label, icon, isActive, onClick, count }) => (
      <button
        onClick={onClick}
        className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-medium border-b-4 transition-all duration-150 ease-in-out
                  ${isActive ? 'border-deep-pink text-deep-pink' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        role="tab"
        aria-selected={isActive}
      >
        {icon}
        <span>{label}</span>
        {typeof count === 'number' && count > 0 && (
          // Badge is always red as requested by user
          <span className={`ml-1.5 rtl:mr-1.5 rtl:ml-0 min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full flex items-center justify-center bg-red-600 text-white animate-pulse shadow-sm`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-8 px-4 sm:px-0">
      <div className="flex justify-between items-center mb-4 sm:mb-6 px-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-royal-blue flex items-center">
          <BellIcon className="w-8 h-8 mr-3 rtl:ml-3 rtl:mr-0 text-deep-pink" />
          התראות והודעות
        </h1>
      </div>

      <div className="flex border-b border-light-blue/30 bg-light-blue/10 sm:rounded-t-lg shadow-sm overflow-x-auto">
        <TabButton
          label="הודעות ממשתמשים"
          icon={<ChatBubbleLeftEllipsisIcon className="w-5 h-5" />}
          isActive={activeTab === 'messages'}
          onClick={() => setActiveTab('messages')}
          count={chatThreads.reduce((sum, t) => sum + (t.unreadMessages[user?.id || ''] || 0), 0)}
        />
        <TabButton
          label="התראות על משרות"
          icon={<BriefcaseIcon className="w-5 h-5" />}
          isActive={activeTab === 'job_alerts'}
          onClick={() => setActiveTab('job_alerts')}
          count={systemNotifications.filter(n => !n.isRead && n.type === 'job_alert_match').length}
        />
        <TabButton
          label="עדכוני מערכת"
          icon={<BellIcon className="w-5 h-5" />}
          isActive={activeTab === 'system'}
          onClick={() => setActiveTab('system')}
          count={systemNotifications.filter(n => !n.isRead && n.type === 'system_update').length}
        />
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in-down">
          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b flex-wrap gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-royal-blue flex items-center">
                <ChatBubbleLeftEllipsisIcon className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0 text-deep-pink" />
                הודעות שקיבלת ממשתמשים
              </h2>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleMarkAllMessagesAsRead}
                  variant="outline"
                  size="sm"
                  disabled={!chatThreads.some(t => t.unreadMessages[user?.id || ''] > 0)}
                  className={!chatThreads.some(t => t.unreadMessages[user?.id || ''] > 0) ? "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200" : ""}
                >
                  סמן הכל כנקרא
                </Button>
                {chatThreads.length > 0 && (
                  <Button onClick={handleDeleteAllChats} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">נקה הכל</Button>
                )}
              </div>
            </div>
            {loadingChatThreads ? (
              <p className="text-center text-gray-500 py-4">טוען הודעות...</p>
            ) : chatThreads.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <ChatBubbleLeftEllipsisIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">תיבת ההודעות שלך ריקה.</p>
              </div>
            ) : (
              <>
                {/* Search and Filter Controls - Collapsible */}
                {isChatFilterOpen && (
                  <div className="mb-4 space-y-3 bg-gray-50 p-4 rounded-lg animate-fade-in-down">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="חפש לפי שם או מילה..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-royal-blue text-right"
                      />
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      {chatSearchQuery && (
                        <button
                          onClick={() => setChatSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Sort and Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setChatSortOrder('newest')}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${chatSortOrder === 'newest'
                          ? 'bg-royal-blue text-white border-royal-blue'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-royal-blue'
                          }`}
                      >
                        חדש ביותר
                      </button>
                      <button
                        onClick={() => setChatSortOrder('oldest')}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${chatSortOrder === 'oldest'
                          ? 'bg-royal-blue text-white border-royal-blue'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-royal-blue'
                          }`}
                      >
                        ישן ביותר
                      </button>
                      <button
                        onClick={() => setChatFilterUnread(!chatFilterUnread)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${chatFilterUnread
                          ? 'bg-deep-pink text-white border-deep-pink'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-deep-pink'
                          }`}
                      >
                        רק לא נקראו
                      </button>
                    </div>
                  </div>
                )}

                <ul className="space-y-3">

                  {chatThreads
                    // Filter by unread
                    .filter(thread => {
                      if (chatFilterUnread) {
                        return (thread.unreadMessages[user?.id || ''] || 0) > 0;
                      }
                      return true;
                    })
                    // Filter by search query
                    .filter(thread => {
                      if (!chatSearchQuery.trim()) return true;
                      const query = chatSearchQuery.toLowerCase();
                      const otherParticipantId = thread.participantIds.find(id => id !== user?.id);
                      const otherParticipant = otherParticipantId && thread.participants?.[otherParticipantId];
                      const participantName = otherParticipant?.displayName?.toLowerCase() || '';
                      const jobTitle = thread.jobTitle?.toLowerCase() || '';
                      const lastMessage = thread.lastMessage?.text?.toLowerCase() || '';
                      return participantName.includes(query) || jobTitle.includes(query) || lastMessage.includes(query);
                    })
                    // Sort by date
                    .sort((a, b) => {
                      const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
                      const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
                      return chatSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
                    })
                    .map(thread => (
                      <ChatThreadListItem
                        key={thread.id}
                        thread={thread}
                        currentUserId={user?.id || ''}
                        onClick={handleChatThreadClick}
                        onDelete={handleDeleteChat}
                      />
                    ))}

                  {/* No results message */}
                  {chatThreads.length > 0 &&
                    chatThreads.filter(t => {
                      if (chatFilterUnread && (t.unreadMessages[user?.id || ''] || 0) === 0) return false;
                      if (!chatSearchQuery.trim()) return true;
                      const query = chatSearchQuery.toLowerCase();
                      const otherParticipantId = t.participantIds.find(id => id !== user?.id);
                      const otherParticipant = otherParticipantId && t.participants?.[otherParticipantId];
                      const participantName = otherParticipant?.displayName?.toLowerCase() || '';
                      const jobTitle = t.jobTitle?.toLowerCase() || '';
                      const lastMessage = t.lastMessage?.text?.toLowerCase() || '';
                      return participantName.includes(query) || jobTitle.includes(query) || lastMessage.includes(query);
                    }).length === 0 && (
                      <li className="text-center py-4 text-gray-500">
                        לא נמצאו שיחות מתאימות
                      </li>
                    )
                  }
                </ul>
              </>
            )}
          </div>
        </div>
      )
      }

      {/* Job Alerts Tab - Two columns: Notifications | Management */}
      {
        activeTab === 'job_alerts' && (
          <div className="animate-fade-in-down">
            {/* Sub-tabs Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 border-b border-gray-100 pb-4">
              <TabButton
                label="התראות שהתקבלו"
                icon={<BellIcon className="w-5 h-5 text-yellow-500" />}
                isActive={jobAlertSubTab === 'notifications'}
                onClick={() => setJobAlertSubTab('notifications')}
                count={systemNotifications.filter(n => !n.isRead && n.type === 'job_alert_match').length}
              />
              <TabButton
                label="ניהול התראות"
                icon={<SearchIcon className="w-5 h-5 text-deep-pink" />}
                isActive={jobAlertSubTab === 'settings'}
                onClick={() => setJobAlertSubTab('settings')}
                // User requested to remove the "alert-like" badge for management tab count
                // We show count 0 here to hide the badge, or we could just remove the count prop.
                // Alternatively, we can show it but ensure the TabButton handles 'isNotification' prop if we had one.
                // For now, let's just pass 0 to hide the red/gray badge, effectively removing the confusion.
                count={0}
              />
            </div>

            {/* Content: Job Alert Notifications */}
            {jobAlertSubTab === 'notifications' && (
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-xl animate-fade-in">
                <div className="flex justify-between items-center mb-4 pb-3 border-b flex-wrap gap-2">
                  <h2 className="text-xl font-semibold text-royal-blue flex items-center">
                    <BellIcon className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0 text-royal-blue" />
                    התראות על משרות חדשות
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    {systemNotifications.some(n => !n.isRead && n.type === 'job_alert_match') && (
                      <Button onClick={handleMarkAllAlertsAsRead} variant="outline" size="sm">קראתי הכל</Button>
                    )}
                    {systemNotifications.some(n => n.type === 'job_alert_match') && (
                      <Button onClick={handleClearAllAlerts} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">נקה התראות</Button>
                    )}
                  </div>
                </div>
                {loadingSystemNotifications ? (
                  <p className="text-center text-gray-500 py-4">טוען התראות...</p>
                ) : systemNotifications.filter(n => n.type === 'job_alert_match').length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BriefcaseIcon className="w-8 h-8 text-royal-blue" />
                    </div>
                    <h3 className="text-lg font-semibold text-royal-blue mb-2">אין התראות על משרות חדשות</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">צור התראה מותאמת אישית וקבל עדכונים על משרות חדשות שמתאימות לך!</p>
                    <Button
                      onClick={() => setCurrentPage('createJobAlert')}
                      variant="primary"
                      size="lg"
                      icon={<PlusCircleIcon className="w-5 h-5" />}
                      className="bg-royal-blue hover:bg-blue-700 text-white font-semibold shadow-lg transform hover:scale-105 transition-all"
                    >
                      צור התראה חדשה
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {systemNotifications
                      .filter(n => n.type === 'job_alert_match')
                      .sort((a, b) => {
                        const timeA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : 0;
                        const timeB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : 0;
                        return timeB - timeA;
                      })
                      .slice(0, visibleJobAlertCount)
                      .map(notif => (
                        <li
                          key={notif.id}
                          className={`p-4 border rounded-lg transition-all hover:shadow-md cursor-pointer ${notif.isRead ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                          onClick={() => {
                            handleViewSystemNotification(notif);
                            // Always navigate to job, whether read or not
                            if (notif.jobId) {
                              const url = `${window.location.origin}/#/jobDetails?jobId=${notif.jobId}`;
                              window.open(url, '_blank');
                            } else if (notif.link) {
                              window.open(notif.link, '_blank');
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center"
                              title="מתאים להתראה"
                            >
                              <BriefcaseIcon className="w-6 h-6 text-royal-blue" />
                            </div>

                            <div className="flex-grow min-w-0">
                              {/* Job title - Large and prominent */}
                              <h4 className="text-lg font-bold text-gray-800 hover:text-royal-blue transition-colors truncate">
                                {notif.message.replace(/^"|"$/g, '').split('" באזור')[0]}
                              </h4>
                              {/* Alert name - Small and subtle */}
                              <p className="text-sm text-gray-500 mt-0.5">{notif.title}</p>
                              <span className="text-xs text-gray-400 mt-1 block">
                                {formatNotificationDate(notif.timestamp || notif.createdAt)}
                              </span>
                            </div>

                            <div className="flex flex-col items-center gap-2 flex-shrink-0">
                              {!notif.isRead && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSystemNotification(notif);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="!px-2 !py-1 text-xs whitespace-nowrap bg-blue-50 hover:bg-blue-100 border-blue-200 text-royal-blue"
                                  title="סמן כנקרא"
                                >
                                  סמן כנקרא
                                </Button>
                              )}
                              {!notif.isRead && (
                                <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 animate-pulse"></span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
                {systemNotifications.filter(n => n.type === 'job_alert_match').length > visibleJobAlertCount && (
                  <div className="text-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleJobAlertCount(prev => prev + 10)}
                    >
                      הצג עוד (טען 10 נוספים)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Content: My Alerts Management */}
            {jobAlertSubTab === 'settings' && (
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-xl animate-fade-in">
                <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">
                  <h2 className="text-xl sm:text-2xl font-semibold text-royal-blue flex items-center">
                    <SearchIcon className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0 text-deep-pink" />
                    ניהול ההתראות שלי
                    {jobAlerts.length > 0 && <span className="mr-3 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">({jobAlerts.filter(a => a.isActive).length} פעילות)</span>}
                  </h2>
                  <Button onClick={() => setCurrentPage('createJobAlert')} variant="primary" icon={<PlusCircleIcon className="w-5 h-5" />}>
                    יצירת התראה חדשה
                  </Button>
                </div>
                {loadingAlerts ? (
                  <p className="text-center text-gray-500 py-4">טוען הגדרות...</p>
                ) : jobAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">לא הוגדרו התראות עדיין.</p>
                    <Button onClick={() => setCurrentPage('createJobAlert')} variant="primary">צור התראה ראשונה</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobAlerts.map(alert => (
                      <div key={alert.id} className={`p-4 border rounded-lg shadow-sm transition-colors ${alert.isActive ? 'bg-white border-royal-blue/20' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-royal-blue text-lg">{alert.name}</h4>
                              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0" dir="ltr">
                                <input type="checkbox" checked={alert.isActive} onChange={() => handleToggleAlertActive(alert)} className="sr-only peer" />
                                <div className="w-[44px] h-[24px] bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                <span className={`ml-2 text-xs font-medium ${alert.isActive ? 'text-green-600' : 'text-gray-500'}`}>{alert.isActive ? 'פעיל' : 'מושהה'}</span>
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                              {alert.location && <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-800">{alert.location}</span>}
                              {alert.difficulty && <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-800">{alert.difficulty}</span>}
                              <span className="text-gray-400">|</span>
                              <span>{JobAlertFrequencyOptions.find(o => o.value === alert.frequency)?.label || alert.frequency}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 self-end sm:self-center">
                            <Button onClick={() => openEditAlertPage(alert)} variant="outline" size="sm" icon={<EditIcon className="w-4 h-4" />}>ערוך</Button>
                            <button onClick={() => handleDeleteAlert(alert.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="מחק התראה">
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }

      {/* System Messages Tab */}
      {
        activeTab === 'system' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in-down">
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-xl border-t-4 border-royal-blue">
              <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">
                <h2 className="text-xl sm:text-2xl font-semibold text-royal-blue flex items-center">
                  <BellIcon className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0 text-royal-blue" />
                  הודעות ועדכוני מערכת
                </h2>
                {systemNotifications.some(n => !n.isRead && n.type !== 'job_alert_match') && (
                  <Button onClick={handleMarkAllSystemNotificationsAsRead} variant="outline" size="sm">סמן הכל כנקרא</Button>
                )}
              </div>

              {loadingSystemNotifications ? (
                <p className="text-center text-gray-500 py-4">טוען הודעות...</p>
              ) : systemNotifications.filter(n => n.type !== 'job_alert_match').length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <BellIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">אין הודעות מערכת חדשות.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {systemNotifications.filter(n => n.type !== 'job_alert_match').map(notif => (
                    <li key={notif.id} className={`p-3 sm:p-4 rounded-lg border ${notif.isRead ? 'bg-gray-50 border-gray-200' : 'bg-light-blue/30 border-royal-blue/30 shadow-sm'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-grow">
                          <h3 className={`font-semibold ${notif.isRead ? 'text-gray-700' : 'text-royal-blue'}`}>{notif.title}</h3>
                          <p className={`text-sm ${notif.isRead ? 'text-gray-600' : 'text-gray-800'}`}>{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativePostedDate(notif.createdAt, authCtx?.datePreference || 'hebrew')}</p>
                        </div>
                        <div className="flex-shrink-0 ml-3 rtl:mr-3 rtl:ml-0 flex flex-col sm:flex-row gap-2 self-center">
                          {!notif.isRead && (<Button onClick={() => handleMarkAsRead(notif.id)} variant="outline" size="sm" className="!px-3 !py-1.5">קראתי</Button>)}
                          {notif.type === 'system_update' ? (
                            <Button onClick={() => { setSelectedSystemNotification(notif); setShowSystemNotificationModal(true); if (!notif.isRead) handleMarkAsRead(notif.id); }} variant="secondary" size="sm" className="!px-3 !py-1.5 bg-royal-blue text-white hover:bg-blue-700">צפה</Button>
                          ) : notif.link && (
                            <Button onClick={() => { if (notif.link) window.open(notif.link, '_blank'); if (!notif.isRead) handleMarkAsRead(notif.id); }} variant="secondary" size="sm" className="!px-3 !py-1.5">פתח</Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )
      }



      {/* System Notification Modal */}
      {
        showSystemNotificationModal && selectedSystemNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 animate-scale-up border-t-4 border-royal-blue">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-royal-blue">{selectedSystemNotification.title}</h3>
                <button onClick={() => setShowSystemNotificationModal(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-md mb-6 text-gray-800 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                {selectedSystemNotification.relatedAlertName && (
                  <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md inline-block mb-3 border border-indigo-100 font-bold">
                    🔔 התקבל מהתראה: {selectedSystemNotification.relatedAlertName}
                  </p>
                )}
                {selectedSystemNotification.message}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-4">
                <div className="flex-grow">
                  {selectedSystemNotification.relatedAlertId && (
                    <button
                      onClick={() => {
                        setShowSystemNotificationModal(false);
                        handleDisableAlertById(selectedSystemNotification.relatedAlertId!, selectedSystemNotification.relatedAlertName || 'התראה');
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      בטל התראה זו (הפסק לקבל עדכונים)
                    </button>
                  )}
                </div>
                <Button onClick={() => setShowSystemNotificationModal(false)} variant="primary" className="min-w-[100px]">
                  סגור
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* General Confirmation Modal */}
      {
        confirmationModal.isOpen && (
          <Modal
            isOpen={confirmationModal.isOpen}
            onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
            title={confirmationModal.title}
          >
            <div className="p-4 text-center">
              <p className="text-gray-700 mb-6 text-lg">{confirmationModal.message}</p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                  variant="outline"
                  className="w-24"
                >
                  {confirmationModal.cancelText || 'ביטול'}
                </Button>
                <Button
                  onClick={confirmationModal.onConfirm}
                  variant={confirmationModal.isDestructive ? 'primary' : 'primary'}
                  className={`w-24 ${confirmationModal.isDestructive ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white' : ''}`}
                >
                  {confirmationModal.confirmText || 'אישור'}
                </Button>
              </div>
            </div>
          </Modal>
        )
      }
    </div>
  );
};