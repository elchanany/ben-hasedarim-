
import { User, ContactPreference } from '../types';
import { DEFAULT_USER_DISPLAY_NAME } from '../constants';

const MOCK_USERS_KEY = 'bein_hasedarim_users';
const CURRENT_USER_KEY = 'bein_hasedarim_current_user';

// Helper to get users from localStorage
export const getStoredUsers = (): User[] => {
  const usersJson = localStorage.getItem(MOCK_USERS_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

// Helper to save users to localStorage
const saveStoredUsers = (users: User[]) => {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

// Initialize with a default admin user if none exist
const initializeDefaultUsers = () => {
    let users = getStoredUsers();
    if (!users.find(u => u.email === 'admin@example.com')) {
        const adminContactPrefs: ContactPreference = {
            displayName: "מנהל האתר",
            showEmail: true,
            showPhone: true,
            showWhatsapp: true,
        };
        const adminUser: User = {
            id: 'admin_user_001',
            fullName: 'מנהל ראשי',
            email: 'admin@example.com',
            phone: '0500000000',
            contactPreference: adminContactPrefs,
            role: 'admin',
            isBlocked: false,
            canChat: true,
        };
        users.push(adminUser);
        saveStoredUsers(users);
    }
     // Ensure mock Google user password for testing email/pass login with this account
     if (!MOCK_PASSWORDS['g.user@example.com']) {
      MOCK_PASSWORDS['g.user@example.com'] = 'google123';
    }
    // Ensure user@example.com contactPreference.displayName is set
    const userExample = users.find(u => u.email === 'user@example.com');
    if(userExample && !userExample.contactPreference.displayName){
        userExample.contactPreference.displayName = userExample.fullName || DEFAULT_USER_DISPLAY_NAME;
        saveStoredUsers(users);
    }
    const testExample = users.find(u => u.email === 'test@example.com');
     if(testExample && !testExample.contactPreference.displayName){
        testExample.contactPreference.displayName = testExample.fullName || DEFAULT_USER_DISPLAY_NAME;
        saveStoredUsers(users);
    }


};

// Mock password check - in real app, compare hashed passwords
const MOCK_PASSWORDS: {[key: string]: string} = {
    'user@example.com': 'password123',
    'test@example.com': 'test1234',
    'admin@example.com': 'admin123'
};
initializeDefaultUsers();


export const login = (email: string, password_provided: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getStoredUsers();
      const user = users.find(u => u.email === email);
      
      if (user && MOCK_PASSWORDS[email] === password_provided) {
        if (user.isBlocked) {
          reject(new Error('חשבונך נחסם. אנא פנה לתמיכה.'));
          return;
        }
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        resolve(user);
      } else {
        reject(new Error('שם משתמש או סיסמה שגויים.'));
      }
    }, 500);
  });
};

export interface RegisterData {
  fullName: string;
  phone: string;
  email: string;
  whatsapp?: string;
  password?: string; 
  contactPreference: ContactPreference;
}

export const register = (data: RegisterData): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      let users = getStoredUsers();
      if (users.find(u => u.email === data.email)) {
        reject(new Error('משתמש עם כתובת אימייל זו כבר קיים.'));
        return;
      }
      const newUser: User = {
        id: `user_${Date.now()}`,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        contactPreference: data.contactPreference.displayName ? data.contactPreference : {...data.contactPreference, displayName: data.fullName || DEFAULT_USER_DISPLAY_NAME},
        role: 'user',
        isBlocked: false,
        canChat: true,
      };
      
      if(data.password) { 
        MOCK_PASSWORDS[data.email] = data.password;
      }

      users.push(newUser);
      saveStoredUsers(users);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
      resolve(newUser);
    }, 500);
  });
};

export const logout = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem(CURRENT_USER_KEY);
      resolve();
    }, 200);
  });
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const userJson = localStorage.getItem(CURRENT_USER_KEY);
      const user = userJson ? JSON.parse(userJson) : null;
      if (user && user.isBlocked) {
        localStorage.removeItem(CURRENT_USER_KEY);
        resolve(null);
      } else {
        resolve(user);
      }
    }, 100);
  });
};


export const updateUserProfile = (userId: string, updatedData: Partial<User>): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      let users = getStoredUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        reject(new Error("משתמש לא נמצא."));
        return;
      }
      const updatedUser: User = {
        ...users[userIndex], 
        fullName: updatedData.fullName || users[userIndex].fullName,
        phone: updatedData.phone || users[userIndex].phone,
        whatsapp: updatedData.whatsapp || users[userIndex].whatsapp,
        contactPreference: {
            ...(updatedData.contactPreference || users[userIndex].contactPreference),
            displayName: (updatedData.contactPreference?.displayName || users[userIndex].contactPreference.displayName) || (updatedData.fullName || users[userIndex].fullName) || DEFAULT_USER_DISPLAY_NAME
        }
      };

      users[userIndex] = updatedUser;
      saveStoredUsers(users);

      const currentUserJson = localStorage.getItem(CURRENT_USER_KEY);
      if (currentUserJson) {
        const currentUser = JSON.parse(currentUserJson);
        if (currentUser.id === userId) {
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
        }
      }
      resolve(updatedUser);
    }, 300);
  });
};

export const sendPasswordReset = (email: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getStoredUsers();
      const userExists = users.some(u => u.email === email);
      if (userExists) {
        console.log(`(Mock) Password reset link sent to ${email}`);
        resolve();
      } else {
        console.log(`(Mock) Password reset attempted for non-existent email: ${email}`);
        // In a real scenario, you don't reveal if the email exists.
        // The service resolves successfully regardless.
        resolve();
      }
    }, 700);
  });
};

export const signInWithGoogle = (): Promise<User> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const googleMockEmail = 'g.user@example.com';
      const googleMockFullName = 'משתמש גוגל לדוגמה';
      let users = getStoredUsers();
      let user = users.find(u => u.email === googleMockEmail);

      if (user) {
        if (user.fullName !== googleMockFullName) {
          user.fullName = googleMockFullName;
        }
        user.contactPreference = user.contactPreference || { displayName: '', showEmail: true, showPhone: false, showWhatsapp: false };
        user.contactPreference.displayName = googleMockFullName; 
      } else {
        const newUser: User = {
          id: `user_google_${Date.now()}`,
          email: googleMockEmail,
          fullName: googleMockFullName,
          phone: '000-0000000', 
          whatsapp: '000-0000000', 
          contactPreference: {
            displayName: googleMockFullName,
            showPhone: false, 
            showWhatsapp: false, 
            showEmail: true,   
          },
          role: 'user',
          isBlocked: false,
          canChat: true,
        };
        users.push(newUser);
        user = newUser;
      }
      
      saveStoredUsers(users);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      resolve(user);
    }, 500);
  });
};
