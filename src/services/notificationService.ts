import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { Notification, NotificationType, JobAlertPreference, JobDifficulty, Job, PaymentType, JobAlertDeliveryMethods, PaymentMethod, JobDateType } from '../types';
import * as RealJobService from './jobService';
import * as MockJobService from './mock/jobService';
import { USE_FIREBASE_BACKEND } from '../config';
import { getTodayGregorianISO } from '../utils/dateConverter';

// Select the correct service
const jobService = USE_FIREBASE_BACKEND ? RealJobService : MockJobService;
const { getAllJobs, isJobDateValidForSearch } = jobService;


const NOTIFICATIONS_KEY = 'bein_hasedarim_notifications';
const JOB_ALERT_PREFERENCES_KEY = 'bein_hasedarim_job_alert_preferences';

// Helper to get notifications from localStorage
const getStoredNotifications = (userId: string): Notification[] => {
  const allNotificationsJson = localStorage.getItem(NOTIFICATIONS_KEY);
  const allNotifications: Notification[] = allNotificationsJson ? JSON.parse(allNotificationsJson) : [];
  // Filter out any potential 'new_message' types if they are fully handled by chat now
  return allNotifications.filter(n => n.userId === userId && (n.type === 'job_alert_match' || n.type === 'system_update'));
};

// Helper to save notifications to localStorage
const saveStoredNotifications = (userId: string, userNotifications: Notification[]) => {
  const allNotificationsJson = localStorage.getItem(NOTIFICATIONS_KEY);
  let allNotificationsGlobal: Notification[] = allNotificationsJson ? JSON.parse(allNotificationsJson) : [];

  allNotificationsGlobal = allNotificationsGlobal.filter(n => n.userId !== userId || (n.type !== 'job_alert_match' && n.type !== 'system_update'));
  allNotificationsGlobal.push(...userNotifications.filter(n => n.type === 'job_alert_match' || n.type === 'system_update'));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(allNotificationsGlobal));
};

// Helper for Job Alert Preferences
const getStoredJobAlertPreferences = (userId: string): JobAlertPreference[] => {
  const allPrefsJson = localStorage.getItem(JOB_ALERT_PREFERENCES_KEY);
  let allPrefs: JobAlertPreference[] = allPrefsJson ? JSON.parse(allPrefsJson) : [];
  // Ensure selectedPaymentMethods is a Set and new alert contact fields exist for older data
  allPrefs = allPrefs.map(pref => ({
    ...pref,
    selectedPaymentMethods: new Set(pref.selectedPaymentMethods || []),
    alertEmail: pref.alertEmail || '',
    alertWhatsappPhone: pref.alertWhatsappPhone || '',
    alertTzintukPhone: pref.alertTzintukPhone || '',
  }));
  return allPrefs.filter(p => p.userId === userId);
};

const saveStoredJobAlertPreferences = (userId: string, userPrefs: JobAlertPreference[]) => {
  const allPrefsJson = localStorage.getItem(JOB_ALERT_PREFERENCES_KEY);
  let allPrefsGlobal: JobAlertPreference[] = allPrefsJson ? JSON.parse(allPrefsJson) : [];
  allPrefsGlobal = allPrefsGlobal.filter(p => p.userId !== userId);

  // Convert Set to Array for JSON serialization
  const serializableUserPrefs = userPrefs.map(pref => ({
    ...pref,
    selectedPaymentMethods: Array.from(pref.selectedPaymentMethods || []) as any // Temp cast for serialization
  }));
  allPrefsGlobal.push(...serializableUserPrefs);
  localStorage.setItem(JOB_ALERT_PREFERENCES_KEY, JSON.stringify(allPrefsGlobal));
};

// Helper to get ALL job alert preferences (for all users) - used when a new job is posted
const getAllStoredJobAlertPreferences = (): JobAlertPreference[] => {
  const allPrefsJson = localStorage.getItem(JOB_ALERT_PREFERENCES_KEY);
  let allPrefs: JobAlertPreference[] = allPrefsJson ? JSON.parse(allPrefsJson) : [];
  // Ensure selectedPaymentMethods is a Set
  allPrefs = allPrefs.map(pref => ({
    ...pref,
    selectedPaymentMethods: new Set(pref.selectedPaymentMethods || []),
  }));
  return allPrefs;
};

// Helper function to check if a job matches an alert preference
const doesJobMatchAlert = (job: Job, pref: JobAlertPreference): boolean => {
  // Location - empty means any
  if (pref.location && pref.location !== '') {
    if (job.area !== pref.location) return false;
  }

  // Difficulty - empty/undefined means any
  if (pref.difficulty) {
    if (job.difficulty !== pref.difficulty) return false;
  }

  // DateType - empty/undefined means any
  if (pref.dateType) {
    if (pref.dateType === 'specificDate' && pref.specificDateStart) {
      const startDate = new Date(pref.specificDateStart);
      startDate.setHours(0, 0, 0, 0);
      const endDate = pref.specificDateEnd ? new Date(pref.specificDateEnd) : startDate;
      endDate.setHours(23, 59, 59, 999);
      if (!job.specificDate) return false;
      const jobDate = new Date(job.specificDate);
      if (jobDate < startDate || jobDate > endDate) return false;
    } else if (pref.dateType === 'today') {
      const todayISO = getTodayGregorianISO();
      if (job.specificDate !== todayISO && job.dateType !== 'today') return false;
    } else if (pref.dateType === 'comingWeek') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const oneWeekFromToday = new Date(today); oneWeekFromToday.setDate(today.getDate() + 7); oneWeekFromToday.setHours(23, 59, 59, 999);
      if (job.dateType !== 'comingWeek' && job.dateType !== 'flexibleDate') {
        if (!job.specificDate) return false;
        const jobDate = new Date(job.specificDate);
        if (jobDate < today || jobDate > oneWeekFromToday) return false;
      }
    } else if (pref.dateType === 'flexibleDate') {
      if (job.dateType !== 'flexibleDate') return false;
    }
  }

  // Duration range
  const minDuration = pref.minEstimatedDurationHours ? parseFloat(pref.minEstimatedDurationHours) : undefined;
  const maxDuration = pref.maxEstimatedDurationHours ? parseFloat(pref.maxEstimatedDurationHours) : undefined;
  if (minDuration !== undefined && (job.estimatedDurationHours === undefined || job.estimatedDurationHours < minDuration)) return false;
  if (maxDuration !== undefined && (job.estimatedDurationHours === undefined || job.estimatedDurationHours > maxDuration)) return false;
  if (pref.filterDurationFlexible && pref.filterDurationFlexible !== 'any') {
    if (job.estimatedDurationIsFlexible !== (pref.filterDurationFlexible === 'yes')) return false;
  }

  // Payment Kind - 'any' or empty means any
  if (pref.paymentKind && pref.paymentKind !== 'any') {
    if (job.paymentType !== pref.paymentKind) return false;
  }

  // Payment rates (apply only if relevant payment kind)
  const minHR = pref.minHourlyRate ? parseFloat(pref.minHourlyRate) : undefined;
  const maxHR = pref.maxHourlyRate ? parseFloat(pref.maxHourlyRate) : undefined;
  const minGP = pref.minGlobalPayment ? parseFloat(pref.minGlobalPayment) : undefined;
  const maxGP = pref.maxGlobalPayment ? parseFloat(pref.maxGlobalPayment) : undefined;

  if (job.paymentType === PaymentType.HOURLY) {
    if (minHR !== undefined && (job.hourlyRate === undefined || job.hourlyRate < minHR)) return false;
    if (maxHR !== undefined && (job.hourlyRate === undefined || job.hourlyRate > maxHR)) return false;
  } else if (job.paymentType === PaymentType.GLOBAL) {
    if (minGP !== undefined && (job.globalPayment === undefined || job.globalPayment < minGP)) return false;
    if (maxGP !== undefined && (job.globalPayment === undefined || job.globalPayment > maxGP)) return false;
  }

  // Payment Methods - empty set means any
  if (pref.selectedPaymentMethods && pref.selectedPaymentMethods.size > 0) {
    if (!job.paymentMethod || !pref.selectedPaymentMethods.has(job.paymentMethod)) return false;
  }

  // People Needed
  const minPN = pref.minPeopleNeeded ? parseInt(pref.minPeopleNeeded, 10) : undefined;
  const maxPN = pref.maxPeopleNeeded ? parseInt(pref.maxPeopleNeeded, 10) : undefined;
  if (minPN !== undefined && (job.numberOfPeopleNeeded === undefined || job.numberOfPeopleNeeded < minPN)) return false;
  if (maxPN !== undefined && (job.numberOfPeopleNeeded === undefined || job.numberOfPeopleNeeded > maxPN)) return false;

  // Suitability - 'any' or empty means any
  if (pref.suitabilityFor && pref.suitabilityFor !== 'any') {
    if (pref.suitabilityFor === 'men' && !job.suitability.men) return false;
    if (pref.suitabilityFor === 'women' && !job.suitability.women) return false;
    if (pref.suitabilityFor === 'general' && !job.suitability.general) return false;
  }

  // Age range
  const minAgeNum = pref.minAge ? parseInt(pref.minAge, 10) : undefined;
  const maxAgeNum = pref.maxAge ? parseInt(pref.maxAge, 10) : undefined;
  // If alert wants minAge 18+, job with minAge 10 SHOULD match (job accepts younger people, which includes 18+)
  // If alert wants maxAge 40, job with minAge 50 should NOT match (job requires 50+, which is above 40)
  if (minAgeNum !== undefined && job.suitability.minAge !== undefined && job.suitability.minAge > minAgeNum) return false;
  if (maxAgeNum !== undefined && job.suitability.minAge !== undefined && job.suitability.minAge > maxAgeNum) return false;

  return true;
};

// NEW: Check all users' alerts when a new job is posted
export const checkAllAlertsForNewJob = (newJob: Job): void => {
  const allPrefs = getAllStoredJobAlertPreferences();

  for (const pref of allPrefs) {
    if (!pref.isActive) continue;
    // Don't notify the job poster about their own job
    if (pref.userId === newJob.postedBy.id) continue;

    if (doesJobMatchAlert(newJob, pref)) {
      // Get existing notifications for this user
      let userNotifications = getStoredNotifications(pref.userId);

      // Check for duplicate - use both jobId AND alertId to prevent duplicates
      const existingNotification = userNotifications.find(
        n => n.type === 'job_alert_match' &&
          n.link === `#/jobDetails?jobId=${newJob.id}` &&
          n.id.includes(newJob.id) && n.id.includes(pref.id)
      );

      if (!existingNotification) {
        userNotifications.push({
          id: `notif_${pref.id}_${newJob.id}_${Date.now()}`,
          userId: pref.userId,
          type: 'job_alert_match',
          title: `משרה חדשה בהתראת '${pref.name}'`,
          message: `"${newJob.title}" באזור ${newJob.area}.`,
          link: `#/jobDetails?jobId=${newJob.id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        saveStoredNotifications(pref.userId, userNotifications);
      }
    }
  }
};



// --- Notification Functions (System & Job Alerts) ---

const NOTIFICATIONS_COLLECTION = 'notifications';

export const sendSystemNotification = async (userId: string, title: string, message: string, link?: string): Promise<void> => {
  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      userId,
      type: 'system_update' as NotificationType,
      title,
      message,
      link,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending system notification:", error);
    throw error;
  }
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const localNotifications = getStoredNotifications(userId);
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const remoteNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));

    // Merge and sort
    const all = [...localNotifications, ...remoteNotifications].filter((n, i, self) =>
      indexOfString(self, n.id) === i // Dedupe by ID in case of overlap (though IDs should differ)
    );
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Error fetching remote notifications", e);
    return localNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

function indexOfString(arr: Notification[], id: string) {
  return arr.findIndex(n => n.id === id);
}

export const getUnreadNotificationCount = (userId: string): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notifications = getStoredNotifications(userId);
      resolve(notifications.filter(n => !n.isRead).length);
    }, 150);
  });
};

export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
  // 1. Try to update in Firestore first (if it's a system notification)
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { isRead: true });
  } catch (e) {
    // If it fails (e.g. ID doesn't exist in Firestore because it's local), ignore and try local
    // console.log("Not a remote notification or error updating:", e);
  }

  // 2. Update local storage
  return new Promise((resolve) => {
    setTimeout(() => {
      let notifications = getStoredNotifications(userId);
      notifications = notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
      saveStoredNotifications(userId, notifications);
      resolve();
    }, 50);
  });
};

export const markAllNotificationsAsRead = (userId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let notifications = getStoredNotifications(userId);
      notifications = notifications.map(n => ({ ...n, isRead: true }));
      saveStoredNotifications(userId, notifications);
      resolve();
    }, 100);
  });
};

// --- Job Alert Preference Functions ---

export const getJobAlertPreferences = (userId: string): Promise<JobAlertPreference[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getStoredJobAlertPreferences(userId));
    }, 100);
  });
};

const defaultNotificationDays: number[] = [0, 1, 2, 3, 4, 5]; // Sun-Fri
const defaultDoNotDisturbHours = { start: "22:00", end: "07:00" };


export const addJobAlertPreference = (userId: string, preferenceData: Omit<JobAlertPreference, 'id' | 'userId' | 'lastChecked'>): Promise<JobAlertPreference> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const preferences = getStoredJobAlertPreferences(userId);
      const newPreference: JobAlertPreference = {
        ...preferenceData,
        id: `alert_${Date.now()}`,
        userId: userId,
        lastChecked: new Date().toISOString(), // Start checking from NOW, ignore old jobs
        notificationDays: preferenceData.notificationDays || defaultNotificationDays,
        doNotDisturbHours: preferenceData.doNotDisturbHours || defaultDoNotDisturbHours,
        deliveryMethods: { site: true, email: false, whatsapp: false, tzintuk: false }, // Force site:true, others false
        selectedPaymentMethods: new Set(preferenceData.selectedPaymentMethods || []),
        alertEmail: preferenceData.alertEmail || '',
        alertWhatsappPhone: preferenceData.alertWhatsappPhone || '',
        alertTzintukPhone: preferenceData.alertTzintukPhone || '',
      };
      preferences.push(newPreference);
      saveStoredJobAlertPreferences(userId, preferences);
      resolve(newPreference);
    }, 100);
  });
};

export const updateJobAlertPreference = (userId: string, preferenceId: string, updates: Partial<Omit<JobAlertPreference, 'id' | 'userId' | 'lastChecked'>>): Promise<JobAlertPreference | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let preferences = getStoredJobAlertPreferences(userId);
      const index = preferences.findIndex(p => p.id === preferenceId);
      if (index !== -1) {
        preferences[index] = {
          ...preferences[index],
          ...updates,
          deliveryMethods: { site: true, email: false, whatsapp: false, tzintuk: false }, // Force site:true, others false
          selectedPaymentMethods: new Set(updates.selectedPaymentMethods || preferences[index].selectedPaymentMethods || []),
          alertEmail: updates.alertEmail !== undefined ? updates.alertEmail : preferences[index].alertEmail,
          alertWhatsappPhone: updates.alertWhatsappPhone !== undefined ? updates.alertWhatsappPhone : preferences[index].alertWhatsappPhone,
          alertTzintukPhone: updates.alertTzintukPhone !== undefined ? updates.alertTzintukPhone : preferences[index].alertTzintukPhone,
        };
        saveStoredJobAlertPreferences(userId, preferences);
        resolve(preferences[index]);
      } else {
        resolve(undefined);
      }
    }, 100);
  });
};

export const deleteJobAlertPreference = (userId: string, preferenceId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let preferences = getStoredJobAlertPreferences(userId);
      preferences = preferences.filter(p => p.id !== preferenceId);
      saveStoredJobAlertPreferences(userId, preferences);
      resolve();
    }, 100);
  });
};


export const generateJobAlertMatches = async (userId: string): Promise<void> => {
  const userPreferences = await getJobAlertPreferences(userId);
  if (userPreferences.length === 0) return;

  const jobs = await getAllJobs();
  const allJobs = jobs.filter(isJobDateValidForSearch);
  let userSystemNotifications = getStoredNotifications(userId);

  let newNotificationsGenerated = false;

  for (const pref of userPreferences) {
    if (!pref.isActive) continue;

    const lastCheckedTime = pref.lastChecked ? new Date(pref.lastChecked).getTime() : 0;

    const matchingJobs = allJobs.filter(job => {
      const jobPostedTime = new Date(job.postedDate).getTime();
      // Use a safety buffer (e.g., 15 minutes) to avoid missing jobs due to latency or varying clock synchronization
      // Duplicate notifications are prevented by the check 'existingNotification' below.
      if (jobPostedTime <= lastCheckedTime - 15 * 60 * 1000) return false;
      // if (job.postedBy.id === userId) return false; // Allowed for testing purposes as per user feedback

      let match = true;

      // Location
      if (pref.location) match = match && job.area === pref.location;
      // Difficulty
      if (pref.difficulty) match = match && job.difficulty === pref.difficulty;

      // DateType & Specific Dates
      if (pref.dateType) {
        if (pref.dateType === 'specificDate' && pref.specificDateStart) {
          const startDate = new Date(pref.specificDateStart);
          startDate.setHours(0, 0, 0, 0);
          const endDate = pref.specificDateEnd ? new Date(pref.specificDateEnd) : startDate;
          endDate.setHours(23, 59, 59, 999);
          match = match && (job.specificDate ? (new Date(job.specificDate) >= startDate && new Date(job.specificDate) <= endDate) : false);
        } else if (pref.dateType === 'today') {
          const todayISO = getTodayGregorianISO();
          match = match && job.specificDate === todayISO && (job.dateType === 'today' || job.dateType === 'specificDate');
        } else if (pref.dateType === 'comingWeek') {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const oneWeekFromToday = new Date(today); oneWeekFromToday.setDate(today.getDate() + 7); oneWeekFromToday.setHours(23, 59, 59, 999);
          match = match && (job.dateType === 'comingWeek' || (job.specificDate ? (new Date(job.specificDate) >= today && new Date(job.specificDate) <= oneWeekFromToday) : false));
        } else if (pref.dateType === 'flexibleDate') {
          match = match && job.dateType === 'flexibleDate';
        }
      }

      // Duration
      const minDuration = pref.minEstimatedDurationHours ? parseFloat(pref.minEstimatedDurationHours) : undefined;
      const maxDuration = pref.maxEstimatedDurationHours ? parseFloat(pref.maxEstimatedDurationHours) : undefined;
      if (minDuration !== undefined) match = match && (job.estimatedDurationHours !== undefined && job.estimatedDurationHours >= minDuration);
      if (maxDuration !== undefined) match = match && (job.estimatedDurationHours !== undefined && job.estimatedDurationHours <= maxDuration);
      if (pref.filterDurationFlexible && pref.filterDurationFlexible !== 'any') {
        match = match && job.estimatedDurationIsFlexible === (pref.filterDurationFlexible === 'yes');
      }

      // Payment Kind & Rates
      const minHR = pref.minHourlyRate ? parseFloat(pref.minHourlyRate) : undefined;
      const maxHR = pref.maxHourlyRate ? parseFloat(pref.maxHourlyRate) : undefined;
      const minGP = pref.minGlobalPayment ? parseFloat(pref.minGlobalPayment) : undefined;
      const maxGP = pref.maxGlobalPayment ? parseFloat(pref.maxGlobalPayment) : undefined;

      if (pref.paymentKind && pref.paymentKind !== 'any') {
        match = match && job.paymentType === pref.paymentKind;
        if (pref.paymentKind === PaymentType.HOURLY) {
          if (minHR !== undefined) match = match && (job.hourlyRate !== undefined && job.hourlyRate >= minHR);
          if (maxHR !== undefined) match = match && (job.hourlyRate !== undefined && job.hourlyRate <= maxHR);
        } else if (pref.paymentKind === PaymentType.GLOBAL) {
          if (minGP !== undefined) match = match && (job.globalPayment !== undefined && job.globalPayment >= minGP);
          if (maxGP !== undefined) match = match && (job.globalPayment !== undefined && job.globalPayment <= maxGP);
        }
      } else { // 'any' payment kind, still filter by rates if set
        if (job.paymentType === PaymentType.HOURLY) {
          if (minHR !== undefined) match = match && (job.hourlyRate !== undefined && job.hourlyRate >= minHR);
          if (maxHR !== undefined) match = match && (job.hourlyRate !== undefined && job.hourlyRate <= maxHR);
        } else if (job.paymentType === PaymentType.GLOBAL) {
          if (minGP !== undefined) match = match && (job.globalPayment !== undefined && job.globalPayment >= minGP);
          if (maxGP !== undefined) match = match && (job.globalPayment !== undefined && job.globalPayment <= maxGP);
        }
      }

      // Payment Methods
      if (pref.selectedPaymentMethods && pref.selectedPaymentMethods.size > 0) {
        match = match && (job.paymentMethod ? pref.selectedPaymentMethods.has(job.paymentMethod) : false);
      }

      // People Needed
      const minPN = pref.minPeopleNeeded ? parseInt(pref.minPeopleNeeded, 10) : undefined;
      const maxPN = pref.maxPeopleNeeded ? parseInt(pref.maxPeopleNeeded, 10) : undefined;
      if (minPN !== undefined) match = match && (job.numberOfPeopleNeeded !== undefined && job.numberOfPeopleNeeded >= minPN);
      if (maxPN !== undefined) match = match && (job.numberOfPeopleNeeded !== undefined && job.numberOfPeopleNeeded <= maxPN);

      // Suitability & Age
      if (pref.suitabilityFor && pref.suitabilityFor !== 'any') {
        if (pref.suitabilityFor === 'men') match = match && job.suitability.men;
        else if (pref.suitabilityFor === 'women') match = match && job.suitability.women;
        else if (pref.suitabilityFor === 'general') match = match && job.suitability.general;
      }
      const minAgeNum = pref.minAge ? parseInt(pref.minAge, 10) : undefined;
      const maxAgeNum = pref.maxAge ? parseInt(pref.maxAge, 10) : undefined;
      // If alert wants minAge 18+, job with minAge 10 SHOULD match (job accepts younger, which includes 18+)
      // If alert wants maxAge 40, job with minAge 50 should NOT match (job requires 50+, above 40)
      if (minAgeNum !== undefined) match = match && (job.suitability.minAge === undefined || job.suitability.minAge <= minAgeNum);
      if (maxAgeNum !== undefined) match = match && (job.suitability.minAge === undefined || job.suitability.minAge <= maxAgeNum);

      return match;
    });

    if (matchingJobs.length > 0) {
      // Delivery method is forced to site:true, others false. So always notify on site.
      // Scheduling (notificationDays, doNotDisturbHours) is not yet implemented for actual delivery.
      // The specific contact details (alertEmail, alertWhatsappPhone, alertTzintukPhone) are stored
      // but not used for sending yet.

      for (const job of matchingJobs) {
        // Check for duplicate using both jobId and alertId
        const existingNotification = userSystemNotifications.find(
          n => n.type === 'job_alert_match' &&
            n.link === `#/jobDetails?jobId=${job.id}` &&
            n.id.includes(job.id) && n.id.includes(pref.id)
        );
        if (!existingNotification) {
          userSystemNotifications.push({
            id: `notif_${pref.id}_${job.id}_${Date.now()}`,
            userId: userId,
            type: 'job_alert_match',
            title: `משרה חדשה בהתראת '${pref.name}'`,
            message: `"${job.title}" באזור ${job.area}.`,
            link: `#/jobDetails?jobId=${job.id}`,
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedAlertId: pref.id,
            relatedAlertName: pref.name,
          });
          newNotificationsGenerated = true;
        }
      }
    }
    pref.lastChecked = new Date().toISOString();
  }

  saveStoredJobAlertPreferences(userId, userPreferences);
  if (newNotificationsGenerated) {
    saveStoredNotifications(userId, userSystemNotifications);
  }
};


export const initializeMockNotifications = (userId: string) => {
  let notifications = getStoredNotifications(userId);
  if (notifications.filter(n => n.type === 'system_update').length === 0) {
    notifications.push({
      id: `sys_notif_welcome_${userId}_${Date.now()}`,
      userId: userId,
      type: 'system_update',
      title: 'ברוכים הבאים לבין הסדורים!',
      message: 'אנו שמחים לראותך כאן. תוכל להתחיל לחפש עבודות או להגדיר התראות אישיות.',
      isRead: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    });
    saveStoredNotifications(userId, notifications);
  }
};
