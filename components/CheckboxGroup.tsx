
import React from 'react';

interface CheckboxOption {
  id: string;
  label: string;
  value: string;
}

interface CheckboxGroupProps {
  legend?: string;
  options: CheckboxOption[];
  selectedValues: Set<string>;
  onChange: (value: string, checked: boolean) => void;
  error?: string;
  name: string; 
  legendClassName?: string;
  optionLabelClassName?: string;
  errorId?: string;
}

const DEFAULT_LEGEND_CLASS = 'text-sm font-medium text-dark-text mb-1 text-right'; // Changed to dark-text
const DEFAULT_OPTION_LABEL_CLASS = 'text-sm text-dark-text';

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  legend,
  options,
  selectedValues,
  onChange,
  error,
  name,
  legendClassName,
  optionLabelClassName,
  errorId
}) => {
  const describedByError = errorId || (error ? `${name}-group-error` : undefined);
  return (
    <fieldset className="mb-4" aria-describedby={describedByError}>
      {legend && <legend className={legendClassName || DEFAULT_LEGEND_CLASS}>{legend}</legend>}
      <div className="mt-2 space-y-3">
        {options.map((option) => (
          <label 
            key={option.id} 
            htmlFor={`${name}-${option.id}`}
            className="flex items-center cursor-pointer justify-end tap-highlight-transparent"
          >
            <span className={`${optionLabelClassName || DEFAULT_OPTION_LABEL_CLASS} mr-3 rtl:ml-3 rtl:mr-0`}>
              {option.label}
            </span>
            <div className="relative inline-block w-10 align-middle select-none"> {/* Switch container */}
              <input
                type="checkbox"
                id={`${name}-${option.id}`}
                name={`${name}-${option.id}`}
                checked={selectedValues.has(option.value)}
                onChange={(e) => onChange(option.value, e.target.checked)}
                className="sr-only peer focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color"
              />
              {/* Track */}
              <div className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-royal-blue transition-colors duration-150 ease-in-out peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-focus-ring-color"></div>
              {/* Thumb */}
              <div className="absolute top-0.5 left-0.5 rtl:right-0.5 rtl:left-auto w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-150 ease-in-out transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4"></div>
            </div>
          </label>
        ))}
      </div>
      {error && <p id={describedByError} className="mt-1 text-xs text-red-600 text-right" role="alert">{error}</p>}
    </fieldset>
  );
};
