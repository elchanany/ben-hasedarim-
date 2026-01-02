
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
  errorId?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  id,
  error,
  containerClassName = 'mb-4',
  labelClassName = 'block text-sm font-medium text-dark-text mb-1 text-right',
  textareaClassName = '',
  required,
  errorId,
  ...props
}) => {
  const baseTextareaStyle =
    'mt-1 block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color focus:border-royal-blue sm:text-sm text-dark-text placeholder-medium-text disabled:bg-gray-100 transition-colors duration-200 resize-y';
  const errorTextareaStyle = error ? 'border-red-500 focus-visible:ring-red-500 focus:border-red-500' : '';
  const describedBy = errorId || (error && id ? `${id}-error` : undefined);

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label} {required && <span aria-hidden="true" className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={id}
        className={`${baseTextareaStyle} ${errorTextareaStyle} ${textareaClassName}`}
        rows={4}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error && <p id={describedBy || `${id}-error`} className="mt-1 text-xs text-red-700 text-right bg-red-50 p-2 rounded-md border border-red-200" role="alert">{error}</p>}
    </div>
  );
};
