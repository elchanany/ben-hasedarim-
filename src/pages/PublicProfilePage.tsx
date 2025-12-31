import React, { useEffect, useState } from 'react';
import { PageProps } from '../App';
import { PublicProfile } from '../types';
import { getPublicProfile } from '../services/publicProfileService';
import { UserAvatar } from '../components/UserAvatar';
import { UserIcon, CalendarDaysIcon, BriefcaseIcon, ClockIcon, EnvelopeIcon, PhoneIcon, ChatBubbleLeftEllipsisIcon, SearchIcon } from '../components/icons';
import { getOrCreateChatThread } from '../services/chatService';
import { formatDateByPreference } from '../utils/dateConverter';
import { useAuth } from '../hooks/useAuth';

interface PublicProfilePageProps extends PageProps {
    userId: string;
}


const DetailItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    className?: string;
    animationType?: 'money' | 'clock' | 'calendar' | 'star' | 'default';
    onClick?: () => void;
}> = ({ icon, label, value, className, animationType = 'default', onClick }) => {
    const [isAnimating, setIsAnimating] = React.useState(false);

    const handleClick = () => {
        if (onClick) {
            setIsAnimating(true);
            onClick();
            setTimeout(() => setIsAnimating(false), 1000);
        }
    };

    const getAnimationClasses = () => {
        if (!isAnimating) return '';

        switch (animationType) {
            case 'money': return 'animate-bounce animate-pulse';
            case 'clock': return 'animate-spin';
            case 'calendar': return 'animate-pulse animate-bounce';
            case 'star': return 'animate-pulse animate-ping';
            default: return 'animate-pulse';
        }
    };

    return (
        <div
            className={`p-4 rounded-lg shadow-sm border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:shadow-md transition-all duration-300 hover:scale-[1.02] transform cursor-pointer ${className} ${getAnimationClasses()}`}
            onClick={handleClick}
        >
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="flex-shrink-0 text-blue-600 pt-1 transition-colors duration-300">
                    {icon}
                </div>
                <div className="flex-grow">
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">{label}</h3>
                    <div className="text-lg font-medium text-dark-text">{value}</div>
                </div>
            </div>
        </div>
    );
};

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ userId, setCurrentPage }) => {
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth(); // To check date preference and current user
    const [isContactVisible, setIsContactVisible] = useState(false); // State to toggle contact visibility

    const isOwnProfile = user?.id === userId;

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await getPublicProfile(userId);
                if (data) {
                    setProfile(data);
                } else {
                    setError('משתמש לא נמצא.');
                }
            } catch (err) {
                console.error(err);
                setError('שגיאה בטעינת הפרופיל.');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchProfile();
        } else {
            setError('מזהה משתמש חסר.');
            setLoading(false);
        }
    }, [userId]);

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-royal-blue">טוען פרופיל...</div>;
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <UserIcon className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-600">{error || 'פרופיל לא נמצא'}</h2>
                <button onClick={() => setCurrentPage('home')} className="mt-4 text-royal-blue hover:underline">
                    חזרה לדף הבית
                </button>
            </div>
        );
    }

    // Determine relative time for "last active"
    const getActivityStatus = () => {
        const dateStr = profile.lastActive || profile.joinDate;
        if (!dateStr) return 'פעיל לאחרונה: לא ידוע';

        const lastActiveDate = new Date(dateStr);
        if (isNaN(lastActiveDate.getTime())) return 'פעיל לאחרונה: לא ידוע';

        const now = new Date();
        const diffInHours = Math.abs(now.getTime() - lastActiveDate.getTime()) / 36e5;

        if (diffInHours < 1) return 'פעיל לאחרונה: לפני רגע';
        if (diffInHours < 24) return 'פעיל לאחרונה: היום';
        if (diffInHours < 48) return 'פעיל לאחרונה: אתמול';
        return 'פעיל לאחרונה: ' + formatDateByPreference(dateStr, user?.datePreference || 'hebrew');
    };

    const getJoinDateFormatted = () => {
        const dateStr = profile.joinDate;
        if (!dateStr) return 'לא ידוע';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'לא ידוע';
        return formatDateByPreference(dateStr, user?.datePreference || 'hebrew');
    };

    const activityStatus = getActivityStatus();

    const handleStartChat = async () => {
        if (!user || user.id === userId) return;
        try {
            setLoading(true);
            const thread = await getOrCreateChatThread(user.id, userId);
            setCurrentPage('chatThread', { threadId: thread.id });
        } catch (error) {
            console.error("Error starting chat:", error);
            setError("אירעה שגיאה ביצירת השיחה");
        } finally {
            setLoading(false);
        }
    };

    // Check if any contact details are actually visible globally (for the notice)
    const hasVisibleContactInfo = profile.phone || profile.whatsapp || profile.email || profile.canChat;

    // Check if there are items to display for the CURRENT viewer (to avoid empty section)
    const hasItemsToDisplay = profile.phone || profile.whatsapp || profile.email || (profile.canChat && !isOwnProfile);

    // Logic for showing contact info:
    // 1. If it's your own profile, you see everything always (or we can hide it too, but usually you want to see what you expose)
    //    User requested "if user chose to show details, show them only after click".
    // 2. If visitor is NOT logged in: Show "Login to view"
    // 3. If visitor IS logged in: Show "Click to view" -> on click show details.

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">

                {/* Header Background (Gradient) */}
                <div className="h-24 bg-gradient-to-r from-royal-blue to-blue-500"></div>

                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <UserAvatar name={profile.displayName} size="xl" className="border-4 border-white shadow-md z-10" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.displayName}</h1>
                    <p className="text-sm text-gray-500 mb-6 flex items-center">
                        <UserIcon className="w-4 h-4 ml-1" />
                        {profile.role === 'admin' || profile.role === 'super_admin' ? 'מנהל מערכת' : 'משתמש רשום'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <CalendarDaysIcon className="w-5 h-5 text-blue-500 ml-3" />
                            <div>
                                <p className="text-xs text-gray-400">הצטרפות</p>
                                <p className="text-sm font-medium text-gray-800">
                                    {getJoinDateFormatted()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-green-500 ml-3" />
                            <div>
                                <p className="text-xs text-gray-400">פעילות אחרונה</p>
                                <p className="text-sm font-medium text-gray-800">{activityStatus}</p>
                            </div>
                        </div>

                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <BriefcaseIcon className="w-5 h-5 text-purple-500 ml-3" />
                            <div>
                                <p className="text-xs text-gray-400">עבודות שפרסם</p>
                                <p className="text-sm font-medium text-gray-800">{profile.jobsPublishedCount || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info Section */}
                    {hasItemsToDisplay ? (
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">פרטי התקשרות</h3>

                            {!user ? (
                                <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100">
                                    <UserIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600 font-medium mb-2">פרטי ההתקשרות חשופים למשתמשים רשומים בלבד</p>
                                    <p className="text-sm text-gray-500 mb-4">התחבר או הירשם כדי לצפות בפרטים וליצור קשר</p>
                                    {/* Note: In a real app we might link to login here, but user asked just to block/hide */}
                                </div>
                            ) : (
                                !isContactVisible ? (
                                    <div className="text-center">
                                        <button
                                            onClick={() => setIsContactVisible(true)}
                                            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-royal-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue transition-colors duration-200"
                                        >
                                            <SearchIcon className="w-4 h-4 ml-2" />
                                            הצג פרטי התקשרות
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 animate-fade-in-down">
                                        {profile.phone && (
                                            <DetailItem
                                                icon={<PhoneIcon className="w-6 h-6" />}
                                                label="טלפון"
                                                value={<a href={`tel:${profile.phone}`} className="hover:text-royal-blue">{profile.phone}</a>}
                                            />
                                        )}
                                        {profile.whatsapp && (
                                            <DetailItem
                                                icon={<ChatBubbleLeftEllipsisIcon className="w-6 h-6" />}
                                                label="וואטסאפ"
                                                value={
                                                    <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600">
                                                        {profile.whatsapp}
                                                    </a>
                                                }
                                            />
                                        )}
                                        {profile.email && (
                                            <DetailItem
                                                icon={<EnvelopeIcon className="w-6 h-6" />}
                                                label="אימייל"
                                                value={<a href={`mailto:${profile.email}`} className="hover:text-royal-blue">{profile.email}</a>}
                                            />
                                        )}
                                        {profile.canChat && !isOwnProfile && (
                                            <DetailItem
                                                icon={<ChatBubbleLeftEllipsisIcon className="w-6 h-6" />}
                                                label="מערכת ההודעות"
                                                value={
                                                    <button
                                                        onClick={handleStartChat}
                                                        className="text-royal-blue font-bold hover:underline"
                                                    >
                                                        שלח הודעה
                                                    </button>
                                                }
                                            />
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        <div className="mt-6 p-4 bg-gray-50 rounded-md text-center text-gray-400 text-sm">
                            {isOwnProfile ? 'לא בחרת להציג פרטי התקשרות.' : 'המשתמש בחר לא להציג פרטי התקשרות.'}
                        </div>
                    )}

                    {/* Notice for own profile */}
                    {isOwnProfile && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-100">
                            <p className="text-sm text-blue-700 text-center">
                                <strong>שים לב:</strong> זהו הפרופיל הציבורי שלך.
                                {hasVisibleContactInfo ? (
                                    <>
                                        <br />
                                        הגדרת שחלק מפרטי ההתקשרות שלך <u>יהיו גלויים</u> למשתמשים אחרים.
                                    </>
                                ) : (
                                    <>
                                        כברירת מחדל, פרטי ההתקשרות שלך <u>מוסתרים</u> ואינם מוצגים לאחרים.
                                    </>
                                )}
                                <br />
                                <button
                                    onClick={() => {
                                        setCurrentPage('settings');
                                        // Slight delay to allow page transition before scrolling
                                        setTimeout(() => {
                                            const element = document.getElementById('profile-visibility');
                                            if (element) element.scrollIntoView({ behavior: 'smooth' });
                                        }, 100);
                                    }}
                                    className="mt-2 font-bold text-royal-blue hover:underline"
                                >
                                    לחץ כאן לשינוי הגדרות התצוגה ובחירת פרטים לחשיפה
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
