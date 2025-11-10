import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as updateFirebaseProfile,
  deleteUser as deleteFirebaseAuthUser, // For deleting Firebase Auth user
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from '../firebaseConfig'; 
import { User, ContactPreference } from '../../types';
import { DEFAULT_USER_DISPLAY_NAME } from '../../constants';

const USERS_COLLECTION = 'users';

export interface RegisterData {
  fullName: string;
  phone: string;
  email: string;
  whatsapp?: string;
  password?: string; 
  contactPreference: ContactPreference;
}

const updateUserFirestoreProfile = async (firebaseUser: import('firebase/auth').User, additionalData: Partial<User> = {}) => {
  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const profileData: Partial<User> = {
    id: firebaseUser.uid,
    email: firebaseUser.email || additionalData.email || '', 
    fullName: additionalData.fullName || firebaseUser.displayName || 'משתמש חדש',
    phone: additionalData.phone || '',
    whatsapp: additionalData.whatsapp || '',
    contactPreference: additionalData.contactPreference || {
      displayName: additionalData.fullName || firebaseUser.displayName || DEFAULT_USER_DISPLAY_NAME,
      showEmail: true,
      showPhone: true,
      showWhatsapp: false,
    },
    role: additionalData.role || 'user',
    isBlocked: additionalData.isBlocked === undefined ? false : additionalData.isBlocked,
    canChat: additionalData.canChat === undefined ? true : additionalData.canChat,
    // Consider adding createdAt: serverTimestamp(), lastLoginAt: serverTimestamp()
  };

  Object.keys(profileData).forEach(key => profileData[key as keyof typeof profileData] === undefined && delete profileData[key as keyof typeof profileData]);

  try {
    await setDoc(userRef, profileData, { merge: true });
    console.log("User profile created/updated in Firestore.");
    return { ...profileData, email: firebaseUser.email! } as User;
  } catch (error) {
    console.error("Error updating Firestore profile: ", error);
    throw error;
  }
};


export const login = async (email: string, password_provided: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password_provided);
    const firebaseUser = userCredential.user;
    const userProfile = await getUserProfile(firebaseUser.uid);
    if (!userProfile) {
        console.warn(`No Firestore profile found for UID: ${firebaseUser.uid} after login. Creating one.`);
        return await updateUserFirestoreProfile(firebaseUser, { email: firebaseUser.email || '' });
    }
    if (userProfile.isBlocked) {
        await signOut(auth); // Log out blocked user
        throw new Error('חשבונך נחסם. אנא פנה לתמיכה.');
    }
    // Optionally update lastLoginAt here
    // await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), { lastLoginAt: serverTimestamp() });
    return userProfile;
  } catch (error: any) {
    console.error("Firebase login error: ", error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('שם משתמש או סיסמה שגויים.');
    }
    if (error.message === 'חשבונך נחסם. אנא פנה לתמיכה.') { // Propagate specific error
        throw error;
    }
    throw new Error('שגיאה בהתחברות. נסו שוב מאוחר יותר.');
  }
};

export const register = async (data: RegisterData): Promise<User> => {
  if (!data.password) {
    throw new Error("סיסמה היא שדה חובה להרשמה עם אימייל.");
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const firebaseUser = userCredential.user;

    await updateFirebaseProfile(firebaseUser, { displayName: data.fullName });

    const userProfileData: Partial<User> = {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email, 
      whatsapp: data.whatsapp || data.phone,
      contactPreference: data.contactPreference.displayName ? data.contactPreference : {...data.contactPreference, displayName: data.fullName || DEFAULT_USER_DISPLAY_NAME},
      role: 'user', 
      isBlocked: false,
      canChat: true,
      // createdAt: serverTimestamp() // Set upon creation
    };
    return await updateUserFirestoreProfile(firebaseUser, userProfileData);
  } catch (error: any) {
    console.error("Firebase registration error: ", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('משתמש עם כתובת אימייל זו כבר קיים.');
    }
    throw new Error('שגיאה בהרשמה. נסו שוב מאוחר יותר.');
  }
};

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    
    let userProfile = await getUserProfile(firebaseUser.uid);
    if (!userProfile) {
      console.log(`New Google Sign-In. Creating Firestore profile for UID: ${firebaseUser.uid}`);
      const initialProfileData: Partial<User> = {
          fullName: firebaseUser.displayName || 'משתמש גוגל',
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '', 
          contactPreference: {
              displayName: firebaseUser.displayName || DEFAULT_USER_DISPLAY_NAME,
              showEmail: true, showPhone: false, showWhatsapp: false,
          },
          role: 'user',
          isBlocked: false,
          canChat: true,
          // createdAt: serverTimestamp()
      };
      userProfile = await updateUserFirestoreProfile(firebaseUser, initialProfileData);
    }
    if (userProfile.isBlocked) {
        await signOut(auth);
        throw new Error('חשבונך נחסם. אנא פנה לתמיכה.');
    }
    // Optionally update lastLoginAt here
    // await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), { lastLoginAt: serverTimestamp() });
    return userProfile;
  } catch (error: any) {
    console.error("Google sign-in error: ", error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('חלון ההתחברות עם גוגל נסגר. נסה שוב.');
    }
     if (error.message === 'חשבונך נחסם. אנא פנה לתמיכה.') {
        throw error;
    }
    throw new Error('שגיאה בהתחברות עם Google. נסו שוב מאוחר יותר.');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase logout error: ", error);
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe(); 
      if (firebaseUser) {
        const userProfile = await getUserProfile(firebaseUser.uid);
        if (userProfile) {
            if (userProfile.isBlocked) {
                await signOut(auth); // Ensure blocked user is logged out from Firebase Auth session
                resolve(null);
            } else {
                resolve(userProfile);
            }
        } else {
            console.warn(`No Firestore profile for UID: ${firebaseUser.uid}. Attempting to create one.`);
             try {
                const fallbackProfile = await updateUserFirestoreProfile(firebaseUser, { email: firebaseUser.email || '', role: 'user', isBlocked: false, canChat: true });
                resolve(fallbackProfile);
            } catch (e) {
                console.error("Error creating fallback profile:", e);
                resolve(null); 
            }
        }
      } else {
        resolve(null);
      }
    }, (error) => {
        console.error("onAuthStateChanged error:", error);
        resolve(null);
    });
  });
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User;
  } else {
    console.log(`No Firestore profile document found for UID: ${uid}`);
    return null;
  }
};

export const updateUserProfile = async (userId: string, updatedData: Partial<User>): Promise<User> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  
  const dataToUpdate: Partial<User> = {};
  if (updatedData.fullName !== undefined) dataToUpdate.fullName = updatedData.fullName;
  if (updatedData.phone !== undefined) dataToUpdate.phone = updatedData.phone;
  if (updatedData.whatsapp !== undefined) dataToUpdate.whatsapp = updatedData.whatsapp;
  if (updatedData.contactPreference !== undefined) dataToUpdate.contactPreference = updatedData.contactPreference;
  // Role, isBlocked, canChat updates are handled by admin functions for security
  
  try {
    await updateDoc(userRef, dataToUpdate);
    const updatedProfile = await getUserProfile(userId);
    if (!updatedProfile) throw new Error("Failed to retrieve updated profile.");

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId && updatedData.fullName && currentUser.displayName !== updatedData.fullName) {
        await updateFirebaseProfile(currentUser, { displayName: updatedData.fullName });
    }
    
    return updatedProfile;
  } catch (error) {
    console.error("Error updating user profile in Firestore: ", error);
    throw error;
  }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Firebase send password reset error: ", error);
    if (error.code === 'auth/user-not-found') {
      // For security, we don't want to explicitly tell the user this.
      // The generic message in the UI ("If an account exists...") will cover this.
      // However, we might throw an error that leads to this generic message or a specific internal logging.
      throw new Error('אם קיים חשבון המשויך לכתובת אימייל זו, נשלח אליו קישור לאיפוס סיסמה.');
    } else if (error.code === 'auth/invalid-email') {
       throw new Error('כתובת האימייל אינה תקינה.');
    }
    throw new Error('אירעה שגיאה בשליחת בקשת איפוס הסיסמה. נסה שוב מאוחר יותר.');
  }
};


// --- Admin Functions ---
// IMPORTANT: These functions should ideally be backed by Firebase Functions for true security.
// Client-side checks are good for UI but not for actual enforcement.

const ensureAdmin = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No authenticated user.");
    const adminProfile = await getUserProfile(currentUser.uid);
    if (adminProfile?.role !== 'admin') throw new Error("Operation requires admin privileges.");
    return adminProfile;
};

export const getAllUsersAdmin = async (): Promise<User[]> => {
    await ensureAdmin(); // Basic client-side check
    const usersCol = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersCol);
    const users: User[] = [];
    querySnapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() } as User);
    });
    return users;
};

export const updateUserRoleAdmin = async (targetUserId: string, newRole: User['role']): Promise<void> => {
    await ensureAdmin();
    if (auth.currentUser?.uid === targetUserId && newRole !== 'admin') {
        throw new Error("Admin cannot remove their own admin role directly.");
    }
    const userRef = doc(db, USERS_COLLECTION, targetUserId);
    await updateDoc(userRef, { role: newRole });
};

export const blockUserAdmin = async (targetUserId: string, block: boolean): Promise<void> => {
    await ensureAdmin();
     if (auth.currentUser?.uid === targetUserId && block) {
        throw new Error("Admin cannot block themselves.");
    }
    const userRef = doc(db, USERS_COLLECTION, targetUserId);
    await updateDoc(userRef, { isBlocked: block });
};

export const toggleUserChatStatusAdmin = async (targetUserId: string, canChat: boolean): Promise<void> => {
    await ensureAdmin();
    const userRef = doc(db, USERS_COLLECTION, targetUserId);
    await updateDoc(userRef, { canChat: canChat });
};

export const deleteUserAccountAdmin = async (targetUserId: string): Promise<void> => {
    await ensureAdmin();
    if (auth.currentUser?.uid === targetUserId) {
        throw new Error("Admin cannot delete their own account via this panel.");
    }
    const userRef = doc(db, USERS_COLLECTION, targetUserId);
    await deleteDoc(userRef);
    console.warn(`User document ${targetUserId} deleted from Firestore. Deleting from Firebase Auth and associated data requires server-side logic (Firebase Function).`);
};