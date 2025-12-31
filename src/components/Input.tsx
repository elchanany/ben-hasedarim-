
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
    'mt-1 block w-full px-4 py-3 text-base bg-gray-50/50 border border-gray-100 focus:outline-none focus:bg-white focus-visible:ring-8 focus-visible:ring-royal-blue/5 focus:border-royal-blue sm:text-sm text-dark-text rounded-2xl transition-all disabled:bg-gray-100';
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
