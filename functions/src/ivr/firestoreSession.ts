import * as admin from 'firebase-admin';

// Interface for the session store (implicit in yemot-router2)
interface SessionStore {
    get(callId: string): Promise<any>;
    set(callId: string, value: any): Promise<void>;
    delete(callId: string): Promise<void>;
}

export class FirestoreCallSession implements SessionStore {
    private collectionName = 'ivrSessions';

    private get db(): admin.firestore.Firestore {
        return admin.firestore();
    }

    async get(callId: string): Promise<any> {
        const doc = await this.db.collection(this.collectionName).doc(callId).get();
        return doc.data();
    }

    async set(callId: string, value: any): Promise<void> {
        // Expire session after 10 minutes
        // We can't easily set TTL here without a cloud function trigger or TTL policy, 
        // but we can save a timestamp.
        await this.db.collection(this.collectionName).doc(callId).set({
            ...value,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async delete(callId: string): Promise<void> {
        await this.db.collection(this.collectionName).doc(callId).delete();
    }
}
