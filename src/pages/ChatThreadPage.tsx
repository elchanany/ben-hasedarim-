import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatThread, Job } from '../types';
import { useAuth } from '../hooks/useAuth';
import type { PageProps } from '../App';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { ChatInput } from '../components/ChatInput';
import { Button } from '../components/Button';
import { BriefcaseIcon, ArrowRightIcon, EditIcon, TrashIcon, CheckCircleIcon } from '../components/icons';
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

  const messagesEndRef = useRef<HTMLLIElement>(null);
  const messageContainerRef = useRef<HTMLUListElement>(null);


  const scrollToBottom = (behavior: "auto" | "smooth" = "auto") => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  const fetchThreadAndMessages = useCallback(async () => {
    if (!user || !threadId) {
      setError("נדרש זיהוי משתמש ותקין של השיחה.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch threads without ordering first to avoid index issues
      const allThreads = await chatService.getChatThreads(user.id);
      const currentThread = allThreads.find(t => t.id === threadId);

      if (!currentThread) {
        console.error(`Thread with ID ${threadId} not found in user's threads.`);
        setError("השיחה לא נמצאה.");
        setLoading(false);
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
      setLoading(false);
    }
  }, [user, threadId, refreshTotalUnreadCount]);

  useEffect(() => {
    fetchThreadAndMessages();
    const intervalId = setInterval(fetchThreadAndMessages, 5000);
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
      const otherId = threadDetails.participantIds.find(id => id !== user.id);
      if (otherId && user.blockedUserIds?.includes(otherId)) {
        setIsBlockedByMe(true);
      } else {
        setIsBlockedByMe(false);
      }
    }
  }, [user, threadDetails]);

  const handleBlockToggle = async () => {
    if (!user || !threadDetails) return;
    const otherId = threadDetails.participantIds.find(id => id !== user.id);
    if (!otherId) return;

    try {
      if (isBlockedByMe) {
        await userService.unblockUser(user.id, otherId);
        setIsBlockedByMe(false);
        alert('החסימה הוסרה בהצלחה');
      } else {
        if (window.confirm('האם אתה בטוח שברצונך לחסום משתמש זה? לא תוכלו לשלוח הודעות זה לזה.')) {
          await userService.blockUser(user.id, otherId);
          setIsBlockedByMe(true);
          alert('המשתמש נחסם בהצלחה');
        }
      }
      setShowMenu(false);
    } catch (error) {
      console.error("Error toggling block:", error);
      alert('שגיאה בביצוע הפעולה');
    }
  };


  const handleSendMessage = async (text: string) => {
    if (!user || !threadDetails) return;

    const otherParticipantId = threadDetails.participantIds.find(id => id !== user.id);
    if (!otherParticipantId) {
      console.error("Cannot find other participant in thread.");
      return;
    }

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

  const handleMarkJobAsTaken = async () => {
    if (!jobDetails || !user || user.id !== jobDetails.postedBy.id) return;

    const confirmMessage = `האם אתה בטוח שברצונך לסמן את העבודה "${jobDetails.title}" כתפוסה? פעולה זו תמחק את המודעה ולא ניתן לשחזר אותה.`;

    if (window.confirm(confirmMessage)) {
      setIsDeletingJob(true);
      try {
        await jobService.deleteJob(jobDetails.id);
        alert('העבודה סומנה כתפוסה ונמחקה בהצלחה');
        setCurrentPage('notifications', { tab: 'messages' });
      } catch (error) {
        console.error("Error deleting job:", error);
        alert('שגיאה במחיקת העבודה');
      } finally {
        setIsDeletingJob(false);
      }
    }
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
    <div className="bg-white rounded-xl shadow-xl flex flex-col overflow-hidden h-[70vh] max-h-[650px] w-full max-w-2xl mx-auto my-4">
      {/* Header */}
      <header className="flex-shrink-0 bg-royal-blue text-white p-3 sm:p-4 flex items-center justify-between shadow-md rounded-t-xl relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage('notifications', { tab: 'messages' })}
          className="!text-white !border-white hover:!bg-light-blue !px-2.5 !py-1.5 z-10"
          aria-label="חזור לרשימת ההודעות"
        >
          <ArrowRightIcon className="w-5 h-5 transform scale-x-[-1]" />
        </Button>
        <div className="flex-grow text-center mx-2">
          <h1 className="text-lg sm:text-xl font-semibold truncate">
            <button
              onClick={() => threadDetails.participantIds.find(id => id !== user?.id) && setCurrentPage('publicProfile', { userId: threadDetails.participantIds.find(id => id !== user?.id) })}
              className="hover:underline focus:outline-none"
            >
              {displayOtherParticipantName}
            </button>
          </h1>
          {displayJobTitle && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <button
                onClick={() => threadDetails.jobId && setCurrentPage('jobDetails', { jobId: threadDetails.jobId })}
                className="text-xs sm:text-sm text-light-blue hover:text-light-pink truncate flex items-center"
                title={`עבור למודעה: ${displayJobTitle}`}
              >
                <BriefcaseIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 rtl:mr-1 rtl:ml-0" />
                {displayJobTitle}
              </button>
              {isJobOwner && threadDetails.jobId && (
                <>
                  <button
                    onClick={() => setCurrentPage('postJob', { editJobId: threadDetails.jobId })}
                    className="text-xs text-white hover:text-light-pink p-1"
                    title="ערוך עבודה"
                  >
                    <EditIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleMarkJobAsTaken}
                    disabled={isDeletingJob}
                    className="text-xs text-white hover:text-light-pink p-1 disabled:opacity-50"
                    title="סמן עבודה כתפוסה"
                  >
                    <CheckCircleIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setCurrentPage('profile', { tab: 'myJobs' })}
                    className="text-xs text-white hover:text-light-pink p-1"
                    title="מחק עבודה"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </>
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
            <span className="text-2xl font-bold">⋮</span>
          </button>

          {showMenu && (
            <div className="absolute top-10 left-0 bg-white shadow-xl rounded-md z-50 min-w-[150px] py-1 text-gray-800 animate-fade-in origin-top-left">
              <button
                onClick={() => { setShowMenu(false); handleBlockToggle(); }}
                className="w-full text-right px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 block transition-colors"
              >
                {isBlockedByMe ? 'בטל חסימה' : 'חסום משתמש'}
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                className="w-full text-right px-4 py-2 hover:bg-gray-100 text-sm font-medium text-red-600 block transition-colors"
              >
                דווח על משתמש
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
      <ChatInput onSendMessage={handleSendMessage} isLoading={loading && messages.length > 0} />

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
    </div>
  );
};