import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { DateDisplayPreference } from '../utils/dateConverter';
import { User } from '../types';
import type { RegisterData } from '../services/authService'; // Type is compatible
import * as notificationService from '@/services/notificationService';
import { USE_FIREBASE_BACKEND } from '../config';

// Conditionally import services
import * as MockAuthService from '@/services/mock/authService';
import * as FirebaseAuthService from '@/services/authService';
import * as MockChatService from '@/services/mock/chatService';
import * as FirebaseChatService from '@/services/chatService';

// Firebase specific imports - only used if USE_FIREBASE_BACKEND is true
import { onAuthStateChanged } from "firebase/auth";
import { auth as firebaseAuth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from "firebase/firestore";

const AuthService = USE_FIREBASE_BACKEND ? FirebaseAuthService : MockAuthService;
const chatService = USE_FIREBASE_BACKEND ? FirebaseChatService : MockChatService;

export interface AuthContextType {
  user: User | null;
  login: (email: string, password_provided: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  checkEmailExists: (email: string) => Promise<boolean>;
  updateUserContext: (updatedUser: User) => Promise<void>;
  loadingAuth: boolean;
  totalUnreadCount: number;
  refreshTotalUnreadCount: () => Promise<void>;
  datePreference: DateDisplayPreference;
  setDatePreference: (pref: DateDisplayPreference) => void;
  adminUnreadContacts: number;
  adminPendingReports: number;
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
    return (saved === 'gregorian' || saved === 'hebrew' || saved === 'both') ? (saved as DateDisplayPreference) : 'hebrew';
  });

  const setDatePreference = (pref: DateDisplayPreference) => {
    setDatePreferenceState(pref);
    localStorage.setItem('datePreference', pref);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'datePreference' && (e.newValue === 'gregorian' || e.newValue === 'hebrew' || e.newValue === 'both')) {
        setDatePreferenceState(e.newValue as DateDisplayPreference);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Setup real-time listeners for unread counts
  useEffect(() => {
    if (!user?.id || !USE_FIREBASE_BACKEND) return;

    // 1. Listen for unread chat messages
    const threadsCol = collection(db, 'chatThreads');
    const qChats = query(threadsCol, where("participantIds", "array-contains", user.id));

    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      let chatUnread = 0;
      snapshot.forEach(doc => {
        const thread = doc.data() as any;
        if (thread.unreadMessages && thread.unreadMessages[user.id]) {
          chatUnread += thread.unreadMessages[user.id];
        }
      });
      // We need to combine this with system notifications count. 
      // Since we can't easily sync two independent listeners into one state without infinite loops or race conditions,
      // we'll store them in refs or separate state if needed. But for simplicity, let's fetch system notifications here too
      // OR better: Have 2 separate states for counts and sum them. A ref is good for the "other" count.
      // Actually, let's set a state for chatUnread.
      setChatUnreadCount(chatUnread);
    }, (error) => {
      console.error("Error in chat listener:", error);
    });

    // 2. Listen for unread system notifications (assuming specific collection structure)
    // Note: If notifications are in a subcollection 'notifications' under user, we listen there.
    // 2. Listen for unread system notifications
    // We query the top-level 'notifications' collection where userId matches
    const notificationsCol = collection(db, 'notifications');
    const qNotifs = query(notificationsCol, where("userId", "==", user.id), where("isRead", "==", false));

    const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
      setSystemUnreadCount(snapshot.size);
    }, (error) => {
      if (error.code !== 'permission-denied') { // Ignore initial permission errors if any
        console.error("Error in notification listener:", error);
      }
    });

    return () => {
      unsubscribeChats();
      unsubscribeNotifs();
    };
  }, [user?.id]);

  // Admin Notification Listeners
  const [adminUnreadContacts, setAdminUnreadContacts] = useState(0);
  const [adminPendingReports, setAdminPendingReports] = useState(0);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.email?.toLowerCase() !== 'eyceyceyc139@gmail.com')) {
      setAdminUnreadContacts(0);
      setAdminPendingReports(0);
      return;
    }

    if (!USE_FIREBASE_BACKEND) return;

    // Listen for unread contact messages
    const contactsCol = collection(db, 'contacts');
    const qContacts = query(contactsCol, where("status", "==", "new"));
    const unsubContacts = onSnapshot(qContacts, (snap) => {
      setAdminUnreadContacts(snap.size);
    }, err => console.error("Error listening to contacts:", err));

    // Listen for pending reports
    const reportsCol = collection(db, 'reports');
    const qReports = query(reportsCol, where("status", "==", "pending"));
    const unsubReports = onSnapshot(qReports, (snap) => {
      setAdminPendingReports(snap.size);
    }, err => console.error("Error listening to reports:", err));

    return () => {
      unsubContacts();
      unsubReports();
    };
  }, [user]);

  // Combine counts
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [systemUnreadCount, setSystemUnreadCount] = useState(0);

  useEffect(() => {
    setTotalUnreadCount(chatUnreadCount + systemUnreadCount);
  }, [chatUnreadCount, systemUnreadCount]);

  const refreshTotalUnreadCount = useCallback(async (currentUserId?: string) => {
    // This function is kept for manual refresh if needed, but listeners should handle it.
    // We can leave it empty or force a re-fetch if listeners fail, but listeners are robust.
    // For now, let's make it a no-op or just log, as listeners drive the state.
    // Actually, other components call this, so we should keep it compatible.
    // But since we use listeners, manual refresh isn't needed for the counts.
    // However, generating new matches still needs to happen.
    const userIdToUse = currentUserId || user?.id;
    if (userIdToUse) {
      await notificationService.generateJobAlertMatches(userIdToUse);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoadingAuth(true);

    if (USE_FIREBASE_BACKEND) {
      let unsubscribeUserDoc: (() => void) | null = null;

      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        // Clean up previous user doc listener if any
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }

        if (firebaseUser) {
          try {
            // Set up real-time listener on user document for immediate block detection
            const { doc: firestoreDoc, onSnapshot: onDocSnapshot } = await import('firebase/firestore');
            const userDocRef = firestoreDoc(db, 'users', firebaseUser.uid);

            unsubscribeUserDoc = onDocSnapshot(userDocRef, (docSnapshot) => {
              if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const userProfile: User = {
                  id: docSnapshot.id,
                  ...userData
                } as User;
                setUser(userProfile);
              } else {
                // Document doesn't exist yet - try to create from Firebase user
                FirebaseAuthService.fetchUserProfileFromFirestore(firebaseUser).then(newProfile => {
                  setUser(newProfile);
                });
              }
              setLoadingAuth(false);
            }, (error) => {
              console.error("Error listening to user document:", error);
              setLoadingAuth(false);
            });
          } catch (error) {
            console.error("Error setting up user listener:", error);
            setUser(null);
            setLoadingAuth(false);
          }
        } else {
          setUser(null);
          setLoadingAuth(false);
        }
      });

      return () => {
        unsubscribeAuth();
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
        }
      };
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
      const intervalId = window.setInterval(() => refreshTotalUnreadCount(user.id), 2000);
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

  const confirmPasswordReset = async (code: string, newPassword: string) => {
    // Only available in Firebase backend
    if (USE_FIREBASE_BACKEND && (AuthService as any).confirmPasswordReset) {
      await (AuthService as any).confirmPasswordReset(code, newPassword);
    } else if (!USE_FIREBASE_BACKEND) {
      // Mock implementation if needed, for now just a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const checkEmailExists = async (email: string) => {
    if (USE_FIREBASE_BACKEND && (AuthService as any).checkEmailExists) {
      return await (AuthService as any).checkEmailExists(email);
    }
    return false;
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
      confirmPasswordReset,
      checkEmailExists,
      updateUserContext,
      loadingAuth,
      totalUnreadCount,
      refreshTotalUnreadCount,
      datePreference,
      setDatePreference,
      adminUnreadContacts,
      adminPendingReports
    }}>
      {children}
    </AuthContext.Provider>
  );
};
