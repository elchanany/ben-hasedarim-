
import React from 'react';
import { ChatMessage } from '../types';
import { CheckCircleIcon, DoubleCheckIcon } from './icons';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isSender: boolean;
  participantDisplayName: string;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isSender, participantDisplayName }) => {
  // WhatsApp-like styling
  // Sender: Light green (or retain app primary color but lighter?), Receiver: White/Gray
  // We keep the app's color scheme but adjust the layout.
  // Sender: bg-royal-blue text-white (as per original), Receiver: bg-gray-200 (as per original)

  const bubbleColor = isSender ? 'bg-royal-blue text-white' : 'bg-gray-200 text-dark-text';
  // In RTL: items-end aligns to the LEFT, items-start aligns to the RIGHT.
  // Sender (Me) -> Left side -> Tail should be on Top-Left.
  // Receiver (Them) -> Right side -> Tail should be on Top-Right.

  const tailClass = isSender
    ? "rounded-tl-none before:content-[''] before:absolute before:top-0 before:-left-2 before:w-0 before:h-0 before:border-[10px] before:border-t-royal-blue before:border-r-transparent before:border-b-transparent before:border-l-transparent"
    : "rounded-tr-none after:content-[''] after:absolute after:top-0 after:-right-2 after:w-0 after:h-0 after:border-[10px] after:border-t-gray-200 after:border-l-transparent after:border-b-transparent after:border-r-transparent";

  const alignClass = isSender ? 'self-end' : 'self-start';

  const formatTimestamp = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const ReadReceipt: React.FC<{ isRead?: boolean, readAt?: string }> = ({ isRead, readAt }) => {
    if (!isSender) return null;

    if (isRead || readAt) {
      return <DoubleCheckIcon className="w-4 h-4 text-blue-300 ml-1 rtl:mr-1 rtl:ml-0" aria-label="ההודעה נקראה" />;
    }
    return <CheckCircleIcon className="w-4 h-4 text-gray-300 ml-1 rtl:mr-1 rtl:ml-0" aria-label="ההודעה נשלחה" />;
  };

  return (
    <div className={`flex flex-col ${alignClass} mb-2 max-w-[85%] sm:max-w-[75%] relative`}>
      {/* Optional name for receiver in groups
        {!isSender && <p className="text-xs font-semibold text-gray-500 ml-2 mb-0.5">{participantDisplayName}</p>} 
        */}

      <div
        className={`relative px-3 py-2 rounded-2xl shadow-sm ${bubbleColor} ${tailClass}`}
      >
        <div className="flex flex-wrap items-end gap-x-2">
          <span className="text-base whitespace-pre-wrap break-words">{message.text}</span>
          <div className={`flex items-center text-[11px] leading-none ${isSender ? 'text-blue-100' : 'text-gray-500'} ml-auto rtl:mr-auto rtl:ml-0 min-w-fit mt-1 self-end -mb-1`}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {isSender && <div className="mr-1 rtl:ml-1 rtl:mr-0"><ReadReceipt isRead={message.isRead} readAt={message.readAt} /></div>}
          </div>
        </div>
      </div>
    </div>
  );
};
