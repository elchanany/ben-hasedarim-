import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { LoginIcon, GoogleIcon, MailIcon } from '../components/icons';
import { Modal } from '../components/Modal';

interface LoginPageProps extends PageProps {
  message?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setCurrentPage, message }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const forgotPasswordModalTitleId = "forgot-password-modal-title";


  const { login, signInWithGoogle, sendPasswordResetEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      setCurrentPage('home'); 
    } catch (err: any) {
      setError(err.message || 'שגיאת התחברות. בדוק את הפרטים ונסה שוב.');
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

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setError(''); // Clear main login error
    if (!resetEmail) {
      setResetMessage('אנא הזן כתובת אימייל.');
      return;
    }
    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(resetEmail);
      setResetMessage('אם קיים חשבון המשויך לכתובת אימייל זו, נשלח אליו קישור לאיפוס סיסמה. אנא בדוק את תיבת הדואר הנכנס שלך (וגם את תיקיית הספאם).');
      setResetEmail(''); // Clear email field on success
    } catch (err: any) {
      setResetMessage(err.message || 'אירעה שגיאה בשליחת הבקשה. נסה שוב.');
    } finally {
      setIsResetLoading(false);
    }
  };


  return (
    <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-xl shadow-2xl">
        <div className="text-center">
            <LoginIcon className="mx-auto h-12 w-auto text-royal-blue" aria-hidden="true"/>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-royal-blue">
            התחברות לחשבון
          </h2>
          <p className="mt-2 text-center text-sm text-medium-text">
            או{' '}
            <button onClick={() => setCurrentPage('register')} className="font-medium text-deep-pink hover:text-pink-700 focus:outline-none focus-visible:underline">
              צור חשבון חדש
            </button>
          </p>
        </div>
        {message && <p className="text-center text-sm text-blue-700 bg-blue-50 p-4 rounded-lg border border-blue-200" role="status">{message}</p>}
        {error && <p id="login-error-summary" className="text-center text-sm text-red-700 bg-red-50 p-4 rounded-lg border border-red-200" role="alert" aria-live="assertive">{error}</p>}
        
        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading || isResetLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-dark-text hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-royal-blue disabled:opacity-50"
            aria-label="התחבר באמצעות חשבון גוגל"
          >
            <GoogleIcon className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
            {isGoogleLoading ? 'מתחבר עם Google...' : 'התחבר עם Google'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-medium-text">או המשך עם אימייל</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" aria-describedby={error ? "login-error-summary" : undefined}>
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
              errorId="email-login-error"
              disabled={isLoading || isGoogleLoading || isResetLoading}
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
              errorId="password-login-error"
              disabled={isLoading || isGoogleLoading || isResetLoading}
            />

            <div className="text-sm text-right">
              <button 
                type="button" 
                onClick={() => { 
                    setResetMessage(''); 
                    setShowForgotPasswordModal(true);
                }} 
                className="font-medium text-royal-blue hover:text-deep-pink focus:outline-none focus-visible:underline"
                disabled={isLoading || isGoogleLoading || isResetLoading}
              >
                שכחתי סיסמה
              </button>
            </div>

            <div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} disabled={isGoogleLoading || isResetLoading}>
                {isLoading ? 'מתחבר...' : 'התחבר'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <Modal 
        isOpen={showForgotPasswordModal} 
        onClose={() => setShowForgotPasswordModal(false)} 
        title="איפוס סיסמה"
        titleId={forgotPasswordModalTitleId}
        size="sm"
      >
        <form onSubmit={handleForgotPasswordRequest} className="space-y-4 p-1">
            <p className="text-sm text-medium-text text-right">
                הזן את כתובת האימייל שלך למטה, ואם קיים חשבון המשויך אליה, נשלח לך קישור לאיפוס הסיסמה.
            </p>
            <Input
                id="reset-email"
                name="reset-email"
                type="email"
                autoComplete="email"
                required
                label="כתובת אימייל לאיפוס"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="your@email.com"
                errorId="reset-email-error"
                disabled={isResetLoading}
            />
            {resetMessage && (
              <p 
                className={`text-sm text-center p-2.5 rounded-md ${resetMessage.includes('נשלח') || resetMessage.includes('sent') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} 
                role={resetMessage.includes('נשלח') || resetMessage.includes('sent') ? 'status' : 'alert'} 
                aria-live="polite"
              >
                {resetMessage}
              </p>
            )}
            <Button type="submit" variant="secondary" size="md" className="w-full" isLoading={isResetLoading} icon={<MailIcon className="w-5 h-5"/>}>
                {isResetLoading ? 'שולח...' : 'שלח לינק לאיפוס'}
            </Button>
        </form>
      </Modal>
    </div>
  );
};
