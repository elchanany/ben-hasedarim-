
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { PaperAirplaneIcon } from './icons';

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
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
      if (textareaRef.current) { // Reset height after send
         textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally display an error to the user here
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
    <form
      onSubmit={handleSubmit}
      className="flex-shrink-0 flex items-end space-x-2 rtl:space-x-reverse p-2 sm:p-3 border-t border-light-blue/30 bg-light-blue/10 sm:rounded-b-xl"
    >
      <textarea
        ref={textareaRef}
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="הקלד הודעה..."
        className="flex-grow p-2.5 border border-light-blue/30 rounded-lg shadow-sm focus:ring-royal-blue focus:border-royal-blue resize-none overflow-y-auto bg-light-blue/10 text-dark-text placeholder-medium-text"
        rows={1} 
        style={{ minHeight: '44px', maxHeight: '120px' }} 
        disabled={isLoading || isSending}
        aria-label="כתוב הודעה"
        aria-multiline="true"
      />
      <Button
        type="submit"
        variant="primary"
        size="md" 
        className="!p-3 aspect-square rounded-full" 
        isLoading={isSending}
        disabled={isLoading || !messageText.trim() || isSending}
        aria-label="שלח הודעה"
      >
        <PaperAirplaneIcon className="w-5 h-5 transform rtl:scale-x-[-1]" />
      </Button>
    </form>
  );
};
