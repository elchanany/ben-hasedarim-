
import { Job, JobDifficulty, PaymentType, JobPosterInfo, JobDateType, PaymentMethod, PreferredContactMethods, JobSuitability, JobSearchFilters } from '../types';
import { ISRAELI_CITIES, DEFAULT_USER_DISPLAY_NAME, SortById } from '../constants'; 
import { getTodayGregorianISO } from '../utils/dateConverter';

const JOBS_KEY = 'bein_hasedarim_jobs';

export const getStoredJobs = (): Job[] => {
  const jobsJson = localStorage.getItem(JOBS_KEY);
  return jobsJson ? JSON.parse(jobsJson) : [];
};

const saveStoredJobs = (jobs: Job[]) => {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
};

const mockUserPoster1: JobPosterInfo = { id: 'mock_user_1', posterDisplayName: 'משה לוי' };
const mockUserPoster2: JobPosterInfo = { id: 'mock_user_2', posterDisplayName: 'שרה כהן' };
const mockUserPoster3: JobPosterInfo = { id: 'mock_user_3', posterDisplayName: 'יוסי הפקות' };
const mockAdminPoster: JobPosterInfo = {id: 'admin_user_001', posterDisplayName: "מנהל האתר"};

const initializeMockJobs = () => {
  let jobs = getStoredJobs();
  if (jobs.length === 0) {
    jobs = [
      {
        id: '1',
        title: 'הובלה קטנה בירושלים',
        area: 'ירושלים',
        dateType: 'today',
        specificDate: getTodayGregorianISO(),
        startTime: '14:00',
        estimatedDurationHours: 2,
        estimatedDurationIsFlexible: false,
        difficulty: JobDifficulty.MEDIUM,
        paymentType: PaymentType.GLOBAL,
        globalPayment: 200,
        description: 'דרוש בחור חזק להובלת מספר רהיטים קטנים מדירה בקומה שנייה ללא מעלית לרכב מסחרי. עבודה פיזית אך לא מורכבת. תשלום במזומן בסיום.',
        specialRequirements: 'יכולת הרמה, זריזות.',
        suitability: { men: true, women: false, general: false, minAge: 18 },
        numberOfPeopleNeeded: 1,
        paymentMethod: PaymentMethod.CASH_ON_COMPLETION,
        contactInfoSource: 'currentUser', 
        contactDisplayName: 'משה לוי',
        contactPhone: '050-1111111',
        contactWhatsapp: '050-1111111',
        contactEmail: 'moshe.levi@example.com',
        preferredContactMethods: { phone: true, whatsapp: true, email: false, allowSiteMessages: true }, 
        postedBy: mockUserPoster1,
        postedDate: new Date(Date.now() - 86400000 * 1).toISOString(), 
        views: 25,
        contactAttempts: 3
      },
      {
        id: '2',
        title: 'בייביסיטר לבנות בבני ברק',
        area: 'בני ברק',
        dateType: 'specificDate',
        specificDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], 
        startTime: '19:00',
        estimatedDurationHours: 3,
        estimatedDurationIsFlexible: false,
        difficulty: JobDifficulty.EASY,
        paymentType: PaymentType.HOURLY,
        hourlyRate: 45,
        description: 'דרושה בחורה אחראית לשמור על שתי בנות מתוקות (גילאי 3 ו-5) בשעות הערב. כולל משחק, ארוחת ערב קלה והשכבה. ניסיון - יתרון.',
        suitability: { men: false, women: true, general: false, minAge: 16 },
        numberOfPeopleNeeded: 1,
        paymentMethod: PaymentMethod.CASH_ON_COMPLETION,
        contactInfoSource: 'currentUser',
        contactDisplayName: 'שרה כהן',
        contactPhone: '052-2222222',
        contactWhatsapp: '052-2222222',
        contactEmail: 'sarah.cohen@example.com',
        preferredContactMethods: { phone: false, whatsapp: true, email: true, allowSiteMessages: true }, 
        postedBy: mockUserPoster2,
        postedDate: new Date(Date.now() - 86400000 * 2).toISOString(), 
        views: 40,
        contactAttempts: 8
      },
      {
        id: '3',
        title: 'עזרה בהכנת אירוע באלעד',
        area: 'אלעד',
        dateType: 'comingWeek', 
        estimatedDurationIsFlexible: true, 
        difficulty: JobDifficulty.MEDIUM,
        paymentType: PaymentType.GLOBAL,
        globalPayment: 700,
        description: 'דרושים צעירים נמרצים לעזרה בהקמת אירוע - סידור כסאות, שולחנות, קישוטים ועוד. עבודה פיזית קלה עד בינונית. אווירה טובה ותשלום הוגן.',
        suitability: { men: true, women: true, general: true, minAge: 16 },
        numberOfPeopleNeeded: 3,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        contactInfoSource: 'other',
        contactDisplayName: 'יוסי הפקות אירועים',
        contactPhone: '053-3333333',
        contactEmail: 'yossi.productions@example.com',
        preferredContactMethods: { phone: true, whatsapp: false, email: true, allowSiteMessages: false },
        postedBy: mockUserPoster3,
        postedDate: new Date().toISOString(),
        views: 15,
        contactAttempts: 1
      },
       {
        id: 'user_mock_job_1',
        title: 'עבודה לדוגמה של משתמש מחובר 1',
        area: 'תל אביב - יפו',
        dateType: 'flexibleDate',
        difficulty: JobDifficulty.EASY,
        paymentType: PaymentType.HOURLY,
        hourlyRate: 60,
        description: 'זוהי עבודה לדוגמה שפורסמה על ידי המשתמש המחובר עם ID mock_user_1.',
        suitability: { men: true, women: true, general: true, minAge: undefined },
        numberOfPeopleNeeded: 1,
        paymentMethod: PaymentMethod.PAYSLIP,
        contactInfoSource: 'currentUser',
        contactDisplayName: 'משה לוי',
        contactPhone: '050-1111111',
        preferredContactMethods: { phone: true, whatsapp: false, email: false, allowSiteMessages: true }, 
        postedBy: mockUserPoster1, 
        postedDate: new Date(Date.now() - 86400000 * 5).toISOString(), 
        views: 5,
        contactAttempts: 0
      },
       {
        id: 'user_mock_job_2_past',
        title: 'עבודה ישנה של משתמש 1',
        area: 'חיפה',
        dateType: 'specificDate',
        specificDate: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0], 
        difficulty: JobDifficulty.HARD,
        paymentType: PaymentType.GLOBAL,
        globalPayment: 500,
        description: 'עבודה זו היא מלפני 10 ימים וצריכה להופיע כלא פעילה.',
        suitability: { men: true, women: false, general: false, minAge: 20 },
        numberOfPeopleNeeded: 2,
        paymentMethod: PaymentMethod.CASH_ON_COMPLETION,
        contactInfoSource: 'currentUser',
        contactDisplayName: 'משה לוי',
        contactPhone: '050-1111111',
        preferredContactMethods: { phone: true, whatsapp: false, email: false, allowSiteMessages: false }, 
        postedBy: mockUserPoster1, 
        postedDate: new Date(Date.now() - 86400000 * 15).toISOString(), 
        views: 30,
        contactAttempts: 2
      },
      {
        id: '20',
        title: 'הזנת נתונים זמנית',
        area: 'רמת גן',
        dateType: 'comingWeek',
        estimatedDurationHours: 10,
        estimatedDurationIsFlexible: true,
        difficulty: JobDifficulty.EASY,
        paymentType: PaymentType.HOURLY,
        hourlyRate: 50,
        description: 'דרוש/ה אדם מסודר להזנת נתונים למערכת. עבודה מהבית או מהמשרד ברמת גן. נדרשת הקלדה מהירה ודיוק.',
        suitability: { men: true, women: true, general: true, minAge: 18 },
        numberOfPeopleNeeded: 1,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        contactInfoSource: 'other',
        contactDisplayName: 'דנה גל',
        contactPhone: '054-4444444',
        contactWhatsapp: '054-4444444',
        contactEmail: 'data.entry@example.com',
        preferredContactMethods: { phone: true, whatsapp: true, email: true, allowSiteMessages: true }, 
        postedBy: mockAdminPoster,
        postedDate: new Date(Date.now() - 86400000 * 0.5).toISOString(),
        views: 12,
        contactAttempts: 1
      }
    ];
    saveStoredJobs(jobs);
  }
};

initializeMockJobs();


export const isJobDateValidForSearch = (job: Job): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (job.dateType === 'flexibleDate') {
        return true; 
    }
    if (job.dateType === 'comingWeek') {
        if (job.specificDate) {
            const specificJobDate = new Date(job.specificDate);
            specificJobDate.setHours(0,0,0,0);
            return specificJobDate >= today;
        }
        const postedDate = new Date(job.postedDate);
        const sevenDaysFromPosted = new Date(postedDate);
        sevenDaysFromPosted.setDate(postedDate.getDate() + 7);
        return sevenDaysFromPosted >= today;
    }
    if (job.dateType === 'today' || job.dateType === 'specificDate') {
        if (!job.specificDate) return false; 
        const specificJobDate = new Date(job.specificDate);
         specificJobDate.setHours(0,0,0,0); 
        return specificJobDate >= today;
    }
    return true; 
};


export const getHotJobs = async (limit: number = 4): Promise<Job[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allJobs = getStoredJobs();
      const validJobs = allJobs.filter(isJobDateValidForSearch);
      const sortedJobs = validJobs.sort((a, b) => {
        const scoreA = (a.views || 0) * 0.6 + (a.contactAttempts || 0) * 0.4;
        const scoreB = (b.views || 0) * 0.6 + (b.contactAttempts || 0) * 0.4;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
      });
      resolve(sortedJobs.slice(0, limit));
    }, 200);
  });
};

export interface SearchCriteria extends JobSearchFilters {
}


export const searchJobs = async (criteria: Partial<SearchCriteria>): Promise<Job[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let jobs = getStoredJobs();

            jobs = jobs.filter(isJobDateValidForSearch);

            if (criteria.term) {
                const searchTerm = criteria.term.toLowerCase();
                jobs = jobs.filter(job =>
                    job.title.toLowerCase().includes(searchTerm) ||
                    job.description.toLowerCase().includes(searchTerm)
                );
            }

            if (criteria.location) {
                jobs = jobs.filter(job => job.area === criteria.location);
            }

            if (criteria.difficulty) {
                jobs = jobs.filter(job => job.difficulty === criteria.difficulty);
            }
            
            if (criteria.dateType) {
                if (criteria.dateType === 'specificDate' && criteria.specificDateStart) {
                    const startDate = new Date(criteria.specificDateStart);
                    startDate.setHours(0,0,0,0);
                    const endDate = criteria.specificDateEnd ? new Date(criteria.specificDateEnd) : startDate;
                    endDate.setHours(23,59,59,999);

                    jobs = jobs.filter(job => {
                        if (!job.specificDate) return false;
                        const jobDate = new Date(job.specificDate);
                        return jobDate >= startDate && jobDate <= endDate;
                    });

                } else if (criteria.dateType === 'today') {
                     const todayISO = getTodayGregorianISO();
                     jobs = jobs.filter(job => job.specificDate === todayISO && (job.dateType === 'today' || job.dateType === 'specificDate'));
                } else if (criteria.dateType === 'comingWeek') {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const oneWeekFromToday = new Date(today);
                    oneWeekFromToday.setDate(today.getDate() + 7);
                    oneWeekFromToday.setHours(23,59,59,999);
                    
                    jobs = jobs.filter(job => {
                        if (job.dateType === 'comingWeek') {
                            if (job.specificDate) {
                                const jobDate = new Date(job.specificDate);
                                return jobDate >= today && jobDate <= oneWeekFromToday;
                            }
                            return true;
                        }
                        if (job.dateType === 'specificDate' && job.specificDate) {
                           const jobDate = new Date(job.specificDate);
                           return jobDate >= today && jobDate <= oneWeekFromToday;
                        }
                        return false;
                    });
                } else if (criteria.dateType === 'flexibleDate') {
                    jobs = jobs.filter(job => job.dateType === 'flexibleDate');
                }
            }


            const minDuration = criteria.minEstimatedDurationHours ? parseFloat(criteria.minEstimatedDurationHours) : undefined;
            const maxDuration = criteria.maxEstimatedDurationHours ? parseFloat(criteria.maxEstimatedDurationHours) : undefined;

            if (minDuration !== undefined) {
                 jobs = jobs.filter(job => job.estimatedDurationHours !== undefined && job.estimatedDurationHours >= minDuration);
            }
            if (maxDuration !== undefined) {
                jobs = jobs.filter(job => job.estimatedDurationHours !== undefined && job.estimatedDurationHours <= maxDuration);
            }
            if (criteria.filterDurationFlexible && criteria.filterDurationFlexible !== 'any') {
                const flexBool = criteria.filterDurationFlexible === 'yes';
                jobs = jobs.filter(job => job.estimatedDurationIsFlexible === flexBool);
            }
            
            const minHR = criteria.minHourlyRate ? parseFloat(criteria.minHourlyRate) : undefined;
            const maxHR = criteria.maxHourlyRate ? parseFloat(criteria.maxHourlyRate) : undefined;
            const minGP = criteria.minGlobalPayment ? parseFloat(criteria.minGlobalPayment) : undefined;
            const maxGP = criteria.maxGlobalPayment ? parseFloat(criteria.maxGlobalPayment) : undefined;

            if (criteria.paymentKind && criteria.paymentKind !== 'any') {
                jobs = jobs.filter(job => job.paymentType === criteria.paymentKind);
                if (criteria.paymentKind === PaymentType.HOURLY) {
                    if (minHR !== undefined) jobs = jobs.filter(j => j.hourlyRate !== undefined && j.hourlyRate >= minHR);
                    if (maxHR !== undefined) jobs = jobs.filter(j => j.hourlyRate !== undefined && j.hourlyRate <= maxHR);
                } else if (criteria.paymentKind === PaymentType.GLOBAL) {
                    if (minGP !== undefined) jobs = jobs.filter(j => j.globalPayment !== undefined && j.globalPayment >= minGP);
                    if (maxGP !== undefined) jobs = jobs.filter(j => j.globalPayment !== undefined && j.globalPayment <= maxGP);
                }
            } else { 
                if (minHR !== undefined || maxHR !== undefined || minGP !== undefined || maxGP !== undefined) {
                    jobs = jobs.filter(job => {
                        if (job.paymentType === PaymentType.HOURLY) {
                            const minPass = minHR === undefined || (job.hourlyRate !== undefined && job.hourlyRate >= minHR);
                            const maxPass = maxHR === undefined || (job.hourlyRate !== undefined && job.hourlyRate <= maxHR);
                            return minPass && maxPass;
                        }
                        if (job.paymentType === PaymentType.GLOBAL) {
                            const minPass = minGP === undefined || (job.globalPayment !== undefined && job.globalPayment >= minGP);
                            const maxPass = maxGP === undefined || (job.globalPayment !== undefined && job.globalPayment <= maxGP);
                            return minPass && maxPass;
                        }
                        return false; 
                    });
                }
            }

            if (criteria.selectedPaymentMethods && criteria.selectedPaymentMethods.size > 0) {
                 jobs = jobs.filter(job => job.paymentMethod && criteria.selectedPaymentMethods!.has(job.paymentMethod));
            }

            const minPN = criteria.minPeopleNeeded ? parseInt(criteria.minPeopleNeeded, 10) : undefined;
            const maxPN = criteria.maxPeopleNeeded ? parseInt(criteria.maxPeopleNeeded, 10) : undefined;
            if (minPN !== undefined) {
                jobs = jobs.filter(job => job.numberOfPeopleNeeded !== undefined && job.numberOfPeopleNeeded >= minPN);
            }
             if (maxPN !== undefined) {
                jobs = jobs.filter(job => job.numberOfPeopleNeeded !== undefined && job.numberOfPeopleNeeded <= maxPN);
            }

            if (criteria.suitabilityFor && criteria.suitabilityFor !== 'any') {
                jobs = jobs.filter(job => {
                    if (criteria.suitabilityFor === 'men') return job.suitability.men;
                    if (criteria.suitabilityFor === 'women') return job.suitability.women;
                    if (criteria.suitabilityFor === 'general') return job.suitability.general;
                    return false;
                });
            }
            const minAgeNum = criteria.minAge ? parseInt(criteria.minAge, 10) : undefined;
            const maxAgeNum = criteria.maxAge ? parseInt(criteria.maxAge, 10) : undefined;

            if (minAgeNum !== undefined) {
                 jobs = jobs.filter(job => job.suitability.minAge === undefined || job.suitability.minAge >= minAgeNum);
            }
             if (maxAgeNum !== undefined) {
                 jobs = jobs.filter(job => job.suitability.minAge === undefined || job.suitability.minAge <= maxAgeNum);
            }

            if (criteria.sortBy) {
                switch (criteria.sortBy) {
                    case 'newest':
                        jobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
                        break;
                    case 'hottest': 
                        jobs.sort((a, b) => {
                            const scoreA = (a.views || 0) + (a.contactAttempts || 0);
                            const scoreB = (b.views || 0) + (b.contactAttempts || 0);
                            if (scoreB !== scoreA) return scoreB - scoreA;
                            return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
                        });
                        break;
                    case 'highestPay':
                        jobs.sort((a, b) => {
                            const payA = a.paymentType === PaymentType.HOURLY ? (a.hourlyRate || 0) 
                                       : (a.globalPayment || 0) / (a.estimatedDurationHours || 4); 
                            const payB = b.paymentType === PaymentType.HOURLY ? (b.hourlyRate || 0) 
                                       : (b.globalPayment || 0) / (b.estimatedDurationHours || 4);
                            if (payB !== payA) return payB - payA;
                             return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
                        });
                        break;
                }
            }

            resolve(jobs);
        }, 300); 
    });
};


export const getJobById = async (id: string): Promise<Job | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const jobs = getStoredJobs();
      const job = jobs.find(job => job.id === id);
      if (job) {
        // Ensure preferredContactMethods exists and has allowSiteMessages
        const preferredContacts = job.preferredContactMethods || { phone: true, whatsapp: false, email: false, allowSiteMessages: false };
        if (typeof preferredContacts.allowSiteMessages === 'undefined') {
            preferredContacts.allowSiteMessages = false; // Default for older data
        }
        resolve({...job, preferredContactMethods: preferredContacts});
      } else {
        resolve(undefined);
      }
    }, 150);
  });
};

export const incrementJobView = async (jobId: string): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let jobs = getStoredJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                jobs[jobIndex].views = (jobs[jobIndex].views || 0) + 1;
                saveStoredJobs(jobs);
            }
            resolve();
        }, 50);
    });
};

export const incrementJobContactAttempt = async (jobId: string): Promise<void> => {
     return new Promise((resolve) => {
        setTimeout(() => {
            let jobs = getStoredJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                jobs[jobIndex].contactAttempts = (jobs[jobIndex].contactAttempts || 0) + 1;
                saveStoredJobs(jobs);
            }
            resolve();
        }, 50);
    });
};

export const addJob = async (jobData: Omit<Job, 'id' | 'postedDate' | 'views' | 'contactAttempts'>): Promise<Job> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            const newJob: Job = {
                id: `job_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                ...jobData,
                postedDate: new Date().toISOString(),
                views: 0,
                contactAttempts: 0,
            };

            if (newJob.dateType === 'today' && !newJob.specificDate) {
                newJob.specificDate = getTodayGregorianISO();
            }
            // Ensure allowSiteMessages has a default if somehow missed
            if (typeof newJob.preferredContactMethods.allowSiteMessages === 'undefined') {
                newJob.preferredContactMethods.allowSiteMessages = false;
            }
            jobs.unshift(newJob); 
            saveStoredJobs(jobs);
            resolve(newJob);
        }, 250);
    });
};

export const updateJob = async (jobId: string, updatedData: Partial<Job>): Promise<Job | undefined> => {
     return new Promise((resolve, reject) => {
        setTimeout(() => {
            let jobs = getStoredJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                if (updatedData.dateType === 'today' && !updatedData.specificDate) {
                    updatedData.specificDate = getTodayGregorianISO();
                }
                if (updatedData.paymentMethod === PaymentMethod.CASH_ON_COMPLETION) {
                    updatedData.paymentDueDate = undefined;
                }
                // Ensure allowSiteMessages is preserved or defaulted
                if (updatedData.preferredContactMethods && typeof updatedData.preferredContactMethods.allowSiteMessages === 'undefined') {
                    updatedData.preferredContactMethods.allowSiteMessages = jobs[jobIndex].preferredContactMethods.allowSiteMessages;
                }


                jobs[jobIndex] = { ...jobs[jobIndex], ...updatedData };
                saveStoredJobs(jobs);
                resolve(jobs[jobIndex]);
            } else {
                reject(new Error("Job not found for update."));
            }
        }, 250);
    });
};


export const getJobsByUserId = async (userId: string): Promise<Job[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            resolve(jobs.filter(job => job.postedBy.id === userId));
        }, 200);
    });
};

export const deleteJob = async (jobId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let jobs = getStoredJobs();
            const initialLength = jobs.length;
            jobs = jobs.filter(job => job.id !== jobId);
            if (jobs.length < initialLength) {
                saveStoredJobs(jobs);
                resolve();
            } else {
                reject(new Error("Job not found for deletion."));
            }
        }, 200);
    });
};


export const getAllJobs = async (): Promise<Job[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredJobs());
        }, 100);
    });
};
