import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { LoginIcon } from '../components/icons';

export const ResetPasswordPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { confirmPasswordReset } = useAuth();

    const oobCode = pageParams?.oobCode as string;

    useEffect(() => {
        if (!oobCode) {
            setError('קוד אימות חסר או לא תקין. נסה לשלוח שוב בקשה לשחזור סיסמה.');
        }
    }, [oobCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!oobCode) {
            setError('לא ניתן לעדכן סיסמה ללא קוד אימות.');
            return;
        }

        if (password !== confirmPassword) {
            setError('הסיסמאות אינן תואמות.');
            return;
        }

        if (password.length < 6) {
            setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
            return;
        }

        setIsLoading(true);
        try {
            await confirmPasswordReset(oobCode, password);
            setSuccess(true);
            setTimeout(() => {
                setCurrentPage('login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'שגיאה בעדכון הסיסמה. ייתכן שהקוד פג תוקף.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-light-blue/10 p-6 sm:p-10 rounded-xl shadow-2xl border border-light-blue/20">
                <div className="text-center">
                    <LoginIcon className="mx-auto h-12 w-auto text-royal-blue" />
                    <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-royal-blue">
                        קביעת סיסמה חדשה
                    </h2>
                </div>

                {success ? (
                    <div className="text-center space-y-4">
                        <p className="text-green-600 bg-green-100 p-4 rounded-md font-bold">
                            הסיסמה עודכנה בהצלחה!
                        </p>
                        <p className="text-sm text-gray-600">הנך מועבר לדף ההתחברות...</p>
                        <Button onClick={() => setCurrentPage('login')} variant="primary" className="w-full">
                            עבור להתחברות
                        </Button>
                    </div>
                ) : (
                    <>

                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <Input
                                id="reset-password"
                                name="password"
                                type="password"
                                required
                                label="סיסמה חדשה"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                            />
                            <Input
                                id="confirm-reset-password"
                                name="confirmPassword"
                                type="password"
                                required
                                label="אימות סיסמה חדשה"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="********"
                            />

                            {error && <p className="text-center text-sm text-red-600 bg-red-100 p-3 rounded-md my-4 animate-fade-in">{error}</p>}
                            <div>
                                <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} disabled={!oobCode}>
                                    {isLoading ? 'מעדכן...' : 'עדכן סיסמה'}
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
