
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorId?: string; 
}

export const Input: React.FC<InputProps> = ({
  label,
  id,
  error,
  containerClassName = 'mb-4',
  labelClassName = 'block text-sm font-medium text-dark-text mb-1 text-right', 
  inputClassName = '',
  required,
  errorId, 
  ...props
}) => {
  const baseInputStyle =
    'mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color focus:border-royal-blue sm:text-sm text-dark-text placeholder-medium-text disabled:bg-gray-100 disabled:cursor-not-allowed';
  const errorInputStyle = error ? 'border-red-500 focus-visible:ring-red-500 focus:border-red-500' : '';
  const describedById = errorId || (error && id ? `${id}-error` : undefined);


  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label} {required && <span aria-hidden="true" className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        className={`${baseInputStyle} ${errorInputStyle} ${inputClassName}`}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedById}
        {...props}
      />
      {error && <p id={describedById} className="mt-1 text-xs text-red-700 text-right bg-red-50 p-2 rounded-md border border-red-200" role="alert">{error}</p>}
    </div>
  );
};
