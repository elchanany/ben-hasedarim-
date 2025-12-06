import { User, ContactPreference } from '../../types';

const STORAGE_KEY = 'bein_hasedarim_user';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  isEmployer?: boolean;
  whatsapp?: string;
  contactPreference?: ContactPreference;
}

export const getCurrentUser = async (): Promise<User | null> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const user = JSON.parse(stored);
    if (user.id === uid) return user;
  }
  return null;
};

export const login = async (email: string, password: string): Promise<User> => {
  // Mock login - accept any password for demo, or match specific mock users
  const mockUser: User = {
    id: 'mock_user_' + Math.random().toString(36).substr(2, 9),
    email,
    fullName: 'משתמש דמה',
    phone: '050-0000000',
    role: 'user',
    isEmployer: false,
    datePreference: 'hebrew',
    createdAt: new Date().toISOString(),
    contactPreference: {
      showPhone: true,
      showWhatsapp: true,
      showEmail: false,
      displayName: 'משתמש דמה'
    },
    isBlocked: false,
    canChat: true,
    whatsapp: ''
  };

  // Check if we have a stored user matching this email for persistence simulation
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const storedUser = JSON.parse(stored);
    if (storedUser.email === email) {
      return storedUser;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
  return mockUser;
};

export const register = async (data: RegisterData): Promise<User> => {
  const newUser: User = {
    id: 'mock_user_' + Date.now(),
    email: data.email,
    fullName: data.fullName,
    phone: data.phone,
    role: 'user',
    isEmployer: data.isEmployer || false,
    datePreference: 'hebrew',
    createdAt: new Date().toISOString(),
    contactPreference: data.contactPreference || {
      showPhone: true,
      showWhatsapp: true,
      showEmail: true,
      displayName: data.fullName
    },
    isBlocked: false,
    canChat: true,
    whatsapp: data.whatsapp || ''
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  return newUser;
};

export const logout = async (): Promise<void> => {
  localStorage.removeItem(STORAGE_KEY);
};

export const signInWithGoogle = async (): Promise<User> => {
  const googleUser: User = {
    id: 'google_mock_' + Date.now(),
    email: 'google@mock.com',
    fullName: 'Google User',
    phone: '',
    role: 'user',
    isEmployer: false,
    datePreference: 'hebrew',
    createdAt: new Date().toISOString(),
    contactPreference: {
      showPhone: true,
      showWhatsapp: false,
      showEmail: true,
      displayName: 'Google User'
    },
    isBlocked: false,
    canChat: true,
    whatsapp: ''
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));
  return googleUser;
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  console.log('Mock password reset sent to:', email);
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.id !== uid) throw new Error("User not found or unauthorized");

  const updatedUser = { ...currentUser, ...data };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
  return updatedUser;
};