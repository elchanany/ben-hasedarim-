import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { LoginIcon, GoogleIcon } from '../components/icons';

interface LoginPageProps extends PageProps {
  message?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setCurrentPage, message }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { login, signInWithGoogle, sendPasswordResetEmail } = useAuth();

  // Ultra-aggressive email cleaning: ASCII ONLY, no spaces, no hidden marks
  const cleanEmail = (val: string) => {
    const cleaned = val.toLowerCase()
      .replace(/[^\x21-\x7E]/g, '') // Remove everything except printable ASCII (no spaces, no Hebrew, no emoji)
      .trim();
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanedEmail = cleanEmail(email);

    try {
      await login(cleanedEmail, password);
      setCurrentPage('home');
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (errorCode === 'auth/user-not-found' || errorMessage.includes('user-not-found') || errorCode === 'auth/wrong-password' || errorMessage.includes('wrong-password') || errorCode === 'auth/invalid-credential' || errorMessage.includes('invalid-credential')) {
        setError('אימייל או סיסמה לא נכונים. בדוק את הפרטים ונסה שוב.');
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
        setError('כתובת האימייל שהזנת אינה תקינה.');
      } else if (errorCode === 'auth/user-disabled' || errorMessage.includes('user-disabled')) {
        setError('חשבון זה הושבת. אנא צור קשר עם התמיכה.');
      } else if (errorCode === 'auth/too-many-requests' || errorMessage.includes('too-many-requests')) {
        setError('יותר מדי ניסיונות כושלים. אנא נסה שוב מאוחר יותר או אפס סיסמה.');
      } else {
        setError(errorMessage || 'שגיאת התחברות. נסה שוב מאוחר יותר.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedEmail = cleanEmail(email);
    if (!cleanedEmail) {
      setError('אנא הזן את כתובת האימייל שלך.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(cleanedEmail);
      setResetEmailSent(true);
    } catch (err: any) {
      const errorCode = err.code || '';
      if (errorCode === 'auth/user-not-found') {
        setError('לא נמצא משתמש עם כתובת האימייל הזו.');
      } else if (errorCode === 'auth/invalid-email') {
        setError('כתובת האימייל אינה תקינה.');
      } else {
        setError('שגיאה בשליחת אימייל שחזור. וודא שהאימייל תקין.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      setCurrentPage('home');
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות עם Google. נסה שוב.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-light-blue/10 p-6 sm:p-10 rounded-xl shadow-2xl border border-light-blue/20">
        <div className="text-center">
          <LoginIcon className="mx-auto h-12 w-auto text-royal-blue" />
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-royal-blue">
            התחברות לחשבון
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            או{' '}
            <button onClick={() => setCurrentPage('register')} className="font-medium text-deep-pink hover:text-pink-700">
              צור חשבון חדש
            </button>
          </p>
        </div>
        {message && <p className="text-center text-sm text-blue-600 bg-blue-100 p-3 rounded-md">{message}</p>}

        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue disabled:opacity-50"
          >
            <GoogleIcon className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
            {isGoogleLoading ? 'מתחבר עם Google...' : 'התחבר עם Google'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">או המשך עם אימייל</span>
            </div>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6" noValidate>
              <p className="text-sm text-gray-600 text-center">
                הכנס את כתובת האימייל שלך ונשלח לך קישור לשחזור הסיסמה.
              </p>
              <Input
                id="email-forgot"
                name="email"
                type="email"
                required
                label="כתובת אימייל לשחזור"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <p className="text-blue-600 bg-blue-100 p-3 rounded-md font-bold">
                    אימייל שחזור נשלח בהצלחה! בדוק את תיבת הדואר שלך.
                  </p>
                  <button type="button" onClick={() => setIsForgotPassword(false)} className="text-royal-blue hover:underline font-bold">
                    חזור להתחברות
                  </button>
                </div>
              ) : (
                <>
                  {error && <p className="text-center text-sm text-red-600 bg-red-100 p-3 rounded-md my-4 animate-fade-in">{error}</p>}
                  <div className="space-y-4">
                    <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                      שלח קישור שחזור
                    </Button>
                    <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-center text-sm text-gray-500 hover:text-royal-blue">
                      ביטול וחזרה להתחברות
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <Input
                id="email-login"
                name="email"
                type="email"
                autoComplete="email"
                required
                label="כתובת אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <Input
                id="password-login"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                label="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
              />

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                  }}
                  className="text-sm font-medium text-royal-blue hover:text-blue-700"
                >
                  שכחת סיסמה?
                </button>
              </div>

              {error && <p className="text-center text-sm text-red-600 bg-red-100 p-3 rounded-md my-4 animate-fade-in">{error}</p>}
              <div>
                <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} disabled={isGoogleLoading}>
                  {isLoading ? 'מתחבר...' : 'התחבר'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};