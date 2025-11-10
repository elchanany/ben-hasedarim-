
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  ...props
}) => {
  const baseStyle = 'font-semibold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring-color transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = 'bg-royal-blue text-white hover:bg-blue-800 focus-visible:ring-royal-blue';
      break;
    case 'secondary':
      variantStyle = 'bg-deep-pink text-white hover:bg-pink-700 focus-visible:ring-deep-pink';
      break;
    case 'danger':
      variantStyle = 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500';
      break;
    case 'outline':
      variantStyle = 'bg-transparent border-2 border-royal-blue text-royal-blue hover:bg-royal-blue hover:text-white focus-visible:ring-royal-blue';
      break;
    default:
      variantStyle = 'bg-royal-blue text-white hover:bg-blue-800 focus-visible:ring-royal-blue';
  }

  let sizeStyle = '';
  switch (size) {
    case 'sm':
      sizeStyle = 'px-3 py-1.5 text-sm';
      break;
    case 'md':
      sizeStyle = 'px-4 py-2 text-base';
      break;
    case 'lg':
      sizeStyle = 'px-6 py-3 text-lg';
      break;
    default:
      sizeStyle = 'px-4 py-2 text-base';
  }

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading ? 'true' : undefined}
      aria-live={isLoading ? 'polite' : undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white rtl:ml-3 rtl:-mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="sr-only">טוען...</span>
        </>
      ) : icon && <span className="mr-2 rtl:ml-2 rtl:mr-0" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
};
