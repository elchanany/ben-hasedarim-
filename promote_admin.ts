
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { firebaseConfig } from './src/config/firebase'; // Adjust path if needed

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PROMOTE_EMAIL = 'eyceyceyc139@gmail.com';

async function promoteToSuperAdmin() {
    console.log(`Searching for user with email: ${PROMOTE_EMAIL}...`);

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', PROMOTE_EMAIL));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error('User not found!');
            process.exit(1);
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        console.log(`Found user: ${userData.fullName} (${userDoc.id})`);
        console.log(`Current role: ${userData.role}`);

        await updateDoc(doc(db, 'users', userDoc.id), {
            role: 'super_admin'
        });

        console.log('Successfully updated role to super_admin!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating user:', error);
        process.exit(1);
    }
}

promoteToSuperAdmin();
