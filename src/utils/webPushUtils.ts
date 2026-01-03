/**
 * Web Push Notification Utilities
 * Uses the Web Notifications API for browser push notifications
 */

const PUSH_ENABLED_KEY = 'bein_hasedarim_push_enabled';

/**
 * Check if browser supports notifications
 */
export const isNotificationSupported = (): boolean => {
    return 'Notification' in window;
};

/**
 * Get current permission status
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
};

/**
 * Request notification permission from user
 * Returns true if permission granted
 * Also auto-enables push preference when permission is granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!isNotificationSupported()) {
        console.warn('Browser does not support notifications');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Auto-enable push when permission is granted
            setPushEnabled(true);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
};

/**
 * Check if user has enabled push notifications in settings
 */
export const isPushEnabled = (): boolean => {
    try {
        return localStorage.getItem(PUSH_ENABLED_KEY) === 'true';
    } catch {
        return false;
    }
};

/**
 * Set push notifications preference
 */
export const setPushEnabled = (enabled: boolean): void => {
    try {
        localStorage.setItem(PUSH_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (error) {
        console.error('Error saving push preference:', error);
    }
};

/**
 * Show a browser push notification with navigation support
 * @param title - Notification title
 * @param options - Notification options (body, icon, tag, etc.)
 * @param navigateTo - Hash URL to navigate to when clicked (e.g., '#/notifications')
 */
export const showBrowserNotification = (
    title: string,
    options?: NotificationOptions,
    navigateTo?: string
): void => {
    // Check if supported and permission granted
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;
    if (!isPushEnabled()) return;

    try {
        const defaultOptions: NotificationOptions = {
            icon: '/logo.png', // App logo from assets
            badge: '/logo.png',
            dir: 'rtl', // Right-to-left for Hebrew
            lang: 'he',
            requireInteraction: false,
            silent: false,
            ...options
        };

        const notification = new Notification(title, defaultOptions);

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        // Navigate on click
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            if (navigateTo) {
                // Remove leading # if present, then set hash properly
                const hashPath = navigateTo.startsWith('#') ? navigateTo.substring(1) : navigateTo;
                window.location.hash = hashPath;
                // Force reload of hash change for SPA routing
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
            notification.close();
        };
    } catch (error) {
        console.error('Error showing notification:', error);
    }
};

/**
 * Show notification for new message
 */
export const showMessageNotification = (senderName: string, messagePreview: string, jobTitle?: string, threadId?: string): void => {
    const title = jobTitle
        ? `הודעה חדשה מ${senderName} בנוגע לעבודה "${jobTitle}"`
        : `הודעה חדשה מ${senderName}`;

    showBrowserNotification(title, {
        body: `באתר בין הסדורים\n${messagePreview || 'לחץ לצפייה'}`,
        tag: 'new-message',
    }, threadId ? `#/chatThread?threadId=${threadId}` : '#/notifications');
};

/**
 * Show notification for new job match
 */
export const showJobMatchNotification = (jobTitle: string, location: string, jobId?: string): void => {
    showBrowserNotification('התראה על עבודה חדשה באתר בין הסדורים', {
        body: `${jobTitle} - ${location}`,
        tag: 'job-match',
    }, jobId ? `#/jobDetails?jobId=${jobId}` : '#/notifications');
};

/**
 * Show notification for job application
 */
export const showApplicationNotification = (applicantName: string, jobTitle: string): void => {
    showBrowserNotification('פנייה חדשה לעבודה שפרסמת', {
        body: `באתר בין הסדורים\n${applicantName} פנה ל"${jobTitle}"`,
        tag: 'job-application',
    }, '#/notifications');
};

/**
 * Show system notification
 */
export const showSystemNotification = (title: string, message: string): void => {
    showBrowserNotification('התראת מערכת חדשה - בין הסדורים', {
        body: `${title}\n${message}`,
        tag: 'system',
    }, '#/notifications');
};
