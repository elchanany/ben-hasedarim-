import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, where, getCountFromServer } from "firebase/firestore";
import { ContactMessage } from '../types';

const CONTACT_COLLECTION = 'contact_messages';

export const sendMessage = async (data: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>): Promise<void> => {
    try {
        await addDoc(collection(db, CONTACT_COLLECTION), {
            ...data,
            status: 'new',
            createdAt: serverTimestamp(),
        });
        // Note: Email sending would typically be triggered here via a Cloud Function watching this collection
    } catch (error) {
        console.error("Error sending contact message:", error);
        throw error;
    }
};

export const getMessages = async (): Promise<ContactMessage[]> => {
    try {
        const q = query(collection(db, CONTACT_COLLECTION), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ContactMessage));
    } catch (error) {
        console.error("Error fetching contact messages:", error);
        return [];
    }
};

export const markAsRead = async (id: string): Promise<void> => {
    try {
        const msgRef = doc(db, CONTACT_COLLECTION, id);
        await updateDoc(msgRef, { status: 'read' });
    } catch (error) {
        console.error("Error marking message as read:", error);
        throw error;
    }
};

export const getUnreadMessageCount = async (): Promise<number> => {
    try {
        const q = query(collection(db, CONTACT_COLLECTION), where("status", "==", "new"));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error fetching unread count:", error);
        return 0;
    }
};
