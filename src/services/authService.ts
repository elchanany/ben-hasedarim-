import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithPopup,
  User as FirebaseAuthUser,
  updateProfile
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  DocumentData
} from "firebase/firestore";
// הנתיב תוקן ל-@/lib/firebase - יפתור את שגיאת ה-Vite
import { auth, db, googleProvider } from "@/lib/firebase";
// הנתיב תוקן גם כאן ל-@/types
import { User } from "@/types";

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
  if (firebaseUser.email === 'eyceyceyc139@gmail.com') {
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
      showPhone: true,
      showWhatsapp: true,
      showEmail: false,
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
      return mapDocumentToUser(firebaseUser, userDoc.data());
    } else {
      const isSuperAdmin = firebaseUser.email === 'eyceyceyc139@gmail.com';
      const role = isSuperAdmin ? 'super_admin' : 'user';

      const newProfile = {
        email: firebaseUser.email || '',
        fullName: firebaseUser.displayName || 'משתמש חדש',
        createdAt: serverTimestamp(),
        role: role,
        datePreference: 'hebrew',
        isEmployer: false,
        contactPreference: {
          showPhone: true,
          showWhatsapp: true,
          showEmail: false,
          displayName: firebaseUser.displayName || 'משתמש חדש'
        },
        isBlocked: false,
        canChat: true
      };

      await setDoc(userDocRef, newProfile);

      return {
        id: firebaseUser.uid,
        phone: '',
        whatsapp: '',
        ...newProfile,
        createdAt: new Date().toISOString(),
        role: role,
        datePreference: 'hebrew'
      } as User;
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

  const isSuperAdmin = data.email === 'eyceyceyc139@gmail.com';
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
      showPhone: true,
      showWhatsapp: true,
      showEmail: true,
      displayName: data.fullName
    },
    isBlocked: false,
    canChat: true,
    whatsapp: data.whatsapp || ''
  };

  await setDoc(doc(db, "users", userCredential.user.uid), newProfile);

  return {
    id: userCredential.user.uid,
    ...newProfile,
    createdAt: new Date().toISOString(),
    role: 'user',
    datePreference: 'hebrew'
  } as User;
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

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
  const userRef = doc(db, "users", uid);

  const { id, email, ...dataToUpdate } = data;

  await updateDoc(userRef, dataToUpdate);

  const updatedUser = await getUserProfile(uid);
  if (!updatedUser) throw new Error("Failed to retrieve updated profile");
  return updatedUser;
};