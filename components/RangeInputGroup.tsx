
import React from 'react';
import { Input } from './Input';

interface RangeInputGroupProps {
  label: string;
  minName: string;
  minValue: string;
  onMinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxName: string;
  maxValue: string;
  onMaxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  unitSymbol?: string;
  minError?: string;
  maxError?: string;
  containerClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
}

export const RangeInputGroup: React.FC<RangeInputGroupProps> = ({
  label,
  minName,
  minValue,
  onMinChange,
  maxName,
  maxValue,
  onMaxChange,
  minPlaceholder = "מ...",
  maxPlaceholder = "עד...",
  unitSymbol,
  minError,
  maxError,
  containerClassName = "",
  labelClassName = "block text-sm font-medium text-dark-text mb-1 text-right", // Changed to dark-text
  disabled = false,
}) => {
  const minInputId = minName + "-range-min";
  const maxInputId = maxName + "-range-max";
  const describedByMin = minError ? `${minInputId}-error` : undefined;
  const describedByMax = maxError ? `${maxInputId}-error` : undefined;
  
  return (
    <div className={`${containerClassName} ${disabled ? 'opacity-60' : ''}`}>
      <span id={`${minName}-${maxName}-label`} className={labelClassName}>{label}</span>
      <div className="flex items-center space-x-2 rtl:space-x-reverse mt-1">
        <div className="relative flex-1">
          <Input
            type="number"
            name={minName}
            id={minInputId}
            value={minValue}
            onChange={onMinChange}
            placeholder={minPlaceholder}
            min="0"
            inputClassName={`w-full ${unitSymbol ? 'pr-6 rtl:pl-6 rtl:pr-2' : ''}`}
            containerClassName="mb-0"
            error={minError}
            disabled={disabled}
            aria-labelledby={`${minName}-${maxName}-label`}
            aria-describedby={describedByMin}
            errorId={describedByMin}
            label="מינימום" 
            labelClassName="sr-only"
          />
          {unitSymbol && <span className="absolute right-2 rtl:left-2 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-500 text-sm" aria-hidden="true">{unitSymbol}</span>}
        </div>
        <span className="text-gray-500" aria-hidden="true">–</span>
        <div className="relative flex-1">
          <Input
            type="number"
            name={maxName}
            id={maxInputId}
            value={maxValue}
            onChange={onMaxChange}
            placeholder={maxPlaceholder}
            min="0"
            inputClassName={`w-full ${unitSymbol ? 'pr-6 rtl:pl-6 rtl:pr-2' : ''}`}
            containerClassName="mb-0"
            error={maxError}
            disabled={disabled}
            aria-labelledby={`${minName}-${maxName}-label`}
            aria-describedby={describedByMax}
            errorId={describedByMax}
            label="מקסימום"
            labelClassName="sr-only"
          />
          {unitSymbol && <span className="absolute right-2 rtl:left-2 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-500 text-sm" aria-hidden="true">{unitSymbol}</span>}
        </div>
      </div>
    </div>
  );
};
