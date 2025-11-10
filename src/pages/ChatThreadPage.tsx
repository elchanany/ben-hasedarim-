
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatThread } from '../types';
import * as chatService from '../services/chatService';
import { useAuth } from '../hooks/useAuth';
import type { PageProps } from '../App';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { ChatInput } from '../components/ChatInput';
import { Button } from '../components/Button'; 
import { BriefcaseIcon, ArrowRightIcon, UserIcon } from '../components/icons'; 

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const allThreads = await chatService.getChatThreads(user.id); 
      const currentThread = allThreads.find(t => t.id === threadId);
      
      if (!currentThread) {
        setError("השיחה לא נמצאה.");
        setLoading(false);
        return;
      }
      setThreadDetails(currentThread);

      const fetchedMessages = await chatService.getMessagesForThread(threadId, user.id);
      setMessages(fetchedMessages);
      await chatService.markThreadAsRead(threadId, user.id);
      refreshTotalUnreadCount(); 
    } catch (err) {
      console.error("Error fetching chat messages:", err);
      setError("שגיאה בטעינת ההודעות.");
    } finally {
      setLoading(false);
    }
  }, [user, threadId, refreshTotalUnreadCount]);

  useEffect(() => {
    fetchThreadAndMessages();
    const intervalId = setInterval(fetchThreadAndMessages, 5000); // Consider WebSocket for production
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
      setError(err.message || "שגיאה בשליחת ההודעה.");
    }
  };

  if (loading && !threadDetails) { 
    return (
      <div role="status" aria-live="polite" className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-xl text-royal-blue">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-royal-blue mb-4"></div>
        טוען שיחה...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-xl text-red-500 p-4">
        {error}
        <Button onClick={() => setCurrentPage('notifications', {tab: 'messages'})} className="mt-4">חזרה להודעות</Button>
      </div>
    );
  }

  if (!threadDetails) {
     return (
      <div className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-xl text-gray-500 p-4">
       לא נבחרה שיחה.
       <Button onClick={() => setCurrentPage('notifications', {tab: 'messages'})} className="mt-4">חזרה להודעות</Button>
      </div>
    );
  }
  
  const otherParticipantId = threadDetails.participantIds.find(id => id !== user?.id);
  const otherParticipantInfo = otherParticipantId ? threadDetails.participants[otherParticipantId] : null;
  const displayOtherParticipantName = initialOtherParticipantName || otherParticipantInfo?.displayName || "משתתף";
  const displayJobTitle = initialJobTitle || threadDetails.jobTitle;


  return (
    <div className="bg-white rounded-xl shadow-xl flex flex-col overflow-hidden h-[70vh] max-h-[650px] w-full max-w-2xl mx-auto my-4">
      <header className="flex-shrink-0 bg-royal-blue text-white p-3 sm:p-4 flex items-center justify-between shadow-md rounded-t-xl">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage('notifications', {tab: 'messages'})} 
            className="!text-white !border-white/70 hover:!bg-white/20 !px-2.5 !py-1.5"
            aria-label="חזור לרשימת ההודעות"
        >
          <ArrowRightIcon className="w-5 h-5 transform scale-x-[-1]" />
        </Button>
        <div className="flex-grow text-center mx-2">
            <h1 className="text-lg sm:text-xl font-semibold truncate" aria-live="polite">
              שיחה עם {displayOtherParticipantName}
            </h1>
            {displayJobTitle && (
                 <button 
                    onClick={() => threadDetails.jobId && setCurrentPage('jobDetails', { jobId: threadDetails.jobId })}
                    className="text-xs sm:text-sm text-light-blue hover:text-light-pink truncate flex items-center justify-center mx-auto"
                    title={`עבור למודעה: ${displayJobTitle}`}
                    aria-label={`פרטי משרה: ${displayJobTitle}`}
                >
                    <BriefcaseIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 rtl:mr-1 rtl:ml-0" aria-hidden="true"/>
                    {displayJobTitle}
                 </button>
            )}
        </div>
        <div className="w-10" aria-hidden="true"> {/* Spacer */} </div>
      </header>

      <ul ref={messageContainerRef} className="flex-grow overflow-y-auto p-3 sm:p-4 space-y-1.5 bg-neutral-gray/30" aria-live="polite" aria-atomic="false">
        {messages.map((msg) => (
          <li key={msg.id}>
            <ChatMessageBubble
              message={msg}
              isSender={msg.senderId === user?.id}
              participantDisplayName={threadDetails.participants[msg.senderId]?.displayName || "לא ידוע"}
            />
          </li>
        ))}
      </ul>
      
      <ChatInput onSendMessage={handleSendMessage} isLoading={loading && messages.length > 0} />
    </div>
  );
};
