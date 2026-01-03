
import React from 'react';

interface UserAvatarProps {
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

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
    const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
    const bgColorClass = React.useMemo(() => getConsistentTailwindColor(name || 'Unknown'), [name]);

    const sizeStyles: Record<string, { width: number; height: number; fontSize: number }> = {
        sm: { width: 32, height: 32, fontSize: 12 },
        md: { width: 40, height: 40, fontSize: 14 },
        lg: { width: 64, height: 64, fontSize: 20 },
        xl: { width: 96, height: 96, fontSize: 30 },
    };

    const style = sizeStyles[size];

    return (
        <div
            className={`relative rounded-full ${bgColorClass} ${className}`}
            style={{
                width: style.width,
                height: style.height,
                minWidth: style.width,
                minHeight: style.height,
            }}
            aria-label={`פרופיל של ${name}`}
        >
            <span
                className="absolute text-white font-bold"
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: style.fontSize,
                    lineHeight: 1,
                }}
            >
                {firstLetter}
            </span>
        </div>
    );
};
