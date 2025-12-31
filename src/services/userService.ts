import { collection, getDocs, doc, updateDoc, query, where, getDoc } from "firebase/firestore";
import { User } from '../types';
import * as adminLogService from './adminLogService';
import { db } from '@/lib/firebase'; // Ensure db is imported if not already, or reuse existing import line

const USERS_COLLECTION = 'users';

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const usersCol = collection(db, USERS_COLLECTION);
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as User));
        return userList;
    } catch (error) {
        console.error("Error fetching users:", error);
        return []; // Return empty array on error to safely handle in UI
    }
};

export const updateUserRole = async (userId: string, newRole: User['role']): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, { role: newRole });
    } catch (error) {
        console.error("Error updating user role:", error);
        throw error;
    }
};


export const updateUserBlockContact = async (userId: string, isContactBlocked: boolean): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, { isContactBlocked });
    } catch (error) {
        console.error("Error updating user block contact:", error);
        throw error;
    }
};

// Updated to accept separate admin reason and user-visible reason
export const toggleUserBlock = async (
    userId: string,
    isBlocked: boolean,
    adminReason?: string,
    userReason?: string,
    adminUser?: { id: string, name: string }
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const updateData: any = {
            isBlocked,
            // Admin reason stored in blockReason (for internal/logs)
            blockReason: isBlocked ? (adminReason || 'Admin blocked user') : null,
            // User-visible reason stored in blockReasonUser (only if provided)
            blockReasonUser: isBlocked ? (userReason || null) : null
        };

        if (!isBlocked) {
            updateData.isContactBlocked = false;
        }

        await updateDoc(userRef, updateData);

        // Note: Logging is now handled by the caller (AdminDashboardPage) with admin reason
    } catch (error) {
        console.error("Error toggling user block:", error);
        throw error;
    }
};

export const blockUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, currentUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            const blockedUserIds = userData.blockedUserIds || [];
            if (!blockedUserIds.includes(targetUserId)) {
                await updateDoc(userRef, {
                    blockedUserIds: [...blockedUserIds, targetUserId]
                });
            }
        }
    } catch (error) {
        console.error("Error blocking user:", error);
        throw error;
    }
};

export const unblockUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, currentUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            const blockedUserIds = userData.blockedUserIds || [];
            await updateDoc(userRef, {
                blockedUserIds: blockedUserIds.filter(id => id !== targetUserId)
            });
        }
    } catch (error) {
        console.error("Error unblocking user:", error);
        throw error;
    }
};
