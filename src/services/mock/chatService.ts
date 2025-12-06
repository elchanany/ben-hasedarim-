import { ChatThread, ChatMessage, User } from '../../types';

const THREADS_KEY = 'bein_hasedarim_mock_chat_threads';

const getStoredThreads = (): ChatThread[] => {
    const stored = localStorage.getItem(THREADS_KEY);
    return stored ? JSON.parse(stored) : [];
};

const saveThreads = (threads: ChatThread[]) => {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
};

export const getChatThreads = async (userId: string): Promise<ChatThread[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const threads = getStoredThreads();
            resolve(threads.filter(t => t.participantIds.includes(userId)));
        }, 300);
    });
};

export const subscribeToChatThreads = (userId: string, callback: (threads: ChatThread[]) => void) => {
    // Simple mock subscription - just calls once
    getChatThreads(userId).then(callback);
    return () => { };
};

export const getMessagesForThread = async (threadId: string): Promise<ChatMessage[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            // We can store messages inside threads or separately. For simplicity, let's assume separate not implemented fully in mock yet 
            // or just return empty for now as simple mock.
            resolve([]);
        }, 300);
    });
};

export const subscribeToMessages = (threadId: string, callback: (messages: ChatMessage[]) => void) => {
    callback([]);
    return () => { };
};

export const sendMessage = async (
    senderId: string,
    receiverId: string,
    text: string,
    jobId?: string,
    jobTitle?: string,
    existingThreadId?: string
): Promise<void> => {
    const threads = getStoredThreads();
    let thread: ChatThread | undefined;

    if (existingThreadId) {
        thread = threads.find(t => t.id === existingThreadId);
    } else {
        // Find by participants
        thread = threads.find(t => t.participantIds.includes(senderId) && t.participantIds.includes(receiverId) && t.jobId === jobId);
    }

    if (!thread) {
        // Create new
        const newThread: ChatThread = {
            id: 'mock_thread_' + Date.now(),
            jobId,
            jobTitle,
            participantIds: [senderId, receiverId],
            participants: {
                [senderId]: { id: senderId, displayName: 'Me' },
                [receiverId]: { id: receiverId, displayName: 'Other' }
            },
            lastMessage: {
                text,
                senderId,
                timestamp: new Date().toISOString()
            },
            unreadMessages: {
                [receiverId]: 1,
                [senderId]: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        threads.unshift(newThread);
    } else {
        thread.lastMessage = {
            text,
            senderId,
            timestamp: new Date().toISOString()
        };
        thread.updatedAt = new Date().toISOString();
        if (thread.unreadMessages && typeof thread.unreadMessages[receiverId] === 'number') {
            thread.unreadMessages[receiverId]++;
        }
    }
    saveThreads(threads);
};

export const startNewChat = async (currentUser: User, otherUser: { id: string, displayName: string }, jobId?: string, jobTitle?: string): Promise<string> => {
    // In mock, sendMessage handles creation if needed, or we just return a generated ID
    return 'mock_thread_' + Date.now();
};

export const markThreadAsRead = async (threadId: string, userId: string): Promise<void> => {
    const threads = getStoredThreads();
    const thread = threads.find(t => t.id === threadId);
    if (thread && thread.unreadMessages) {
        thread.unreadMessages[userId] = 0;
        saveThreads(threads);
    }
};

export const getTotalUnreadMessagesCount = async (userId: string): Promise<number> => {
    const threads = getStoredThreads();
    let count = 0;
    threads.forEach(t => {
        if (t.participantIds.includes(userId) && t.unreadMessages && t.unreadMessages[userId]) {
            count += t.unreadMessages[userId];
        }
    });
    return count;
};