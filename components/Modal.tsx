
import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  panelClassName?: string; 
  titleId?: string; 
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', panelClassName, titleId = "modal-title" }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const focusableElementsString = 'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="email"]:not([disabled]), input[type="password"]:not([disabled]), input[type="tel"]:not([disabled]), input[type="number"]:not([disabled]), input[type="search"]:not([disabled]), input[type="url"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = Array.from(modalRef.current.querySelectorAll<HTMLElement>(focusableElementsString));
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) { 
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else { 
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    if (isOpen) {
      if (!previouslyFocusedElement.current && document.activeElement) {
        previouslyFocusedElement.current = document.activeElement as HTMLElement;
      }
      
      document.body.style.overflow = 'hidden'; 
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', trapFocus);
      
      // Delay focus slightly to ensure modal is fully rendered and transitions complete
      const focusTimeoutId = setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = Array.from(modalRef.current.querySelectorAll<HTMLElement>(focusableElementsString));
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else {
            modalRef.current.focus(); // Fallback to modal itself
          }
        }
      }, 100); // Adjust timeout as needed

      return () => {
        clearTimeout(focusTimeoutId);
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('keydown', trapFocus);
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
          previouslyFocusedElement.current = null; // Reset for next modal open
        }
      };
    } else {
      // If modal is closing, ensure overflow is reset and listeners are cleaned up.
      // Focus restoration is handled in the return function of the 'if (isOpen)' block.
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', trapFocus);
      if (previouslyFocusedElement.current) {
         // This condition might be hit if isOpen becomes false *before* the effect fully cleans up.
         // Focusing here could be redundant if already handled by the cleanup, but good for safety.
         previouslyFocusedElement.current.focus();
         previouslyFocusedElement.current = null;
      }
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let sizeClasses = '';
  if (!panelClassName) { 
    switch (size) {
      case 'sm': sizeClasses = 'max-w-sm'; break;
      case 'md': sizeClasses = 'max-w-md'; break;
      case 'lg': sizeClasses = 'max-w-lg'; break;
      case 'xl': sizeClasses = 'max-w-xl'; break;
      default: sizeClasses = 'max-w-md';
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1} 
        className={panelClassName || `bg-white rounded-lg shadow-xl m-4 w-full ${sizeClasses} transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-appear flex flex-col`}
        onClick={(e) => e.stopPropagation()} 
        style={{ animationFillMode: 'forwards' }} 
        role="document"
      >
        {title && (
          <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
            <h2 id={titleId} className="text-xl font-semibold text-royal-blue">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color"
              aria-label="סגור חלון"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        )}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
            {children}
        </div>
      </div>
    </div>
  );
};
