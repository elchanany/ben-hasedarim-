import React, { useState, useEffect } from 'react';

interface TimeAgoProps {
    date: string | Date;
    format: (date: string) => string;
    className?: string;
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ date, format, className = '' }) => {
    const [timeString, setTimeString] = useState<string>('');

    // Convert input to ISO string for the formatter, or keep as is if it's already a string
    const dateStr = date instanceof Date ? date.toISOString() : date;

    useEffect(() => {
        const updateTime = () => {
            setTimeString(format(dateStr));
        };

        updateTime(); // Initial update

        // Update every 60 seconds
        const intervalId = setInterval(updateTime, 60000);

        return () => clearInterval(intervalId);
    }, [dateStr, format]);

    return <span className={className}>{timeString}</span>;
};
