
import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  placeholder?: string;
  errorId?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  id,
  options,
  error,
  containerClassName = 'mb-4',
  labelClassName = 'block text-sm font-medium text-dark-text mb-1 text-right', 
  selectClassName = '',
  placeholder,
  required,
  errorId,
  ...props
}) => {
  const baseSelectStyle =
    'mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color focus:border-royal-blue sm:text-sm text-dark-text rounded-md disabled:bg-gray-100';
  const errorSelectStyle = error ? 'border-red-500 focus-visible:ring-red-500 focus:border-red-500' : '';
  const describedBy = errorId || (error && id ? `${id}-error` : undefined);

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label} {required && <span aria-hidden="true" className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        className={`${baseSelectStyle} ${errorSelectStyle} ${selectClassName}`}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p id={describedBy || `${id}-error`} className="mt-1 text-xs text-red-600 text-right" role="alert">{error}</p>}
    </div>
  );
};
