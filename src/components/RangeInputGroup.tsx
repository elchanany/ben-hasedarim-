
import React from 'react';
import { Input } from './Input';

interface RangeInputGroupProps {
  label: string;
  minName: string;
  minValue: string | number;
  onMinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxName: string;
  maxValue: string | number;
  onMaxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unitSymbol?: string;
  disabled?: boolean;
  labelClassName?: string;
  inputClassName?: string;
  containerClassName?: string;
}

export const RangeInputGroup: React.FC<RangeInputGroupProps> = ({
  label,
  minName,
  minValue,
  onMinChange,
  maxName,
  maxValue,
  onMaxChange,
  unitSymbol,
  disabled = false,
  labelClassName = '',
  inputClassName = '',
  containerClassName = '',
}) => {
  return (
    <div className={`flex flex-col gap-1 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${containerClassName}`}>
      <label className={`text-sm font-medium text-gray-700 text-right ${labelClassName}`}>{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            name={minName}
            value={minValue}
            onChange={onMinChange}
            placeholder="מ-"
            className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent text-sm text-right ${inputClassName}`}
            disabled={disabled}
            aria-label={`${label} מינימום`}
          />
          {unitSymbol && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{unitSymbol}</span>}
        </div>
        <span className="text-gray-400 font-bold">–</span>
        <div className="relative flex-1">
          <input
            type="number"
            name={maxName}
            value={maxValue}
            onChange={onMaxChange}
            placeholder="עד"
            className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent text-sm text-right ${inputClassName}`}
            disabled={disabled}
            aria-label={`${label} מקסימום`}
          />
          {unitSymbol && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{unitSymbol}</span>}
        </div>
      </div>
    </div>
  );
};
