
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CheckboxGroup } from '../components/CheckboxGroup';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { ContactPreference } from '../types';
import { UserIcon, GoogleIcon } from '../components/icons';

export const RegisterPage: React.FC<PageProps> = ({ setCurrentPage }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [emailError, setEmailError] = useState<React.ReactNode>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const { register, signInWithGoogle, checkEmailExists } = useAuth();

  // Helper to clean email from common copy-paste fluff and invisible Hebrew marks (RTL/LTR)
  const cleanEmail = (val: string) => val.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\s]/g, '').toLowerCase();

  // Real-time password match check
  React.useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordMatchError('הסיסמאות אינן תואמות');
    } else {
      setPasswordMatchError('');
    }
  }, [password, confirmPassword]);

  // Real-time email check
  React.useEffect(() => {
    const trimmedEmail = cleanEmail(email);
    if (trimmedEmail.length < 5 || !trimmedEmail.includes('@')) {
      setEmailError('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const exists = await checkEmailExists(trimmedEmail);
        if (exists) {
          setEmailError(
            <div className="flex flex-col items-center gap-2">
              <span>כתובת האימייל הזו כבר רשומה במערכת.</span>
              <button
                type="button"
                onClick={() => setCurrentPage('login')}
                className="text-royal-blue font-bold hover:underline"
              >
                שכחת סיסמה? התחבר כאן
              </button>
            </div>
          );
        } else {
          setEmailError('');
        }
      } catch (err) {
        console.error("Error checking email:", err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, checkEmailExists, setCurrentPage]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Trim all string inputs
    const trimmedEmail = cleanEmail(email);
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedWhatsapp = whatsapp.trim();
    const trimmedPassword = password; // Usually don't trim passwords as spaces might be intentional, but confirm same for both
    const trimmedConfirmPassword = confirmPassword;

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError('הסיסמאות אינן תואמות. אנא בדוק שוב.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    // Let Firebase handle deep email validation, but catch empty or obviously non-email strings
    if (!trimmedEmail.includes('@') || trimmedEmail.length < 5) {
      setError('כתובת אימייל לא תקינה.');
      return;
    }

    const phoneRegex = /^(05\d|0[2-4,8,9,77])(-?\d){7}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setError('מספר טלפון לא תקין. יש להזין מספר תקין (לדוגמה: 052-1234567).');
      return;
    }
    if (trimmedWhatsapp && !phoneRegex.test(trimmedWhatsapp)) {
      setError('מספר וואטסאפ לא תקין.');
      return;
    }

    if (emailError) {
      return; // Error is already shown
    }

    setIsLoading(true);
    try {
      await register({
        fullName: trimmedFullName,
        phone: trimmedPhone,
        email: trimmedEmail,
        whatsapp: trimmedWhatsapp || trimmedPhone,
        password: trimmedPassword,
        contactPreference: { displayName: trimmedFullName },
      });
      setCurrentPage('home');
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) {
        setError(
          <div className="flex flex-col items-center gap-2">
            <span>כתובת האימייל הזו כבר רשומה במערכת.</span>
            <button
              type="button"
              onClick={() => setCurrentPage('login')}
              className="text-royal-blue font-bold hover:underline"
            >
              שכחת סיסמה? התחבר כאן
            </button>
          </div>
        );
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
        setError('כתובת האימייל שהזנת אינה תקינה. אנא בדוק שנית.');
      } else if (errorCode === 'auth/weak-password' || errorMessage.includes('weak-password')) {
        setError('הסיסמה שבחרת חלשה מדי. בחר סיסמה עם 6 תווים לפחות.');
      } else {
        setError(errorMessage || 'שגיאת הרשמה. נסה שוב מאוחר יותר.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      setCurrentPage('home');
    } catch (err: any) {
      setError(err.message || 'שגיאה בהרשמה עם Google. נסה שוב.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 sm:p-10 rounded-xl shadow-2xl">
        <div className="text-center">
          <UserIcon className="mx-auto h-12 w-auto text-royal-blue" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-royal-blue">
            יצירת חשבון חדש
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            כבר יש לך חשבון?{' '}
            <button onClick={() => setCurrentPage('login')} className="font-medium text-deep-pink hover:text-pink-700">
              התחבר כאן
            </button>
          </p>
        </div>

        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue disabled:opacity-50"
          >
            <GoogleIcon className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
            {isGoogleLoading ? 'מרשם עם Google...' : 'הרשם עם Google'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">או הרשם עם אימייל</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Input label="שם מלא" id="fullName" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <Input label="טלפון" id="phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="05X-XXXXXXX" />
            </div>
            <div className="relative">
              <Input
                label="אימייל"
                id="email-register"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
              {emailError && (
                <div className="mt-1 text-xs text-red-700 bg-red-50 p-3 rounded-md border border-red-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                  {emailError}
                </div>
              )}
              {isCheckingEmail && (
                <div className="absolute left-3 top-10 flex items-center h-full pb-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-royal-blue border-t-transparent"></div>
                </div>
              )}
            </div>
            <Input label="וואטסאפ (אופציונלי, אם שונה מהטלפון)" id="whatsapp" name="whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="05X-XXXXXXX" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Input
                label="סיסמה (לפחות 6 תווים)"
                id="password-register"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="אימות סיסמה"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={passwordMatchError}
              />
            </div>

            {error && <p className="text-center text-sm text-red-600 bg-red-100 p-3 rounded-md animate-in fade-in slide-in-from-bottom-2 duration-300">{error}</p>}

            <div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} disabled={isGoogleLoading}>
                {isLoading ? 'מרשם...' : 'הרשמה'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
