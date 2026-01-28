import React, { useEffect, useState, useContext } from 'react';

import type { PageProps } from '../App';
import { Job, User, Report, ContactMessage } from '../types';
import { BriefcaseIcon, UserIcon, PlusCircleIcon, LightBulbIcon, EnvelopeIcon, SearchIcon, ExclamationCircleIcon } from '../components/icons';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatDateByPreference } from '../utils/dateConverter';
import * as jobService from '../services/jobService';
import * as userService from '../services/userService';
import * as reportService from '../services/reportService';
import * as contactService from '../services/contactService';
import * as adminLogService from '../services/adminLogService';
import * as notificationService from '../services/notificationService';
import { AuthContext } from '../contexts/AuthContext';
import { AdminLog } from '../types';


import { AdminPaymentTab } from '../components/admin/AdminPaymentTab';
import NotificationsAdminPanel from '../components/admin/NotificationsAdminPanel';
import { PhoneSettingsSection } from '../components/PhoneSettingsSection';

interface AdminStats {
  totalJobs: number;
  totalViews: number;
  totalContactAttempts: number;
  totalUsers: number;
}

type Tab = 'overview' | 'users' | 'jobs' | 'reports' | 'contact' | 'logs' | 'payments' | 'notifications' | 'phone';

export const AdminDashboardPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
  const authCtx = useContext(AuthContext);
  const currentUser = authCtx?.user;
  // HARDCODED OVERRIDE: Ensure this specific user is ALWAYS treated as super_admin in the UI
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.email?.toLowerCase() === 'eyceyceyc139@gmail.com';

  const [activeTab, setActiveTab] = useState<Tab>((pageParams?.tab as Tab) || 'overview');

  useEffect(() => {
    if (pageParams?.tab) {
      setActiveTab(pageParams.tab as Tab);
    }
  }, [pageParams]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search States
  const [userSearch, setUserSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');

  // Toast Notification State (in-app messages)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Blocking Modal State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState<User | null>(null);
  const [blockReasonAdmin, setBlockReasonAdmin] = useState(''); // Reason for admin history
  const [blockReasonUser, setBlockReasonUser] = useState(''); // Optional reason visible to user
  const [isContactBlocked, setIsContactBlocked] = useState(false);

  // Contact Reply State

  // Contact Reply State
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'success' | 'info';
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'info',
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  // Fetch data - isBackgroundRefresh prevents loading state from showing on auto-refresh
  const fetchAllData = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    try {
      // Parallel fetching for dashboard
      const [allJobs, allUsers, allReports, allMessages] = await Promise.all([
        jobService.getAllJobs(),
        userService.getAllUsers(),
        reportService.getReports(),
        contactService.getMessages()
      ]);

      setJobs(allJobs);
      setUsers(allUsers);
      setReports(allReports);
      setMessages(allMessages);

      // Async fetch logs (don't block dashboard stats)
      adminLogService.getLogs().then(setLogs).catch(e => console.error(e));

      const totalJobs = allJobs.length;
      const totalViews = allJobs.reduce((sum, job) => sum + job.views, 0);
      const totalContactAttempts = allJobs.reduce((sum, job) => sum + job.contactAttempts, 0);
      const totalUsers = allUsers.length;

      setStats({ totalJobs, totalViews, totalContactAttempts, totalUsers });
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load - show loading state
    fetchAllData(false);

    // Background refresh every 15 seconds - silent update, no UI jump
    const refreshInterval = setInterval(() => {
      fetchAllData(true);
    }, 15000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Helper to show toast and auto-dismiss
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openBlockModal = (user: User) => {
    if (user.isBlocked) {
      setConfirmModal({
        isOpen: true,
        title: 'ביטול חסימה',
        message: `האם אתה בטוח שברצונך לבטל את החסימה של ${user.fullName}?`,
        confirmText: 'בטל חסימה',
        type: 'info',
        onConfirm: () => {
          handleBlockAction(user, false, 'Unblocked by admin', '');
          closeConfirmModal();
        }
      });
    } else {
      // Block flow - open modal
      setUserToBlock(user);
      setBlockReasonAdmin('');
      setBlockReasonUser('');
      setIsContactBlocked(false);
      setShowBlockModal(true);
    }
  };

  const handleBlockAction = async (user: User, shouldBlock: boolean, adminReason: string, userReason: string) => {
    try {
      if (!currentUser) {
        showToast('שגיאה: לא נמצא משתמש מחובר', 'error');
        return;
      }

      // Call service with separate admin and user reasons
      await userService.toggleUserBlock(
        user.id,
        shouldBlock,
        adminReason,           // Admin reason (for logs/internal)
        userReason.trim() ? userReason : undefined // User-visible reason (optional - only if provided)
      );

      // Log with admin reason
      if (shouldBlock) {
        await adminLogService.logAction({
          adminId: currentUser.id,
          adminName: currentUser.fullName,
          action: 'ban_user',
          targetId: user.id,
          targetType: 'user',
          reason: adminReason,
          details: userReason ? `הודעה למשתמש: ${userReason}` : 'ללא הודעה למשתמש'
        });
      } else {
        await adminLogService.logAction({
          adminId: currentUser.id,
          adminName: currentUser.fullName,
          action: 'unban_user',
          targetId: user.id,
          targetType: 'user',
          reason: 'Unblocked by admin'
        });
      }

      // If blocking contact too (only relevant when blocking)
      if (shouldBlock && isContactBlocked) {
        try {
          await userService.updateUserBlockContact(user.id, true);
        } catch (contactError) {
          console.error("Error updating contact block (non-fatal):", contactError);
        }
      }

      // Optimistic update
      setUsers(users.map(u => u.id === user.id ? {
        ...u,
        isBlocked: shouldBlock,
        blockReason: shouldBlock ? adminReason : undefined,
        blockReasonUser: shouldBlock ? (userReason || undefined) : undefined,
        isContactBlocked: shouldBlock ? isContactBlocked : false
      } : u));

      // Close modal if open
      setShowBlockModal(false);
      setUserToBlock(null);

      showToast(shouldBlock ? 'משתמש נחסם בהצלחה' : 'חסימה בוטלה בהצלחה', 'success');
    } catch (error) {
      console.error(error);
      showToast('שגיאה בביצוע הפעולה', 'error');
    }
  };

  const handleRoleChange = async (userId: string, newRole: User['role']) => {
    if (!isSuperAdmin) {
      showToast('אין לך הרשאה לשינוי תפקידים', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'שינוי תפקיד משתמש',
      message: `האם אתה בטוח שברצונך לשנות את תפקיד המשתמש ל-${newRole}?`,
      confirmText: 'שנה תפקיד',
      type: 'danger',
      onConfirm: async () => {
        try {
          await userService.updateUserRole(userId, newRole);
          setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

          // Log role change
          if (currentUser) {
            await adminLogService.logAction({
              adminId: currentUser.id,
              adminName: currentUser.fullName,
              action: 'update_role',
              targetId: userId,
              targetType: 'user',
              reason: `Role changed to ${newRole}`,
              details: `Changed role to ${newRole}`
            });
          }
          showToast('תפקיד שונה בהצלחה', 'success');
        } catch (error) {
          showToast('שגיאה בשינוי תפקיד', 'error');
        }
        closeConfirmModal();
      }
    });
  };

  const handleDeleteJob = async (jobId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'מחיקת משרה',
      message: 'האם אתה בטוח שברצונך למחוק את המשרה לצמיתות? פעולה זו אינה הפיכה.',
      confirmText: 'מחק משרה',
      type: 'danger',
      onConfirm: async () => {
        try {
          await jobService.deleteJob(jobId, {
            adminId: currentUser?.id || 'unknown',
            adminName: currentUser?.fullName || 'Admin',
            action: 'delete_job',
            targetId: jobId,
            targetType: 'job',
            reason: 'Direct deletion from list'
          });
          setJobs(jobs.filter(j => j.id !== jobId));
          showToast('משרה נמחקה בהצלחה', 'success');
        } catch (error) {
          showToast('שגיאה במחיקת המשרה', 'error');
        }
        closeConfirmModal();
      }
    });
  };

  // Helper to process the reply after validation
  const processReply = async () => {
    if (!selectedMessage) return;
    try {
      // Update message status using service
      await contactService.markAsRead(selectedMessage.id); // Mark as read/handled

      // Log action
      if (currentUser) {
        await adminLogService.logAction({
          adminId: currentUser.id,
          adminName: currentUser.fullName,
          action: 'reply_contact',
          targetId: selectedMessage.id,
          targetType: 'message',
          reason: 'Reply sent: ' + replyText.substring(0, 50) + '...',
          details: replyText
        });
      }

      setMessages(messages.map(m => m.id === selectedMessage.id ? { ...m, status: 'replied' } : m));
      setShowReplyModal(false);
      setReplyText('');
      setSelectedMessage(null);
      showToast('התשובה נשלחה/נרשמה בהצלחה', 'success');

    } catch (e) {
      console.error(e);
      showToast('שגיאה בשליחת התשובה', 'error');
    }
  };

  const handleReplySubmit = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      // If user is registered, send system notification
      if (selectedMessage.userId) {
        await notificationService.sendSystemNotification(
          selectedMessage.userId,
          `תשובה לפנייתך: ${selectedMessage.subject}`,
          replyText,
          '#/contact' // Or link to a thread if we had one
        );
        processReply();
      } else {
        // Just mark as replied + log (admin should have emailed manually)
        // But user asked for "Reply in site", which implies notification.
        // If no user ID, we can't notify in-site.
        // Replacement for window.confirm
        setConfirmModal({
          isOpen: true,
          title: 'משתמש לא רשום',
          message: "המשתמש אינו רשום ולכן לא יקבל התראה באתר. האם ברצונך לסמן כ'הושב' בכל זאת? (עליך לשלוח מייל ידנית)",
          confirmText: 'כן, סמן כהושב',
          cancelText: 'ביטול',
          type: 'info',
          onConfirm: () => {
            processReply();
            closeConfirmModal();
          }
        });
      }

    } catch (e) {
      console.error(e);
      showToast('שגיאה בשליחת התשובה', 'error');
    }
  };

  if (loading) {
    return <div className="text-center p-10 text-xl text-royal-blue">טוען נתוני ניהול...</div>;
  }

  if (!stats) {
    return <div className="text-center p-10 text-red-500">שגיאה בטעינת הנתונים.</div>;
  }

  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 rtl:space-x-reverse border border-gray-100">
      <div className="p-3 bg-light-pink/20 text-deep-pink rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-royal-blue">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-royal-blue">לוח בקרה למנהל</h1>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border text-sm overflow-x-auto w-full md:w-auto no-scrollbar">
          {(['overview', 'users', 'jobs', 'payments', 'notifications', 'phone', 'reports', 'contact', 'logs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2 rounded-md transition-colors font-medium whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'bg-royal-blue text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab === 'overview' && 'סקירה'}
              {tab === 'users' && 'משתמשים'}
              {tab === 'jobs' && 'משרות'}
              {tab === 'payments' && 'כספים ומנויים'}
              {tab === 'notifications' && 'התראות ומיילים'}
              {tab === 'phone' && '📞 קו טלפון'}
              {tab === 'reports' && (
                <>
                  דיווחים
                  {reports.filter(r => r.status === 'pending').length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {reports.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </>
              )}
              {tab === 'contact' && (
                <>
                  פניות
                  {messages.filter(m => m.status === 'new').length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {messages.filter(m => m.status === 'new').length}
                    </span>
                  )}
                </>
              )}
              {tab === 'logs' && 'היסטוריה'}
            </button>
          ))}
        </div>
      </div>


      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <StatCard title="סהכ משרות" value={stats.totalJobs} icon={<BriefcaseIcon className="w-6 h-6" />} />
            <StatCard title="צפיות במשרות" value={stats.totalViews} icon={<UserIcon className="w-6 h-6" />} />
            <StatCard title="פניות שבוצעו" value={stats.totalContactAttempts} icon={<PlusCircleIcon className="w-6 h-6" />} />
            <StatCard title="סהכ משתמשים" value={stats.totalUsers} icon={<UserIcon className="w-6 h-6" />} />
          </div>



          <section className="bg-gradient-to-l from-light-blue/20 to-transparent p-6 rounded-xl border border-light-blue/20">
            <h2 className="text-xl font-semibold text-royal-blue mb-4 flex items-center">
              <LightBulbIcon className="w-6 h-6 ml-2 rtl:mr-2 rtl:ml-0 text-yellow-500" />
              טיפים למנהל
            </h2>
            <div className="text-right space-y-2 text-dark-text/80">
              <p>• השתמש בלשונית "משתמשים" כדי לחסום משתמשים בעייתיים.</p>
              <p>• סופר-אדמין יכול למנות מנהלים נוספים.</p>
              <p>• בדוק את לשונית "דיווחים" באופן יומי.</p>
              <p>• בדוק את לשונית "פניות" לפניות ממשתמשים.</p>
            </div>
          </section>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <AdminPaymentTab />
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <NotificationsAdminPanel />
      )}

      {/* PHONE SETTINGS TAB */}
      {activeTab === 'phone' && (
        <PhoneSettingsSection />
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center">
            <SearchIcon className="w-5 h-5 text-gray-400 ml-2 rtl:mr-2 rtl:ml-0" />
            <input
              type="text"
              placeholder="חפש משתמש לפי שם, אימייל או טלפון..."
              className="bg-transparent border-none focus:ring-0 w-full text-sm"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם משתמש</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">אימייל</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תפקיד</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.filter(u =>
                  (u.fullName && u.fullName.toLowerCase().includes(userSearch.toLowerCase())) ||
                  (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
                  (u.phone && u.phone.includes(userSearch))
                ).map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${user.id === currentUser?.id ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.fullName}
                      {user.id === currentUser?.id && <span className="mr-2 text-xs bg-royal-blue text-white px-2 py-0.5 rounded-full inline-block">אני</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(user.role === 'super_admin' || user.email?.toLowerCase() === 'eyceyceyc139@gmail.com') ? (
                        <span className="text-purple-600 font-bold">מנהל ראשי</span>
                      ) : user.role === 'admin' ? (
                        <span className="text-blue-600 font-bold">מנהל</span>
                      ) : 'משתמש'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.isBlocked ?
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">חסום</span> :
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">פעיל</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                      {/* Protect Super Admin (by role or email) */}
                      {(user.role === 'super_admin' || user.email?.toLowerCase() === 'eyceyceyc139@gmail.com') ? (
                        <span className="text-purple-600 text-xs font-bold">מנהל ראשי (מוגן)</span>
                      ) : user.id === currentUser?.id ? (
                        <span className="text-gray-400 text-xs italic">אני</span>
                      ) : (user.role === 'admin' && !isSuperAdmin) ? (
                        // Admins cannot block other admins (only super admin can)
                        <span className="text-gray-400 text-xs italic">מנהל (לא ניתן לחסום)</span>
                      ) : (
                        <>
                          <button
                            onClick={() => openBlockModal(user)}
                            className={`${user.isBlocked ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}`}
                          >
                            {user.isBlocked ? 'בטל חסימה' : 'חסום'}
                          </button>
                          {/* Toggle Contact Block (only for blocked users) */}
                          {user.isBlocked && (
                            <button
                              onClick={async () => {
                                try {
                                  const newContactBlockedState = !user.isContactBlocked;
                                  await userService.updateUserBlockContact(user.id, newContactBlockedState);
                                  setUsers(users.map(u => u.id === user.id ? { ...u, isContactBlocked: newContactBlockedState } : u));
                                  showToast(newContactBlockedState ? 'המשתמש נחסם משליחת ערעורים' : 'המשתמש יכול לשלוח ערעורים', 'success');
                                  if (currentUser) {
                                    await adminLogService.logAction({
                                      adminId: currentUser.id,
                                      adminName: currentUser.fullName,
                                      action: newContactBlockedState ? 'block_contact' : 'unblock_contact',
                                      targetId: user.id,
                                      targetType: 'user',
                                      reason: newContactBlockedState ? 'Blocked from sending appeals' : 'Allowed to send appeals'
                                    });
                                  }
                                } catch (error) {
                                  showToast('שגיאה בעדכון הגדרות קשר', 'error');
                                }
                              }}
                              className={`${user.isContactBlocked ? 'text-orange-600 hover:text-orange-900' : 'text-yellow-600 hover:text-yellow-900'}`}
                              title={user.isContactBlocked ? 'אפשר שליחת ערעור' : 'חסום שליחת ערעור'}
                            >
                              {user.isContactBlocked ? 'אפשר ערעור' : 'חסום ערעור'}
                            </button>
                          )}
                          {/* Role Change Button (Only for Super Admin) */}
                          {isSuperAdmin && (
                            <button onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')} className="text-blue-600 hover:text-blue-800">
                              {user.role === 'admin' ? 'הורד לרגיל' : 'הפוך למנהל'}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
      }

      {/* JOBS TAB */}
      {
        activeTab === 'jobs' && (
          <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center">
              <SearchIcon className="w-5 h-5 text-gray-400 ml-2 rtl:mr-2 rtl:ml-0" />
              <input
                type="text"
                placeholder="חפש משרה לפי מזהה (ID) או מספר סידורי..."
                className="bg-transparent border-none focus:ring-0 w-full text-sm"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מזהה</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">כותרת</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מפרסם</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.filter(j =>
                    j.id.toLowerCase().includes(jobSearch.toLowerCase()) ||
                    (j.serialNumber && j.serialNumber.toString().includes(jobSearch))
                  ).map(job => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {job.serialNumber ? `#${job.serialNumber}` : job.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.postedBy.posterDisplayName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateByPreference(job.postedDate, authCtx?.datePreference || 'hebrew')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                        <button onClick={() => setCurrentPage('jobDetails', { jobId: job.id })} className="text-royal-blue hover:text-blue-800">צפה</button>
                        <button onClick={() => handleDeleteJob(job.id)} className="text-red-600 hover:text-red-900">מחק</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* REPORTS TAB */}
      {
        activeTab === 'reports' && (
          <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סוג</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סיבה</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.entityType === 'job' ? 'משרה' : report.entityType === 'user' ? 'משתמש' : 'צ\'אט'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={report.reason}>
                        {report.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {report.status === 'pending' ? 'ממתין' : report.status === 'resolved' ? 'טופל' : 'נדחה'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Date formatting would typically use formatted date string from report.createdAt */}
                        {/* Correctly format report date using preference */}
                        {formatDateByPreference(report.createdAt, authCtx?.datePreference || 'hebrew')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={async () => {
                                await reportService.updateReportStatus(report.id, 'resolved');
                                setReports(reports.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                                if (currentUser) {
                                  await adminLogService.logAction({
                                    adminId: currentUser.id,
                                    adminName: currentUser.fullName,
                                    action: 'resolve_report',
                                    targetId: report.id,
                                    targetType: report.entityType, // Using mapped type
                                    reason: 'Report resolved by admin',
                                    details: `Resolved report for ${report.entityType} ${report.reportedEntityId}`

                                  });
                                }
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              סמן כטופל
                            </button>
                            <button
                              onClick={async () => {
                                await reportService.updateReportStatus(report.id, 'dismissed');
                                setReports(reports.map(r => r.id === report.id ? { ...r, status: 'dismissed' } : r));
                                if (currentUser) {
                                  await adminLogService.logAction({
                                    adminId: currentUser.id,
                                    adminName: currentUser.fullName,
                                    action: 'dismiss_report',
                                    targetId: report.id,
                                    targetType: report.entityType,
                                    reason: 'Report dismissed by admin',
                                    details: `Dismissed report for ${report.entityType} ${report.reportedEntityId}`
                                  });
                                }
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              התעלם
                            </button>
                          </>
                        )}
                        {report.status !== 'pending' && (
                          <span className="text-gray-400">אין פעולות</span>
                        )}
                        {report.entityType === 'job' && (
                          <button
                            onClick={() => setCurrentPage('jobDetails', { jobId: report.reportedEntityId })}
                            className="text-royal-blue hover:text-blue-900"
                          >
                            צפה במשרה
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reports.length === 0 && (
                <div className="text-center p-8 text-gray-500">אין דיווחים להצגה</div>
              )}
            </div>
          </div>
        )
      }

      {/* CONTACT MESSAGES TAB */}
      {
        activeTab === 'contact' && (
          <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">נושא</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {messages.map(msg => (
                    <tr key={msg.id} className={`hover:bg-gray-50 ${msg.status === 'new' ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                              {msg.name}
                              {msg.userId && <UserIcon className="w-3 h-3 text-green-500" />}
                            </div>
                            <div className="text-sm text-gray-500">{msg.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="text-sm text-gray-900 font-medium truncate" title={msg.subject}>{msg.subject}</div>
                        <div className="text-sm text-gray-500 truncate" title={msg.message}>{msg.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Correctly format message date using preference */}
                        {formatDateByPreference(msg.createdAt, authCtx?.datePreference || 'hebrew')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${msg.status === 'new' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                          {msg.status === 'new' ? 'חדש' : 'נקרא/טופל'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          {msg.status === 'new' && (
                            <button
                              onClick={async () => {
                                await contactService.markAsRead(msg.id);
                                setMessages(messages.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
                              }}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              סמן כנקרא
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedMessage(msg); setShowReplyModal(true); }}
                            className="bg-royal-blue text-white hover:bg-blue-700 px-3 py-1 rounded text-xs font-medium transition-colors shadow-sm whitespace-nowrap mr-2 rtl:mr-0 rtl:ml-2"
                          >
                            השב / צפה
                          </button>
                          <a href={`mailto:${msg.email}?subject=RE: ${msg.subject}`} className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap no-underline mr-2 rtl:mr-0 rtl:ml-2">
                            ✉️ מייל
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {messages.length === 0 && (
                <div className="text-center p-8 text-gray-500">אין הודעות חדשות</div>
              )}
            </div>
          </div>
        )
      }
      {/* LOGS TAB */}
      {
        activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מנהל</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולה</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">יעד</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סיבה</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map(log => {
                    const translateAction = (action: string) => {
                      const map: Record<string, string> = {
                        'delete_job': 'מחיקת משרה',
                        'ban_user': 'חסימת משתמש',
                        'unban_user': 'ביטול חסימה',
                        'update_role': 'שינוי תפקיד',
                        'reply_contact': 'תשובה לפניה',
                        'resolve_report': 'טיפול בדיווח',
                        'dismiss_report': 'דחיית דיווח',
                        'block_contact': 'חסימת יצירת קשר',
                        'unblock_contact': 'ביטול חסימת קשר',
                        'delete_message': 'מחיקת הודעה'
                      };
                      return map[action] || action;
                    };
                    const translateTarget = (type: string) => {
                      const map: Record<string, string> = {
                        'job': 'משרה',
                        'user': 'משתמש',
                        'message': 'הודעה',
                        'chat': 'צ\'אט'
                      };
                      return map[type] || type;
                    };

                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.adminName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {translateAction(log.action)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                          {translateTarget(log.targetType)}: {log.targetId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.details || log.reason}>
                          <div className="font-medium">{log.reason}</div>
                          {log.details && <div className="text-xs text-gray-400 truncate">{log.details}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" dir="ltr">
                          {formatDateByPreference(log.timestamp, authCtx?.datePreference || 'hebrew') + ' ' + new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {logs.length === 0 && <div className="p-8 text-center text-gray-500">אין רישומים להיסטוריה</div>}
            </div>
          </div>
        )
      }

      {/* Reply Modal */}
      {
        showReplyModal && selectedMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 animate-scale-up">
              <h3 className="text-xl font-bold text-royal-blue mb-4">תשובה לפנייה: {selectedMessage.subject}</h3>

              <div className="bg-gray-50 p-4 rounded-md mb-4 text-sm text-gray-700 max-h-40 overflow-y-auto">
                <p className="font-semibold mb-1">{selectedMessage.name} ({selectedMessage.email}):</p>
                <p>{selectedMessage.message}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">תוכן התשובה</label>
                <textarea
                  className="w-full border rounded-md p-2 h-32 focus:ring-2 focus:ring-royal-blue"
                  placeholder="כתוב את תשובתך כאן..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedMessage.userId ? 'המשתמש יקבל התראה באתר.' : 'שים לב: המשתמש אינו רשום. התשובה תירשם רק במערכת (יש לשלוח מייל).'}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowReplyModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">ביטול</button>
                <button onClick={handleReplySubmit} className="px-4 py-2 bg-royal-blue text-white rounded hover:bg-blue-700">שלח וסמן כטופל</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Block User Modal - With Admin and User-Visible Reasons */}
      {showBlockModal && userToBlock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 animate-scale-up">
            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <ExclamationCircleIcon className="w-6 h-6" />
              חסימת משתמש
            </h3>

            <div className="space-y-4">
              <p className="text-gray-700">
                אתה עומד לחסום את המשתמש <strong className="text-red-600">{userToBlock.fullName}</strong>.
              </p>

              {/* Admin Reason - for history/log */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיבת החסימה להיסטוריה (חובה):
                  <span className="text-xs text-gray-500 mr-2">נראה רק למנהלים</span>
                </label>
                <textarea
                  className="w-full border rounded-md p-2 h-20 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="סיבה פנימית למנהלים..."
                  value={blockReasonAdmin}
                  onChange={e => setBlockReasonAdmin(e.target.value)}
                ></textarea>
              </div>

              {/* User-Visible Reason - optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הודעה למשתמש (אופציונלי):
                  <span className="text-xs text-gray-500 mr-2">יוצג למשתמש שנחסם</span>
                </label>
                <textarea
                  className="w-full border rounded-md p-2 h-16 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="הסבר קצר שיוצג למשתמש... (אם ריק, המשתמש יראה הודעה כללית)"
                  value={blockReasonUser}
                  onChange={e => setBlockReasonUser(e.target.value)}
                ></textarea>
              </div>

              {/* Block contact option */}
              <div className="flex items-center bg-gray-50 p-3 rounded-md">
                <input
                  id="block-contact"
                  type="checkbox"
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  checked={isContactBlocked}
                  onChange={e => setIsContactBlocked(e.target.checked)}
                />
                <label htmlFor="block-contact" className="mr-2 text-sm text-gray-700">
                  חסום גם אפשרות ליצירת קשר (ערעור)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
              <button
                onClick={() => { setShowBlockModal(false); setUserToBlock(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                ביטול
              </button>
              <button
                onClick={() => {
                  if (!blockReasonAdmin.trim()) {
                    showToast('חובה להזין סיבה לחסימה', 'error');
                    return;
                  }
                  handleBlockAction(userToBlock, true, blockReasonAdmin, blockReasonUser);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold shadow-sm"
              >
                חסום משתמש
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <ExclamationCircleIcon className="w-5 h-5" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="hover:opacity-70">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

    </div >
  );
};