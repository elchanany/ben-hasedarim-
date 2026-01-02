
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckCircleIcon } from './icons';

interface SelectOption {
    value: string | number;
    label: string;
}

interface CustomSelectProps {
    label: string;
    id: string;
    options: { value: string | number; label: string }[];
    value?: string | number;
    onChange: (value: string | number) => void;
    error?: string;
    placeholder?: string;
    containerClassName?: string;
    required?: boolean;
    labelClassName?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    id,
    options,
    value,
    onChange,
    error,
    placeholder = 'בחר אפשרות...', // Changed default placeholder
    containerClassName = 'mb-4',
    required = false, // Added default for required
    labelClassName = '', // Destructured labelClassName with default
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null); // Kept original ref name

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${containerClassName}`} ref={containerRef}>
            {label && (
                <label htmlFor={id} className={`block text-sm font-medium text-dark-text mb-1 text-right ${labelClassName}`}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-full bg-white border rounded-2xl py-3 px-4 pl-10 text-right cursor-pointer shadow-sm transition-all duration-200 outline-none
          ${error
                        ? 'border-red-500 hover:border-red-600 focus:ring-4 focus:ring-red-500/10'
                        : isOpen
                            ? 'border-royal-blue ring-4 ring-royal-blue/10'
                            : 'border-gray-200 hover:border-royal-blue/50'
                    }`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
                    {selectedOption ? selectedOption.label : placeholder || 'בחר אפשרות...'}
                </span>
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                    <ChevronDownIcon
                        className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-royal-blue' : ''}`}
                    />
                </span>
            </button>

            {/* Error Message */}
            {error && (
                <p className="mt-1 text-xs text-red-600 animate-slide-in-right">
                    {error}
                </p>
            )}

            {/* Dropdown Options */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-1 max-h-60 overflow-auto focus:outline-none animate-in fade-in zoom-in-95 duration-150 origin-top">
                    <ul role="listbox">
                        {options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <li
                                    key={option.value}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`relative cursor-pointer select-none py-2.5 px-4 text-right transition-colors
                    ${isSelected ? 'bg-royal-blue/10 text-royal-blue font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-royal-blue'}
                  `}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="block truncate">{option.label}</span>
                                        {isSelected && (
                                            <CheckCircleIcon className="w-4 h-4 text-royal-blue ml-2" />
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
