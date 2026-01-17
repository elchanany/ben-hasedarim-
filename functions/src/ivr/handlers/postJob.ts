/**
 * Post Job Handler
 * 
 * Handles posting a new job via phone
 */

import { Call, Msg } from 'yemot-router2';
import * as admin from 'firebase-admin';
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
    { key: '0', name: 'אחר' },
];

export async function handlePostJob(call: Call): Promise<any> {
    // 1. Job Title (Speech to Text)
    // Combine intro messages with the first read action to ensure continuous flow
    // 1. Job Title (Speech to Text) with Validation Loop
    let title = '';
    while (true) {
        // Only play welcome message on first attempt? 
        // We'll keep it simple for now or split if needed.
        // Actually, let's play welcome only once outside loop or handle it smart.
        // But to simplicity and robust flow, let's loop the read part.

        const isRetry = title !== '';

        const messages: Msg[] = [];
        if (!isRetry) {
            messages.push({ type: 'text', data: 'ברוכים הבאים למערכת פרסום עבודות.' });
            messages.push({ type: 'text', data: 'העבודה שתפרסם תופיע גם באתר וגם בקו הטלפוני.' });
        }
        messages.push({ type: 'text', data: 'אנא אמור את שם העבודה בבירור.' });

        title = await call.read(messages, 'stt', { val_name: 'job_title' });

        if (!title) {
            await call.id_list_message([{ type: 'text', data: 'לא נקלט שם עבודה. נסה שוב.' }]);
            continue;
        }

        // Confirm title
        const confirmTitle = await call.read(
            [
                { type: 'text', data: `קלטתי את השם: ${title}` },
                { type: 'text', data: 'לאישור הקש 1. להקלטה מחדש הקש 2.' }
            ],
            'tap',
            { val_name: 'confirm_title', max_digits: 1 }
        );

        if (confirmTitle === '1') {
            break;
        }
        // If 2 or anything else, loop again
    }

    // 2. City selection
    let cityList = '';
    CITIES.forEach(city => {
        cityList += `ל${city.name} הקש ${city.key}. `;
    });

    const cityChoice = await call.read(
        [{ type: 'text', data: 'בחר עיר: ' + cityList }],
        'tap',
        { val_name: 'job_city', max_digits: 1 }
    );

    const selectedCity = CITIES.find(c => c.key === cityChoice);
    const area = selectedCity?.name || 'לא צוין';

    // 3. Difficulty
    const difficultyChoice = await call.read(
        [
            { type: 'text', data: 'רמת קושי.' },
            { type: 'text', data: 'לעבודה קלה הקש 1. לבינונית הקש 2. לקשה הקש 3.' }
        ],
        'tap',
        { val_name: 'job_difficulty', max_digits: 1 }
    );

    const difficulties: Record<string, string> = { '1': 'קלה', '2': 'בינונית', '3': 'קשה' };
    const difficulty = difficulties[difficultyChoice] || 'בינונית';

    // 4. Payment type
    const paymentChoice = await call.read(
        [{ type: 'text', data: 'סוג תשלום. לשעתי הקש 1. לגלובלי הקש 2.' }],
        'tap',
        { val_name: 'payment_type', max_digits: 1 }
    );

    const paymentType = paymentChoice === '1' ? 'לפי שעה' : 'גלובלי';

    // 5. Payment amount
    const paymentAmount = await call.read(
        [{ type: 'text', data: 'הקש את סכום התשלום ולסיום הקש סולמית.' }],
        'tap',
        { val_name: 'payment_amount', max_digits: 5 }
    );

    const amount = parseInt(paymentAmount) || 50;

    // 6. Contact phone
    const callerPhone = call.ApiPhone || '';

    const useCallerPhone = await call.read(
        [{ type: 'text', data: 'להשתמש במספר הנוכחי ליצירת קשר הקש 1. לאחר הקש 2.' }],
        'tap',
        { val_name: 'use_caller_phone', max_digits: 1 }
    );

    let contactPhone = callerPhone;
    if (useCallerPhone === '2') {
        contactPhone = await call.read(
            [{ type: 'text', data: 'הקש מספר טלפון ולסיום סולמית.' }],
            'tap',
            { val_name: 'contact_phone', max_digits: 10 }
        );
    }

    // 7. Suitability
    const suitChoice = await call.read(
        [{ type: 'text', data: 'לגברים בלבד הקש 1. לנשים בלבד הקש 2. לכולם הקש 3.' }],
        'tap',
        { val_name: 'suitability', max_digits: 1 }
    );

    const suitability = {
        men: suitChoice === '1' || suitChoice === '3',
        women: suitChoice === '2' || suitChoice === '3',
        general: suitChoice === '3'
    };

    // Confirm
    const confirm = await call.read(
        [
            { type: 'text', data: `סיכום: ${area}, ${difficulty}, ${amount} שקלים.` },
            { type: 'text', data: 'לאישור ופרסום הקש 1. לביטול הקש 2.' }
        ],
        'tap',
        { val_name: 'confirm', max_digits: 1 }
    );

    if (confirm !== '1') {
        await call.id_list_message([
            { type: 'text', data: 'הפרסום בוטל.' }
        ]);
        return handleMainMenu(call);
    }

    // Save to Firestore
    try {
        const db = admin.firestore();

        const counterRef = db.collection('counters').doc('jobs');
        const counterDoc = await counterRef.get();
        let serialNumber = 1;

        if (counterDoc.exists) {
            serialNumber = (counterDoc.data()?.current || 0) + 1;
            await counterRef.update({ current: serialNumber });
        } else {
            await counterRef.set({ current: 1 });
        }

        const newJob = {
            title: title || 'עבודה מהטלפון',
            area,
            description: '',
            difficulty,
            paymentType,
            hourlyRate: paymentType === 'לפי שעה' ? amount : null,
            globalPayment: paymentType === 'גלובלי' ? amount : null,
            suitability,
            contactPhone,
            contactDisplayName: 'מפרסם טלפוני',
            postedBy: {
                id: 'phone-user-' + callerPhone,
                posterDisplayName: 'מפרסם טלפוני'
            },
            postedDate: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isPosted: true,
            serialNumber,
            postedVia: 'phone'
        };

        await db.collection('jobs').add(newJob);

        await call.id_list_message([
            { type: 'text', data: 'העבודה פורסמה בהצלחה!' }
        ]);

    } catch (error) {
        console.error('[IVR] Error posting job:', error);
        await call.id_list_message([
            { type: 'text', data: 'שגיאה בפרסום. נסה שוב.' }
        ]);
    }

    return handleMainMenu(call);
}
