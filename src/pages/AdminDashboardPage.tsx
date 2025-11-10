
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { PageProps } from '../App';
import * as jobService from '../services/jobService'; 
import * as authService from '../services/authService';
import * as chatService from '../services/chatService';
import { Job, User, ChatThread, ContactPreference } from '../types';
import { BriefcaseIcon, UserIcon, ChatBubbleLeftEllipsisIcon, TrashIcon, EditIcon, CheckCircleIcon, XCircleIcon } from '../components/icons';
import { gregSourceToHebrewString, formatRelativePostedDate, formatGregorianString, formatDateByPreference } from '../utils/dateConverter';
import { useAuth } from '../hooks/useAuth'; 
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

interface AdminStats {
  totalJobs: number;
  totalUsers: number;
  totalChatThreads: number;
}

type UserRole = 'user' | 'moderator' | 'support' | 'admin';
const userRoleOptions: { value: UserRole; label: string }[] = [
    { value: 'user', label: 'משתמש רגיל' },
    { value: 'support', label: 'תמיכה' },
    { value: 'moderator', label: 'מודרטור' },
    { value: 'admin', label: 'מנהל-על' },
];


export const AdminDashboardPage: React.FC<PageProps> = ({ setCurrentPage }) => {
  const authCtx = useContext(AuthContext);
  const { user: adminUser } = useAuth(); 
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allChatThreads, setAllChatThreads] = useState<ChatThread[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', onConfirm: () => {}, confirmText: 'אישור', showCancel: true });
  const [flagReason, setFlagReason] = useState('');
  const [jobToFlag, setJobToFlag] = useState<Job | null>(null);


  const fetchData = useCallback(async () => {
    if (!adminUser || adminUser.role !== 'admin') {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    setAccessDenied(false);
    setLoading(true);
    setError(null);
    try {
      const [users, jobs, threads] = await Promise.all([
        authService.getAllUsersAdmin(),
        jobService.getAllJobs(),
        chatService.getAllChatThreadsAdmin()
      ]);
      setAllUsers(users);
      setAllJobs(jobs);
      setAllChatThreads(threads);
      setStats({
        totalJobs: jobs.length,
        totalUsers: users.length,
        totalChatThreads: threads.length
      });
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(err.message || "שגיאה בטעינת נתוני ניהול.");
    } finally {
      setLoading(false);
    }
  }, [adminUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleUserAction = async (action: () => Promise<any>, successMessage: string) => {
    try {
      await action();
      fetchData(); // Refresh data
      setModalContent({ title: 'הצלחה', message: successMessage, onConfirm: () => setShowModal(false), confirmText: 'הבנתי', showCancel: false });
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || "שגיאה בביצוע הפעולה.");
    }
  };

  const confirmUserDelete = (targetUser: User) => {
    setModalContent({
      title: 'אישור מחיקת משתמש',
      message: `האם אתה בטוח שברצונך למחוק את המשתמש ${targetUser.fullName || targetUser.email}? פעולה זו תמחק את חשבון ה-Auth שלו ואת מסמך הפרופיל ב-Firestore. מחיקת נתונים מקושרים (משרות, שיחות) דורשת יישום Firebase Functions.`,
      onConfirm: () => handleUserAction(() => authService.deleteUserAccountAdmin(targetUser.id), 'המשתמש נמחק בהצלחה (Auth ומסמך פרופיל).'),
      confirmText: 'מחק משתמש',
      showCancel: true,
    });
    setShowModal(true);
  };

  const confirmJobDelete = (job: Job) => {
    setModalContent({
        title: 'אישור מחיקת משרה',
        message: `האם אתה בטוח שברצונך למחוק את המשרה "${job.title}" (ID: ${job.id})?`,
        onConfirm: () => handleUserAction(() => jobService.deleteJob(job.id), 'המשרה נמחקה בהצלחה.'),
        confirmText: 'מחק משרה',
        showCancel: true,
    });
    setShowModal(true);
  };
  
  const openFlagJobModal = (job: Job) => {
    setJobToFlag(job);
    setFlagReason(job.flagReason || '');
    setModalContent({
      title: job.isFlagged ? `בטל סימון בעייתיות למשרה "${job.title}"` : `סמן משרה "${job.title}" כבעייתית`,
      message: job.isFlagged ? 'האם לבטל את הסימון הבעייתי של משרה זו?' : 'אנא הזן סיבה לסימון המשרה כבעייתית (אופציונלי):',
      onConfirm: () => handleConfirmFlagJob(job.isFlagged ? false : true), // Pass true if flagging, false if unflagging
      confirmText: job.isFlagged ? 'בטל סימון' : 'סמן כבעייתית',
      showCancel: true,
    });
    setShowModal(true);
  };

  const handleConfirmFlagJob = async (shouldFlag: boolean) => {
    if (!jobToFlag) return;
    const reason = shouldFlag ? flagReason : ''; // Use flagReason only when flagging
    handleUserAction(
      () => jobService.flagJobAdmin(jobToFlag.id, reason, shouldFlag),
      `המשרה "${jobToFlag.title}" ${shouldFlag ? 'סומנה כבעייתית' : 'הוסר ממנה הסימון הבעייתי'}.`
    );
    setJobToFlag(null);
    setFlagReason('');
    setShowModal(false); // Close the current modal; success/error will open a new one.
  };



  if (accessDenied) {
    return (
      <div className="text-center p-10">
        <h1 className="text-2xl font-bold text-red-700">גישה נדחתה</h1>
        <p className="text-gray-700">אין לך הרשאות לגשת לדף זה.</p>
        <Button onClick={() => setCurrentPage('home')} className="mt-4">חזרה לדף הבית</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center p-10">טוען נתוני ניהול...</div>;
  }
  
  if (error) {
    return <div className="text-center p-10 text-red-700">{error}</div>;
  }


  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 rtl:space-x-reverse">
      <div className="p-3 bg-deep-pink/20 text-deep-pink rounded-full">{icon}</div>
      <div><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold text-royal-blue">{value}</p></div>
    </div>
  );

  return (
    <div className="space-y-8 p-2 sm:p-0">
      <h1 className="text-3xl font-bold text-royal-blue mb-6 border-b pb-3">לוח בקרה למנהל</h1>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="סהכ משתמשים רשומים" value={stats.totalUsers} icon={<UserIcon className="w-8 h-8"/>} />
          <StatCard title="סהכ משרות במערכת" value={stats.totalJobs} icon={<BriefcaseIcon className="w-8 h-8"/>} />
          <StatCard title="סהכ שיחות" value={stats.totalChatThreads} icon={<ChatBubbleLeftEllipsisIcon className="w-8 h-8"/>} />
        </div>
      )}

      {/* Users Table */}
      <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-royal-blue mb-4">ניהול משתמשים ({allUsers.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-right font-medium text-gray-500">שם מלא</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">אימייל</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">תפקיד</th>
                <th className="px-3 py-3 text-center font-medium text-gray-500">חסום</th>
                <th className="px-3 py-3 text-center font-medium text-gray-500">יכולת שיחה</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allUsers.map(u => (
                <tr key={u.id} className={`${u.isBlocked ? 'bg-red-50 opacity-70' : (u.role === 'admin' ? 'bg-blue-50' : '')}`}>
                  <td className="px-3 py-3 whitespace-nowrap">{u.fullName}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{u.email}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Select
                        options={userRoleOptions}
                        value={u.role || 'user'}
                        onChange={(e) => handleUserAction(() => authService.updateUserRoleAdmin(u.id, e.target.value as UserRole), `תפקיד משתמש ${u.email} עודכן ל${e.target.value}.`)}
                        selectClassName="py-1 text-xs !mt-0"
                        containerClassName="mb-0 min-w-[120px]"
                        disabled={adminUser?.id === u.id && u.role === 'admin'}
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <Button size="sm" variant={u.isBlocked ? "danger" : "outline"} onClick={() => handleUserAction(() => authService.blockUserAdmin(u.id, !u.isBlocked), `משתמש ${u.email} ${!u.isBlocked ? 'נחסם' : 'שוחרר מחסימה'}.`)} className="!px-2 !py-1" disabled={adminUser?.id === u.id}>
                      {u.isBlocked ? <XCircleIcon className="w-5 h-5 text-white"/> : <CheckCircleIcon className="w-5 h-5 text-green-500"/>}
                    </Button>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                     <Button size="sm" variant={u.canChat === false ? "danger" : "outline"} onClick={() => handleUserAction(() => authService.toggleUserChatStatusAdmin(u.id, !(u.canChat ?? true)), `יכולת שיחה למשתמש ${u.email} ${!(u.canChat ?? true) ? 'הופעלה' : 'נחסמה'}.`)} className="!px-2 !py-1">
                        {u.canChat === false ? <XCircleIcon className="w-5 h-5 text-white"/> : <CheckCircleIcon className="w-5 h-5 text-green-500"/>}
                     </Button>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap space-x-1 rtl:space-x-reverse">
                    <Button size="sm" variant="danger" icon={<TrashIcon className="w-4 h-4"/>} onClick={() => confirmUserDelete(u)} className="!px-2 !py-1" disabled={adminUser?.id === u.id}>מחק</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Jobs Table */}
      <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-royal-blue mb-4">ניהול משרות ({allJobs.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
             <thead className="bg-gray-50">
                <tr>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">ID</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">כותרת</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">מפרסם</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">תאריך פרסום</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-500">בעייתית?</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">פעולות</th>
                </tr>
             </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allJobs.map(job => (
                <tr key={job.id} className={`${job.isFlagged ? 'bg-yellow-50' : ''}`}>
                  <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{job.id}</td>
                  <td className="px-3 py-3 whitespace-nowrap hover:text-deep-pink cursor-pointer" onClick={() => setCurrentPage('jobDetails', {jobId: job.id})}>{job.title}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{job.postedBy.posterDisplayName} ({job.postedBy.id.substring(0,5)}...)</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateByPreference(job.postedDate, authCtx?.datePreference || 'hebrew')}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                     <Button size="sm" variant={job.isFlagged ? "secondary" : "outline"} onClick={() => openFlagJobModal(job)} className="!px-2 !py-1">
                        {job.isFlagged ? <XCircleIcon className="w-5 h-5 text-white"/> : <CheckCircleIcon className="w-5 h-5 text-gray-400"/>}
                     </Button>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap space-x-1 rtl:space-x-reverse">
                    <Button size="sm" variant="outline" icon={<EditIcon className="w-4 h-4"/>} onClick={() => setCurrentPage('postJob', {editJobId: job.id})} className="!px-2 !py-1">ערוך</Button>
                    <Button size="sm" variant="danger" icon={<TrashIcon className="w-4 h-4"/>} onClick={() => confirmJobDelete(job)} className="!px-2 !py-1">מחק</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Chat Threads Table */}
       <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-royal-blue mb-4">שיחות ({allChatThreads.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
             <thead className="bg-gray-50">
                <tr>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">ID שיחה</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">משתתפים</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">נושא (משרה)</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">הודעה אחרונה</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">פעולות</th>
                </tr>
             </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allChatThreads.map(thread => (
                <tr key={thread.id}>
                  <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{thread.id.substring(0,8)}...</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {thread.participantIds.map(pid => thread.participants[pid]?.displayName || pid.substring(0,5)+"...").join(' , ')}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{thread.jobTitle || 'שיחה כללית'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {thread.lastMessage ? `${thread.lastMessage.text.substring(0,30)}... (${formatRelativePostedDate(thread.lastMessage.timestamp, authCtx?.datePreference || 'hebrew')})` : 'אין הודעות'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                     <Button size="sm" variant="outline" onClick={() => setCurrentPage('chatThread', {threadId: thread.id, otherParticipantName: 'משתתפים', jobTitle: thread.jobTitle})} className="!px-2 !py-1">צפה בשיחה</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalContent.title}>
          <div className="p-4">
              <p className="text-gray-700 mb-4">{modalContent.message}</p>
              {modalContent.title.toLowerCase().includes("סמן משרה") && !modalContent.title.toLowerCase().includes("בטל סימון") && (
                <Input 
                    label="סיבה (אופציונלי):"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    containerClassName="mb-4"
                />
              )}
              <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                  {modalContent.showCancel && <Button variant="outline" onClick={() => setShowModal(false)}>ביטול</Button>}
                  <Button variant="primary" onClick={modalContent.onConfirm}>{modalContent.confirmText}</Button>
              </div>
          </div>
      </Modal>

    </div>
  );
};
