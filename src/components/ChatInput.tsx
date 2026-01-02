import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from './icons';

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120; // Approx 5 lines
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [messageText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSending || isLoading) return;

    setIsSending(true);
    try {
      await onSendMessage(messageText.trim());
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        // Keep focus on input after sending
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className={`p-4 transition-all duration-300 ${isFocused ? 'pb-5' : 'pb-4'}`}>
      <form
        onSubmit={handleSubmit}
        className={`
          relative flex items-end gap-2 p-2 rounded-2xl transition-all duration-300
          ${isFocused
            ? 'bg-white shadow-lg ring-2 ring-royal-blue/20 transform -translate-y-1'
            : 'bg-white shadow-md border border-gray-100'}
        `}
        noValidate
      >
        <textarea
          ref={textareaRef}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="כתוב הודעה..."
          className="flex-grow p-3 bg-transparent border-none focus:ring-0 outline-none focus:outline-none resize-none overflow-y-auto text-gray-800 placeholder-gray-400 text-sm sm:text-base leading-relaxed"
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
          disabled={isLoading || isSending}
          aria-label="כתוב הודעה"
        />

        <button
          type="submit"
          disabled={isLoading || !messageText.trim() || isSending}
          onMouseDown={(e) => {
            // Prevent default to disable focus loss on button click
            e.preventDefault();
            // Manually trigger submit if not disabled
            if (!isLoading && messageText.trim() && !isSending) {
              handleSubmit(e as any);
            }
          }}
          className={`
            flex-shrink-0 p-3 rounded-xl transition-all duration-300
            ${!messageText.trim() || isLoading || isSending
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-br from-royal-blue to-deep-pink text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95'}
          `}
          aria-label="שלח הודעה"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <PaperAirplaneIcon className="w-5 h-5 transform rtl:scale-x-[-1]" />
          )}
        </button>
      </form>
    </div>
  );
};
