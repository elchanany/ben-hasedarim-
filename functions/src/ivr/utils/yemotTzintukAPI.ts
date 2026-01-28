/**
 * Yemot Tzintuk API Utilities
 * 
 * Handles communication with Yemot's free tzintuk list management API
 */

import axios from 'axios';

const YEMOT_API_BASE = 'https://www.call2all.co.il/ym/api';

export interface YemotTzintukList {
    listName: string;
    extPath: string;
}

export interface YemotListEntry {
    phone: string;
    name?: string;
    dateAdded?: string;
}

/**
 * Get all tzintuk lists from Yemot
 */
export async function getTzintukLists(token: string): Promise<YemotTzintukList[]> {
    try {
        const response = await axios.get(`${YEMOT_API_BASE}/TzintukimListManagement`, {
            params: {
                token,
                action: 'getlists'
            }
        });

        if (response.data.responseStatus === 'OK') {
            return response.data.lists || [];
        }

        console.error('[Yemot API] Failed to get lists:', response.data);
        return [];
    } catch (error) {
        console.error('[Yemot API] Error getting lists:', error);
        return [];
    }
}

/**
 * Get all phone numbers subscribed to a specific tzintuk list
 */
export async function getListMembers(token: string, listName: string): Promise<YemotListEntry[]> {
    try {
        const response = await axios.get(`${YEMOT_API_BASE}/TzintukimListManagement`, {
            params: {
                token,
                action: 'getlistEnteres',
                TzintukimList: listName
            }
        });

        if (response.data.responseStatus === 'OK') {
            return response.data.enteres || [];
        }

        console.error(`[Yemot API] Failed to get members for list ${listName}:`, response.data);
        return [];
    } catch (error) {
        console.error(`[Yemot API] Error getting members for list ${listName}:`, error);
        return [];
    }
}

/**
 * Check which tzintuk lists a phone number is subscribed to
 */
export async function getUserTzintukLists(token: string, phone: string): Promise<string[]> {
    console.log(`[Yemot API] Checking lists for phone: ${phone}`);

    // Get all lists
    const allLists = await getTzintukLists(token);
    console.log(`[Yemot API] Found ${allLists.length} total lists`);

    const subscribedLists: string[] = [];

    // Check each list for the phone number
    for (const list of allLists) {
        const members = await getListMembers(token, list.listName);
        const isSubscribed = members.some(member => member.phone === phone);

        if (isSubscribed) {
            console.log(`[Yemot API] Phone ${phone} found in list: ${list.listName}`);
            subscribedLists.push(list.listName);
        }
    }

    console.log(`[Yemot API] Phone ${phone} is subscribed to ${subscribedLists.length} lists:`, subscribedLists);
    return subscribedLists;
}

/**
 * Map city area codes to tzintuk list names
 */
export const CITY_TO_LIST_MAP: Record<string, string> = {
    'jerusalem': 'jerusalem',
    'bnei_brak': 'bnei_brak',
    'ashdod': 'ashdod',
    'modiin_illit': 'modiin_illit',
    'beitar_illit': 'beitar_illit',
    'elad': 'elad',
    'tzfat': 'tzfat',
    'petach_tikva': 'petach_tikva',
    'haifa': 'haifa',
    'all_country': 'all_country'
};

/**
 * Map list names to friendly Hebrew names (for TTS)
 */
export const LIST_NAME_TO_HEBREW: Record<string, string> = {
    'jerusalem': 'ירושלים',
    'bnei_brak': 'בני ברק',
    'ashdod': 'אשדוד',
    'modiin_illit': 'מודיעין עילית',
    'beitar_illit': 'ביתר עילית',
    'elad': 'אלעד',
    'tzfat': 'צפת',
    'petach_tikva': 'פתח תקווה',
    'haifa': 'חיפה',
    'all_country': 'כל הארץ'
};
