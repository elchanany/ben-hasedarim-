import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { DateDisplayPreference } from '../../utils/dateConverter';
import { User } from '../../types';
import type { RegisterData } from '../../services/authService'; // Type is compatible
import * as notificationService from '../../services/notificationService'; // Mock only
import { USE_FIREBASE_BACKEND } from '../../config';

// Conditionally import services
import * as MockAuthService from '../../services/authService';
import * as FirebaseAuthService from '../services/authService';
import * as MockChatService from '../../services/chatService';
import * as FirebaseChatService from '../services/chatService';

// Firebase specific imports - only used if USE_FIREBASE_BACKEND is true
import { onAuthStateChanged } from "firebase/auth";
import { auth as firebaseAuth } from '../firebaseConfig';

const AuthService = USE_FIREBASE_BACKEND ? FirebaseAuthService : MockAuthService;
const chatService = USE_FIREBASE_BACKEND ? FirebaseChatService : MockChatService;

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
    setLoadingAuth(true);

    if (USE_FIREBASE_BACKEND) {
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userProfile = await FirebaseAuthService.getUserProfile(firebaseUser.uid);
                    if (userProfile) {
                        if (userProfile.isBlocked) {
                            await FirebaseAuthService.logout();
                            setUser(null);
                        } else {
                            setUser(userProfile);
                        }
                    } else {
                        // Create a profile if it doesn't exist (e.g., for Google Sign-In)
                        const newProfile = await FirebaseAuthService.updateUserProfile(firebaseUser.uid, {
                            email: firebaseUser.email || "", 
                            fullName: firebaseUser.displayName || "משתמש חדש"
                        });
                        setUser(newProfile);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    } else {
        const loadMockUser = async () => {
            try {
                const currentUser = await MockAuthService.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                console.error("Error fetching mock user:", error);
                setUser(null);
            } finally {
                setLoadingAuth(false);
            }
        };
        loadMockUser();
    }
  }, []); // Intentionally empty to run once on mount

  useEffect(() => {
    if (user?.id && !loadingAuth) {
        refreshTotalUnreadCount(user.id);
        const intervalId = window.setInterval(() => refreshTotalUnreadCount(user.id), 30000); 
        return () => window.clearInterval(intervalId);
    }
  }, [user?.id, loadingAuth, refreshTotalUnreadCount]);


  const login = async (email: string, password_provided: string) => {
    const loggedInUser = await AuthService.login(email, password_provided);
    if (!USE_FIREBASE_BACKEND) setUser(loggedInUser);
    // For Firebase, onAuthStateChanged handles setting the user
  };

  const register = async (data: RegisterData) => {
    const registeredUser = await AuthService.register(data);
    if (!USE_FIREBASE_BACKEND) setUser(registeredUser);
  };

  const signInWithGoogle = async () => {
    const googleUser = await AuthService.signInWithGoogle();
    if (!USE_FIREBASE_BACKEND) setUser(googleUser);
  };

  const logout = async () => {
    await AuthService.logout();
    if (!USE_FIREBASE_BACKEND) setUser(null);
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
