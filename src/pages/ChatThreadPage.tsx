import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatThread, Job } from '../types';
import { useAuth } from '../hooks/useAuth';
import type { PageProps } from '../App';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { ChatInput } from '../components/ChatInput';
import { Button } from '../components/Button';
import {
  ArrowRightIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ExclamationCircleIcon as ExclamationTriangleIcon,
  UserIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  EditIcon
} from '../components/icons';
import { ConfirmModal } from '../components/ConfirmModal';
import * as chatService from '../services/chatService';
import * as jobService from '../services/jobService';
import * as userService from '../services/userService';
import * as reportService from '../services/reportService';
import { ReportModal } from '../components/ReportModal';

interface ChatThreadPageProps extends PageProps {
  // threadId, otherParticipantName, jobTitle, jobId are expected in pageParams
}

export const ChatThreadPage: React.FC<ChatThreadPageProps> = ({ setCurrentPage, pageParams }) => {
  const { user, refreshTotalUnreadCount } = useAuth();
  const threadId = pageParams?.threadId as string;

  const initialOtherParticipantName = pageParams?.otherParticipantName as string | undefined;
  const initialJobTitle = pageParams?.jobTitle as string | undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadDetails, setThreadDetails] = useState<ChatThread | null>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const messagesEndRef = useRef<HTMLLIElement>(null);

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
  const messageContainerRef = useRef<HTMLUListElement>(null);


  const scrollToBottom = (behavior: "auto" | "smooth" = "auto") => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  const fetchThreadAndMessages = useCallback(async (isBackground = false) => {
    if (!user || !threadId) {
      setError("נדרש זיהוי משתמש ותקין של השיחה.");
      if (!isBackground) setLoading(false);
      return;
    }
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      // Fetch threads without ordering first to avoid index issues
      const allThreads = await chatService.getChatThreads(user.id);
      const currentThread = allThreads.find(t => t.id === threadId);

      if (!currentThread) {
        console.error(`Thread with ID ${threadId} not found in user's threads.`);
        setError("השיחה לא נמצאה.");
        if (!isBackground) setLoading(false);
        return;
      }
      setThreadDetails(currentThread);

      // Load job details if jobId exists
      if (currentThread.jobId) {
        try {
          const job = await jobService.getJobById(currentThread.jobId);
          setJobDetails(job || null);
        } catch (err) {
          console.error("Error loading job details:", err);
          // Don't fail the whole chat load just because job details failed
        }
      }

      const fetchedMessages = await chatService.getMessagesForThread(threadId, user.id);
      setMessages(fetchedMessages);

      // Mark as read without blocking avoiding race conditions
      chatService.markThreadAsRead(threadId, user.id).then(() => refreshTotalUnreadCount());

    } catch (err: any) {
      console.error("Detailed error fetching chat:", err);
      // Check for Firestore Missing Index error
      if (err?.message?.includes("index")) {
        setError("שגיאת מערכת: חסר אינדקס ב-Database (ראה קונסול).");
      } else {
        setError(`שגיאה בטעינת ההודעות: ${err?.message || 'לא ידוע'}`);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [user, threadId, refreshTotalUnreadCount]);

  useEffect(() => {
    fetchThreadAndMessages(false);
    const intervalId = setInterval(() => fetchThreadAndMessages(true), 5000);
    return () => clearInterval(intervalId);
  }, [fetchThreadAndMessages]);


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("auto");
    }
  }, [threadDetails, messages.length]);


  useEffect(() => {
    if (user && threadDetails) {
      // Check thread-level blocking
      if (threadDetails.blockedBy) {
        setIsBlockedByMe(threadDetails.blockedBy.includes(user.id));
        const otherId = threadDetails.participantIds.find(id => id !== user.id);
        if (otherId) {
          setIsBlockedByOther(threadDetails.blockedBy.includes(otherId));
        }
      } else {
        setIsBlockedByMe(false);
        setIsBlockedByOther(false);
      }
    }
  }, [user, threadDetails]);

  const handleToggleBlock = async () => {
    if (!user || !threadDetails) return;

    try {
      if (isBlockedByMe) {
        setConfirmModal({
          isOpen: true,
          title: 'הסרת חסימה',
          message: 'האם לבטל את חסימת המשתמש?',
          confirmText: 'בטל חסימה',
          type: 'info',
          onConfirm: async () => {
            await chatService.toggleBlockUserInThread(threadDetails.id, user.id, false);
            setIsBlockedByMe(false);
            closeConfirmModal();
            alert('החסימה הוסרה בהצלחה');
          }
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'חסימת משתמש',
          message: 'האם אתה בטוח שברצונך לחסום משתמש זה? לא תוכלו לשלוח הודעות זה לזה.',
          confirmText: 'חסום משתמש',
          type: 'danger',
          onConfirm: async () => {
            await chatService.toggleBlockUserInThread(threadDetails.id, user.id, true);
            setIsBlockedByMe(true);
            closeConfirmModal();
            alert('המשתמש נחסם בהצלחה');
          }
        });
      }
      setShowMenu(false);
      fetchThreadAndMessages(); // Refresh to ensure backend state updates
    } catch (error) {
      console.error("Error toggling block:", error);
      alert('שגיאה בביצוע הפעולה');
    }
  };

  const handleDeleteThread = async () => {
    if (!user || !threadDetails) return;

    setConfirmModal({
      isOpen: true,
      title: 'מחיקת שיחה',
      message: 'האם אתה בטוח שברצונך למחוק את השיחה לצמיתות? פעולה זו תמחק את השיחה גם עבור הצד השני.',
      confirmText: 'מחק לצמיתות',
      type: 'danger',
      onConfirm: async () => {
        try {
          await chatService.deleteChatThread(threadDetails.id, user.id, true);
          closeConfirmModal();
          setCurrentPage('notifications', { tab: 'messages' });
        } catch (error) {
          console.error("Error deleting thread:", error);
          alert('שגיאה במחיקת השיחה');
        }
      }
    });
    setShowMenu(false);
  };


  const handleSendMessage = async (text: string) => {
    if (!user || !threadDetails) return;

    const otherParticipantId = threadDetails.participantIds.find(id => id !== user.id);
    if (!otherParticipantId) {
      console.error("Cannot find other participant in thread.");
      return;
    }

    const performSendMessage = async () => {
      try {
        const { message: newMessage, thread: updatedThread } = await chatService.sendMessage(
          user.id,
          otherParticipantId,
          text,
          threadDetails.jobId,
          threadDetails.jobTitle,
          threadId
        );
        setMessages(prevMessages => [...prevMessages, newMessage]);
        setThreadDetails(updatedThread);
        refreshTotalUnreadCount();
        setTimeout(() => scrollToBottom("smooth"), 0);
      } catch (err: any) {
        console.error("Error sending message:", err);
        // Catch blocking error specifically
        if (err.message && err.message.includes("חסם")) {
          alert("הודעה לא נשלחה כי המשתמש חסם אותך או שאתה חסמת אותו.");
        } else {
          setError("שגיאה בשליחת ההודעה.");
        }
      }
    };

    // Check for phone/email patterns warning
    const phoneRegex = /\b05\d-?(\d{7}|\d{3}-?\d{4})\b/;
    const emailRegex = /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/;

    if (phoneRegex.test(text) || emailRegex.test(text)) {
      setConfirmModal({
        isOpen: true,
        title: 'אזהרת פרטיות',
        message: 'נראה שאתה מנסה לשלוח פרטי התקשרות. אנו ממליצים להשתמש במערכת הצ\'אט לשמירה על פרטיותך. האם אתה בטוח שברצונך לשלוח?',
        confirmText: 'שלח בכל זאת',
        type: 'info',
        onConfirm: () => {
          closeConfirmModal();
          performSendMessage();
        }
      });
      return;
    }

    performSendMessage();
  };

  const handleMarkJobAsTaken = async () => {
    if (!jobDetails || !user || user.id !== jobDetails.postedBy.id) return;

    setConfirmModal({
      isOpen: true,
      title: 'סימון עבודה כתפוסה',
      message: `האם אתה בטוח שברצונך לסמן את העבודה "${jobDetails.title}" כתפוסה? פעולה זו תמחק את המודעה ולא ניתן לשחזר אותה.`,
      confirmText: 'סמן כתפוסה',
      type: 'danger',
      onConfirm: async () => {
        setIsDeletingJob(true);
        try {
          await jobService.deleteJob(jobDetails.id);
          closeConfirmModal();
          setCurrentPage('notifications', { tab: 'messages' });
          alert('העבודה סומנה כתפוסה ונמחקה בהצלחה');
        } catch (error) {
          console.error("Error deleting job:", error);
          alert('שגיאה במחיקת העבודה');
        } finally {
          setIsDeletingJob(false);
        }
      }
    });
  };

  if (loading && !threadDetails) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-xl text-royal-blue">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-royal-blue mb-4"></div>
        טוען שיחה...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-xl text-red-500 p-4">
        {error}
        <Button onClick={() => setCurrentPage('notifications', { tab: 'messages' })} className="mt-4">חזרה להודעות</Button>
      </div>
    );
  }

  if (!threadDetails) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-xl text-gray-500 p-4">
        לא נבחרה שיחה.
        <Button onClick={() => setCurrentPage('notifications', { tab: 'messages' })} className="mt-4">חזרה להודעות</Button>
      </div>
    );
  }

  const otherParticipantId = threadDetails.participantIds.find(id => id !== user?.id);
  const otherParticipantInfo = otherParticipantId ? threadDetails.participants[otherParticipantId] : null;
  const displayOtherParticipantName = initialOtherParticipantName || otherParticipantInfo?.displayName || "משתתף";
  const displayJobTitle = initialJobTitle || threadDetails.jobTitle;

  // Check if current user is the job poster
  const isJobOwner = jobDetails && user && user.id === jobDetails.postedBy.id;


  return (
    <div className="bg-white rounded-xl shadow-xl flex flex-col overflow-hidden h-[calc(100dvh-120px)] sm:h-[70vh] sm:max-h-[650px] w-full max-w-2xl mx-auto my-1 sm:my-4 transition-all duration-300">
      {/* Header */}
      <header className="flex-shrink-0 bg-royal-blue text-white p-2 sm:p-4 flex items-center justify-between shadow-md rounded-t-xl relative z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentPage('notifications', { tab: 'messages' })}
          className="text-white hover:bg-white/20 rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors"
          aria-label="חזור לרשימת ההודעות"
        >
          <ArrowRightIcon className="w-6 h-6" />
        </Button>
        <div className="flex-grow text-center mx-1 sm:mx-2 min-w-0">
          <h1 className="text-base sm:text-xl font-semibold truncate leading-tight">
            <button
              onClick={() => threadDetails.participantIds.find(id => id !== user?.id) && setCurrentPage('publicProfile', { userId: threadDetails.participantIds.find(id => id !== user?.id) })}
              className="hover:underline focus:outline-none truncate max-w-full"
            >
              {displayOtherParticipantName}
            </button>
          </h1>
          {displayJobTitle && (
            <div className="flex items-center justify-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => threadDetails.jobId && setCurrentPage('jobDetails', { jobId: threadDetails.jobId })}
                className="text-[10px] sm:text-sm text-light-blue hover:text-white truncate flex items-center bg-white/10 px-1.5 py-0.5 rounded flex-shrink-0"
                title={`עבור למודעה: ${displayJobTitle}`}
              >
                <BriefcaseIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 rtl:mr-1 rtl:ml-0" />
                <span className="truncate max-w-[80px] sm:max-w-[200px]">{displayJobTitle}</span>
              </button>
              {isJobOwner && threadDetails.jobId && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setCurrentPage('postJob', { editJobId: threadDetails.jobId })}
                    className="text-white hover:text-light-pink p-1 bg-white/10 rounded"
                    title="ערוך עבודה"
                  >
                    <EditIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleMarkJobAsTaken}
                    disabled={isDeletingJob}
                    className="text-white hover:text-light-pink p-1 bg-white/10 rounded disabled:opacity-50"
                    title="סמן עבודה כתפוסה"
                  >
                    <CheckCircleIcon className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            title="אפשרויות נוספות"
          >
            <span className="text-2xl font-bold leading-none">⋮</span>
          </button>

          {showMenu && (
            <div className="absolute top-10 left-0 bg-white shadow-2xl rounded-lg z-50 min-w-[160px] py-1 text-gray-800 animate-fade-in origin-top-left border border-gray-100">
              <button
                onClick={() => { setShowMenu(false); handleToggleBlock(); }}
                className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700 block transition-colors"
              >
                {isBlockedByMe ? 'בטל חסימה' : 'חסום משתמש'}
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm font-medium text-red-600 block transition-colors border-t border-gray-50"
              >
                דווח על משתמש
              </button>
              <button
                onClick={() => { setShowMenu(false); handleDeleteThread(); }}
                className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm font-medium text-red-600 block transition-colors border-t border-gray-100"
              >
                מחק שיחה
              </button>
            </div>
          )}
          {/* Overlay to close menu */}
          {showMenu && (
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMenu(false)}></div>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <ul ref={messageContainerRef} className="flex-grow overflow-y-auto p-3 sm:p-4 space-y-1.5 bg-light-blue/20">
        {messages.map((msg) => (
          <li key={msg.id} className="flex flex-col">
            <ChatMessageBubble
              message={msg}
              isSender={msg.senderId === user?.id}
              participantDisplayName={threadDetails.participants[msg.senderId]?.displayName || "לא ידוע"}
            />
          </li>
        ))}
        <li ref={messagesEndRef} className="h-px" />
      </ul>

      {/* Input Area */}
      {(isBlockedByMe || isBlockedByOther) ? (
        <div className="p-4 bg-gray-100 text-center text-gray-500 text-sm border-t border-gray-200">
          {isBlockedByMe ? 'חסמת משתמש זה' : 'משתמש זה חסם אותך'} - לא ניתן לשלוח הודעות.
        </div>
      ) : (
        <ChatInput onSendMessage={handleSendMessage} isLoading={loading && messages.length > 0} />
      )}

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (reason) => {
          if (!user || !otherParticipantId) return;
          await reportService.submitReport({
            reporterId: user.id,
            reportedEntityId: otherParticipantId,
            entityType: 'user', // Reporting the user from chat
            reason: `דיווח מתוך צ'אט: ${reason}`,
          });
          alert('הדיווח נשלח בהצלחה');
        }}
      />
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
    </div>
  );
};