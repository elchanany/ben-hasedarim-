import React, { useState } from 'react';
import * as contactService from '../services/contactService';
import { Button } from '../components/Button';
import { EnvelopeIcon, PaperAirplaneIcon } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import type { PageProps } from '../App';

export const ContactPage: React.FC<PageProps> = ({ setCurrentPage }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await contactService.sendMessage({ ...formData, userId: user?.id });
            setSuccess(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            console.error(err);
            setError("שגיאה בשליחת ההודעה. אנא נסה שוב מאוחר יותר.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-fade-in-down">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                    <PaperAirplaneIcon className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-royal-blue mb-4">הודעתך נשלחה בהצלחה!</h2>
                <p className="text-lg text-gray-600 mb-8 max-w-md">
                    תודה שפנית אלינו. אנו עושים מאמץ להשיב לכל פניה בהקדם האפשרי.
                </p>
                <Button onClick={() => setCurrentPage('home')}>חזרה לדף הבית</Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white rounded-xl shadow-xl my-8 animate-fade-in-up">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-light-blue/20 rounded-full mb-4 text-royal-blue">
                    <EnvelopeIcon className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-royal-blue">צור קשר</h1>
                <p className="text-gray-600 mt-2">יש לך שאלה? הצעה? נשמח לשמוע ממך.</p>
            </div>

            {error && (
                <div className="bg-red-50 border-r-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
                    <p className="font-bold">שגיאה</p>
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent transition-shadow outline-none"
                        value={formData.name}
                        onChange={handleChange}
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent transition-shadow outline-none"
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>

                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">נושא הפניה</label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent transition-shadow outline-none"
                        value={formData.subject}
                        onChange={handleChange}
                    />
                </div>

                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה</label>
                    <textarea
                        id="message"
                        name="message"
                        rows={5}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent transition-shadow outline-none resize-none"
                        value={formData.message}
                        onChange={handleChange}
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    isLoading={loading}
                    icon={<PaperAirplaneIcon className="w-5 h-5 transform rotate-90 ml-2" />}
                >
                    שלח הודעה
                </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
                <p>ניתן לפנות אלינו גם במייל: <a href="mailto:eyceyceyc139@gmail.com" className="text-royal-blue hover:underline">eyceyceyc139@gmail.com</a></p>
            </div>
        </div>
    );
};
