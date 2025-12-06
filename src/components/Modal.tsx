import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  panelClassName?: string;
  titleId?: string;
  headerActions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  panelClassName,
  titleId = "modal-title",
  headerActions
}) => {
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
      }, 100);

      return () => {
        clearTimeout(focusTimeoutId);
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('keydown', trapFocus);
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
          previouslyFocusedElement.current = null;
        }
      };
    } else {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', trapFocus);
      if (previouslyFocusedElement.current) {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={panelClassName || `bg-white border border-gray-200 rounded-xl shadow-2xl my-8 mx-4 w-full max-h-[calc(100vh-4rem)] overflow-hidden ${sizeClasses} transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-appear flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        style={{ animationFillMode: 'forwards' }}
        role="document"
      >
        {title && (
          <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <h2 id={titleId} className="text-xl font-semibold text-royal-blue">{title}</h2>
              {headerActions && <div>{headerActions}</div>}
            </div>
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
