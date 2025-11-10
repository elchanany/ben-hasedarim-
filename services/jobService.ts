import { Job, JobDifficulty, PaymentType, JobPosterInfo, JobDateType, PaymentMethod, PreferredContactMethods, JobSuitability, JobSearchFilters } from '../types';
import { ISRAELI_CITIES, DEFAULT_USER_DISPLAY_NAME, SortById } from '../constants'; 
import { getTodayGregorianISO } from '../utils/dateConverter';

const JOBS_KEY = 'bein_hasedarim_jobs_shared';

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
        description: 'דרוש בחור חזק להובלת מספר רהיטים קטנים.',
        specialRequirements: 'יכולת הרמה, זריזות.',
        suitability: { men: true, women: false, general: false, minAge: 18 },
        numberOfPeopleNeeded: 1,
        paymentMethod: PaymentMethod.CASH_ON_COMPLETION,
        contactInfoSource: 'currentUser', 
        contactDisplayName: 'משה לוי',
        contactPhone: '050-1111111',
        preferredContactMethods: { phone: true, whatsapp: true, email: false, allowSiteMessages: true }, 
        postedBy: mockUserPoster1,
        postedDate: new Date().toISOString(),
        views: 0,
        contactAttempts: 0,
      },
      {
        id: '2',
        title: 'ניקיון דירה בתל אביב',
        area: 'תל אביב',
        dateType: 'specificDate',
        specificDate: '2024-01-15',
        startTime: '09:00',
        estimatedDurationHours: 4,
        estimatedDurationIsFlexible: true,
        difficulty: JobDifficulty.EASY,
        paymentType: PaymentType.HOURLY,
        hourlyRate: 50,
        description: 'ניקיון יסודי של דירה בת 3 חדרים.',
        specialRequirements: 'ניסיון בניקיון, אחריות.',
        suitability: { men: false, women: true, general: false, minAge: 20 },
        numberOfPeopleNeeded: 1,
        paymentMethod: PaymentMethod.CASH_ON_COMPLETION,
        contactInfoSource: 'currentUser',
        contactDisplayName: 'שרה כהן',
        contactPhone: '050-2222222',
        preferredContactMethods: { phone: true, whatsapp: false, email: true, allowSiteMessages: true },
        postedBy: mockUserPoster2,
        postedDate: new Date(Date.now() - 86400000).toISOString(), // יום אתמול
        views: 5,
        contactAttempts: 2,
      },
      {
        id: '3',
        title: 'עזרה בהפקת אירוע',
        area: 'חיפה',
        dateType: 'flexibleDate',
        specificDate: undefined,
        startTime: '18:00',
        estimatedDurationHours: 6,
        estimatedDurationIsFlexible: true,
        difficulty: JobDifficulty.HARD,
        paymentType: PaymentType.GLOBAL,
        globalPayment: 500,
        description: 'דרוש עזרה בהפקת אירוע גדול. עבודה פיזית ומגוונת.',
        specialRequirements: 'כושר גופני טוב, יכולת עבודה בצוות.',
        suitability: { men: true, women: true, general: true, minAge: 18 },
        numberOfPeopleNeeded: 3,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentDueDate: '2024-01-20',
        contactInfoSource: 'other',
        contactDisplayName: 'יוסי הפקות',
        contactPhone: '050-3333333',
        contactEmail: 'yossi@productions.co.il',
        preferredContactMethods: { phone: true, whatsapp: true, email: true, allowSiteMessages: false },
        postedBy: mockUserPoster3,
        postedDate: new Date(Date.now() - 172800000).toISOString(), // יומיים אתמול
        views: 12,
        contactAttempts: 4,
      }
    ];
    saveStoredJobs(jobs);
  }
};

// Initialize mock jobs when the module loads
initializeMockJobs();

export const isJobDateValidForSearch = (job: Job): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (job.dateType === 'flexibleDate') return true; 
    
    if (job.dateType === 'comingWeek') {
        const jobDateForComparison = job.specificDate ? new Date(job.specificDate) : new Date(job.postedDate);
        jobDateForComparison.setHours(0,0,0,0);
        
        const sevenDaysFromComparison = new Date(jobDateForComparison);
        sevenDaysFromComparison.setDate(jobDateForComparison.getDate() + 7);
        
        return sevenDaysFromComparison >= today;
    }
    if (job.dateType === 'today' || job.dateType === 'specificDate') {
        if (!job.specificDate) return false; 
        const specificJobDate = new Date(job.specificDate);
         specificJobDate.setHours(0,0,0,0); 
        return specificJobDate >= today;
    }
    return true; 
};

export const getHotJobs = async (jobLimit: number = 4): Promise<Job[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
            const jobs = getStoredJobs();
            const hotJobs = jobs
                .filter(isJobDateValidForSearch)
                .sort((a, b) => {
                    // Sort by views (descending), then by postedDate (descending)
                    if (b.views !== a.views) {
                        return b.views - a.views;
        }
        return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
                })
                .slice(0, jobLimit);
            resolve(hotJobs);
        }, 100);
  });
};

export interface SearchCriteria extends JobSearchFilters {}

export const searchJobs = async (criteria: Partial<SearchCriteria>): Promise<Job[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let jobs = getStoredJobs();

            // Apply filters
            if (criteria.location) {
                jobs = jobs.filter(job => job.area === criteria.location);
            }

            if (criteria.difficulty) {
                jobs = jobs.filter(job => job.difficulty === criteria.difficulty);
            }
            
            if (criteria.dateType === 'today') {
                const today = getTodayGregorianISO();
                jobs = jobs.filter(job => job.specificDate === today);
            } else if (criteria.dateType === 'specificDate' && criteria.specificDateStart) {
                const startDate = criteria.specificDateStart;
                const endDate = criteria.specificDateEnd || startDate;
                    jobs = jobs.filter(job => {
                        if (!job.specificDate) return false;
                    return job.specificDate >= startDate && job.specificDate <= endDate;
                    });
                } else if (criteria.dateType === 'comingWeek') {
                    const today = new Date();
                    const oneWeekFromToday = new Date(today);
                    oneWeekFromToday.setDate(today.getDate() + 7);
                    jobs = jobs.filter(job => {
                    if (!job.specificDate) return false;
                           const jobDate = new Date(job.specificDate);
                           return jobDate >= today && jobDate <= oneWeekFromToday;
                    });
                } else if (criteria.dateType === 'flexibleDate') {
                    jobs = jobs.filter(job => job.dateType === 'flexibleDate');
            }

            if (criteria.paymentKind && criteria.paymentKind !== 'any') {
                jobs = jobs.filter(job => job.paymentType === criteria.paymentKind);
                if (criteria.paymentKind === PaymentType.HOURLY && criteria.minHourlyRate) {
                    jobs = jobs.filter(job => job.hourlyRate && job.hourlyRate >= parseFloat(criteria.minHourlyRate));
                } else if (criteria.paymentKind === PaymentType.GLOBAL && criteria.minGlobalPayment) {
                    jobs = jobs.filter(job => job.globalPayment && job.globalPayment >= parseFloat(criteria.minGlobalPayment));
                }
            }

            if (criteria.suitabilityFor && criteria.suitabilityFor !== 'any') {
                jobs = jobs.filter(job => job.suitability[criteria.suitabilityFor as keyof JobSuitability] === true);
            }
            
            if (criteria.term) {
                const searchTerm = criteria.term.toLowerCase();
                jobs = jobs.filter(job =>
                    job.title.toLowerCase().includes(searchTerm) ||
                    job.description.toLowerCase().includes(searchTerm)
                );
            }
            
            if (criteria.selectedPaymentMethods && criteria.selectedPaymentMethods.size > 0) {
                jobs = jobs.filter(job => job.paymentMethod && criteria.selectedPaymentMethods!.has(job.paymentMethod));
            }
            
            // Apply date validity filter
            jobs = jobs.filter(isJobDateValidForSearch);
            
            // Sort results
            if (criteria.sortBy === 'hottest') {
                        jobs.sort((a, b) => {
                    if (b.views !== a.views) {
                        return b.views - a.views;
                    }
                            return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
                        });
            } else if (criteria.sortBy === 'highestPay') {
                        jobs.sort((a, b) => {
                    const aPay = a.paymentType === PaymentType.HOURLY ? (a.hourlyRate || 0) : (a.globalPayment || 0);
                    const bPay = b.paymentType === PaymentType.HOURLY ? (b.hourlyRate || 0) : (b.globalPayment || 0);
                    if (bPay !== aPay) {
                        return bPay - aPay;
                    }
                             return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
                        });
            } else {
                jobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
            }

            resolve(jobs);
        }, 200);
    });
};

export const getJobById = async (id: string): Promise<Job | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const jobs = getStoredJobs();
            const job = jobs.find(j => j.id === id);
      if (job) {
        const preferredContacts = job.preferredContactMethods || { phone: true, whatsapp: false, email: false, allowSiteMessages: false };
        if (typeof preferredContacts.allowSiteMessages === 'undefined') {
                    preferredContacts.allowSiteMessages = false;
        }
                resolve({ ...job, preferredContactMethods: preferredContacts });
      } else {
        resolve(undefined);
      }
        }, 100);
  });
};

export const incrementJobView = async (jobId: string): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                jobs[jobIndex].views += 1;
                saveStoredJobs(jobs);
            }
            resolve();
        }, 50);
    });
};

export const incrementJobContactAttempt = async (jobId: string): Promise<void> => {
     return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                jobs[jobIndex].contactAttempts += 1;
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
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                const updatedJob = { ...jobs[jobIndex], ...updatedData };
                
                if (updatedJob.dateType === 'today' && !updatedJob.specificDate) {
                    updatedJob.specificDate = getTodayGregorianISO();
                }
                
                if (updatedJob.paymentMethod === PaymentMethod.CASH_ON_COMPLETION) {
                    updatedJob.paymentDueDate = undefined;
                }
                
                if (updatedJob.preferredContactMethods && typeof updatedJob.preferredContactMethods.allowSiteMessages === 'undefined') {
                    updatedJob.preferredContactMethods.allowSiteMessages = jobs[jobIndex].preferredContactMethods.allowSiteMessages ?? false;
                }
                
                jobs[jobIndex] = updatedJob;
                saveStoredJobs(jobs);
                resolve(updatedJob);
            } else {
                resolve(undefined);
            }
        }, 200);
    });
};

export const getJobsByUserId = async (userId: string): Promise<Job[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            const userJobs = jobs.filter(job => job.postedBy.id === userId);
            resolve(userJobs);
        }, 100);
    });
};

export const deleteJob = async (jobId: string): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            const filteredJobs = jobs.filter(job => job.id !== jobId);
            saveStoredJobs(filteredJobs);
            resolve();
        }, 200);
    });
};

export const flagJobAdmin = async (jobId: string, reason: string, flag: boolean): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                jobs[jobIndex].isFlagged = flag;
                jobs[jobIndex].flagReason = flag ? reason : '';
                saveStoredJobs(jobs);
            }
            resolve();
        }, 200);
    });
};

export const getAllJobs = async (): Promise<Job[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const jobs = getStoredJobs();
            resolve(jobs);
        }, 100);
    });
};