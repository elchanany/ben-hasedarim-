
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PublicProfile, User } from "../types";

const PUBLIC_PROFILES_COLLECTION = 'public_profiles';

export const getPublicProfile = async (userId: string): Promise<PublicProfile | null> => {
    try {
        const docRef = doc(db, PUBLIC_PROFILES_COLLECTION, userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Safe casting
            return {
                id: docSnap.id,
                displayName: data.displayName || 'משתמש',
                role: data.role || 'user',
                joinDate: data.joinDate || new Date().toISOString(), // Fallback
                jobsPublishedCount: data.jobsPublishedCount || 0,
                lastActive: data.lastActive || new Date().toISOString(),
                phone: data.phone, // Will be undefined if not in doc
                whatsapp: data.whatsapp,
                email: data.email
            } as PublicProfile;
        }

        // Fallback: try to get from users collection if public profile doesn't exist yet
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // Use profileContactPreference for public profile display (NOT contactPreference which is for ads)
            const profilePrefs = userData.profileContactPreference || { showPhone: false, showWhatsapp: false, showEmail: false, showChat: true };
            return {
                id: userId,
                displayName: profilePrefs.displayName || userData.fullName || 'משתמש',
                role: userData.role || 'user',
                joinDate: userData.createdAt || new Date().toISOString(),
                jobsPublishedCount: 0,
                lastActive: new Date().toISOString(),
                // Only expose contact info based on profileContactPreference
                phone: profilePrefs.showPhone ? userData.phone : undefined,
                whatsapp: profilePrefs.showWhatsapp ? (userData.whatsapp || userData.phone) : undefined,
                email: profilePrefs.showEmail ? userData.email : undefined,
                canChat: profilePrefs.showChat
            } as PublicProfile;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching public profile for ${userId}:`, error);
        return null;
    }
};

/**
 * Syncs a User's private data to their public profile based on their privacy settings.
 * AND updates their "last active" status.
 * This should be called on login, profile update, and periodically.
 */
export const syncPublicProfile = async (user: User): Promise<void> => {
    try {
        const publicProfileRef = doc(db, PUBLIC_PROFILES_COLLECTION, user.id);

        // Use profileContactPreference for public profile visibility (NOT contactPreference which is for ads)
        const profilePrefs = user.profileContactPreference || { showPhone: false, showWhatsapp: false, showEmail: true, showChat: false, displayName: user.fullName };

        // Construct the public object based strictly on profile preferences
        const publicData: any = {
            displayName: profilePrefs.displayName || user.fullName,
            role: user.role || 'user',
            joinDate: user.createdAt,
            lastActive: new Date().toISOString(),
            canChat: profilePrefs.showChat,
        };

        // Explicitly add contact info ONLY if allowed by profile preferences
        if (profilePrefs.showPhone && user.phone) {
            publicData.phone = user.phone;
        } else {
            publicData.phone = null;
        }

        if (profilePrefs.showWhatsapp && (user.whatsapp || user.phone)) {
            publicData.whatsapp = user.whatsapp || user.phone;
        } else {
            publicData.whatsapp = null;
        }

        if (profilePrefs.showEmail && user.email) {
            publicData.email = user.email;
        } else {
            publicData.email = null;
        }

        // We use setDoc with merge: true to update fields but create if not exists
        await setDoc(publicProfileRef, publicData, { merge: true });

    } catch (error) {
        console.error("Error syncing public profile:", error);
        // Non-blocking error
    }
};

// Helper to update just the activity timestamp
export const updateLastActive = async (userId: string): Promise<void> => {
    try {
        const publicProfileRef = doc(db, PUBLIC_PROFILES_COLLECTION, userId);
        await updateDoc(publicProfileRef, {
            lastActive: new Date().toISOString()
        });
    } catch (error) {
        // Ignore errors for background activity updates
    }
}
