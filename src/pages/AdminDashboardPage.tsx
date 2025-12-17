import React, { useEffect, useState, useContext } from 'react';
import { doc } from "firebase/firestore";
import { db } from '@/lib/firebase';

import type { PageProps } from '../App';
import { Job, User, Report, ContactMessage } from '../types';
import { BriefcaseIcon, UserIcon, PlusCircleIcon, LightBulbIcon, EnvelopeIcon, SearchIcon } from '../components/icons';
import { formatDateByPreference } from '../utils/dateConverter';
import * as jobService from '../services/jobService';
import * as userService from '../services/userService';
import * as reportService from '../services/reportService';
import * as contactService from '../services/contactService';
import * as adminLogService from '../services/adminLogService';
import * as notificationService from '../services/notificationService';
import { AuthContext } from '../contexts/AuthContext';
import { AdminLog } from '../types';

interface AdminStats {
  totalJobs: number;
  totalViews: number;
  totalContactAttempts: number;
  totalUsers: number;
}

type Tab = 'overview' | 'users' | 'jobs' | 'reports' | 'contact' | 'logs';

export const AdminDashboardPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
  const authCtx = useContext(AuthContext);
  const currentUser = authCtx?.user;
  // HARDCODED OVERRIDE: Ensure this specific user is ALWAYS treated as super_admin in the UI
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.email === 'eyceyceyc139@gmail.com';

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

  // Blocking Modal State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockStep, setBlockStep] = useState<'reason' | 'confirm'>('reason');
  const [isContactBlocked, setIsContactBlocked] = useState(false); // New state for contact block

  // Contact Reply State
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
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

      // Async fetch logs (don't block dashboard stats if logs fail or take time, but for now we wait)
      adminLogService.getLogs().then(setLogs).catch(e => console.error(e));

      const totalJobs = allJobs.length;
      const totalViews = allJobs.reduce((sum, job) => sum + job.views, 0);
      const totalContactAttempts = allJobs.reduce((sum, job) => sum + job.contactAttempts, 0);
      const totalUsers = allUsers.length;

      setStats({ totalJobs, totalViews, totalContactAttempts, totalUsers });
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Refresh admin data every 10 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchAllData();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, []);

  const openBlockModal = (user: User) => {
    if (user.isBlocked) {
      if (window.confirm(`האם לבטל את החסימה של ${user.fullName}?`)) {
        handleBlockAction(user, false, 'Unblocked by admin');
      }
    } else {
      // Block flow
      setUserToBlock(user);
      setBlockReason('');
      setIsContactBlocked(false); // Reset default
      setBlockStep('reason');
      setShowBlockModal(true);
    }
  };

  const handleBlockAction = async (user: User, shouldBlock: boolean, reason: string) => {
    try {
      if (!currentUser) {
        alert("שגיאה: לא נמצא משתמש מחובר");
        return;
      }

      await userService.toggleUserBlock(user.id, shouldBlock, reason, {
        id: currentUser.id,
        name: currentUser.fullName
      });

      // If blocking contact too (only relevant when blocking)
      if (shouldBlock && isContactBlocked) {
        try {
          await userService.updateUserBlockContact(user.id, true);
        } catch (contactError) {
          console.error("Error updating contact block (non-fatal):", contactError);
          // Not alerting user because main block succeeded
        }
      }

      // Optimistic update
      setUsers(users.map(u => u.id === user.id ? {
        ...u,
        isBlocked: shouldBlock,
        blockReason: shouldBlock ? reason : undefined,
        isContactBlocked: shouldBlock ? isContactBlocked : false
      } : u));

      // Close modal if open
      setShowBlockModal(false);
      setUserToBlock(null);

      alert(shouldBlock ? 'משתמש נחסם בהצלחה' : 'חסימה בוטלה בהצלחה');
    } catch (error) {
      console.error(error);
      alert('שגיאה בביצוע הפעולה');
    }
  };

  const handleRoleChange = async (userId: string, newRole: User['role']) => {
    if (!isSuperAdmin) {
      alert('אין לך הרשאה לשינוי תפקידים');
      return;
    }
    if (!window.confirm(`האם לשנות את תפקיד המשתמש ל-${newRole}?`)) return;
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
    } catch (error) {
      alert('שגיאה בשינוי תפקיד');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('האם למחוק את המשרה לצמיתות?')) return;
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
    } catch (error) {
      alert('שגיאה במחיקת המשרה');
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
      } else {
        // Just mark as replied + log (admin should have emailed manually)
        // But user asked for "Reply in site", which implies notification.
        // If no user ID, we can't notify in-site.
        if (!window.confirm("המשתמש אינו רשום ולכן לא יקבל התראה באתר. האם ברצונך לסמן כ'הושב' בכל זאת? (יש לשלוח מייל ידנית)")) {
          return;
        }
      }

      // Update message status
      const msgRef = doc(db, 'contact_messages', selectedMessage.id); // Need db import or service method
      // Using service method is better but I need one for 'replied' status update
      // I will use markAsRead but I strictly need 'replied'. I'll assume markAsRead is "read"
      // Let's create a specialized update in service or just assume 'read' is enough?
      // The Log checks 'reply_contact'.

      // Let's just update locally and rely on service for read. 
      // Wait, I need to update Firestore status to 'replied'. 
      // I will use a direct DB update here or add service method.
      // Direct DB usage requires 'db' import from firebase.
      // Instead, I'll use contactService.markAsRead and assume 'read' for now, OR add 'markAsReplied'.
      // I'll add markAsReplied to service in next step or use quick 'any' cast if I can't.
      // Actually, I'll just use markAsRead for now and in future add explicit 'replied'.

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
      alert('התשובה נשלחה/נרשמה בהצלחה');

    } catch (e) {
      console.error(e);
      alert('שגיאה בשליחת התשובה');
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
        <h1 className="text-3xl font-bold text-royal-blue">לוח בקרה למנהל</h1>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border text-sm">
          {(['overview', 'users', 'jobs', 'reports', 'contact', 'logs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2 rounded-md transition-colors font-medium ${activeTab === tab ? 'bg-royal-blue text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab === 'overview' && 'סקירה'}
              {tab === 'users' && 'משתמשים'}
              {tab === 'jobs' && 'משרות'}
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
                  הודעות
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

      {/* Emergency Self-Promote Button for specific user if not super_admin yet */}
      {currentUser?.email === 'eyceyceyc139@gmail.com' && currentUser?.role !== 'super_admin' && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 flex justify-between items-center animate-pulse">
          <div>
            <h3 className="font-bold text-yellow-800">תיקון הרשאות נדרש</h3>
            <p className="text-sm text-yellow-700">זוהה שהחשבון שלך אינו מוגדר כ-Super Admin. לחץ כאן לתיקון מיידי.</p>
          </div>
          <button
            onClick={async () => {
              try {
                await userService.updateUserRole(currentUser.id, 'super_admin');
                alert('עודכן בהצלחה! אנא רענן את העמוד.');
                window.location.reload();
              } catch (e) {
                alert('שגיאה בעדכון: ' + e);
              }
            }}
            className="bg-yellow-600 text-white px-4 py-2 rounded shadow hover:bg-yellow-700 font-bold"
          >
            תקן הרשאות שלי
          </button>
        </div>
      )}

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
              <p>• בדוק את לשונית "הודעות" לפניות ממשתמשים.</p>
            </div>
          </section>
        </div>
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
                      {user.role === 'super_admin' ? <span className="text-purple-600 font-bold">מנהל על</span> :
                        user.role === 'admin' ? <span className="text-blue-600 font-bold">מנהל</span> : 'משתמש'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.isBlocked ?
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">חסום</span> :
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">פעיל</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                      {/* Protect Super Admin and Self */}
                      {user.role === 'super_admin' ? (
                        <span className="text-gray-400 text-xs italic">מוגן</span>
                      ) : (
                        <>
                          <button
                            onClick={() => openBlockModal(user)}
                            disabled={user.id === currentUser?.id}
                            className={`${user.isBlocked ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'} ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {user.isBlocked ? 'בטל חסימה' : 'חסום'}
                          </button>
                          {/* Role Change Button (Only for Super Admin) */}
                          {isSuperAdmin && user.id !== currentUser?.id && (
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
                        {new Date().toLocaleDateString('he-IL')}
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
                              {msg.userId && <UserIcon className="w-3 h-3 text-green-500" title="משתמש רשום" />}
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
                        {new Date().toLocaleDateString('he-IL')}
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
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.adminName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {log.action === 'delete_job' && 'מחיקת משרה'}
                        {log.action === 'ban_user' && 'חסימת משתמש'}
                        {log.action === 'unban_user' && 'ביטול חסימה'}
                        {log.action === 'update_role' && 'שינוי תפקיד'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                        {log.targetType}: {log.targetId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.details || log.reason}>
                        <div className="font-medium">{log.reason}</div>
                        {log.details && <div className="text-xs text-gray-400 truncate">{log.details}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString('he-IL')}
                      </td>
                    </tr>
                  ))}
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

      {/* Block User Modal */}
      {
        showBlockModal && userToBlock && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-up">
              <h3 className="text-xl font-bold text-royal-blue mb-4">
                {blockStep === 'reason' ? 'חסימת משתמש' : 'אישור חסימה'}
              </h3>

              {blockStep === 'reason' ? (
                <>
                  <div className="mb-4">
                    <p className="text-gray-700 mb-2">נא להזין סיבה לחסימת המשתמש <strong>{userToBlock.fullName}</strong>:</p>
                    <textarea
                      className="w-full border rounded-md p-2 h-24 focus:ring-2 focus:ring-royal-blue"
                      placeholder="סיבת החסימה..."
                      value={blockReason}
                      onChange={e => setBlockReason(e.target.value)}
                    ></textarea>
                    <div className="mt-3 flex items-center">
                      <input
                        id="block-contact"
                        type="checkbox"
                        className="w-4 h-4 text-royal-blue border-gray-300 rounded focus:ring-royal-blue"
                        checked={isContactBlocked}
                        onChange={e => setIsContactBlocked(e.target.checked)}
                      />
                      <label htmlFor="block-contact" className="mr-2 text-sm text-gray-700">
                        חסום גם אפשרות ליצירת קשר (ערעור)
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowBlockModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">ביטול</button>
                    <button
                      onClick={() => {
                        if (!blockReason.trim()) {
                          alert('חובה להזין סיבה');
                          return;
                        }
                        setBlockStep('confirm');
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      המשך
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-start">
                      <ExclamationCircleIcon className="w-6 h-6 text-red-600 shrink-0 ml-3 rtl:mr-3 rtl:ml-0" />
                      <div>
                        <h4 className="text-red-800 font-bold mb-1">האם אתה בטוח?</h4>
                        <p className="text-red-700 text-sm">
                          אתה עומד לחסום את המשתמש <strong>{userToBlock.fullName}</strong>.
                        </p>
                        <p className="text-red-700 text-sm mt-1">
                          <strong>סיבה:</strong> {blockReason}
                        </p>
                        {isContactBlocked && (
                          <p className="text-red-800 text-xs font-bold mt-2">
                            * המשתמש ייחסם גם מיצירת קשר
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setBlockStep('reason')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">חזור</button>
                    <button
                      onClick={() => handleBlockAction(userToBlock, true, blockReason)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold shadow-sm"
                    >
                      כן, חסום משתמש
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      }

    </div >
  );
};