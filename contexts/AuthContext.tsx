import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { DateDisplayPreference } from '../utils/dateConverter';
import { User } from '../types';
import * as AuthService from '../services/authService';
import type { RegisterData } from '../services/authService';
import * as notificationService from '../services/notificationService';
import * as chatService from '../services/chatService';

export interface AuthContextType {
  user: User | null;
  login: (email: string, password_provided: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserContext: (updatedUser: User) => Promise<void>; 
  loadingAuth: boolean;
  totalUnreadCount: number; 
  refreshTotalUnreadCount: () => Promise<void>;
  datePreference: DateDisplayPreference;
  setDatePreference: (pref: DateDisplayPreference) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [datePreference, setDatePreferenceState] = useState<DateDisplayPreference>(() => {
    const saved = localStorage.getItem('datePreference');
    return (saved === 'gregorian' || saved === 'hebrew') ? (saved as DateDisplayPreference) : 'hebrew';
  });

  const setDatePreference = (pref: DateDisplayPreference) => {
    setDatePreferenceState(pref);
    localStorage.setItem('datePreference', pref);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'datePreference' && (e.newValue === 'gregorian' || e.newValue === 'hebrew')) {
        setDatePreferenceState(e.newValue as DateDisplayPreference);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const refreshTotalUnreadCount = useCallback(async (currentUserId?: string) => {
    const userIdToUse = currentUserId || user?.id;
    if (userIdToUse) {
      try {
        await notificationService.generateJobAlertMatches(userIdToUse);
        const systemAlertsUnread = await notificationService.getUnreadNotificationCount(userIdToUse);
        const chatMessagesUnread = await chatService.getTotalUnreadMessagesCount(userIdToUse); 
        setTotalUnreadCount(systemAlertsUnread + chatMessagesUnread); 
      } catch (error) {
        console.error("Error updating total unread count:", error);
        setTotalUnreadCount(0);
      }
    } else {
      setTotalUnreadCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    const loadUser = async () => {
      setLoadingAuth(true);
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
            notificationService.initializeMockNotifications(currentUser.id);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        setUser(null);
      } finally {
        setLoadingAuth(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.id && !loadingAuth) {
        refreshTotalUnreadCount(user.id);
        const intervalId = window.setInterval(() => refreshTotalUnreadCount(user.id), 30000); 
        return () => window.clearInterval(intervalId);
    }
  }, [user?.id, loadingAuth, refreshTotalUnreadCount]);


  const login = async (email: string, password_provided: string) => {
    const loggedInUser = await AuthService.login(email, password_provided);
    setUser(loggedInUser);
  };

  const register = async (data: RegisterData) => {
    const registeredUser = await AuthService.register(data);
    setUser(registeredUser);
  };

  const signInWithGoogle = async () => {
    const googleUser = await AuthService.signInWithGoogle();
    setUser(googleUser);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };
  
  const sendPasswordResetEmail = async (email: string) => {
    await AuthService.sendPasswordReset(email);
  };

  const updateUserContext = async (updatedUserData: User) => {
    setUser(updatedUserData);
    await refreshTotalUnreadCount(updatedUserData.id); 
  };

  return (
    <AuthContext.Provider value={{
        user,
        login,
        register,
        logout,
        signInWithGoogle,
        sendPasswordResetEmail,
        updateUserContext,
        loadingAuth,
        totalUnreadCount,
        refreshTotalUnreadCount,
        datePreference,
        setDatePreference
    }}>
      {children}
    </AuthContext.Provider>
  );
};
