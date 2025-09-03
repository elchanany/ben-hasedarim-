
export interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  whatsapp?: string; // Optional
  // FIX: Made contactPreference optional to match src/types.ts and fix type errors.
  contactPreference?: ContactPreference;
  role?: 'user' | 'moderator' | 'admin' | 'support'; // Add user role
  isBlocked?: boolean; // For blocking user access
  canChat?: boolean; // For disabling chat for a user
  // password is not stored in user object on frontend for security
  // displayName could be part of contactPreference or a separate field if needed globally
}

export interface ContactPreference { // User's default contact preferences for their profile
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  displayName: string; // e.g., "משה כהן" - Name to display on listings
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
// Extended type for filtering UI
export type PaymentTypeFilter = PaymentType | 'both' | '';


export interface JobSuitability {
  men: boolean;
  women: boolean;
  general: boolean;
  minAge?: number;
}

// Information about the user who actually posted the job
export interface JobPosterInfo {
  id: string; // User ID of the actual poster
  posterDisplayName: string; // The displayName or fullName of the actual user who posted the job
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
  id: string;
  title: string;
  area: string; // City or region
  
  // Date fields
  dateType: JobDateType;
  specificDate?: string; // ISO string for 'specificDate'

  // Duration fields
  estimatedDurationHours?: number;
  estimatedDurationIsFlexible?: boolean;
  
  startTime?: string; // e.g., "14:00" - Kept for now, might be useful
  difficulty: JobDifficulty;
  
  // Payment Type (Hourly/Global)
  paymentType: PaymentType;
  hourlyRate?: number;
  globalPayment?: number;

  // How payment is made
  paymentMethod?: PaymentMethod;
  paymentDueDate?: string; // Optional: When the payment will be made (ISO date string)

  numberOfPeopleNeeded?: number;
  
  specialRequirements?: string;
  suitability: JobSuitability;
  description: string;
  
  // Contact details for THIS job posting
  contactInfoSource: 'currentUser' | 'other' | 'anonymous';
  contactDisplayName: string; // Actual name to display for this job
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  preferredContactMethods: PreferredContactMethods;

  postedBy: JobPosterInfo; // Information about the user who posted the job (actual user)
  postedDate: string; // ISO string
  views: number;
  contactAttempts: number;
  isFlagged?: boolean; // For admin/moderator to mark as problematic
  flagReason?: string; // Reason for flagging
}

export interface City {
  id: string;
  name: string;
}

// Notification types: job_alert_match for job alerts, system_update for general system messages.
export type NotificationType = 'job_alert_match' | 'system_update'; 

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // e.g., to job details
  isRead: boolean;
  createdAt: string; // ISO date string
}

export interface JobAlertDeliveryMethods {
  site: boolean; 
  tzintuk: boolean;
  whatsapp: boolean;
  email: boolean;
}

export interface JobAlertPreference {
  id: string;
  userId: string;
  name: string; // User-defined name for the alert
  
  // --- Filtering criteria (mirroring JobSearchFilters) ---
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

  // --- Scheduling ---
  frequency: 'daily' | 'instant' | 'weekly'; // How often to check for matches
  notificationDays: number[]; // 0 (Sun) - 5 (Fri). Saturday (6) implicitly excluded.
  doNotDisturbHours?: { 
    start: string; // HH:mm format e.g. "22:00"
    end: string;   // HH:mm format e.g. "07:00"
  };

  // --- Delivery Methods ---
  deliveryMethods: JobAlertDeliveryMethods;
  alertEmail?: string; // Specific email for this alert
  alertWhatsappPhone?: string; // Specific WhatsApp phone for this alert
  alertTzintukPhone?: string; // Specific Tzintuk phone for this alert


  isActive: boolean;
  lastChecked?: string; // ISO date string, for job_alert_match generation
}


export interface JobSearchFilters {
  term: string;
  location: string;
  difficulty: JobDifficulty | '';
  sortBy: string; // SortById type is in constants

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

// --- Chat System Types ---
export interface ChatParticipantInfo {
  id: string;
  displayName: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO date string
  isRead: boolean;
  readAt?: string; // ISO date string
}

export interface ChatThread {
  id: string;
  jobId?: string; // Link to a specific job if the chat is about one
  jobTitle?: string; // Denormalized job title for quick display
  participantIds: string[]; // Array of user IDs participating in the chat
  participants: Record<string, ChatParticipantInfo>; // Map of userId to participant info (name, avatar etc.)
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  } | null;
  unreadMessages: Record<string, number>; // Map of userId to their unread message count for this thread
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string, typically timestamp of lastMessage
}
