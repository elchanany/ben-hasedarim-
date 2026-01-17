
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckCircleIcon } from './icons';

interface Option {
    value: string | number;
    label: string;
}

interface PopoverSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: any) => void;
    className?: string;
    buttonClassName?: string;
}

export const PopoverSelect: React.FC<PopoverSelectProps> = ({
    options,
    value,
    onChange,
    className = '',
    buttonClassName = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Scroll to selected item when opening
    useEffect(() => {
        if (isOpen && listRef.current && selectedOption) {
            const selectedEl = listRef.current.querySelector('[aria-selected="true"]');
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'center' });
            }
        }
    }, [isOpen, selectedOption]);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center gap-2 cursor-pointer focus:outline-none transition-colors ${buttonClassName}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>
                    {selectedOption ? selectedOption.label : ''}
                </span>
                <ChevronDownIcon
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[140px] max-h-60 overflow-auto bg-white border border-gray-100 rounded-xl shadow-2xl z-50 animate-fade-in custom-scrollbar">
                    <ul role="listbox" ref={listRef} className="py-1">
                        {options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <li
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`px-4 py-2.5 text-sm cursor-pointer text-center transition-colors
                    ${isSelected
                                            ? 'bg-royal-blue text-white font-bold'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-royal-blue'
                                        }
                  `}
                                >
                                    {option.label}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
