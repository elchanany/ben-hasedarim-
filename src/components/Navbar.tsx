
import React, { useState, useRef, useEffect } from 'react';
import type { Page, PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import * as contactService from '../services/contactService'; // Import contact service
import { UserIcon, BriefcaseIcon, PlusCircleIcon, LoginIcon, BellIcon, SearchIcon, ChatBubbleLeftEllipsisIcon, EnvelopeIcon, ArrowRightIcon, EyeIcon, CogIcon, CalendarDaysIcon } from './icons';
import { UserAvatar } from './UserAvatar';

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
      className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring-color
                  ${finalIsActive ? activeStyle : inactiveStyle} ${className}`}
      aria-current={finalIsActive ? 'page' : undefined}
    >
      <div className="relative flex items-center justify-center">
        {icon}
        {typeof badgeCount === 'number' && badgeCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-[1rem] flex items-center justify-center bg-red-600 text-white text-[10px] leading-none font-bold rounded-full shadow-sm border border-white"
            aria-label={`${badgeCount} התראות והודעות חדשות`}
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </div>
      <span>{label}</span>
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
  createJobAlert: 'יצירת התראת עבודה חדשה',
  contact: 'צור קשר',
  privacy: 'מדיניות פרטיות',
  terms: 'תנאי שימוש',
  accessibility: 'הצהרת נגישות',
  publicProfile: 'פרופיל משתמש',
  settings: 'הגדרות מערכת'
};

interface NavbarProps extends Pick<PageProps, 'setCurrentPage'> {
  currentPage: Page;
}

export const Navbar: React.FC<NavbarProps> = ({ setCurrentPage, currentPage }) => {
  const { user, logout, totalUnreadCount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUnreadContacts, setAdminUnreadContacts] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Poll for admin messages if user is admin
  React.useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin' || user?.email?.toLowerCase() === 'eyceyceyc139@gmail.com') {
      const fetchAdmindat = async () => {
        const count = await contactService.getUnreadMessageCount();
        setAdminUnreadContacts(count);
      };
      fetchAdmindat();
      const interval = setInterval(fetchAdmindat, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

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
      {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email?.toLowerCase() === 'eyceyceyc139@gmail.com') && (
        <NavLink
          {...createNavLinkProps(
            'admin',
            'לוח מנהל',
            <BriefcaseIcon className="w-5 h-5" />,
            adminUnreadContacts > 0 ? { tab: 'contact' } : undefined,
            'text-yellow-300 hover:text-yellow-100'
          )}
          badgeCount={adminUnreadContacts}
        />
      )}
      {/* Contact Link moved here */}
      <NavLink
        {...createNavLinkProps(
          'contact',
          'צור קשר',
          <EnvelopeIcon className="w-4 h-4" />,
          undefined,
          'text-xs px-2 py-1 bg-white/10 hover:bg-white/20' // Smaller style
        )}
      />
      {user ? (
        <div className="relative ml-0 mr-auto pl-0" ref={userMenuRef}> {/* Strictly left */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`flex items-center gap-2 focus:outline-none p-1.5 rounded-full transition-all duration-200 ${userMenuOpen ? 'bg-white/10 ring-2 ring-white/30' : 'hover:bg-white/5'}`}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="hidden md:flex flex-col items-end text-white leading-tight">
              <span className="text-[10px] opacity-80 font-light">שלום,</span>
              <span className="text-sm font-medium">{user.fullName?.split(' ')[0] || 'אורח'}</span>
            </div>
            <UserAvatar name={user.fullName || 'User'} size="md" className="ring-2 ring-white/20 shadow-md" />
          </button>

          {userMenuOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-50 origin-top-left overflow-hidden transform transition-all duration-200 ease-out">

              <div className="py-2">
                {/* Only the requested items */}

                <button
                  onClick={() => { setCurrentPage('profile'); setUserMenuOpen(false); }}
                  className="w-full text-right px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-royal-blue flex items-center transition-colors border-b border-gray-100"
                  role="menuitem"
                >
                  <UserIcon className="w-4 h-4 ml-3 text-gray-500" />
                  אזור אישי
                </button>

                <button
                  onClick={() => { setCurrentPage('settings'); setUserMenuOpen(false); }}
                  className="w-full text-right px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-royal-blue flex items-center transition-colors border-b border-gray-100"
                  role="menuitem"
                >
                  <CogIcon className="w-4 h-4 ml-3 text-gray-500" />
                  הגדרות
                </button>

                <button
                  onClick={() => { setCurrentPage('publicProfile', { userId: user.id }); setUserMenuOpen(false); }}
                  className="w-full text-right px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-royal-blue flex items-center transition-colors border-b border-gray-100"
                  role="menuitem"
                >
                  <EyeIcon className="w-4 h-4 ml-3 text-gray-500" />
                  צפייה בפרופיל
                </button>

                <button
                  onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                  className="w-full text-right px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors font-medium"
                  role="menuitem"
                >
                  <ArrowRightIcon className="w-4 h-4 ml-3 text-red-400" />
                  התנתקות
                </button>
              </div>
            </div>
          )}
        </div>
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
        <div className="flex items-center justify-between h-24"> {/* Increased height to h-24 (96px) */}
          <div className="flex items-center">
            <button onClick={() => setCurrentPage('home')} className="flex-shrink-0 flex items-center text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring-color rounded-md" aria-label="דף הבית, בין הסדורים">
              <div className="h-10 w-10 bg-white rounded-lg overflow-hidden flex items-center justify-center p-0.5">
                <img src="/assets/logo.svg" alt="" className="w-full h-full object-cover transform scale-125" aria-hidden="true" />
              </div>
              <span className="font-bold text-lg md:text-xl ml-3 rtl:mr-3 rtl:ml-0">
                {siteName}
                {currentPage === 'home' ? (
                  <span className="hidden sm:inline"> - {pageDisplayNames.home}</span>
                ) : (
                  pageTitle && <span className=""> - {pageTitle}</span>
                )}
              </span>
            </button>
          </div>
          <div className="hidden md:flex items-center space-x-1 rtl:space-x-reverse" role="navigation" aria-label="ניווט ראשי - דסקטופ">
            {navLinks}
            <div className="w-px h-10 bg-gray-500/50 mx-3" aria-hidden="true"></div> {/* Adjusted separator height and margin */}
            {authLinks}
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => { setCurrentPage('notifications'); setMobileMenuOpen(false); }}
              className={`relative p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color
                          ${currentPage === 'notifications' ? 'text-white bg-blue-700' : 'text-gray-300 hover:text-white hover:bg-royal-blue/70'}`}
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
            <hr className="border-gray-600 w-full my-2" aria-hidden="true" />

            {/* Mobile Actions for Avatar/Settings */}
            {user ? (
              <div className="space-y-1">
                <div className="flex items-center px-2 py-2 text-white">
                  <UserAvatar name={user.fullName || 'User'} size="sm" className="ml-3" />
                  <div>
                    <div className="font-bold">{user.fullName}</div>
                    <div className="text-xs opacity-70">מחובר</div>
                  </div>
                </div>
                <button onClick={() => setCurrentPage('profile')} className="block w-full text-right px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-royal-blue/70 rounded-md">אזור אישי ועדכון פרטים</button>
                <button onClick={() => setCurrentPage('settings')} className="block w-full text-right px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-royal-blue/70 rounded-md">הגדרות מערכת ותאריך</button>
                <button onClick={() => setCurrentPage('publicProfile', { userId: user.id })} className="block w-full text-right px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-royal-blue/70 rounded-md">צפייה בפרופיל</button>
                <button onClick={handleLogout} className="block w-full text-right px-3 py-2 text-base font-medium text-red-400 hover:text-red-300 hover:bg-royal-blue/70 rounded-md">התנתקות</button>
              </div>
            ) : (
              <>
                <NavLink {...createNavLinkProps('login', 'התחברות', <LoginIcon className="w-5 h-5" />)} />
                <NavLink {...createNavLinkProps('register', 'הרשמה', undefined)} />
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
