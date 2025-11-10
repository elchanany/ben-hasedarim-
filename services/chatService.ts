
import { ChatMessage, ChatThread, User, ChatParticipantInfo } from '../types';
import { getStoredUsers } from './authService'; // To get user display names
import { getJobById } from './jobService'; // To get job titles

const CHAT_THREADS_KEY = 'bein_hasedarim_chat_threads';
const CHAT_MESSAGES_KEY_PREFIX = 'bein_hasedarim_chat_messages_'; // threadId will be appended

// --- Helper Functions ---
const getStoredChatThreads = (): ChatThread[] => {
  try {
    const threadsJson = localStorage.getItem(CHAT_THREADS_KEY);
    return threadsJson ? JSON.parse(threadsJson) : [];
  } catch (error) {
    console.error("Error parsing chat threads from localStorage:", error);
    return [];
  }
};

const saveStoredChatThreads = (threads: ChatThread[]) => {
  localStorage.setItem(CHAT_THREADS_KEY, JSON.stringify(threads));
};

const getStoredMessagesForThread = (threadId: string): ChatMessage[] => {
  try {
    const messagesJson = localStorage.getItem(`${CHAT_MESSAGES_KEY_PREFIX}${threadId}`);
    return messagesJson ? JSON.parse(messagesJson) : [];
  } catch (error) {
    console.error("Error parsing chat messages from localStorage:", error);
    return [];
  }
};

const saveStoredMessagesForThread = (threadId: string, messages: ChatMessage[]) => {
  localStorage.setItem(`${CHAT_MESSAGES_KEY_PREFIX}${threadId}`, JSON.stringify(messages));
};

const createMockThreadId = (userId1: string, userId2: string, jobId?: string) => {
    const sortedIds = [userId1, userId2].sort().join('_');
    return `thread_${sortedIds}${jobId ? `_job_${jobId}` : ''}`;
};


// --- Service Functions ---

export const getChatThreads = async (userId: string): Promise<ChatThread[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allThreads = getStoredChatThreads();
      const userThreads = allThreads
        .filter(thread => thread.participantIds.includes(userId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(userThreads);
    }, 200);
  });
};

export const getMessagesForThread = async (threadId: string, currentUserId: string): Promise<ChatMessage[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let messages = getStoredMessagesForThread(threadId);
      let changed = false;
      messages = messages.map(msg => {
        if (msg.senderId !== currentUserId && !msg.isRead) {
          changed = true;
          return { ...msg, isRead: true, readAt: new Date().toISOString() };
        }
        return msg;
      });

      if (changed) {
        saveStoredMessagesForThread(threadId, messages);
        // Update unread count in the thread object
        const threads = getStoredChatThreads();
        const threadIndex = threads.findIndex(t => t.id === threadId);
        if (threadIndex !== -1) {
          threads[threadIndex].unreadMessages[currentUserId] = 0;
          // No need to update updatedAt here, as fetching messages shouldn't bump the thread.
          saveStoredChatThreads(threads);
        }
      }
      resolve(messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    }, 150);
  });
};

const fetchParticipantInfo = async (userId: string): Promise<ChatParticipantInfo> => {
    const users = getStoredUsers(); 
    const user = users.find(u => u.id === userId);
    return {
        id: userId,
        displayName: user?.contactPreference.displayName || user?.fullName || "משתמש לא ידוע"
    };
};


export const getOrCreateChatThread = async (
    userId1: string, // Current user
    userId2: string, // Other participant
    jobId?: string,
    jobTitle?: string
): Promise<ChatThread> => {
    return new Promise(async (resolve) => {
        setTimeout(async () => {
          const allThreads = getStoredChatThreads();
          let thread = allThreads.find(t =>
              t.participantIds.includes(userId1) &&
              t.participantIds.includes(userId2) &&
              (jobId ? t.jobId === jobId : t.jobId === undefined) // Match jobId if provided, or ensure no jobId if not
          );

          if (thread) {
              resolve(thread);
              return;
          }

          // Create new thread
          const participant1Info = await fetchParticipantInfo(userId1);
          const participant2Info = await fetchParticipantInfo(userId2);
          
          const newThreadId = createMockThreadId(userId1, userId2, jobId);
          const now = new Date().toISOString();
          let actualJobTitle = jobTitle;
          if (jobId && !jobTitle) {
            const job = await getJobById(jobId);
            actualJobTitle = job?.title;
          }


          const newThread: ChatThread = {
              id: newThreadId,
              jobId: jobId,
              jobTitle: actualJobTitle,
              participantIds: [userId1, userId2],
              participants: {
                  [userId1]: participant1Info,
                  [userId2]: participant2Info,
              },
              lastMessage: null,
              unreadMessages: { [userId1]: 0, [userId2]: 0 },
              createdAt: now,
              updatedAt: now,
          };

          allThreads.push(newThread);
          saveStoredChatThreads(allThreads);
          resolve(newThread);
        }, 50); // Reduced timeout for faster creation
    });
};


export const sendMessage = async (
  senderId: string,
  receiverId: string,
  text: string,
  jobId?: string,
  jobTitle?: string, 
  existingThreadId?: string
): Promise<{ thread: ChatThread, message: ChatMessage }> => {
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      if (!text.trim()) {
        reject(new Error("Message text cannot be empty."));
        return;
      }

      let thread: ChatThread | undefined;
      if (existingThreadId) {
        const threads = getStoredChatThreads();
        thread = threads.find(t => t.id === existingThreadId);
      }
      
      if (!thread) {
        thread = await getOrCreateChatThread(senderId, receiverId, jobId, jobTitle);
      }

      if (!thread) { 
        reject(new Error("Could not find or create chat thread."));
        return;
      }
      
      const now = new Date().toISOString();
      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        threadId: thread.id,
        senderId: senderId,
        text: text.trim(),
        timestamp: now,
        isRead: false,
        readAt: undefined,
      };

      const messages = getStoredMessagesForThread(thread.id);
      messages.push(newMessage);
      saveStoredMessagesForThread(thread.id, messages);

      thread.lastMessage = {
        text: newMessage.text.length > 50 ? newMessage.text.substring(0, 47) + "..." : newMessage.text,
        timestamp: newMessage.timestamp,
        senderId: newMessage.senderId,
      };
      thread.updatedAt = newMessage.timestamp;
      if (thread.unreadMessages[receiverId] !== undefined) {
        thread.unreadMessages[receiverId]++;
      } else {
        thread.unreadMessages[receiverId] = 1;
      }
      thread.unreadMessages[senderId] = 0;


      const allThreads = getStoredChatThreads();
      const threadIndex = allThreads.findIndex(t => t.id === thread!.id);
      if (threadIndex !== -1) {
        allThreads[threadIndex] = thread;
      } else {
        allThreads.push(thread); 
      }
      saveStoredChatThreads(allThreads);

      resolve({ thread, message: newMessage });
    }, 100);
  });
};


export const markThreadAsRead = async (threadId: string, userId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const threads = getStoredChatThreads();
      const threadIndex = threads.findIndex(t => t.id === threadId);
      if (threadIndex !== -1) {
        if (threads[threadIndex].unreadMessages[userId] > 0) {
            threads[threadIndex].unreadMessages[userId] = 0;
            // threads[threadIndex].updatedAt = new Date().toISOString(); // Optionally update timestamp
            saveStoredChatThreads(threads);
        }
      }
      resolve();
    }, 50);
  });
};

export const getTotalUnreadMessagesCount = async (userId: string): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allThreads = getStoredChatThreads();
      let totalUnread = 0;
      allThreads.forEach(thread => {
        if (thread.participantIds.includes(userId) && thread.unreadMessages[userId]) {
          totalUnread += thread.unreadMessages[userId];
        }
      });
      resolve(totalUnread);
    }, 100);
  });
};


const initializeMockChats = async () => {
  const users = getStoredUsers();
  const user1 = users.find(u => u.email === 'user@example.com'); 
  const user2 = users.find(u => u.email === 'test@example.com'); 
  const adminUser = users.find(u => u.email === 'admin@example.com');

  if (!user1 || !user2 || !adminUser) {
    console.warn("Mock users not found, skipping chat initialization.");
    return;
  }

  let threads = getStoredChatThreads();
  if (threads.length === 0) {
    const job1 = (await getJobById('1')); 

    // Thread 1: User1 and User2 about Job1
    const thread1Id = createMockThreadId(user1.id, user2.id, job1?.id);
    const thread1Participant1Info = await fetchParticipantInfo(user1.id);
    const thread1Participant2Info = await fetchParticipantInfo(user2.id);
    const thread1: ChatThread = {
      id: thread1Id,
      jobId: job1?.id,
      jobTitle: job1?.title,
      participantIds: [user1.id, user2.id],
      participants: {
          [user1.id]: thread1Participant1Info,
          [user2.id]: thread1Participant2Info,
      },
      lastMessage: { text: "האם העבודה עדיין רלוונטית?", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), senderId: user1.id },
      unreadMessages: { [user1.id]: 0, [user2.id]: 1 },
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    };
    saveStoredMessagesForThread(thread1Id, [
      { id: 'msg1_1', threadId: thread1Id, senderId: user1.id, text: "שלום, ראיתי את המודעה שלך על הובלה קטנה.", timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), isRead: true, readAt: new Date(Date.now() - 3600000 * 2.8).toISOString() },
      { id: 'msg1_2', threadId: thread1Id, senderId: user2.id, text: "היי, כן היא עדיין פנויה.", timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(), isRead: true, readAt: new Date(Date.now() - 3600000 * 2.3).toISOString() },
      { id: 'msg1_3', threadId: thread1Id, senderId: user1.id, text: "מצוין. האם העבודה עדיין רלוונטית?", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), isRead: false },
    ]);

    // Thread 2: User1 and Admin (general)
    const thread2Id = createMockThreadId(user1.id, adminUser.id);
    const thread2Participant1Info = await fetchParticipantInfo(user1.id);
    const thread2ParticipantAdminInfo = await fetchParticipantInfo(adminUser.id);
    const thread2: ChatThread = {
      id: thread2Id,
      participantIds: [user1.id, adminUser.id],
       participants: {
          [user1.id]: thread2Participant1Info,
          [adminUser.id]: thread2ParticipantAdminInfo,
      },
      lastMessage: { text: "תודה על העזרה!", timestamp: new Date(Date.now() - 86400000).toISOString(), senderId: user1.id },
      unreadMessages: { [user1.id]: 0, [adminUser.id]: 0 },
      createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    };
    saveStoredMessagesForThread(thread2Id, [
      { id: 'msg2_1', threadId: thread2Id, senderId: user1.id, text: "יש לי שאלה לגבי האתר.", timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(), isRead: true, readAt: new Date(Date.now() - 86400000 * 1.4).toISOString()},
      { id: 'msg2_2', threadId: thread2Id, senderId: adminUser.id, text: "כן, במה אוכל לעזור?", timestamp: new Date(Date.now() - 86400000 * 1.2).toISOString(), isRead: true, readAt: new Date(Date.now() - 86400000 * 1.1).toISOString() },
      { id: 'msg2_3', threadId: thread2Id, senderId: user1.id, text: "תודה על העזרה!", timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true, readAt: new Date(Date.now() - 86400000 * 0.9).toISOString() },
    ]);
    
    threads.push(thread1, thread2);
    saveStoredChatThreads(threads);
  }
};

// Ensure this runs once when the service is loaded, and handle potential errors.
(async () => {
    try {
        await initializeMockChats();
    } catch (e) {
        console.error("Failed to initialize mock chats on load:", e);
    }
})();
