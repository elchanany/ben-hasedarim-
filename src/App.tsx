import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PostJobPage } from './pages/PostJobPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatThreadPage } from './pages/ChatThreadPage';
import { CreateJobAlertPage } from './pages/CreateJobAlertPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';
import { AccessibilityStatementPage } from './pages/AccessibilityStatementPage';
import { ContactPage } from './pages/ContactPage';
import { BlockedPage } from './pages/BlockedPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CookieConsent } from './components/CookieConsent';
import { useAuth } from './hooks/useAuth';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import { PaymentPage } from './pages/PaymentPage';
import { PayPalProvider } from './contexts/PayPalContext';

export type Page = 'home' | 'login' | 'register' | 'postJob' | 'jobDetails' | 'profile' | 'publicProfile' | 'searchResults' | 'admin' | 'notifications' | 'settings' | 'chatThread' | 'createJobAlert' | 'privacy' | 'terms' | 'accessibility' | 'contact' | 'reset-password' | 'payment';

export interface PageProps {
  setCurrentPage: (page: Page, params?: Record<string, any>) => void;
  pageParams?: Record<string, any>;
}

const App: React.FC = () => {
  // Initialize state from URL hash to prevent overwriting on refresh
  const getInitialState = () => {
    const hash = window.location.hash.replace(/^#\//, '');
    const [pageString, paramStr] = hash.split('?');
    const validPages: Page[] = ['home', 'login', 'register', 'postJob', 'jobDetails', 'profile', 'publicProfile', 'searchResults', 'admin', 'notifications', 'settings', 'chatThread', 'createJobAlert', 'privacy', 'terms', 'accessibility', 'contact', 'reset-password', 'payment'];

    // Default to home if invalid or empty
    let initialPage: Page = 'home';
    let initialParams: Record<string, string> | undefined = undefined;

    const page = pageString as Page;
    if (validPages.includes(page)) {
      initialPage = page;
      if (paramStr) {
        initialParams = {};
        new URLSearchParams(paramStr).forEach((value, key) => {
          initialParams![key] = value;
        });
      }
    }
    return { page: initialPage, params: initialParams };
  };

  const initialState = getInitialState();
  const [currentPage, setCurrentPageInternal] = useState<Page>(initialState.page);
  const [pageParams, setPageParams] = useState<Record<string, any> | undefined>(initialState.params);
  const { user, loadingAuth } = useAuth();

  const setCurrentPage = (page: Page, params?: Record<string, any>) => {
    setCurrentPageInternal(page);
    setPageParams(params);
    window.scrollTo(0, 0);
  };

  // Sync internal state with URL changes (Back/Forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\//, '');
      const [pageString, paramStr] = hash.split('?');
      const params: Record<string, string> = {};

      if (paramStr) {
        new URLSearchParams(paramStr).forEach((value, key) => {
          params[key] = value;
        });
      }

      const page = pageString as Page;
      const validPages: Page[] = ['home', 'login', 'register', 'postJob', 'jobDetails', 'profile', 'publicProfile', 'searchResults', 'admin', 'notifications', 'settings', 'chatThread', 'createJobAlert', 'privacy', 'terms', 'accessibility', 'contact', 'reset-password', 'payment'];

      // Admin page access check based on user role
      const isUserAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.email?.toLowerCase() === 'eyceyceyc139@gmail.com';

      if (validPages.includes(page)) {
        if (page === 'admin' && !isUserAdmin) {
          setCurrentPageInternal('home');
          setPageParams(undefined);
          window.location.replace('#/home');
        } else {
          // If hash changed externally, updates state
          setCurrentPageInternal(page);
          setPageParams(params);
        }
      } else {
        // Only redirect to home if completely invalid and not just empty
        if (hash !== '' && hash !== '/') {
          setCurrentPageInternal('home');
          setPageParams(undefined);
          window.location.replace('#/home');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Note: We do NOT call handleHashChange() immediately here because we already initialized from hash. 
    // Calling it might cause double-updates or race conditions with the state-to-hash sync.

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [user]);

  // Sync URL hash with internal state changes
  useEffect(() => {
    let newHash = `/${currentPage}`;
    if (pageParams && Object.keys(pageParams).length > 0) {
      const filteredParams = Object.fromEntries(Object.entries(pageParams).filter(([, value]) => value !== undefined && value !== null && value !== ''));
      if (Object.keys(filteredParams).length > 0) {
        newHash += `?${new URLSearchParams(filteredParams as Record<string, string>).toString()}`;
      }
    }

    const currentHash = window.location.hash.replace(/^#/, '');
    if (currentHash !== newHash) {
      // Use pushState to add history entry for back button navigation
      window.history.pushState(null, '', `#${newHash}`);
    }
  }, [currentPage, pageParams]);


  if (loadingAuth) {
    return <div role="alert" aria-live="assertive" className="flex justify-center items-center h-screen bg-royal-blue text-white text-2xl">טוען...</div>;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage setCurrentPage={setCurrentPage} />;
      case 'login':
        return <LoginPage setCurrentPage={setCurrentPage} />;
      case 'register':
        return <RegisterPage setCurrentPage={setCurrentPage} />;
      case 'reset-password':
        return <ResetPasswordPage setCurrentPage={setCurrentPage} pageParams={pageParams} />;
      case 'postJob':
        return user ? <PostJobPage setCurrentPage={setCurrentPage} pageParams={pageParams} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי לפרסם עבודה." />;
      case 'jobDetails':
        if (pageParams?.jobId) {
          return <JobDetailsPage setCurrentPage={setCurrentPage} jobId={pageParams.jobId as string} />;
        }
        return <HomePage setCurrentPage={setCurrentPage} />;
      case 'profile':
        return user ? <ProfilePage setCurrentPage={setCurrentPage} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי לגשת לפרופיל." />;
      case 'publicProfile':
        return pageParams?.userId ? <PublicProfilePage setCurrentPage={setCurrentPage} userId={pageParams.userId} /> : <HomePage setCurrentPage={setCurrentPage} />;
      case 'searchResults':
        return <SearchResultsPage setCurrentPage={setCurrentPage} pageParams={pageParams} />
      case 'admin':
        const isUserAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.email?.toLowerCase() === 'eyceyceyc139@gmail.com';
        return isUserAdmin ? <AdminDashboardPage setCurrentPage={setCurrentPage} /> : <HomePage setCurrentPage={setCurrentPage} />;
      case 'notifications':
        return user ? <NotificationsPage setCurrentPage={setCurrentPage} pageParams={pageParams} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי לצפות בהתראות והודעות." />;
      case 'settings':
        return user ? <SettingsPage setCurrentPage={setCurrentPage} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי לגשת להגדרות." />;
      case 'chatThread':
        return user && pageParams?.threadId ? <ChatThreadPage setCurrentPage={setCurrentPage} pageParams={pageParams} /> : <NotificationsPage setCurrentPage={setCurrentPage} pageParams={{ tab: 'messages' }} />;
      case 'createJobAlert':
        return user ? <CreateJobAlertPage setCurrentPage={setCurrentPage} pageParams={pageParams} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי ליצור התראת עבודה." />;
      case 'privacy':
        return <PrivacyPolicyPage setCurrentPage={setCurrentPage} />;
      case 'terms':
        return <TermsOfUsePage setCurrentPage={setCurrentPage} />;
      case 'accessibility':
        return <AccessibilityStatementPage setCurrentPage={setCurrentPage} />;
      case 'contact':
        return <ContactPage setCurrentPage={setCurrentPage} />;
      case 'payment':
        return <PaymentPage setCurrentPage={setCurrentPage} pageParams={pageParams} />;
      default:
        return <HomePage setCurrentPage={setCurrentPage} />;
    }
  };

  const appContainerClasses = "min-h-screen w-full overflow-x-hidden flex flex-col font-assistant bg-neutral-gray";
  const mainContainerClasses = "flex-grow w-full p-0 sm:p-4 md:p-6";

  // Blocked user - show limited UI with navbar and notifications access
  if (user?.isBlocked) {
    // If user navigates to allowed pages, show them; otherwise show BlockedPage
    const allowedBlockedPages: Page[] = ['notifications'];
    const isAllowedPage = allowedBlockedPages.includes(currentPage);

    return (
      <div className={appContainerClasses}>
        {/* Limited Navbar for blocked users */}
        <header className="bg-royal-blue text-white p-4 shadow-md">
          <div className="container mx-auto flex items-center justify-between">
            <span className="text-xl font-bold">בין הסדורים</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('notifications')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentPage === 'notifications' ? 'bg-blue-700' : 'hover:bg-blue-600'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                התראות מערכת
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-gray-300 hover:text-white underline"
              >
                התנתק
              </button>
            </div>
          </div>
        </header>

        <main className={`${mainContainerClasses} focus:outline-none`}>
          {isAllowedPage ? (
            <NotificationsPage setCurrentPage={setCurrentPage} pageParams={{ tab: 'alerts' }} />
          ) : (
            <BlockedPage user={user} onLogout={() => window.location.reload()} />
          )}
        </main>
      </div>
    );
  }

  return (
    <PayPalProvider>
      <div className={appContainerClasses}>
        <a href="#main-content" className="visually-hidden focus-visible:not-visually-hidden">
          דלג לתוכן המרכזי
        </a>
        <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />
        <main id="main-content" role="main" tabIndex={-1} className={`${mainContainerClasses} focus:outline-none`}>
          {renderPage()}
        </main>
        <AccessibilityWidget onAccessibilityStatementClick={() => setCurrentPage('accessibility')} />
        <CookieConsent onPrivacyPolicyClick={() => setCurrentPage('privacy')} />
        <footer role="contentinfo" className="bg-royal-blue text-white text-center p-6 mt-auto">
          <p>&copy; {new Date().getFullYear()} בין הסדורים. כל הזכויות שמורות.</p>
          <p className="text-sm text-light-blue mb-4">נבנה באהבה עבור ציבור בני התורה</p>
          <div className="flex justify-center gap-4 text-sm text-blue-200">
            <button onClick={() => setCurrentPage('terms')} className="hover:text-white hover:underline bg-transparent border-0 cursor-pointer p-0 font-inherit">תנאי שימוש</button>
            <span>|</span>
            <button onClick={() => setCurrentPage('privacy')} className="hover:text-white hover:underline bg-transparent border-0 cursor-pointer p-0 font-inherit">מדיניות פרטיות</button>
            <span>|</span>
            <button onClick={() => setCurrentPage('accessibility')} className="hover:text-white hover:underline bg-transparent border-0 cursor-pointer p-0 font-inherit">הצהרת נגישות</button>
            <span>|</span>
            <button onClick={() => setCurrentPage('contact')} className="hover:text-white hover:underline bg-transparent border-0 cursor-pointer p-0 font-inherit">צור קשר</button>
          </div>
        </footer>
      </div>
    </PayPalProvider>
  );
};

export default App;