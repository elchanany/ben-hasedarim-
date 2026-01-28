/**
 * Post Job Handler
 * 
 * Handles posting a new job via phone with:
 * - Voice recording for job title with STT confirmation
 * - Area selection
 * - Difficulty level
 * - Payment type and amount
 * - Contact phone
 * - Suitability (men/women/all)
 * - Minimum age requirement
 * - Full summary confirmation before posting
 */

import { Call, Msg } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { handleMainMenu } from './mainMenu';
import { AUDIO_FILES, audioFile } from '../audioFiles';

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
    { key: '0', name: 'כל הארץ' },  // Changed from 'אחר' - has audio wav.048
];

// City name to audio file mapping
const CITY_AUDIO_MAP: Record<string, string> = {
    'ירושלים': '054',
    'בני ברק': '051',
    'אשדוד': '049',
    'מודיעין עילית': '055',
    'ביתר עילית': '050',
    'אלעד': '052',
    'צפת': '057',
    'פתח תקווה': '056',
    'חיפה': '053',
    'כל הארץ': '048',
    'ארצי': '048',
    'אחר': '048',  // Fallback for old 'other' value
};

/**
 * Get city audio message - either pre-recorded or TTS fallback
 */
function getCityAudioMessage(cityName: string): { type: string; data: string } {
    const audioCode = CITY_AUDIO_MAP[cityName];
    if (audioCode) {
        return { type: 'file', data: audioCode };
    }
    // Fallback to TTS for unknown cities
    return { type: 'text', data: cityName };
}

export async function handlePostJob(call: Call): Promise<any> {
    console.log('[IVR] ===== POST JOB HANDLER =====');
    console.log(`[IVR] Caller phone: ${call.ApiPhone || 'Unknown'}`);

    try {
        // TODO: Check payment requirement
        // const paymentAllowed = await handlePosterPayment(call);
        // if (!paymentAllowed) {
        //     return handleMainMenu(call);
        // }

        // 1. Job Title (with confirmation loop)
        const title = await collectJobTitle(call);
        console.log(`[IVR] Job title confirmed: ${title}`);

        // 2. Area selection
        const area = await collectArea(call);
        console.log(`[IVR] Area selected: ${area}`);

        // 3. Difficulty
        const difficulty = await collectDifficulty(call);
        console.log(`[IVR] Difficulty selected: ${difficulty}`);

        // 4. Date type selection (NEW)
        const dateType = await collectDateType(call);
        console.log(`[IVR] Date type selected: ${dateType}`);

        // 5. Payment type and amount
        const payment = await collectPayment(call);
        console.log(`[IVR] Payment collected:`, payment);

        // 6. Suitability (moved BEFORE phone)
        const suitability = await collectSuitability(call);
        console.log(`[IVR] Suitability:`, suitability);

        // 7. Minimum age (moved BEFORE phone)
        const minimumAge = await collectMinimumAge(call);
        console.log(`[IVR] Minimum age: ${minimumAge}`);

        // 8. Contact phone (LAST before confirmation)
        const contactPhone = await collectContactPhone(call);
        console.log(`[IVR] Contact phone: ${contactPhone}`);

        // 9. Summary and confirmation
        const confirmed = await confirmJobDetails(call, {
            title,
            area,
            difficulty,
            dateType,
            payment,
            contactPhone,
            suitability,
            minimumAge
        });

        if (!confirmed) {
            console.log('[IVR] User cancelled job posting');
            await call.id_list_message([
                audioFile(AUDIO_FILES.PUBLISH_CANCELLED)
            ], { prependToNextAction: true });
            return handleMainMenu(call);
        }

        // 10. Save to Firestore
        await saveJob(call, {
            title,
            area,
            difficulty,
            dateType,
            payment,
            contactPhone,
            suitability,
            minimumAge
        });

        console.log('[IVR] Job posted successfully');
        await call.id_list_message([
            audioFile(AUDIO_FILES.JOB_PUBLISHED_SUCCESS)
        ], { prependToNextAction: true });

        return handleMainMenu(call);

    } catch (error) {
        console.error('[IVR] Error in post job handler:', error);
        console.error('[IVR] Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
        });

        await call.id_list_message([
            audioFile(AUDIO_FILES.PUBLISH_ERROR)
        ]);

        return handleMainMenu(call);
    }
}

async function collectJobTitle(call: Call): Promise<string> {
    console.log('[IVR] === Collecting Job Title ===');

    let title = '';
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        attempts++;
        console.log(`[IVR] Job title attempt ${attempts}/${maxAttempts}`);

        const messages: Msg[] = [];
        if (attempts === 1) {
            messages.push(audioFile(AUDIO_FILES.POST_JOB_INTRO));
        }

        title = await call.read(messages, 'record', { val_name: 'job_title' });

        if (!title) {
            console.log('[IVR] No title recorded');
            await call.id_list_message([
                audioFile(AUDIO_FILES.NO_NAME_TRY_AGAIN)
            ], { prependToNextAction: true });
            continue;
        }

        console.log(`[IVR] Title recorded: ${title}`);

        // Confirm title
        const confirmChoice = await call.read(
            [
                audioFile(AUDIO_FILES.JOB_TITLE_RECORDED),
                { type: 'text', data: title }, // Play back the recording
                audioFile(AUDIO_FILES.CONFIRM_OR_RERECORD)
            ],
            'tap',
            { val_name: 'confirm_title', max_digits: 1 }
        );

        console.log(`[IVR] Title confirmation choice: ${confirmChoice}`);

        if (confirmChoice === '1') {
            return title;
        }

        // User chose to re-record (choice '2' or anything else)
        console.log('[IVR] User chose to re-record title');
    }

    // Max attempts reached, use last recording
    console.log('[IVR] Max attempts reached, using last recording');
    return title || 'עבודה מהטלפון';
}

async function collectArea(call: Call): Promise<string> {
    console.log('[IVR] === Collecting Area ===');

    const areaChoice = await call.read(
        [
            audioFile(AUDIO_FILES.SELECT_JOB_AREA),
            audioFile(AUDIO_FILES.AREA_OPTIONS)
        ],
        'tap',
        { val_name: 'job_area', max_digits: 1 }
    );

    const selectedCity = CITIES.find(c => c.key === areaChoice);
    const area = selectedCity?.name || 'לא צוין';

    console.log(`[IVR] Area choice: ${areaChoice} -> ${area}`);
    return area;
}

async function collectDifficulty(call: Call): Promise<string> {
    console.log('[IVR] === Collecting Difficulty ===');

    const difficultyChoice = await call.read(
        [audioFile(AUDIO_FILES.DIFFICULTY_OPTIONS)],
        'tap',
        { val_name: 'job_difficulty', max_digits: 1 }
    );

    const difficulties: Record<string, string> = { '1': 'קלה', '2': 'בינונית', '3': 'קשה' };
    const difficulty = difficulties[difficultyChoice] || 'בינונית';

    console.log(`[IVR] Difficulty choice: ${difficultyChoice} -> ${difficulty}`);
    return difficulty;
}

async function collectDateType(call: Call): Promise<string> {
    console.log('[IVR] === Collecting Date Type ===');

    const dateChoice = await call.read(
        [audioFile(AUDIO_FILES.DATE_SELECTION_PROMPT)],
        'tap',
        { val_name: 'job_date_type', max_digits: 1 }
    );

    // 1 = today, 2 = this week, 3 = flexible
    const dateTypes: Record<string, string> = {
        '1': 'today',
        '2': 'comingWeek',
        '3': 'flexibleDate'
    };
    const dateType = dateTypes[dateChoice] || 'flexibleDate';

    console.log(`[IVR] Date type choice: ${dateChoice} -> ${dateType}`);
    return dateType;
}

async function collectPayment(call: Call): Promise<{ type: string; amount: number }> {
    console.log('[IVR] === Collecting Payment ===');

    const paymentChoice = await call.read(
        [audioFile(AUDIO_FILES.PAYMENT_TYPE_SELECT)],
        'tap',
        { val_name: 'payment_type', max_digits: 1 }
    );

    const isHourly = paymentChoice === '1';
    // Use Hebrew values to match website PaymentType enum
    const paymentType = isHourly ? 'לפי שעה' : 'גלובלי';
    console.log(`[IVR] Payment type: ${paymentType}`);

    const amountInput = await call.read(
        [audioFile(isHourly ? AUDIO_FILES.ENTER_HOURLY_RATE : AUDIO_FILES.ENTER_GLOBAL_AMOUNT)],
        'tap',
        { val_name: 'payment_amount', block_asterisk_key: false }
    );

    const amount = parseInt(amountInput) || 50;
    console.log(`[IVR] Payment amount: ${amount}`);

    return {
        type: paymentType,
        amount
    };
}

async function collectContactPhone(call: Call): Promise<string> {
    console.log('[IVR] === Collecting Contact Phone ===');

    const callerPhone = call.ApiPhone || '';

    const useCallerPhone = await call.read(
        [audioFile(AUDIO_FILES.PHONE_NUMBER_OPTIONS)],
        'tap',
        { val_name: 'use_caller_phone', max_digits: 1 }
    );

    if (useCallerPhone === '1') {
        console.log(`[IVR] Using caller phone: ${callerPhone}`);
        return callerPhone;
    }

    const contactPhone = await call.read(
        [audioFile(AUDIO_FILES.ENTER_PHONE_NUMBER)],
        'tap',
        { val_name: 'contact_phone', block_asterisk_key: false }
    );

    console.log(`[IVR] Contact phone entered: ${contactPhone}`);
    return contactPhone || callerPhone;
}

async function collectSuitability(call: Call): Promise<{ men: boolean; women: boolean; general: boolean }> {
    console.log('[IVR] === Collecting Suitability ===');

    const suitChoice = await call.read(
        [audioFile(AUDIO_FILES.SUITABILITY_SELECT)],
        'tap',
        { val_name: 'suitability', max_digits: 1 }
    );

    const suitability = {
        men: suitChoice === '1' || suitChoice === '3',
        women: suitChoice === '2' || suitChoice === '3',
        general: suitChoice === '3'
    };

    console.log(`[IVR] Suitability choice: ${suitChoice}`, suitability);
    return suitability;
}

async function collectMinimumAge(call: Call): Promise<number> {
    console.log('[IVR] === Collecting Minimum Age ===');

    const ageInput = await call.read(
        [audioFile(AUDIO_FILES.ENTER_MINIMUM_AGE)],
        'tap',
        { val_name: 'minimum_age', block_asterisk_key: false }
    );

    const age = parseInt(ageInput) || 16;
    console.log(`[IVR] Minimum age: ${age}`);

    return age;
}

async function confirmJobDetails(call: Call, jobData: any): Promise<boolean> {
    console.log('[IVR] === Confirming Job Details ===');

    // Build summary message
    const summaryParts: any[] = [
        audioFile(AUDIO_FILES.CONFIRM_JOB_DETAILS),
        audioFile(AUDIO_FILES.JOB_NAME),
        { type: 'text', data: jobData.title },
        audioFile(AUDIO_FILES.JOB_AREA),
        getCityAudioMessage(jobData.area),  // Use pre-recorded city audio
        audioFile(AUDIO_FILES.JOB_DIFFICULTY),
        { type: 'text', data: jobData.difficulty },
        audioFile(AUDIO_FILES.JOB_SALARY),
        { type: 'number', data: String(jobData.payment.amount) },
        audioFile(jobData.payment.type === 'לפי שעה' ? AUDIO_FILES.SHEKEL_PER_HOUR : AUDIO_FILES.GLOBAL_PAYMENT),
        audioFile(AUDIO_FILES.SUITABLE_FOR), // "מתאימה ל"
        audioFile(jobData.suitability.men && jobData.suitability.women ? AUDIO_FILES.MEN_AND_WOMEN :
            jobData.suitability.men ? AUDIO_FILES.MEN : AUDIO_FILES.WOMEN),
        audioFile(AUDIO_FILES.FROM_AGE),
        { type: 'number', data: String(jobData.minimumAge) }
    ];

    const confirmChoice = await call.read(
        [
            ...summaryParts,
            audioFile(AUDIO_FILES.CONFIRM_OR_EDIT)
        ],
        'tap',
        { val_name: 'confirm_job', max_digits: 1 }
    );

    const confirmed = confirmChoice === '1';
    console.log(`[IVR] Job confirmation: ${confirmed ? 'YES' : 'NO'}`);

    return confirmed;
}

async function saveJob(call: Call, jobData: any): Promise<void> {
    console.log('[IVR] === Saving Job to Firestore ===');

    try {
        const db = admin.firestore();
        const callerPhone = call.ApiPhone || 'Unknown';

        // Get serial number
        const counterRef = db.collection('counters').doc('jobs');
        const counterDoc = await counterRef.get();
        let serialNumber = 1;

        if (counterDoc.exists) {
            serialNumber = (counterDoc.data()?.current || 0) + 1;
            await counterRef.update({ current: serialNumber });
        } else {
            await counterRef.set({ current: 1 });
        }

        console.log(`[IVR] Assigned serial number: ${serialNumber}`);

        const newJob = {
            title: jobData.title,
            area: jobData.area,
            // Description shows this was posted via phone - don't expose caller phone in description
            description: `📞 עבודה זו פורסמה באמצעות קו הטלפון של האתר.\nלפרסום עבודות בטלפון חייגו: *6090`,
            difficulty: jobData.difficulty,
            paymentType: jobData.payment.type, // Now uses Hebrew: 'לפי שעה' or 'גלובלי'
            // Check for Hebrew payment type values
            hourlyRate: (jobData.payment.type === 'לפי שעה') ? jobData.payment.amount : null,
            globalPayment: (jobData.payment.type === 'גלובלי') ? jobData.payment.amount : null,
            suitability: {
                men: jobData.suitability.men,
                women: jobData.suitability.women,
                general: jobData.suitability.general,
                minAge: jobData.minimumAge
            },
            minimumAge: jobData.minimumAge,
            contactPhone: jobData.contactPhone,
            // Show phone number as the poster name
            contactDisplayName: callerPhone,
            // Contact methods - phone is always available for phone-posted jobs
            preferredContactMethods: {
                phone: true,
                email: false,
                whatsapp: false,
                allowSiteMessages: false
            },
            postedBy: {
                id: 'phone-user-' + callerPhone,
                // Show phone number as poster display name
                posterDisplayName: `פורסם בקו הטלפוני (${callerPhone})`
            },
            postedDate: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isPosted: true,
            serialNumber,
            postedVia: 'phone',
            callerPhone: callerPhone, // Store original caller phone
            dateType: jobData.dateType || 'flexibleDate', // Use selected date type
            // Required fields that website expects
            views: 0,
            contactAttempts: 0,
            applicationCount: 0,
            numberOfPeopleNeeded: 1,
            estimatedDurationIsFlexible: true,
            paymentMethod: 'מזומן' // Default payment method
        };

        const docRef = await db.collection('jobs').add(newJob);
        console.log(`[IVR] Job saved successfully: ${docRef.id}`);

    } catch (error) {
        console.error('[IVR] Error saving job to Firestore:', error);
        console.error('[IVR] Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
        });
        throw error;
    }
}
