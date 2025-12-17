import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { AdminLog } from '../types';

const ADMIN_LOGS_COLLECTION = 'admin_logs';

export const logAction = async (logData: Omit<AdminLog, 'id' | 'timestamp'>): Promise<void> => {
    try {
        await addDoc(collection(db, ADMIN_LOGS_COLLECTION), {
            ...logData,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error logging admin action:", error);
        // We log but don't throw to avoid blocking the main action if logging fails
    }
};

export const getLogs = async (maxLogs: number = 50): Promise<AdminLog[]> => {
    try {
        const q = query(
            collection(db, ADMIN_LOGS_COLLECTION),
            orderBy('timestamp', 'desc'),
            limit(maxLogs)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdminLog));
    } catch (error) {
        console.error("Error fetching admin logs:", error);
        return [];
    }
};
