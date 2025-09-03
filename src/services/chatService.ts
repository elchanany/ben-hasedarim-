
import { ChatMessage, ChatThread, User, ChatParticipantInfo } from '../types';
// Removed getStoredUsers, will use getUserProfile from the new authService
import { getUserProfile } from './authService'; 
import { getJobById } from './jobService'; // To get job titles
import { db } from '../firebaseConfig';
import { 
    collection, 
    query, 
    orderBy, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    where, 
    serverTimestamp, 
    Timestamp,
    writeBatch, // Added import for writeBatch
    limit // Added import for limit
} from "firebase/firestore";


const CHAT_THREADS_COLLECTION = 'chatThreads';
// For messages, assuming they are subcollections under each chatThread document:
// e.g., /chatThreads/{threadId}/messages/{messageId}

const convertTimestamps = (docData: any) => {
    const data = { ...docData };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return data;
};

// --- Service Functions ---

export const getChatThreads = async (userId: string): Promise<ChatThread[]> => {
  const threadsCol = collection(db, CHAT_THREADS_COLLECTION);
  const q = query(
    threadsCol, 
    where("participantIds", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const threads: ChatThread[] = [];
  querySnapshot.forEach((docSnap) => {
    threads.push({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as ChatThread);
  });
  return threads;
};

export const getAllChatThreadsAdmin = async (): Promise<ChatThread[]> => {
  // SECURITY: This function should only be callable by an admin.
  // Firestore Security Rules must enforce this.
  const threadsCol = collection(db, CHAT_THREADS_COLLECTION);
  const q = query(threadsCol, orderBy("updatedAt", "desc"));
  const querySnapshot = await getDocs(q);
  const threads: ChatThread[] = [];
  querySnapshot.forEach((docSnap) => {
    threads.push({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as ChatThread);
  });
  return threads;
};


export const getMessagesForThread = async (threadId: string, currentUserId: string): Promise<ChatMessage[]> => {
  const messagesCol = collection(db, CHAT_THREADS_COLLECTION, threadId, 'messages');
  const q = query(messagesCol, orderBy("timestamp", "asc"));
  
  const firestoreBatch = writeBatch(db); // Corrected: use writeBatch from firestore
  let changed = false;
  const messages: ChatMessage[] = [];

  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((docSnap) => {
    let msg = { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as ChatMessage;
    if (msg.senderId !== currentUserId && !msg.isRead) {
      changed = true;
      msg = { ...msg, isRead: true, readAt: new Date().toISOString() };
      firestoreBatch.update(doc(db, CHAT_THREADS_COLLECTION, threadId, 'messages', msg.id), { isRead: true, readAt: serverTimestamp() });
    }
    messages.push(msg);
  });

  if (changed) {
    await firestoreBatch.commit();
    // Update unread count in the thread object
    const threadRef = doc(db, CHAT_THREADS_COLLECTION, threadId);
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
        const threadData = threadSnap.data() as ChatThread;
        const unreadMessagesUpdate: Record<string, number> = { ...threadData.unreadMessages };
        unreadMessagesUpdate[currentUserId] = 0;
        await updateDoc(threadRef, { unreadMessages: unreadMessagesUpdate });
    }
  }
  return messages;
};

const fetchParticipantInfo = async (userId: string): Promise<ChatParticipantInfo> => {
    const user = await getUserProfile(userId); // Use Firebase authService
    return {
        id: userId,
        displayName: user?.contactPreference?.displayName || user?.fullName || "משתמש לא ידוע"
    };
};


export const getOrCreateChatThread = async (
    userId1: string, 
    userId2: string, 
    jobId?: string,
    jobTitle?: string
): Promise<ChatThread> => {
    const threadsCol = collection(db, CHAT_THREADS_COLLECTION);
    // Query for existing thread
    let q;
    if (jobId) {
        q = query(threadsCol, 
            where("participantIds", "array-contains", userId1),
            where("jobId", "==", jobId) 
        );
    } else {
         q = query(threadsCol, 
            where("participantIds", "array-contains", userId1),
            where("jobId", "==", null) 
        );
    }
    
    const querySnapshot = await getDocs(q);
    let existingThread: ChatThread | null = null;
    querySnapshot.forEach(docSnap => {
        const threadData = docSnap.data() as ChatThread;
        if (threadData.participantIds.includes(userId2)) {
            existingThread = { id: docSnap.id, ...convertTimestamps(threadData) } as ChatThread;
        }
    });

    if (existingThread) {
        return existingThread;
    }

    // Create new thread
    const participant1Info = await fetchParticipantInfo(userId1);
    const participant2Info = await fetchParticipantInfo(userId2);
    
    let actualJobTitle = jobTitle;
    if (jobId && !jobTitle) {
      const job = await getJobById(jobId); 
      actualJobTitle = job?.title;
    }

    const newThreadData = {
        jobId: jobId || null,
        jobTitle: actualJobTitle || null,
        participantIds: [userId1, userId2],
        participants: {
            [userId1]: participant1Info,
            [userId2]: participant2Info,
        },
        lastMessage: null,
        unreadMessages: { [userId1]: 0, [userId2]: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(threadsCol, newThreadData);
    const createdTimestamp = new Date().toISOString(); // Estimate for client-side immediate use
    return { 
        id: docRef.id, 
        ...newThreadData, 
        createdAt: createdTimestamp, // Replace serverTimestamp with actual string for immediate use
        updatedAt: createdTimestamp  // Replace serverTimestamp with actual string for immediate use
    } as unknown as ChatThread; // Cast because serverTimestamp type !== string
};


export const sendMessage = async (
  senderId: string,
  receiverId: string, // Used to find/create thread
  text: string,
  jobId?: string,
  jobTitle?: string, 
  existingThreadId?: string
): Promise<{ thread: ChatThread, message: ChatMessage }> => {
  if (!text.trim()) {
    throw new Error("Message text cannot be empty.");
  }

  let thread: ChatThread | undefined;
  if (existingThreadId) {
    const threadRef = doc(db, CHAT_THREADS_COLLECTION, existingThreadId);
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
        thread = {id: threadSnap.id, ...convertTimestamps(threadSnap.data())} as ChatThread;
    }
  }
  
  if (!thread) {
    thread = await getOrCreateChatThread(senderId, receiverId, jobId, jobTitle);
  }

  if (!thread) { 
    throw new Error("Could not find or create chat thread.");
  }
  
  const messagesCol = collection(db, CHAT_THREADS_COLLECTION, thread.id, 'messages');
  const newMessageData = {
    threadId: thread.id,
    senderId: senderId,
    text: text.trim(),
    timestamp: serverTimestamp(),
    isRead: false,
    readAt: null,
  };
  const messageDocRef = await addDoc(messagesCol, newMessageData);
  const messageTimestampEstimate = new Date().toISOString(); // Estimate for immediate client update

  const updatedLastMessage = {
    text: newMessageData.text.length > 50 ? newMessageData.text.substring(0, 47) + "..." : newMessageData.text,
    timestamp: messageTimestampEstimate, 
    senderId: newMessageData.senderId,
  };
  
  const currentUnreadCount = thread.unreadMessages[receiverId] || 0;
  const unreadMessagesUpdate: Record<string, number> = {
      ...thread.unreadMessages,
      [receiverId]: currentUnreadCount + 1,
      [senderId]: 0, // Sender's unread count for this thread becomes 0
  };

  await updateDoc(doc(db, CHAT_THREADS_COLLECTION, thread.id), {
    lastMessage: updatedLastMessage,
    updatedAt: serverTimestamp(),
    unreadMessages: unreadMessagesUpdate,
  });
  
  // Fetch the updated thread to return
  const updatedThreadSnap = await getDoc(doc(db, CHAT_THREADS_COLLECTION, thread.id));
  const updatedThread = {id: updatedThreadSnap.id, ...convertTimestamps(updatedThreadSnap.data())} as ChatThread;

  return { 
    thread: updatedThread, 
    message: { 
        id: messageDocRef.id, 
        ...newMessageData, 
        timestamp: messageTimestampEstimate 
    } as unknown as ChatMessage // Cast because serverTimestamp type !== string
  };
};


export const markThreadAsRead = async (threadId: string, userId: string): Promise<void> => {
  const threadRef = doc(db, CHAT_THREADS_COLLECTION, threadId);
  const threadSnap = await getDoc(threadRef);
  if (threadSnap.exists()) {
    const threadData = threadSnap.data() as ChatThread;
    if (threadData.unreadMessages && threadData.unreadMessages[userId] && threadData.unreadMessages[userId] > 0) {
        const unreadMessagesUpdate = { ...threadData.unreadMessages, [userId]: 0 };
        await updateDoc(threadRef, { unreadMessages: unreadMessagesUpdate });
    }
  }
};

export const getTotalUnreadMessagesCount = async (userId: string): Promise<number> => {
  const threadsCol = collection(db, CHAT_THREADS_COLLECTION);
  const q = query(threadsCol, where("participantIds", "array-contains", userId));
  
  const querySnapshot = await getDocs(q);
  let totalUnread = 0;
  querySnapshot.forEach((docSnap) => {
    const thread = docSnap.data() as ChatThread;
    if (thread.unreadMessages && thread.unreadMessages[userId]) {
      totalUnread += thread.unreadMessages[userId];
    }
  });
  return totalUnread;
};

// Mock data initialization (consider removing or guarding for production)
const initializeMockChats = async () => {
  const threadsCol = collection(db, CHAT_THREADS_COLLECTION);
  // Corrected: Use limit from firestore
  const snapshot = await getDocs(query(threadsCol, limit(1))); 
  if (!snapshot.empty) {
    // console.log("Chat threads already exist in Firestore, skipping mock initialization.");
    return;
  }

  console.log("Initializing mock chat data in Firestore...");

  const mockUser1Id = "firebase_mock_user_1"; 
  const mockUser2Id = "firebase_mock_user_2"; 
  const mockAdminId = "firebase_admin_user_001";

  const user1Info = await fetchParticipantInfo(mockUser1Id);
  const user2Info = await fetchParticipantInfo(mockUser2Id);
  const adminInfo = await fetchParticipantInfo(mockAdminId);
  
  // Attempt to get a real job ID if possible, otherwise this part of mock data might be less useful
  // For robust mock data, ensure your Firestore `jobs` collection has a document with ID 'YOUR_MOCK_JOB_ID_1'
  // Or, create one here if it doesn't exist. For simplicity, we'll assume it might exist.
  const job1 = (await getJobById('YOUR_MOCK_JOB_ID_1')); 

  // Thread 1
  const thread1Data = {
    jobId: job1?.id || null,
    jobTitle: job1?.title || "משרה לדוגמה (אם לא נמצאה)",
    participantIds: [mockUser1Id, mockUser2Id],
    participants: { [mockUser1Id]: user1Info, [mockUser2Id]: user2Info },
    lastMessage: { text: "האם העבודה עדיין רלוונטית?", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), senderId: mockUser1Id },
    unreadMessages: { [mockUser1Id]: 0, [mockUser2Id]: 1 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const thread1Ref = await addDoc(threadsCol, thread1Data);
  
  const messagesThread1Col = collection(db, CHAT_THREADS_COLLECTION, thread1Ref.id, 'messages');
  await addDoc(messagesThread1Col, { threadId: thread1Ref.id, senderId: mockUser1Id, text: "שלום, ראיתי את המודעה שלך.", timestamp: serverTimestamp(), isRead: true, readAt: serverTimestamp() });
  await addDoc(messagesThread1Col, { threadId: thread1Ref.id, senderId: mockUser2Id, text: "היי, כן היא עדיין פנויה.", timestamp: serverTimestamp(), isRead: true, readAt: serverTimestamp() });
  await addDoc(messagesThread1Col, { threadId: thread1Ref.id, senderId: mockUser1Id, text: "מצוין. האם העבודה עדיין רלוונטית?", timestamp: serverTimestamp(), isRead: false });

  // Thread 2
  const thread2Data = {
    jobId: null, jobTitle: null,
    participantIds: [mockUser1Id, mockAdminId],
    participants: { [mockUser1Id]: user1Info, [mockAdminId]: adminInfo },
    lastMessage: { text: "תודה על העזרה!", timestamp: new Date(Date.now() - 86400000).toISOString(), senderId: mockUser1Id },
    unreadMessages: { [mockUser1Id]: 0, [mockAdminId]: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const thread2Ref = await addDoc(threadsCol, thread2Data);
  const messagesThread2Col = collection(db, CHAT_THREADS_COLLECTION, thread2Ref.id, 'messages');
  await addDoc(messagesThread2Col, { threadId: thread2Ref.id, senderId: mockUser1Id, text: "יש לי שאלה לגבי האתר.", timestamp: serverTimestamp(), isRead: true, readAt: serverTimestamp()});
  await addDoc(messagesThread2Col, { threadId: thread2Ref.id, senderId: mockAdminId, text: "כן, במה אוכל לעזור?", timestamp: serverTimestamp(), isRead: true, readAt: serverTimestamp() });
  await addDoc(messagesThread2Col, { threadId: thread2Ref.id, senderId: mockUser1Id, text: "תודה על העזרה!", timestamp: serverTimestamp(), isRead: true, readAt: serverTimestamp() });

  console.log("Mock chat data initialized.");
};

// Call with caution, e.g., during initial setup or if DB is empty.
// initializeMockChats();
