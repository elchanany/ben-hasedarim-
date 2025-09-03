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
  const { login, signInWithGoogle } = useAuth();

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

  return (
    <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-xl shadow-2xl">
        <div className="text-center">
            <LoginIcon className="mx-auto h-12 w-auto text-royal-blue"/>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-royal-blue">
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
        {error && <p className="text-center text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        
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

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="flex items-center justify-between">
              <div className="flex items-center justify-end w-full">
              </div>
            </div>

            <div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} disabled={isGoogleLoading}>
                {isLoading ? 'מתחבר...' : 'התחבר'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};