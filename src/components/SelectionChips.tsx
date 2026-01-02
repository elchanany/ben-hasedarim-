
import React from 'react';
import { CheckCircleIcon } from './icons';

export interface SelectionOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface SelectionChipsProps {
    label?: string;
    options: SelectionOption[];
    selectedValues: string | string[] | Set<string>;
    onChange: (value: string) => void; // Parent handles toggle logic based on type
    multiSelect?: boolean;
    className?: string;
    labelClassName?: string;
}

export const SelectionChips: React.FC<SelectionChipsProps> = ({
    label,
    options,
    selectedValues,
    onChange,
    multiSelect = false,
    className = '',
    labelClassName = 'block text-sm font-medium text-gray-700 mb-2',
}) => {

    const isSelected = (value: string) => {
        if (multiSelect) {
            if (selectedValues instanceof Set) return selectedValues.has(value);
            if (Array.isArray(selectedValues)) return selectedValues.includes(value);
            return false;
        }
        return selectedValues === value;
    };

    return (
        <div className={className}>
            {label && <label className={labelClassName}>{label}</label>}
            <div className="flex flex-wrap gap-3">
                {options.map((option) => {
                    const selected = isSelected(option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`
                        relative flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 outline-none
                        ${selected
                                    ? 'bg-royal-blue/10 border-royal-blue text-royal-blue shadow-sm ring-1 ring-royal-blue/20'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                        >
                            {option.icon && (
                                <span className={`transition-colors ${selected ? 'text-royal-blue' : 'text-gray-400'}`}>
                                    {option.icon}
                                </span>
                            )}
                            <span className="font-medium text-sm sm:text-base">{option.label}</span>
                            {selected && <CheckCircleIcon className="w-4 h-4 text-royal-blue animate-fade-in" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
