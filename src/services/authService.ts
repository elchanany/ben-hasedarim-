import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithPopup,
  User as FirebaseAuthUser,
  updateProfile,
  deleteUser,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentData
} from "firebase/firestore";
// הנתיב תוקן ל-@/lib/firebase - יפתור את שגיאת ה-Vite
import { auth, db, googleProvider } from "@/lib/firebase";
// הנתיב תוקן גם כאן ל-@/types
import { User } from "@/types";
import { syncPublicProfile } from "./publicProfileService";

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  isEmployer?: boolean;
  whatsapp?: string;
  contactPreference?: any; // Using any for simplicity or import ContactPreference
}

// פונקציית עזר פנימית למיפוי נתונים מפיירבייס לאובייקט User שלנו
const mapDocumentToUser = (firebaseUser: FirebaseAuthUser, data: DocumentData): User => {

  // המרת תאריך בטוחה
  let createdAtStr = new Date().toISOString();
  if (data.createdAt) {
    if (typeof data.createdAt.toDate === 'function') {
      createdAtStr = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
      createdAtStr = data.createdAt;
    }
  }

  // וידוא תפקיד תקין
  let role: User['role'] = (['user', 'moderator', 'admin', 'super_admin', 'support'].includes(data.role))
    ? data.role as User['role']
    : 'user';

  // Force super_admin for specific email even if DB differs (extra safety)
  if (firebaseUser.email?.toLowerCase() === 'eyceyceyc139@gmail.com') {
    role = 'super_admin';
  }

  // וידוא העדפת תאריך תקינה
  const datePreference: User['datePreference'] = (data.datePreference === 'gregorian')
    ? 'gregorian'
    : 'hebrew';

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    fullName: data.fullName || firebaseUser.displayName || 'משתמש',
    phone: data.phone || '',
    role: role,
    datePreference: datePreference,
    isEmployer: !!data.isEmployer,
    createdAt: createdAtStr,
    whatsapp: data.whatsapp || '',
    contactPreference: data.contactPreference || {
      showPhone: false,
      showWhatsapp: false,
      showEmail: true,
      showChat: false,
      displayName: data.fullName || firebaseUser.displayName || 'משתמש'
    },
    isBlocked: !!data.isBlocked,
    canChat: data.canChat ?? true
  };
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      return mapDocumentToUser(firebaseUser, userDoc.data());
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const fetchUserProfileFromFirestore = async (firebaseUser: FirebaseAuthUser): Promise<User | null> => {
  try {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const user = mapDocumentToUser(firebaseUser, userDoc.data());
      // Sync public profile in background
      syncPublicProfile(user).catch(err => console.error("Background sync failed:", err));
      return user;
    } else {
      const isSuperAdmin = firebaseUser.email?.toLowerCase() === 'eyceyceyc139@gmail.com';
      const role = isSuperAdmin ? 'super_admin' : 'user';

      const newProfile = {
        email: firebaseUser.email || '',
        fullName: firebaseUser.displayName || 'משתמש חדש',
        createdAt: serverTimestamp(),
        role: role,
        datePreference: 'hebrew',
        isEmployer: false,
        contactPreference: {
          showPhone: false,
          showWhatsapp: false,
          showEmail: true,
          showChat: false,
          displayName: firebaseUser.displayName || 'משתמש חדש'
        },
        isBlocked: false,
        canChat: true
      };

      await setDoc(userDocRef, newProfile);

      const finalNewUser = {
        id: firebaseUser.uid,
        phone: '',
        whatsapp: '',
        ...newProfile,
        createdAt: new Date().toISOString(),
        role: role,
        datePreference: 'hebrew'
      } as User;

      await syncPublicProfile(finalNewUser);
      return finalNewUser;
    }
  } catch (error) {
    console.error("Error fetching/creating user profile:", error);
    return null;
  }
};

export const login = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = await fetchUserProfileFromFirestore(userCredential.user);
  if (!user) throw new Error("Failed to fetch user profile after login");
  return user;
};

export const register = async (data: RegisterData): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

  if (userCredential.user) {
    await updateProfile(userCredential.user, {
      displayName: data.fullName
    });
  }

  const isSuperAdmin = data.email?.toLowerCase() === 'eyceyceyc139@gmail.com';
  const role = isSuperAdmin ? 'super_admin' : 'user';

  const newProfile = {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    role: role,
    isEmployer: data.isEmployer || false,
    datePreference: 'hebrew',
    createdAt: serverTimestamp(),
    contactPreference: data.contactPreference || {
      showPhone: false,
      showWhatsapp: false,
      showEmail: true,
      showChat: false,
      displayName: data.fullName
    },
    profileContactPreference: {
      showPhone: false,
      showWhatsapp: false,
      showEmail: true,
      showChat: false,
      displayName: data.fullName
    },
    isBlocked: false,
    canChat: true,
    whatsapp: data.whatsapp || ''
  };

  await setDoc(doc(db, "users", userCredential.user.uid), newProfile);

  const newUser = {
    id: userCredential.user.uid,
    ...newProfile,
    createdAt: new Date().toISOString(),
    role: 'user',
    datePreference: 'hebrew'
  } as User;

  await syncPublicProfile(newUser);
  return newUser;
};

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = await fetchUserProfileFromFirestore(result.user);
  if (!user) throw new Error("Failed to fetch user profile via Google");
  return user;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await firebaseSendPasswordResetEmail(auth, email);
};

export const confirmPasswordReset = async (code: string, newPassword: string): Promise<void> => {
  await firebaseConfirmPasswordReset(auth, code, newPassword);
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
  const userRef = doc(db, "users", uid);

  const { id, email, ...dataToUpdate } = data;

  //Get current data first to ensure we surrender nothing
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) throw new Error("User not found");
  const currentUser = snapshot.data() as User;

  await updateDoc(userRef, dataToUpdate);

  // Construct the updated object locally to avoid latency issues
  const updatedUser = {
    ...currentUser,
    ...dataToUpdate,
    id: uid, // Ensure ID hasn't changed
    // Ensure complex objects are merged correctly if needed, but for top-level partials spread matches updateDoc behavior
  } as User;

  await syncPublicProfile(updatedUser);
  return updatedUser;
};

export const deleteAccount = async (userId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user found");
  if (user.uid !== userId) throw new Error("Unauthorized to delete this account");

  // 1. Delete Public Profile
  try {
    await deleteDoc(doc(db, "public_profiles", userId));
  } catch (error) {
    console.error("Error deleting public profile:", error);
    // Continue even if fail, as we want to delete the main user record
  }

  // 2. Delete User Profile from Firestore
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    console.error("Error deleting user profile:", error);
    throw new Error("Failed to delete user profile data");
  }

  // 3. Delete Authentication User
  try {
    await deleteUser(user);
  } catch (error: any) {
    console.error("Error deleting auth user:", error);
    if (error.code === 'auth/requires-recent-login') {
      throw new Error("security-requires-recent-login");
    }
    throw new Error("Failed to delete authentication account");
  }
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    console.error("Error checking email existence:", error);
    return false;
  }
};