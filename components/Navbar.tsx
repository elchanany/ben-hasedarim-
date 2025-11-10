
import React, { useState } from 'react';
import type { Page, PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { UserIcon, BriefcaseIcon, PlusCircleIcon, LoginIcon, BellIcon, SearchIcon, ChatBubbleLeftEllipsisIcon } from './icons';

interface NavLinkProps {
  to: Page;
  label: string;
  icon?: React.ReactNode;
  setCurrentPageProp: (page: Page, params?: Record<string, any>) => void;
  currentPage: Page;
  className?: string;
  badgeCount?: number;
  params?: Record<string, any>; // For navigating with params
}

const NavLink: React.FC<NavLinkProps> = ({ to, label, icon, setCurrentPageProp, currentPage, className, badgeCount, params }) => {
  const isActive = to === currentPage;
  
  // Special check for notifications tab: if current page is notifications and tab matches, or if no tab specified and it's just notifications page
  const isNotificationsActive = 
    to === 'notifications' && 
    currentPage === 'notifications' &&
    // Check if the current hash's tab param matches the link's tab param OR if the link has no tab param (general notifications link)
    (params?.tab ? params.tab === (window.location.hash.includes('tab=') ? new URLSearchParams(window.location.hash.split('?')[1]).get('tab') : 'alerts') : true);


  const finalIsActive = (to === 'notifications') ? isNotificationsActive : isActive;
  const activeStyle = 'bg-blue-700 text-white'; 
  const inactiveStyle = 'text-gray-200 hover:bg-blue-600 hover:text-white'; // Enhanced hover

  return (
    <button
      onClick={() => setCurrentPageProp(to, params)}
      className={`relative flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring-color
                  ${finalIsActive ? activeStyle : inactiveStyle} ${className}`}
      aria-current={finalIsActive ? 'page' : undefined}
    >
      {icon}
      <span>{label}</span>
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span
          className="absolute top-0.5 right-0.5 transform translate-x-1/4 -translate-y-1/4 min-w-[1.2rem] h-[1.2rem] p-0.5 bg-red-500 text-white text-xs leading-none font-sans font-semibold rounded-full flex items-center justify-center shadow-md"
          aria-label={`${badgeCount} התראות והודעות חדשות`}
        >
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </button>
  );
};

const pageDisplayNames: Record<Page, string> = {
  home: 'אתר העבודות הזמניות של הציבור החרדי', 
  login: 'התחברות',
  register: 'הרשמה',
  postJob: 'פרסום עבודה',
  jobDetails: 'פרטי משרה',
  profile: 'אזור אישי',
  searchResults: 'חיפוש עבודות',
  admin: 'לוח מנהל',
  notifications: 'התראות והודעות', 
  chatThread: 'שיחה פעילה',
  createJobAlert: 'יצירת התראת עבודה חדשה' // Added
};

interface NavbarProps extends Pick<PageProps, 'setCurrentPage'> {
  currentPage: Page;
}

export const Navbar: React.FC<NavbarProps> = ({ setCurrentPage, currentPage }) => {
  const { user, logout, totalUnreadCount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setCurrentPage('home');
    setMobileMenuOpen(false);
  };
  
  const createNavLinkProps = (to: Page, label: string, icon?: React.ReactNode, navParams?: Record<string, any>, additionalClassName?: string) => ({
    to,
    label,
    icon,
    setCurrentPageProp: (p: Page, params?: Record<string, any>) => {
      setCurrentPage(p, params);
      setMobileMenuOpen(false);
    },
    currentPage,
    params: navParams,
    className: additionalClassName,
  });

  const navLinks = (
    <>
      <NavLink {...createNavLinkProps('home', 'דף הבית', <BriefcaseIcon className="w-5 h-5" />)} />
      <NavLink {...createNavLinkProps('searchResults', 'חיפוש עבודות', <SearchIcon className="w-5 h-5" />)} />
      <NavLink 
        {...createNavLinkProps(
            'postJob', 
            'פרסום עבודה', 
            <PlusCircleIcon className="w-5 h-5" />, 
            undefined, 
            `bg-deep-pink hover:bg-pink-700 text-white ${currentPage === 'postJob' ? 'ring-2 ring-white/70' : ''}`
        )} 
      />
    </>
  );

  const authLinks = (
    <>
      <NavLink 
        {...createNavLinkProps(
            'notifications', 
            "התראות והודעות", 
            <BellIcon className="w-5 h-5" />,
            undefined 
        )}
        badgeCount={user ? totalUnreadCount : 0}
      />
      {user ? (
        <>
          <NavLink {...createNavLinkProps('profile', 'אזור אישי', <UserIcon className="w-5 h-5" />)} />
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:bg-blue-600 hover:text-white transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring-color"
          >
            <LoginIcon className="w-5 h-5 transform scale-x-[-1]" />
            <span>התנתקות</span>
          </button>
        </>
      ) : (
        <>
          <NavLink {...createNavLinkProps('login', 'התחברות', <LoginIcon className="w-5 h-5" />)} />
          <NavLink 
            {...createNavLinkProps(
                'register', 
                'הרשמה', 
                undefined, 
                undefined,
                `bg-light-pink hover:bg-pink-300 text-royal-blue ${currentPage === 'register' ? 'ring-2 ring-royal-blue/70' : ''}`
            )} 
          />
        </>
      )}
    </>
  );

  const siteName = "בין הסדורים";
  const pageTitle = pageDisplayNames[currentPage] || '';

  return (
    <nav role="banner" aria-label="תפריט ראשי" className="bg-royal-blue shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <button onClick={() => setCurrentPage('home')} className="flex-shrink-0 flex items-center text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring-color rounded-md" aria-label="דף הבית, בין הסדורים">
              <img src="/assets/logo.svg" alt="" className="h-10 w-auto" aria-hidden="true" /> {/* Alt can be empty as button has aria-label */}
              <span className="font-bold text-xl md:text-2xl ml-3 rtl:mr-3 rtl:ml-0 text-white">
                {siteName}
                {currentPage === 'home' ? (
                  <span className="hidden sm:inline text-lg md:text-xl text-light-blue font-medium"> - {pageDisplayNames.home}</span>
                ) : (
                  pageTitle && <span className="text-lg md:text-xl text-light-blue font-medium"> - {pageTitle}</span>
                )}
              </span>
            </button>
          </div>
          <div className="hidden md:flex items-center space-x-1 rtl:space-x-reverse" role="navigation" aria-label="ניווט ראשי - דסקטופ">
            {navLinks}
            <div className="w-px h-6 bg-gray-500/50 mx-1" aria-hidden="true"></div> 
            {authLinks}
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => {setCurrentPage('notifications'); setMobileMenuOpen(false);}}
              className={`relative p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color
                          ${currentPage ==='notifications' ? 'text-white bg-blue-700' : 'text-gray-300 hover:text-white hover:bg-royal-blue/70'}`}
              aria-label="התראות והודעות"
            >
              <BellIcon className="h-6 w-6" />
              {user && totalUnreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 min-w-[1.1rem] h-[1.1rem] p-0.5 bg-red-500 text-white text-[0.7rem] leading-none font-sans font-semibold rounded-full flex items-center justify-center shadow-md" aria-hidden="true">
                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="ml-2 rtl:mr-2 rtl:ml-0 inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-royal-blue/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring-color"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              id="mobile-menu-button"
            >
              <span className="sr-only">פתח תפריט ראשי</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col items-stretch" role="menu" aria-orientation="vertical" aria-labelledby="mobile-menu-button">
            {navLinks}
            <hr className="border-gray-600 w-full my-2" aria-hidden="true"/>
            {authLinks}
          </div>
        </div>
      )}
    </nav>
  );
};
