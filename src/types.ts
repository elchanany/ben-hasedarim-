
export interface User {
  id: string; // Firebase Auth UID
  fullName: string;
  phone: string;
  email: string;
  whatsapp?: string;
  contactPreference?: ContactPreference; 
  role?: 'user' | 'moderator' | 'admin' | 'support'; // Add user role
  isBlocked?: boolean; // For blocking user access
  canChat?: boolean; // For disabling chat for a user
}

export interface ContactPreference {
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  displayName: string;
}

export enum JobDifficulty {
  EASY = 'קלה',
  MEDIUM = 'בינונית',
  HARD = 'קשה',
}

export enum PaymentType {
  HOURLY = 'לפי שעה',
  GLOBAL = 'גלובלי',
}
export type PaymentTypeFilter = PaymentType | 'both' | '';


export interface JobSuitability {
  men: boolean;
  women: boolean;
  general: boolean;
  minAge?: number;
}

export interface JobPosterInfo {
  id: string; 
  posterDisplayName: string; 
}

export type JobDateType = 'today' | 'comingWeek' | 'flexibleDate' | 'specificDate';

export enum PaymentMethod {
  CASH_ON_COMPLETION = 'בסוף העבודה במזומן',
  BANK_TRANSFER = 'בהעברה בנקאית',
  PAYSLIP = 'בתלוש',
}

export interface PreferredContactMethods {
  phone: boolean;
  whatsapp: boolean;
  email: boolean;
  allowSiteMessages: boolean; 
}

export interface Job {
  id: string; // Document ID in Firestore
  title: string;
  area: string; 
  
  dateType: JobDateType;
  specificDate?: string; 

  estimatedDurationHours?: number;
  estimatedDurationIsFlexible?: boolean;
  
  startTime?: string; 
  difficulty: JobDifficulty;
  
  paymentType: PaymentType;
  hourlyRate?: number;
  globalPayment?: number;

  paymentMethod?: PaymentMethod;
  paymentDueDate?: string; 

  numberOfPeopleNeeded?: number;
  
  specialRequirements?: string;
  suitability: JobSuitability;
  description: string;
  
  contactInfoSource: 'currentUser' | 'other' | 'anonymous';
  contactDisplayName: string; 
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  preferredContactMethods: PreferredContactMethods;

  postedBy: JobPosterInfo; 
  postedDate: string; // ISO string (consider Firebase Timestamp for Firestore)
  views: number;
  contactAttempts: number;
  isFlagged?: boolean; // For admin/moderator to mark as problematic
  flagReason?: string; // Reason for flagging
  // Consider adding status: 'active', 'expired', 'filled' for better querying
}

export interface City {
  id: string;
  name: string;
}

export type NotificationType = 'job_alert_match' | 'system_update'; 

export interface Notification {
  id: string; // Document ID in Firestore
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string; 
  isRead: boolean;
  createdAt: string; // ISO string (consider Firebase Timestamp)
}

export interface JobAlertDeliveryMethods {
  site: boolean; 
  tzintuk: boolean;
  whatsapp: boolean;
  email: boolean;
}

export interface JobAlertPreference {
  id: string; // Document ID in Firestore
  userId: string;
  name: string; 
  
  location?: string;
  difficulty?: JobDifficulty | '';
  
  dateType?: JobDateType | '';
  specificDateStart?: string | null;
  specificDateEnd?: string | null;

  minEstimatedDurationHours?: string;
  maxEstimatedDurationHours?: string;
  filterDurationFlexible?: 'yes' | 'no' | 'any';

  paymentKind?: 'any' | PaymentType.HOURLY | PaymentType.GLOBAL;
  minHourlyRate?: string; 
  maxHourlyRate?: string;
  minGlobalPayment?: string;
  maxGlobalPayment?: string;
  selectedPaymentMethods?: Set<PaymentMethod>; 

  minPeopleNeeded?: string;
  maxPeopleNeeded?: string;
  suitabilityFor?: 'any' | 'men' | 'women' | 'general';
  minAge?: string;
  maxAge?: string;

  frequency: 'daily' | 'instant' | 'weekly'; 
  notificationDays: number[]; 
  doNotDisturbHours?: { 
    start: string; 
    end: string;   
  };

  deliveryMethods: JobAlertDeliveryMethods;
  alertEmail?: string; 
  alertWhatsappPhone?: string; 
  alertTzintukPhone?: string; 


  isActive: boolean;
  lastChecked?: string; 
}


export interface JobSearchFilters {
  term: string;
  location: string;
  difficulty: JobDifficulty | '';
  sortBy: string; 

  dateType: JobDateType | '';
  specificDateStart: string | null;
  specificDateEnd: string | null;

  minEstimatedDurationHours: string;
  maxEstimatedDurationHours: string;
  filterDurationFlexible: 'yes' | 'no' | 'any';

  paymentKind: 'any' | PaymentType.HOURLY | PaymentType.GLOBAL;
  minHourlyRate: string;
  maxHourlyRate: string;
  minGlobalPayment: string;
  maxGlobalPayment: string;
  selectedPaymentMethods: Set<PaymentMethod>;

  minPeopleNeeded: string;
  maxPeopleNeeded: string;
  suitabilityFor: 'any' | 'men' | 'women' | 'general';
  minAge: string;
  maxAge: string;
}

export interface SelectFilterOption<T = string> {
  value: T;
  label: string;
}

export interface ChatParticipantInfo {
  id: string;
  displayName: string;
}

export interface ChatMessage {
  id: string; // Document ID in Firestore
  threadId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string (consider Firebase Timestamp)
  isRead: boolean;
  readAt?: string; // ISO string (consider Firebase Timestamp)
}

export interface ChatThread {
  id: string; // Document ID in Firestore
  jobId?: string; 
  jobTitle?: string; 
  participantIds: string[]; 
  participants: Record<string, ChatParticipantInfo>; 
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  } | null;
  unreadMessages: Record<string, number>; 
  createdAt: string; // ISO string (consider Firebase Timestamp)
  updatedAt: string; // ISO string (consider Firebase Timestamp)
}
