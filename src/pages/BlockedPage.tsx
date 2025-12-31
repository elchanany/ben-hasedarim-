import React, { useState } from 'react';
import { User } from '../types';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BlockedPageProps {
    user: User;
    onLogout: () => void;
}

export const BlockedPage: React.FC<BlockedPageProps> = ({ user, onLogout }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    // If user is also blocked from contacting, user.isContactBlocked (need to add to type)
    // For now casting to any to access potentially new field
    const isContactBlocked = (user as any).isContactBlocked;

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'contact_messages'), {
                userId: user.id,
                name: user.fullName || 'Blocked User',
                email: user.email,
                subject: 'פנייה ממשתמש חסום',
                message: message,
                createdAt: serverTimestamp(),
                status: 'new'
            });
            setSent(true);
        } catch (error) {
            console.error("Error sending message:", error);
            alert('שגיאה בשליחת ההודעה');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 rtl">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">החשבון שלך נחסם</h1>
                <p className="text-gray-600 mb-6">
                    מנהל המערכת חסם את הגישה שלך לאתר.
                </p>

                {/* Only show reason if user-visible reason was provided */}
                {user.blockReasonUser && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-right">
                        <h3 className="text-red-800 font-bold mb-1 text-sm">סיבת החסימה:</h3>
                        <p className="text-gray-700">{user.blockReasonUser}</p>
                    </div>
                )}

                {!isContactBlocked ? (
                    <>
                        {!sent ? (
                            <form onSubmit={handleContactSubmit} className="text-right" noValidate>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ערעור / יצירת קשר עם ההנהלה:</label>
                                <textarea
                                    className="w-full border rounded-md p-3 focus:ring-2 focus:ring-royal-blue min-h-[100px]"
                                    placeholder="כתוב כאן את הודעתך..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={isSubmitting}
                                ></textarea>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !message.trim()}
                                    className="w-full mt-4 bg-royal-blue text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'שולח...' : 'שלח הודעה'}
                                </button>
                            </form>
                        ) : (
                            <div className="bg-green-50 text-green-800 p-4 rounded-md">
                                הודעתך נשלחה למנהלי המערכת.
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-gray-100 text-gray-600 p-4 rounded-md text-sm">
                        אפשרות יצירת הקשר נחסמה גם היא עבור חשבון זה.
                    </div>
                )}

                <div className="mt-8 border-t pt-6">
                    <button onClick={onLogout} className="text-gray-500 hover:text-gray-700 text-sm underline">
                        התנתק מהחשבון
                    </button>
                </div>
            </div>
        </div>
    );
};
