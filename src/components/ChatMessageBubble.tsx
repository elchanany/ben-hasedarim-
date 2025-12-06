
import React from 'react';
import { ChatMessage } from '../types';
import { CheckCircleIcon, DoubleCheckIcon } from './icons';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isSender: boolean;
  participantDisplayName: string;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isSender, participantDisplayName }) => {
  const bubbleAlignment = isSender ? 'items-end self-end' : 'items-start self-start';
  const bubbleColor = isSender ? 'bg-royal-blue text-white' : 'bg-gray-200 text-dark-text';
  const textAlign = isSender ? 'text-right' : 'text-left';

  const formatTimestamp = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const ReadReceipt: React.FC<{ isRead?: boolean, readAt?: string }> = ({ isRead, readAt }) => {
    if (!isSender) return null;

    if (isRead || readAt) { // Consider it read if either is true
      return <DoubleCheckIcon className="w-4 h-4 text-blue-500 ml-1 rtl:mr-1 rtl:ml-0" aria-label="ההודעה נקראה" />;
    }
    // Default to single tick for sent but not yet confirmed read.
    return <CheckCircleIcon className="w-4 h-4 text-gray-400 ml-1 rtl:mr-1 rtl:ml-0" aria-label="ההודעה נשלחה" />;
  };


  return (
    <div className={`flex flex-col ${bubbleAlignment} mb-2 w-full`}>
      <div className={`max-w-[75%] sm:max-w-[70%] md:max-w-[65%] px-3.5 py-2.5 rounded-2xl shadow-sm ${bubbleColor}`}>
        {/* Optional: Display sender's name - not typical for 1-on-1 WhatsApp style unless it's a group */}
        {/* {!isSender && <p className="text-xs font-semibold text-gray-500 mb-0.5">{participantDisplayName}</p>} */}
        <p className={`text-base whitespace-pre-wrap break-words ${textAlign}`}>{message.text}</p>
      </div>
      <div className={`flex items-center mt-1 px-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
        <span className="text-xs text-medium-text">{formatTimestamp(message.timestamp)}</span>
        {isSender && <ReadReceipt isRead={message.isRead} readAt={message.readAt} />}
      </div>
    </div>
  );
};
