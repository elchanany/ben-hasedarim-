
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
  const [contactPreference, setContactPreference] = useState<ContactPreference>({
    showPhone: true,
    showWhatsapp: false,
    showEmail: false,
    displayName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { register, signInWithGoogle } = useAuth();

  const handleContactPreferenceChange = (value: string, checked: boolean) => {
    setContactPreference(prev => ({ ...prev, [value]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }
    if (password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
        return;
    }
    const phoneRegex = /^(05\d|0[2-4,8,9,77])(-?\d){7}$/;
    if (!phoneRegex.test(phone)) {
        setError('מספר טלפון לא תקין.');
        return;
    }
     if (whatsapp && !phoneRegex.test(whatsapp)) { 
        setError('מספר וואטסאפ לא תקין.');
        return;
    }

    setIsLoading(true);
    try {
      await register({
        fullName,
        phone,
        email,
        whatsapp: whatsapp || phone, 
        password,
        contactPreference: { ...contactPreference, displayName: fullName },
      });
      setCurrentPage('home'); 
    } catch (err: any) {
      setError(err.message || 'שגיאת הרשמה. ייתכן שהאימייל כבר קיים או שארעה שגיאה אחרת.');
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

  const contactOptions = [
    { id: 'showPhoneReg', label: 'הצג טלפון במודעות', value: 'showPhone' },
    { id: 'showWhatsappReg', label: 'הצג וואטסאפ במודעות', value: 'showWhatsapp' },
    { id: 'showEmailReg', label: 'הצג אימייל במודעות', value: 'showEmail' },
  ];
  
  const labelTextClass = 'text-dark-text';
  const legendTextClass = 'text-dark-text';


  return (
    <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 sm:p-10 rounded-xl shadow-2xl">
        <div className="text-center">
            <UserIcon className="mx-auto h-12 w-auto text-royal-blue" aria-hidden="true"/>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-royal-blue">
            יצירת חשבון חדש
          </h2>
          <p className="mt-2 text-center text-sm text-medium-text">
            כבר יש לך חשבון?{' '}
            <button onClick={() => setCurrentPage('login')} className="font-medium text-deep-pink hover:text-pink-700 focus:outline-none focus-visible:underline">
              התחבר כאן
            </button>
          </p>
        </div>
        {error && <p id="register-error-summary" className="text-center text-sm text-red-700 bg-red-100 p-3 rounded-md" role="alert" aria-live="assertive">{error}</p>}

        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-dark-text hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-royal-blue disabled:opacity-50"
            aria-label="הירשם באמצעות חשבון גוגל"
          >
            <GoogleIcon className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
            {isGoogleLoading ? 'מרשם עם Google...' : 'הרשם עם Google'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-medium-text">או הרשם עם אימייל</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" aria-describedby={error ? "register-error-summary" : undefined}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Input label="שם מלא" id="fullName" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required labelClassName={labelTextClass} errorId="fullName-error"/>
              <Input label="טלפון" id="phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="05X-XXXXXXX" labelClassName={labelTextClass} errorId="phone-error"/>
            </div>
            <Input label="אימייל" id="email-register" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" labelClassName={labelTextClass} errorId="email-register-error"/>
            <Input label="וואטסאפ (אופציונלי, אם שונה מהטלפון)" id="whatsapp" name="whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="05X-XXXXXXX" labelClassName={labelTextClass} errorId="whatsapp-error"/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Input label="סיסמה (לפחות 6 תווים)" id="password-register" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required labelClassName={labelTextClass} errorId="password-register-error"/>
              <Input label="אימות סיסמה" id="confirmPassword" name="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required labelClassName={labelTextClass} errorId="confirmPassword-error"/>
            </div>

            <fieldset className="p-4 border border-gray-200 rounded-md">
              <legend className={`text-lg font-medium ${legendTextClass} px-2`}>הגדרות פרטיות ראשוניות</legend>
              <p className="text-xs text-medium-text mb-3 text-right">תוכל לשנות הגדרות אלו ולקבוע שם תצוגה שונה לכל מודעה בעת הפרסום או באזור האישי.</p>
              <CheckboxGroup
                  legend="אילו פרטי התקשרות להציג כברירת מחדל במודעות שתפרסם?"
                  name="contactPreferenceGroup"
                  options={contactOptions}
                  selectedValues={new Set(Object.entries(contactPreference).filter(([, val]) => val === true && typeof val === 'boolean').map(([key]) => key))}
                  onChange={handleContactPreferenceChange}
                  legendClassName={`sr-only ${legendTextClass}`} 
                  optionLabelClassName={labelTextClass}
              />
            </fieldset>

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
