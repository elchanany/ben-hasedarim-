
import React from 'react';

interface UserAvatarProps {
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const hex = "00000".substring(0, 6 - c.length) + c;
    return `#${hex}`;
};

// Pastel/Pleasant palette generator to avoid ugly colors
const getConsistentTailwindColor = (str: string) => {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
        'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
        'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};


export const UserAvatar: React.FC<UserAvatarProps> = ({ name, className = '', size = 'md' }) => {
    const firstLetter = name ? name.charAt(0) : '?';
    const bgColorClass = React.useMemo(() => getConsistentTailwindColor(name || 'Unknown'), [name]);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-xl',
        xl: 'w-24 h-24 text-3xl',
    };

    return (
        <div
            className={`rounded-full flex items-center justify-center text-white font-bold shadow-sm ${bgColorClass} ${sizeClasses[size]} ${className}`}
            aria-label={`פרופיל של ${name}`}
        >
            {firstLetter}
        </div>
    );
};
