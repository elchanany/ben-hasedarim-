
import React, { useState, useRef, useEffect } from 'react';
import type { Page, PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import * as contactService from '../services/contactService'; // Import contact service
import { UserIcon, BriefcaseIcon, PlusCircleIcon, LoginIcon, BellIcon, SearchIcon, ChatBubbleLeftEllipsisIcon, EnvelopeIcon, ArrowRightIcon, EyeIcon, CogIcon, CalendarDaysIcon, ChevronDownIcon } from './icons';
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
  settings: 'הגדרות מערכת',
  'reset-password': 'איפוס סיסמה',
  payment: 'תשלום'
};

interface NavbarProps extends Pick<PageProps, 'setCurrentPage'> {
  currentPage: Page;
}

export const Navbar: React.FC<NavbarProps> = ({ setCurrentPage, currentPage }) => {
  const { user, logout, totalUnreadCount, adminUnreadContacts, adminPendingReports } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMenuPinned, setIsMenuPinned] = useState(false); // Track if menu was opened by click
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const menuTimeoutRef = useRef<any>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        // If clicking outside, close and reset pin state
        setUserMenuOpen(false);
        setIsMenuPinned(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Poll for admin messages if user is admin
  React.useEffect(() => {
  }, [user]);

  // Check if user is Pro
  const isPro = user?.subscription?.isActive && new Date(user.subscription.expiresAt) > new Date();

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
          `bg-deep-pink hover:bg-pink-700 text-white mx-3 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 ${currentPage === 'postJob' ? 'ring-2 ring-white/70' : ''}`
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
            adminUnreadContacts > 0 ? { tab: 'contact' } : adminPendingReports > 0 ? { tab: 'reports' } : undefined,
            'text-yellow-300 hover:text-yellow-100'
          )}
          badgeCount={adminUnreadContacts + adminPendingReports}
        />
      )}
      {!user && (
        <NavLink
          {...createNavLinkProps(
            'contact',
            'צור קשר',
            <EnvelopeIcon className="w-3.5 h-3.5" />,
            undefined,
            'text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 opacity-90' // Much smaller style for logged-out
          )}
        />
      )}
      {user ? (
        <div
          className="relative pl-0 ltr:mr-[-10px] rtl:ml-[-12px] rtl:mr-4"
          ref={userMenuRef}
          onMouseEnter={() => {
            if (menuTimeoutRef.current) {
              clearTimeout(menuTimeoutRef.current);
              menuTimeoutRef.current = null;
            }
            setUserMenuOpen(true);
          }}
          onMouseLeave={() => {
            // Only auto-close if menu was not pinned by click
            if (!isMenuPinned) {
              menuTimeoutRef.current = setTimeout(() => {
                setUserMenuOpen(false);
              }, 300);
            }
          }}
        >
          <button
            onClick={() => {
              if (userMenuOpen && !isMenuPinned) {
                // Menu is open from hover, clicking pins it
                setIsMenuPinned(true);
              } else if (isMenuPinned) {
                // Menu is pinned, clicking unpins and closes it
                setIsMenuPinned(false);
                setUserMenuOpen(false);
              } else {
                // Menu is closed, clicking opens and pins it
                setUserMenuOpen(true);
                setIsMenuPinned(true);
              }
            }}
            className={`flex items-center gap-2 focus:outline-none p-1.5 rounded-full transition-all duration-200 ${userMenuOpen ? 'bg-white/10 ring-2 ring-white/30' : 'hover:bg-white/5'} ${isPro ? 'ring-2 ring-yellow-400/50 bg-gradient-to-r from-yellow-400/10 to-transparent' : ''}`}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="hidden lg:flex flex-col items-end text-white leading-tight">
              <span className="text-[10px] opacity-80 font-light flex items-center">
                שלום,
              </span>
              <span className="text-sm font-medium">{user.fullName?.split(' ')[0] || 'אורח'}</span>
            </div>
            <div className="relative">
              <UserAvatar name={user.fullName || 'User'} size="md" className={`shadow-md ${isPro ? 'ring-2 ring-yellow-400' : 'ring-2 ring-white/20'}`} />
              <div className={`absolute -bottom-1 -left-1 bg-white rounded-full p-0.5 text-royal-blue shadow-sm transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`}>
                <ChevronDownIcon className="w-3 h-3" />
              </div>
              {isPro && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-royal-blue text-[8px] font-bold px-1 rounded-full shadow-sm border border-white">
                  PRO
                </div>
              )}
            </div>
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

                <div className="border-t border-gray-100 my-1"></div>

                {isPro ? (
                  <button
                    onClick={() => { setCurrentPage('settings'); setUserMenuOpen(false); }}
                    className="w-full text-right px-5 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center transition-colors"
                    role="menuitem"
                  >
                    <BriefcaseIcon className="w-4 h-4 ml-3 text-gray-500" />
                    ניהול מנוי
                  </button>
                ) : (
                  <button
                    onClick={() => { setCurrentPage('payment', { type: 'subscription' }); setUserMenuOpen(false); }}
                    className="w-full text-right px-5 py-3 text-sm text-royal-blue bg-blue-50/50 hover:bg-blue-100 flex items-center transition-colors font-medium "
                    role="menuitem"
                  >
                    <img src="/assets/logo.svg" className="w-4 h-4 ml-3" alt="" />
                    שדרוג ל-PRO
                  </button>
                )}

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                  className="w-full text-right px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors font-medium border-b border-gray-100"
                  role="menuitem"
                >
                  <ArrowRightIcon className="w-4 h-4 ml-3 text-red-400" />
                  התנתקות
                </button>

                <button
                  onClick={() => { setCurrentPage('contact'); setUserMenuOpen(false); }}
                  className="w-full text-right px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-royal-blue flex items-center transition-colors"
                  role="menuitem"
                >
                  <ChatBubbleLeftEllipsisIcon className="w-4 h-4 ml-3 text-gray-500" />
                  צור קשר
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
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1700px]">
        <div className="flex items-center h-18 md:h-20">
          <div className="flex items-center flex-shrink-0">
            {/* Mobile Back Button */}
            {currentPage !== 'home' && (
              <button
                onClick={() => window.history.back()}
                className="lg:hidden p-2 rounded-full text-white bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all flex items-center justify-center ml-2 rtl:ml-2 rtl:mr-0 shadow-sm border border-white/10"
                aria-label="חזרה לדף הקודם"
              >
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7 7-7M21 12H3" />
                </svg>
              </button>
            )}
            <button onClick={() => setCurrentPage('home')} className="flex items-center text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring-color rounded-md" aria-label="דף הבית, בין הסדורים">
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

          <div className="flex-1 min-w-[1rem]"></div>

          <div className="hidden lg:flex items-center space-x-1 rtl:space-x-reverse h-full" role="navigation" aria-label="ניווט ראשי - דסקטופ">
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              {navLinks}
            </div>

            <div className="w-px h-8 bg-gray-500/50 mx-2" aria-hidden="true"></div>

            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              {authLinks}
            </div>
          </div>
          <div className="lg:hidden flex items-center">
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Content - Slides from Left */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-3/4 max-w-[320px] z-[9999] bg-royal-blue/98 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-out border-r border-white/10
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        id="mobile-menu"
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header of Menu */}
          <div className="flex justify-between items-center p-3 border-b border-white/10">
            <div className="flex items-center">
              <div className="h-7 w-7 bg-white rounded-lg overflow-hidden flex items-center justify-center p-0.5">
                <img src="/assets/logo.svg" alt="" className="w-full h-full object-cover transform scale-125" />
              </div>
              <span className="font-bold text-white text-sm ml-2 rtl:mr-2 rtl:ml-0">{siteName}</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="סגור תפריט"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-3 py-4 space-y-1.5">
            {/* User Section (Logged In) */}
            {user ? (
              <div className="mb-4 bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center mb-3">
                  <UserAvatar name={user.fullName || 'User'} size="sm" className="ring-1 ring-white/20" />
                  <div className="mr-2 rtl:mr-2 text-white">
                    <div className="font-bold text-sm flex items-center">
                      {user.fullName}
                      {isPro && <span className="mr-2 bg-yellow-400 text-royal-blue text-[10px] font-bold px-1.5 rounded-full">PRO</span>}
                    </div>
                    <div className="text-[10px] opacity-70 flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full ml-1 rtl:ml-1"></span>
                      מחובר
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => { setCurrentPage('profile'); setMobileMenuOpen(false); }}
                    className="group flex items-center px-4 py-3.5 rounded-xl text-white hover:bg-white/15 hover:translate-x-1 active:bg-white/25 active:scale-[0.97] transition-all duration-200 text-right"
                  >
                    <UserIcon className="w-5 h-5 ml-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 group-active:scale-95 transition-all" />
                    <span className="text-sm font-medium group-hover:font-bold transition-all">אזור אישי</span>
                  </button>
                  <button
                    onClick={() => { setCurrentPage('settings'); setMobileMenuOpen(false); }}
                    className="group flex items-center px-4 py-3.5 rounded-xl text-white hover:bg-white/15 hover:translate-x-1 active:bg-white/25 active:scale-[0.97] transition-all duration-200 text-right"
                  >
                    <CogIcon className="w-5 h-5 ml-3 opacity-70 group-hover:opacity-100 group-hover:rotate-90 group-active:rotate-180 transition-all duration-300" />
                    <span className="text-sm font-medium group-hover:font-bold transition-all">הגדרות</span>
                  </button>
                  <button
                    onClick={() => { setCurrentPage('publicProfile', { userId: user.id }); setMobileMenuOpen(false); }}
                    className="group flex items-center px-4 py-3.5 rounded-xl text-white hover:bg-white/15 hover:translate-x-1 active:bg-white/25 active:scale-[0.97] transition-all duration-200 text-right"
                  >
                    <EyeIcon className="w-5 h-5 ml-3 opacity-70 group-hover:opacity-100 group-hover:scale-125 group-active:scale-90 transition-all" />
                    <span className="text-sm font-medium group-hover:font-bold transition-all">פרופיל</span>
                  </button>
                  <button
                    onClick={() => { setCurrentPage('contact'); setMobileMenuOpen(false); }}
                    className="group flex items-center px-4 py-3.5 rounded-xl text-white hover:bg-white/15 hover:translate-x-1 active:bg-white/25 active:scale-[0.97] transition-all duration-200 text-right"
                  >
                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5 ml-3 opacity-70 group-hover:opacity-100 group-hover:animate-bounce transition-all" />
                    <span className="text-sm font-medium group-hover:font-bold transition-all">צור קשר</span>
                  </button>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="group flex items-center px-4 py-3.5 rounded-xl text-red-300 hover:bg-red-500/20 hover:text-red-200 hover:-translate-x-1 active:bg-red-500/40 active:scale-[0.97] transition-all duration-200 text-right mt-2 border border-red-500/20"
                  >
                    <ArrowRightIcon className="w-5 h-5 ml-3 opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 group-active:translate-x-0 transition-all rotate-180" />
                    <span className="text-sm font-semibold group-hover:font-bold transition-all">התנתקות</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Main Navigation */}
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold px-3 mb-2">ניווט</p>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}
                  className={`group flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 active:scale-95 ${currentPage === 'home' ? 'bg-white/20 text-white shadow-lg shadow-white/10 ring-1 ring-white/20' : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'}`}
                >
                  <BriefcaseIcon className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 group-active:scale-90" />
                  <span className="text-base font-bold">דף הבית</span>
                </button>
                <button
                  onClick={() => { setCurrentPage('searchResults'); setMobileMenuOpen(false); }}
                  className={`group flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 active:scale-95 ${currentPage === 'searchResults' ? 'bg-white/20 text-white shadow-lg shadow-white/10 ring-1 ring-white/20' : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'}`}
                >
                  <SearchIcon className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12 group-active:scale-90" />
                  <span className="text-base font-bold">חיפוש עבודות</span>
                </button>
                <button
                  onClick={() => { setCurrentPage('postJob'); setMobileMenuOpen(false); }}
                  className="group flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 bg-gradient-to-r from-deep-pink to-pink-500 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.03] active:scale-[0.92] ring-1 ring-white/10"
                >
                  <PlusCircleIcon className="w-6 h-6 ml-3 transition-transform duration-500 group-hover:rotate-180 group-active:scale-75" />
                  <span className="text-base font-bold text-lg">פרסום עבודה</span>
                </button>

                {/* Logged out only - explicitly */}
                {!user && (
                  <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setCurrentPage('login'); setMobileMenuOpen(false); }}
                      className="group flex items-center justify-center p-3 rounded-xl border border-white/20 text-white font-bold text-sm hover:bg-white/10 active:scale-90 transition-all"
                    >
                      <LoginIcon className="w-5 h-5 ml-2 transition-transform group-hover:-translate-x-1" />
                      התחברות
                    </button>
                    <button
                      onClick={() => { setCurrentPage('register'); setMobileMenuOpen(false); }}
                      className="group flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-light-pink to-pink-300 text-royal-blue font-bold text-sm hover:from-white hover:to-white hover:scale-105 active:scale-90 transition-all shadow-lg shadow-pink-500/20"
                    >
                      הרשמה
                    </button>
                  </div>
                )}

                {!user && (
                  <button
                    onClick={() => { setCurrentPage('contact'); setMobileMenuOpen(false); }}
                    className="flex items-center px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/5 mt-1"
                  >
                    <EnvelopeIcon className="w-4 h-4 ml-3" />
                    <span className="text-base font-bold">צור קשר</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer of Menu */}
          <div className="mt-auto p-4 text-center border-t border-white/5">
            <p className="text-[10px] text-white/30 font-light">כל הזכויות שמורות &copy; {new Date().getFullYear()} {siteName}</p>
          </div>
        </div>
      </div>
    </nav>
  );
};
