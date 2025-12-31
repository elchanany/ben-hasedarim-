import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SearchIcon, ChevronDownIcon, XIcon } from './icons';
import { MAJOR_CITIES_NAMES } from '../constants';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableSelectProps {
    label?: string;
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    className?: string;
    id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'חפש...',
    className = '',
    id
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find current label
    const currentLabel = useMemo(() => {
        const opt = options.find(o => o.value === value);
        return opt ? opt.label : '';
    }, [value, options]);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerSearch = searchTerm.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lowerSearch)
        );
    }, [searchTerm, options]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    return (
        <div className={`relative z-[60] ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-tight text-right px-1">
                    {label}
                </label>
            )}

            <div
                className={`flex items-center justify-between w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl cursor-pointer shadow-sm transition-all duration-300 ${isOpen
                    ? 'border-royal-blue ring-8 ring-royal-blue/5 shadow-md'
                    : 'hover:border-gray-300 hover:shadow-md'
                    }`}
                onClick={handleToggle}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    <span className={`truncate text-lg font-medium ${value === '' ? 'text-gray-400' : 'text-gray-900'}`}>
                        {currentLabel || placeholder}
                    </span>
                </div>
                <SearchIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute z-[9999] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-down origin-top overflow-y-auto max-h-72">
                    <div className="sticky top-0 bg-white p-3 border-b border-gray-50">
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-royal-blue/10 focus:bg-white transition-all text-right"
                                placeholder="הקלד לחיפוש עיר..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            {searchTerm && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
                                >
                                    <XIcon className="w-3 h-3 text-gray-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="py-2 overflow-y-auto max-h-56 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <div
                                    key={opt.value + '-' + idx}
                                    className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors text-right ${value === opt.value
                                        ? 'bg-royal-blue/5 text-royal-blue'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(opt.value);
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-center text-gray-400 text-sm">
                                לא נמצאו ערים תואמות
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
