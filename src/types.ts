// src/types.ts

export interface User {
  id: string; // Firebase Auth UID
  fullName: string;
  phone: string;
  email: string;

  // שדות חדשים שחסרים לך וגורמים לאדום:
  role?: 'user' | 'moderator' | 'admin' | 'super_admin' | 'support';
  datePreference?: 'hebrew' | 'gregorian';
  isEmployer?: boolean;
  createdAt?: string;

  // שדות קיימים
  whatsapp?: string;
  contactPreference?: ContactPreference; // For ads defaults
  profileContactPreference?: ContactPreference; // For public profile visibility
  isBlocked?: boolean;
  isContactBlocked?: boolean;
  canChat?: boolean;
  blockedUserIds?: string[];
  blockReason?: string; // Admin reason (for logs/internal)
  blockReasonUser?: string; // User-visible reason (optional)
}

export interface PublicProfile {
  id: string; // Same as User ID
  displayName: string; // Usually full name, but allows for future nickname support if needed
  role: User['role'];
  joinDate: string; // ISO Date
  jobsPublishedCount: number;
  lastActive: string; // ISO Date

  // Contact info - ONLY returned if user allowed it
  phone?: string;
  whatsapp?: string;
  email?: string;
  canChat?: boolean;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedEntityId: string;
  entityType: 'user' | 'job' | 'chat';
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface ContactPreference {
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  showChat: boolean;
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
  id: string;
  serialNumber?: number; // Auto-incrementing friendly ID
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
  postedDate: string;
  views: number;
  contactAttempts: number;
  isFlagged?: boolean;
  flagReason?: string;
}

export interface City {
  id: string;
  name: string;
}

export type NotificationType = 'job_alert_match' | 'system_update';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
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
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  readAt?: string;
}

export interface ChatThread {
  id: string;
  jobId?: string;
  jobTitle?: string;
  isAnonymousThread?: boolean;
  anonymousParticipantId?: string;
  participantIds: string[];
  participants: Record<string, ChatParticipantInfo>;
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  } | null;
  unreadMessages: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: any;
  userId?: string; // Optional: Link to user if logged in
  status: 'new' | 'read' | 'replied';
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: 'delete_job' | 'ban_user' | 'unban_user' | 'delete_message' | 'update_role' | 'reply_contact' | 'resolve_report' | 'dismiss_report';
  targetId: string;
  targetType: 'job' | 'user' | 'message' | 'chat';
  reason: string;
  timestamp: string; // ISO
  details?: string;
}