import React, { useEffect, useState } from 'react';
import type { PageProps } from '../App';
import { Job } from '../types';
import { BriefcaseIcon, UserIcon, PlusCircleIcon, LightBulbIcon } from '../components/icons';
import { gregSourceToHebrewString, formatGregorianString, formatDateByPreference } from '../utils/dateConverter';
import * as jobService from '../services/jobService';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';


interface AdminStats {
  totalJobs: number;
  totalViews: number;
  totalContactAttempts: number;
  // Potentially add more stats like new users today, jobs per category etc.
}

export const AdminDashboardPage: React.FC<PageProps> = ({ setCurrentPage }) => {
  const authCtx = useContext(AuthContext);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const allJobs = await jobService.getAllJobs(); // This might need pagination in a real app
        const totalJobs = allJobs.length;
        const totalViews = allJobs.reduce((sum, job) => sum + job.views, 0);
        const totalContactAttempts = allJobs.reduce((sum, job) => sum + job.contactAttempts, 0);
        
        setStats({ totalJobs, totalViews, totalContactAttempts });
        setRecentJobs(allJobs.sort((a,b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()).slice(0, 10)); // Show 10 most recent
      } catch (error) {
        console.error("Error fetching admin data:", error);
        // Handle error display
      }
      setLoading(false);
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return <div className="text-center p-10">טוען נתוני ניהול...</div>;
  }

  if (!stats) {
    return <div className="text-center p-10 text-red-500">שגיאה בטעינת נתוני ניהול.</div>;
  }

  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 rtl:space-x-reverse">
      <div className="p-3 bg-light-pink text-deep-pink rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-royal-blue">{value}</p>
      </div>
    </div>
  );


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-royal-blue mb-6 border-b pb-3">לוח בקרה למנהל</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="סהכ עבודות שפורסמו" value={stats.totalJobs} icon={<BriefcaseIcon className="w-8 h-8"/>} />
        <StatCard title="סהכ צפיות בעבודות" value={stats.totalViews} icon={<UserIcon className="w-8 h-8"/>}/>
        <StatCard title="סהכ פניות דרך האתר" value={stats.totalContactAttempts} icon={<PlusCircleIcon className="w-8 h-8"/>} />
      </div>

      <section className="bg-light-blue/10 p-4 sm:p-6 rounded-xl shadow-lg border border-light-blue/20">
        <h2 className="text-xl font-semibold text-royal-blue mb-4 flex items-center">
            <LightBulbIcon className="w-6 h-6 ml-2 rtl:mr-2 rtl:ml-0 text-yellow-500" />
            כלי עזר למנהל
        </h2>
        <div className="border-t pt-4">
            <div className="text-right space-y-3">
              <p className="text-medium-text">כלים לניהול האתר וסטטיסטיקות</p>
              <p className="text-medium-text">כאן יוצגו כלים נוספים לניהול האתר בעתיד</p>
            </div>
        </div>
      </section>

      <div className="bg-light-blue/10 p-6 rounded-xl shadow-lg border border-light-blue/20">
        <h2 className="text-xl font-semibold text-royal-blue mb-4">עבודות אחרונות שפורסמו</h2>
        {recentJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-light-pink/40">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מס' משרה</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">כותרת</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">אזור</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך פרסום</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">צפיות</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentJobs.map(job => (
                  <tr key={job.id} className="hover:bg-light-blue transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">#{job.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.area}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateByPreference(job.postedDate, authCtx?.datePreference || 'hebrew')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.views}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => setCurrentPage('jobDetails', { jobId: job.id })} className="text-royal-blue hover:text-deep-pink">צפה</button>
                      {/* Add more actions like edit/delete if needed */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">אין עבודות להצגה.</p>
        )}
      </div>

       <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
        <h2 className="text-xl font-semibold text-royal-blue mb-4">דיווחים ותלונות</h2>
         <p className="text-gray-500 text-center py-8">אזור זה בפיתוח ויציג דיווחים ממשתמשים על מודעות או תוכן לא הולם.</p>
         {/* Placeholder for reports */}
      </div>

    </div>
  );
};