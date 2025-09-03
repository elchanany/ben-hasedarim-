
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
    'mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color focus:border-royal-blue sm:text-sm text-dark-text placeholder-medium-text disabled:bg-gray-100';
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
      {error && <p id={describedBy || `${id}-error`} className="mt-1 text-xs text-red-600 text-right" role="alert">{error}</p>}
    </div>
  );
};
