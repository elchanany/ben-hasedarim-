
import React from 'react';
import { ChevronDownIcon } from './icons';

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
    'appearance-none mt-1 block w-full pl-3 pr-10 py-3 text-base bg-white border border-gray-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-royal-blue/10 focus:border-royal-blue sm:text-sm text-dark-text rounded-2xl transition-all duration-200 ease-in-out disabled:bg-gray-100 hover:border-royal-blue/50 cursor-pointer';
  const errorSelectStyle = error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : '';
  const describedBy = errorId || (error && id ? `${id}-error` : undefined);

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label} {required && <span aria-hidden="true" className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
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
        <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-3 rtl:right-auto flex items-center px-2 text-royal-blue">
          <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 text-right" id={describedBy} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
