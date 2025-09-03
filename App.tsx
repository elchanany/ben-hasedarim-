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
import { ChatThreadPage } from './pages/ChatThreadPage'; 
import { CreateJobAlertPage } from './pages/CreateJobAlertPage'; // Added
import { useAuth } from './hooks/useAuth';
import { AccessibilityWidget } from './components/AccessibilityWidget'; // Import the widget

export type Page = 'home' | 'login' | 'register' | 'postJob' | 'jobDetails' | 'profile' | 'searchResults' | 'admin' | 'notifications' | 'chatThread' | 'createJobAlert'; // Added createJobAlert

export interface PageProps {
  setCurrentPage: (page: Page, params?: Record<string, any>) => void;
  pageParams?: Record<string, any>;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPageInternal] = useState<Page>('home');
  const [pageParams, setPageParams] = useState<Record<string, any> | undefined>(undefined);
  const { user, loadingAuth } = useAuth();

  const setCurrentPage = (page: Page, params?: Record<string, any>) => {
    setCurrentPageInternal(page);
    setPageParams(params);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

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
      const validPages: Page[] = ['home', 'login', 'register', 'postJob', 'jobDetails', 'profile', 'searchResults', 'admin', 'notifications', 'chatThread', 'createJobAlert']; 
      
      // Admin page access check based on user role
      if (validPages.includes(page)) {
        if (page === 'admin' && user?.role !== 'admin') {
          setCurrentPageInternal('home'); 
          setPageParams(undefined);
          window.location.replace('#/home'); // Update hash silently
        } else {
          setCurrentPageInternal(page);
          setPageParams(params);
        }
      } else {
        setCurrentPageInternal('home');
        setPageParams(undefined);
         window.location.replace('#/home'); // Update hash silently for invalid pages
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [user]); // Re-run if user changes for admin check

  useEffect(() => {
    let newHash = `/${currentPage}`;
    if (pageParams && Object.keys(pageParams).length > 0) {
      const filteredParams = Object.fromEntries(Object.entries(pageParams).filter(([, value]) => value !== undefined && value !== null && value !== ''));
      if (Object.keys(filteredParams).length > 0) {
        newHash += `?${new URLSearchParams(filteredParams as Record<string, string>).toString()}`;
      }
    }
    if (window.location.hash.replace(/^#/, '') !== newHash) {
         // Use replace to avoid adding to history stack for internal state-driven hash changes
         window.location.replace(`#${newHash}`);
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
      case 'postJob':
        return user ? <PostJobPage setCurrentPage={setCurrentPage} pageParams={pageParams} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי לפרסם עבודה." />;
      case 'jobDetails':
        if (pageParams?.jobId) {
          return <JobDetailsPage setCurrentPage={setCurrentPage} jobId={pageParams.jobId as string} />;
        }
        return <HomePage setCurrentPage={setCurrentPage} />; 
      case 'profile':
        return user ? <ProfilePage setCurrentPage={setCurrentPage} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי לגשת לפרופיל." />;
      case 'searchResults':
        return <SearchResultsPage setCurrentPage={setCurrentPage} pageParams={pageParams} />;
      case 'admin':
        return user?.role === 'admin' ? <AdminDashboardPage setCurrentPage={setCurrentPage} /> : <HomePage setCurrentPage={setCurrentPage} />;
      case 'notifications':
        return user ? <NotificationsPage setCurrentPage={setCurrentPage} pageParams={pageParams}/> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי לצפות בהתראות והודעות." />;
      case 'chatThread':
        return user && pageParams?.threadId ? <ChatThreadPage setCurrentPage={setCurrentPage} pageParams={pageParams} /> : <NotificationsPage setCurrentPage={setCurrentPage} pageParams={{tab: 'messages'}} />;
      case 'createJobAlert':
        return user ? <CreateJobAlertPage setCurrentPage={setCurrentPage} pageParams={pageParams} /> : <LoginPage setCurrentPage={setCurrentPage} message="עליך להתחבר כדי ליצור התראת עבודה." />;
      default:
        return <HomePage setCurrentPage={setCurrentPage} />;
    }
  };
  
  const mainContainerClasses = "flex-grow container mx-auto p-0 sm:p-4 md:p-6";
  const appContainerClasses = "min-h-screen flex flex-col font-assistant bg-neutral-gray";


  return (
    <div className={appContainerClasses}>
      <a href="#main-content" className="visually-hidden focus-visible:not-visually-hidden">
        דלג לתוכן המרכזי
      </a>
      <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />
      <main id="main-content" role="main" tabIndex={-1} className={`${mainContainerClasses} focus:outline-none`}>
        {renderPage()}
      </main>
      <AccessibilityWidget />
      <footer role="contentinfo" className="bg-royal-blue text-white text-center p-6 mt-auto">
        <p>&copy; {new Date().getFullYear()} בין הסדורים. כל הזכויות שמורות.</p>
        <p className="text-sm text-light-blue">נבנה באהבה עבור ציבור בני התורה</p>
      </footer>
    </div>
  );
};

export default App;
