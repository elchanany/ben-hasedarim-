import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Report } from '../types';

const REPORTS_COLLECTION = 'reports';

export const submitReport = async (reportData: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<void> => {
    try {
        await addDoc(collection(db, REPORTS_COLLECTION), {
            ...reportData,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error submitting report:", error);
        throw error;
    }
};

export const getReports = async (): Promise<Report[]> => {
    try {
        const q = query(collection(db, REPORTS_COLLECTION), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Report));
    } catch (error) {
        console.error("Error fetching reports:", error);
        return [];
    }
};

export const updateReportStatus = async (reportId: string, status: Report['status']): Promise<void> => {
    try {
        const reportRef = doc(db, REPORTS_COLLECTION, reportId);
        await updateDoc(reportRef, { status });
    } catch (error) {
        console.error("Error updating report status:", error);
        throw error;
    }
};
