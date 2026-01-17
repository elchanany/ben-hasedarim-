/**
 * Jobs List Handler
 * 
 * Handles browsing and filtering jobs via phone
 */

import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { formatJobForPhone, formatPhoneForReadout } from '../utils/jobFormatter';
import { handleMainMenu } from './mainMenu';

const CITIES = [
    { key: '1', name: 'ירושלים' },
    { key: '2', name: 'בני ברק' },
    { key: '3', name: 'אשדוד' },
    { key: '4', name: 'מודיעין עילית' },
    { key: '5', name: 'ביתר עילית' },
    { key: '6', name: 'אלעד' },
    { key: '7', name: 'צפת' },
    { key: '8', name: 'פתח תקווה' },
    { key: '9', name: 'חיפה' },
];

export async function handleJobsList(call: Call): Promise<any> {
    // Filter menu
    const filterChoice = await call.read(
        [
            { type: 'text', data: 'תפריט עבודות.' },
            { type: 'text', data: 'לשמיעת כל העבודות האחרונות הקש 1.' },
            { type: 'text', data: 'לסינון לפי עיר הקש 2.' },
            { type: 'text', data: 'לחזרה לתפריט הראשי הקש כוכבית.' }
        ],
        'tap',
        { val_name: 'filter_choice', max_digits: 1 }
    );

    let cityFilter: string | undefined;

    if (filterChoice === '*') {
        return handleMainMenu(call);
    }

    if (filterChoice === '2') {
        // City selection
        let cityList = '';
        CITIES.forEach(city => {
            cityList += `ל${city.name} הקש ${city.key}. `;
        });

        const cityChoice = await call.read(
            [{ type: 'text', data: cityList }],
            'tap',
            { val_name: 'city_choice', max_digits: 1 }
        );

        const selectedCity = CITIES.find(c => c.key === cityChoice);
        if (selectedCity) {
            cityFilter = selectedCity.name;
        }
    }

    // Fetch jobs from Firestore
    const db = admin.firestore();
    let query: admin.firestore.Query = db.collection('jobs')
        .where('isPosted', '==', true)
        .orderBy('postedDate', 'desc')
        .limit(10);

    const snapshot = await query.get();

    if (snapshot.empty) {
        await call.id_list_message([
            { type: 'text', data: 'לא נמצאו עבודות.' }
        ]);
        return handleMainMenu(call);
    }

    // Filter jobs (logic matched with frontend to hide expired jobs)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let jobs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(job => {
            // City filter
            if (cityFilter && !job.area?.includes(cityFilter) && !job.city?.includes(cityFilter)) {
                return false;
            }

            // Date expiry filter
            if (!job.dateType || job.dateType === 'flexibleDate') return true;

            if (job.dateType === 'today' || job.dateType === 'specificDate') {
                if (!job.specificDate) return false;
                const jobDate = new Date(job.specificDate);
                jobDate.setHours(0, 0, 0, 0);
                return jobDate >= today;
            }

            if (job.dateType === 'comingWeek') {
                // Check if still relevant (not in the past)
                // Simply check if posted/specific date is not too old? 
                // For now, let's just ensure specificDate (if exists) is future, or postedDate is recent.
                // Matching simple frontend rule:
                const refDate = job.specificDate ? new Date(job.specificDate) : new Date(job.postedDate);
                refDate.setHours(0, 0, 0, 0);
                const nextWeek = new Date(refDate);
                nextWeek.setDate(refDate.getDate() + 7);
                return nextWeek >= today;
            }

            return true;
        });

    if (jobs.length === 0) {
        await call.id_list_message([
            { type: 'text', data: `לא נמצאו עבודות ב${cityFilter}.` }
        ]);
        return handleMainMenu(call);
    }

    await call.id_list_message([
        { type: 'text', data: `נמצאו ${jobs.length} עבודות.` }
    ]);

    // Read jobs one by one
    for (let i = 0; i < jobs.length; i++) {
        const job: any = jobs[i];
        const jobText = formatJobForPhone(job, false);

        const action = await call.read(
            [
                { type: 'text', data: `עבודה מספר ${i + 1}.` },
                { type: 'text', data: jobText },
                { type: 'text', data: 'לפרטים נוספים הקש 1. לעבודה הבאה הקש 2. לחזרה לתפריט הקש כוכבית.' }
            ],
            'tap',
            { val_name: `job_action_${i}`, max_digits: 1 }
        );

        if (action === '1') {
            // Full details
            const fullDetails = formatJobForPhone(job, true);

            const detailAction = await call.read(
                [
                    { type: 'text', data: fullDetails },
                    { type: 'text', data: 'לשמיעת פרטי יצירת קשר הקש 1. להמשך הקש 2.' }
                ],
                'tap',
                { val_name: `detail_action_${i}`, max_digits: 1 }
            );

            if (detailAction === '1' && job.contactPhone) {
                const phoneFormatted = formatPhoneForReadout(job.contactPhone);
                await call.id_list_message([
                    { type: 'text', data: `טלפון ליצירת קשר: ${phoneFormatted}` }
                ]);
            }
        } else if (action === '*') {
            return handleMainMenu(call);
        }
        // action === '2' continues to next job
    }

    await call.id_list_message([
        { type: 'text', data: 'אלו היו כל העבודות. חוזרים לתפריט הראשי.' }
    ]);

    return handleMainMenu(call);
}
