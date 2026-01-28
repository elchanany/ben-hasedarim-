/**
 * Jobs List Handler
 * 
 * Handles browsing and filtering jobs via phone with advanced filters:
 * - Area/City selection
 * - Salary range (min-max)
 * - Age range (min-max)
 */

import { Call } from 'yemot-router2';
import * as admin from 'firebase-admin';
import { formatJobWithAudio, formatPhoneForReadout } from '../utils/jobFormatter';
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
    { key: '0', name: 'כל הארץ' },
];

interface JobFilters {
    area?: string;
    minSalary?: number;
    maxSalary?: number;
    salaryType?: 'hourly' | 'global' | 'any';
    minAge?: number;
    maxAge?: number;
}

export async function handleJobsList(call: Call): Promise<any> {
    console.log('[IVR] ===== JOBS LIST HANDLER =====');

    try {
        const filters = await collectFilters(call);
        console.log('[IVR] Filters collected:', filters);

        const jobs = await fetchAndFilterJobs(filters);
        console.log(`[IVR] Found ${jobs.length} jobs after filtering`);

        if (jobs.length === 0) {
            console.log('[IVR] No jobs found, returning to main menu');
            await call.id_list_message([
                audioFile(AUDIO_FILES.NO_JOBS_FOUND)
            ], { prependToNextAction: true });
            return handleMainMenu(call);
        }

        await presentJobs(call, jobs);

        console.log('[IVR] Jobs presentation complete, returning to main menu');
        return handleMainMenu(call);

    } catch (error) {
        console.error('[IVR] Error in jobs list handler:', error);
        console.error('[IVR] Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
        });
        throw error;
    }
}

async function collectFilters(call: Call): Promise<JobFilters> {
    console.log('[IVR] === Collecting Filters ===');
    const filters: JobFilters = {};

    // Main filter menu
    const filterChoice = await call.read(
        [audioFile(AUDIO_FILES.JOBS_MENU_OPTIONS)],
        'tap',
        { val_name: 'filter_choice', max_digits: 1 }
    );

    console.log(`[IVR] Filter choice: ${filterChoice}`);

    if (filterChoice === '*') {
        console.log('[IVR] User chose to return to main menu');
        return filters; // Will be handled by caller
    }

    if (filterChoice === '1') {
        // No filtering - show all jobs
        console.log('[IVR] No filtering selected');
        return filters;
    }

    if (filterChoice === '2') {
        // Area filtering
        console.log('[IVR] Area filtering selected');
        filters.area = await collectAreaFilter(call);
    }

    if (filterChoice === '3') {
        // Salary filtering
        console.log('[IVR] Salary filtering selected');
        const salaryFilter = await collectSalaryFilter(call);
        filters.minSalary = salaryFilter.min;
        filters.maxSalary = salaryFilter.max;
        filters.salaryType = salaryFilter.type;
    }

    if (filterChoice === '4') {
        // Age filtering
        console.log('[IVR] Age filtering selected');
        const ageFilter = await collectAgeFilter(call);
        filters.minAge = ageFilter.min;
        filters.maxAge = ageFilter.max;
    }

    return filters;
}

async function collectAreaFilter(call: Call): Promise<string | undefined> {
    const areaChoice = await call.read(
        [audioFile(AUDIO_FILES.AREA_OPTIONS)],
        'tap',
        { val_name: 'area_choice', max_digits: 1 }
    );

    const selectedCity = CITIES.find(c => c.key === areaChoice);
    const area = selectedCity?.name;

    console.log(`[IVR] Area selected: ${area || 'None'} (choice: ${areaChoice})`);

    return area === 'כל הארץ' ? undefined : area;
}

async function collectSalaryFilter(call: Call): Promise<{ min?: number; max?: number; type?: 'hourly' | 'global' | 'any' }> {
    // First ask: hourly, global, or any
    const typeChoice = await call.read(
        [audioFile(AUDIO_FILES.SALARY_OR_GLOBAL)],
        'tap',
        { val_name: 'salary_type', max_digits: 1 }
    );

    console.log(`[IVR] Salary type choice: ${typeChoice}`);

    if (typeChoice === '0') {
        // All types
        return { type: 'any' };
    }

    if (typeChoice === '2') {
        // Global payment only
        return { type: 'global' };
    }

    // Hourly payment - collect range
    const minSalary = await call.read(
        [audioFile(AUDIO_FILES.ENTER_MIN_SALARY)],
        'tap',
        { val_name: 'min_salary', block_asterisk_key: false }
    );

    const min = parseInt(minSalary) || undefined;
    console.log(`[IVR] Min salary: ${min}`);

    const maxSalary = await call.read(
        [audioFile(AUDIO_FILES.ENTER_MAX_SALARY)],
        'tap',
        { val_name: 'max_salary', block_asterisk_key: false }
    );

    const max = parseInt(maxSalary) || undefined;
    console.log(`[IVR] Max salary: ${max}`);

    return { min, max, type: 'hourly' };
}

async function collectAgeFilter(call: Call): Promise<{ min?: number; max?: number }> {
    const minAge = await call.read(
        [audioFile(AUDIO_FILES.ENTER_MIN_AGE)],
        'tap',
        { val_name: 'min_age', block_asterisk_key: false }
    );

    const min = parseInt(minAge) || undefined;
    console.log(`[IVR] Min age: ${min}`);

    const maxAge = await call.read(
        [audioFile(AUDIO_FILES.ENTER_MAX_AGE)],
        'tap',
        { val_name: 'max_age', block_asterisk_key: false }
    );

    const max = parseInt(maxAge) || undefined;
    console.log(`[IVR] Max age: ${max}`);

    return { min, max };
}

async function fetchAndFilterJobs(filters: JobFilters): Promise<any[]> {
    console.log('[IVR] === Fetching Jobs from Firestore ===');

    const db = admin.firestore();

    // First, let's check total jobs count for debugging
    const totalSnapshot = await db.collection('jobs').get();
    console.log(`[IVR] Total jobs in database: ${totalSnapshot.size}`);

    const postedSnapshot = await db.collection('jobs').where('isPosted', '==', true).get();
    console.log(`[IVR] Jobs with isPosted=true: ${postedSnapshot.size}`);

    const query: admin.firestore.Query = db.collection('jobs')
        .where('isPosted', '==', true)
        .orderBy('postedDate', 'desc')
        .limit(20);

    const snapshot = await query.get();
    console.log(`[IVR] Fetched ${snapshot.size} jobs from Firestore query`);

    if (snapshot.empty) {
        console.log('[IVR] Query returned empty - checking why...');
        // Log first few jobs to see their isPosted status
        const sampleDocs = totalSnapshot.docs.slice(0, 5);
        sampleDocs.forEach((doc, i) => {
            const data = doc.data();
            console.log(`[IVR] Sample job ${i + 1}: id=${doc.id}, isPosted=${data.isPosted}, postedDate=${data.postedDate}`);
        });
        return [];
    }

    // Filter jobs
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let jobs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(job => {
            // Area filter
            if (filters.area) {
                const jobArea = job.area || job.city || '';
                if (!jobArea.includes(filters.area)) {
                    console.log(`[IVR] Job ${job.id} filtered out by area`);
                    return false;
                }
            }

            // Salary filter
            if (filters.salaryType === 'global') {
                if (job.paymentType !== 'global') {
                    console.log(`[IVR] Job ${job.id} filtered out - not global payment`);
                    return false;
                }
            } else if (filters.salaryType === 'hourly') {
                if (job.paymentType !== 'hourly') {
                    console.log(`[IVR] Job ${job.id} filtered out - not hourly payment`);
                    return false;
                }

                const jobSalary = job.hourlyRate || 0;
                if (filters.minSalary && jobSalary < filters.minSalary) {
                    console.log(`[IVR] Job ${job.id} filtered out - salary too low`);
                    return false;
                }
                if (filters.maxSalary && jobSalary > filters.maxSalary) {
                    console.log(`[IVR] Job ${job.id} filtered out - salary too high`);
                    return false;
                }
            }

            // Age filter
            const jobMinAge = job.minimumAge || 0;
            if (filters.minAge && jobMinAge > filters.minAge) {
                console.log(`[IVR] Job ${job.id} filtered out - minimum age too high`);
                return false;
            }
            if (filters.maxAge && jobMinAge < filters.maxAge) {
                // Job is suitable if its minimum age is within the caller's age range
                // This logic might need adjustment based on requirements
            }

            // Date expiry filter (same as before)
            if (!job.dateType || job.dateType === 'flexibleDate') return true;

            if (job.dateType === 'today' || job.dateType === 'specificDate') {
                if (!job.specificDate) return false;
                const jobDate = new Date(job.specificDate);
                jobDate.setHours(0, 0, 0, 0);
                return jobDate >= today;
            }

            if (job.dateType === 'comingWeek') {
                const refDate = job.specificDate ? new Date(job.specificDate) : new Date(job.postedDate);
                refDate.setHours(0, 0, 0, 0);
                const nextWeek = new Date(refDate);
                nextWeek.setDate(refDate.getDate() + 7);
                return nextWeek >= today;
            }

            return true;
        });

    console.log(`[IVR] ${jobs.length} jobs remaining after filtering`);
    return jobs.slice(0, 10); // Limit to 10 for phone presentation
}

async function presentJobs(call: Call, jobs: any[]): Promise<void> {
    console.log(`[IVR] === Presenting ${jobs.length} Jobs ===`);

    // Announce number of jobs found with audio
    await call.id_list_message([
        audioFile(AUDIO_FILES.FOUND_JOBS), // "נמצאו"
        { type: 'number', data: String(jobs.length) },
        audioFile(AUDIO_FILES.JOBS_PLURAL) // "עבודות"
    ], { prependToNextAction: true });

    // Present each job
    for (let i = 0; i < jobs.length; i++) {
        const job: any = jobs[i];
        console.log(`[IVR] Presenting job ${i + 1}/${jobs.length}: ${job.id}`);

        // Use audio-based job formatting
        const jobMessages = formatJobWithAudio(job, false);

        // Track view
        await incrementJobStat(job.id, 'views');

        const action = await call.read(
            [
                audioFile(AUDIO_FILES.JOB_NUMBER), // "עבודה מספר"
                { type: 'number', data: String(i + 1) },
                ...jobMessages,
                audioFile(AUDIO_FILES.JOB_NAVIGATION)
            ],
            'tap',
            { val_name: `job_action_${i}`, max_digits: 1 }
        );

        console.log(`[IVR] User action for job ${i + 1}: ${action}`);

        if (action === '1') {
            // Full details
            console.log(`[IVR] User requested full details for job ${i + 1}`);
            await presentJobDetails(call, job, i);

        } else if (action === '3') {
            // Return to filter menu
            console.log('[IVR] User chose to return to filter menu');
            return; // Will return to main menu

        } else if (action === '*') {
            // Return to main menu
            console.log('[IVR] User chose to return to main menu');
            return;
        }

        // action === '2' continues to next job
    }

    // All jobs presented
    console.log('[IVR] All jobs presented');
    await call.id_list_message([
        audioFile(AUDIO_FILES.ALL_JOBS_DONE)
    ], { prependToNextAction: true });
}

async function presentJobDetails(call: Call, job: any, index: number): Promise<void> {
    console.log(`[IVR] === Presenting Full Details for Job ${index + 1} ===`);

    // Use audio-based job formatting with full details
    const fullDetailsMessages = formatJobWithAudio(job, true);

    const detailAction = await call.read(
        [
            ...fullDetailsMessages,
            audioFile(AUDIO_FILES.JOB_DETAILS_OPTIONS) // "לשמיעת פרטי יצירת קשר הקישו 1, להמשך הקישו 2"
        ],
        'tap',
        { val_name: `detail_action_${index}`, max_digits: 1 }
    );

    console.log(`[IVR] Detail action: ${detailAction}`);

    if (detailAction === '1' && job.contactPhone) {
        console.log(`[IVR] User requested contact details for job ${index + 1}`);

        // Track contact attempt (Application/Contact click)
        await incrementJobStat(job.id, 'contactAttempts');
        await incrementJobStat(job.id, 'applicationCount'); // Also count as "application" for consistency with site logic

        const phoneFormatted = formatPhoneForReadout(job.contactPhone);
        await call.id_list_message([
            audioFile(AUDIO_FILES.PHONE_NUMBER_CONTACT), // "מספר הטלפון ליצירת קשר"
            { type: 'digits', data: phoneFormatted }
        ], { prependToNextAction: true });
    }
}

/**
 * Increment job view/contact/application stats
 */
async function incrementJobStat(jobId: string, field: 'views' | 'contactAttempts' | 'applicationCount'): Promise<void> {
    try {
        const db = admin.firestore();
        await db.collection('jobs').doc(jobId).update({
            [field]: admin.firestore.FieldValue.increment(1)
        });
        console.log(`[IVR] Incremented ${field} for job ${jobId}`);
    } catch (error) {
        console.error(`[IVR] Failed to increment ${field} for job ${jobId}:`, error);
        // Don't throw - stats are not critical enough to crash the call
    }
}
