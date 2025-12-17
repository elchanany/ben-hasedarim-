import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Job, JobSearchFilters, JobDifficulty, PaymentMethod, PaymentType, JobDateType } from '../types';
import { JobCard } from '../components/JobCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { CheckboxGroup } from '../components/CheckboxGroup';
import { RangeInputGroup } from '../components/RangeInputGroup';
import { HebrewDatePicker } from '../components/HebrewDatePicker';
import { Modal } from '../components/Modal';
import type { PageProps } from '../App';
import {
  ISRAELI_CITIES, SORT_OPTIONS, SortById, INITIAL_JOBS_DISPLAY_COUNT,
  PAYMENT_KIND_OPTIONS, PAYMENT_METHOD_FILTER_OPTIONS, useDateTypeOptions, DURATION_FLEXIBILITY_OPTIONS, SUITABILITY_FOR_OPTIONS, JOB_DIFFICULTY_FILTER_OPTIONS
} from '../constants';
import { UserIcon, PlusCircleIcon, SearchIcon, FilterIcon } from '../components/icons';
import { countActiveFilters } from '../utils/filterUtils';
import { useAuth } from '../hooks/useAuth';
import * as jobService from '../services/jobService';


const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const initialFiltersState: JobSearchFilters = {
  term: '',
  location: '',
  difficulty: '',
  sortBy: 'newest' as SortById,
  dateType: '',
  specificDateStart: null,
  specificDateEnd: null,
  minEstimatedDurationHours: '',
  maxEstimatedDurationHours: '',
  filterDurationFlexible: 'any',
  paymentKind: 'any',
  minHourlyRate: '',
  maxHourlyRate: '',
  minGlobalPayment: '',
  maxGlobalPayment: '',
  selectedPaymentMethods: new Set<PaymentMethod>(),
  minPeopleNeeded: '',
  maxPeopleNeeded: '',
  suitabilityFor: 'any',
  minAge: '',
  maxAge: ''
};


export const HomePage: React.FC<PageProps> = ({ setCurrentPage }) => {
  const { user } = useAuth();
  const [hotJobs, setHotJobs] = useState<Job[]>([]);
  const [loadingHotJobs, setLoadingHotJobs] = useState(true);

  const [displayedJobs, setDisplayedJobs] = useState<Job[]>([]);
  const [loadingDisplayedJobs, setLoadingDisplayedJobs] = useState(true);
  const [homeFilters, setHomeFilters] = useState<JobSearchFilters>(initialFiltersState);
  const [showHomeAdvancedFilters, setShowHomeAdvancedFilters] = useState(false);
  const [isMobileFilterSectionOpen, setIsMobileFilterSectionOpen] = useState(false);


  const fetchHotJobs = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoadingHotJobs(true);
    try {
      const fetchedHotJobs = await jobService.getHotJobs(8);
      setHotJobs(fetchedHotJobs);
    } catch (error) {
      console.error("Error fetching hot jobs:", error);
    }
    setLoadingHotJobs(false);
  }, []);

  const fetchDisplayedJobs = useCallback(async (currentFilters: JobSearchFilters, isRefresh = false) => {
    if (!isRefresh) setLoadingDisplayedJobs(true);
    try {
      const results = await jobService.searchJobs({
        term: currentFilters.term,
        location: currentFilters.location,
        difficulty: currentFilters.difficulty || undefined,
        sortBy: currentFilters.sortBy as SortById,
        dateType: currentFilters.dateType || undefined,
        specificDateStart: currentFilters.specificDateStart || undefined,
        specificDateEnd: currentFilters.specificDateEnd || undefined,
        minEstimatedDurationHours: currentFilters.minEstimatedDurationHours,
        maxEstimatedDurationHours: currentFilters.maxEstimatedDurationHours,
        filterDurationFlexible: currentFilters.filterDurationFlexible,
        paymentKind: currentFilters.paymentKind,
        minHourlyRate: currentFilters.minHourlyRate,
        maxHourlyRate: currentFilters.maxHourlyRate,
        minGlobalPayment: currentFilters.minGlobalPayment,
        maxGlobalPayment: currentFilters.maxGlobalPayment,
        selectedPaymentMethods: currentFilters.selectedPaymentMethods,
        minPeopleNeeded: currentFilters.minPeopleNeeded,
        maxPeopleNeeded: currentFilters.maxPeopleNeeded,
        suitabilityFor: currentFilters.suitabilityFor,
        minAge: currentFilters.minAge,
        maxAge: currentFilters.maxAge,
      });
      const numToShow = Math.max(INITIAL_JOBS_DISPLAY_COUNT, 8);
      setDisplayedJobs(results.slice(0, numToShow));
    } catch (error) {
      console.error("Error fetching displayed jobs:", error);
    }
    setLoadingDisplayedJobs(false);
  }, []);

  useEffect(() => {
    fetchHotJobs();
    fetchDisplayedJobs(homeFilters);

    // Refresh jobs every 10 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchHotJobs(true);
      fetchDisplayedJobs(homeFilters, true);
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [fetchHotJobs, fetchDisplayedJobs, homeFilters]);

  const handleJobDeleted = useCallback((deletedJobId: string) => {
    setHotJobs(prev => prev.filter(job => job.id !== deletedJobId));
    setDisplayedJobs(prev => prev.filter(job => job.id !== deletedJobId));
  }, []);

  const handleHomeFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setHomeFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleHomePaymentMethodChange = (valueKey: string, checked: boolean) => {
    setHomeFilters(prev => {
      const newSet = new Set(prev.selectedPaymentMethods);
      if (checked) newSet.add(valueKey as PaymentMethod);
      else newSet.delete(valueKey as PaymentMethod);
      return { ...prev, selectedPaymentMethods: newSet };
    });
  };

  const handleHomeDateChange = (name: 'specificDateStart' | 'specificDateEnd', date: string | null) => {
    setHomeFilters(prev => ({ ...prev, [name]: date }));
  };

  const handleHomeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDisplayedJobs(homeFilters, true);
    setIsMobileFilterSectionOpen(false);
  };

  const resetHomeFilters = () => {
    setHomeFilters(initialFiltersState);
    fetchDisplayedJobs(initialFiltersState, true);
  }

  const cityOptions = ISRAELI_CITIES.map(city => ({ value: city.name, label: city.name }));
  const fieldSetClassName = "p-4 border border-light-blue/30 rounded-md bg-light-blue/10";
  const legendClassName = "text-md font-semibold text-royal-blue mb-3 text-right px-1";
  const activeFilterCount = countActiveFilters(homeFilters, initialFiltersState);

  const filterFormContent = (
    <form onSubmit={handleHomeSearchSubmit} className="space-y-4">
      <div className={`${fieldSetClassName} space-y-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <Input label="חיפוש חופשי (כותרת, תיאור)" id="home_term" name="term" value={homeFilters.term} onChange={handleHomeFilterChange} placeholder="לדוגמה: מלצרות, הובלה דחופה..." containerClassName="mb-0" />
          <Select label="אזור / עיר" id="home_location" name="location" options={[{ value: '', label: 'כל הארץ' }, ...cityOptions]} value={homeFilters.location} onChange={handleHomeFilterChange} containerClassName="mb-0" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
          <span className="font-semibold text-gray-700 text-sm">מיין לפי:</span>
          {SORT_OPTIONS.map(opt => (
            <Button key={opt.id} type="button" variant={homeFilters.sortBy === opt.id ? 'primary' : 'outline'} size="sm" onClick={() => setHomeFilters(prev => ({ ...prev, sortBy: opt.id }))} className="!px-3 !py-1.5 text-xs sm:text-sm">
              {opt.label}
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => fetchDisplayedJobs(homeFilters, true)} icon={<RefreshIcon className="w-4 h-4" />} className="!px-3 !py-1.5 mr-auto rtl:ml-auto rtl:mr-0">רענן</Button>
        </div>
      </div>

      <Button type="button" variant="outline" onClick={() => setShowHomeAdvancedFilters(!showHomeAdvancedFilters)} className="w-full text-royal-blue hover:bg-light-pink">
        {showHomeAdvancedFilters ? 'הסתר מסננים מתקדמים ➖' : 'הצג מסננים מתקדמים ➕'}
      </Button>

      {showHomeAdvancedFilters && (
        <div className="space-y-6 animate-fade-in-down">
          <fieldset className={fieldSetClassName}>
            <legend className={legendClassName}>תאריך וזמן</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="זמינות העבודה" name="dateType" options={useDateTypeOptions()} value={homeFilters.dateType} onChange={handleHomeFilterChange} />
              {homeFilters.dateType === 'specificDate' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                  <HebrewDatePicker label="מתאריך" value={homeFilters.specificDateStart} onChange={(date) => handleHomeDateChange('specificDateStart', date)} id="home_specificDateStart" />
                  <HebrewDatePicker label="עד תאריך" value={homeFilters.specificDateEnd} onChange={(date) => handleHomeDateChange('specificDateEnd', date)} id="home_specificDateEnd" />
                </div>
              )}
              <RangeInputGroup
                label="משך משוער (שעות)"
                minName="minEstimatedDurationHours"
                minValue={homeFilters.minEstimatedDurationHours}
                onMinChange={handleHomeFilterChange}
                maxName="maxEstimatedDurationHours"
                maxValue={homeFilters.maxEstimatedDurationHours}
                onMaxChange={handleHomeFilterChange}
                unitSymbol="שעות"
                disabled={homeFilters.filterDurationFlexible === 'yes'}
              />
              <Select label="האם משך הזמן גמיש?" name="filterDurationFlexible" options={DURATION_FLEXIBILITY_OPTIONS} value={homeFilters.filterDurationFlexible} onChange={handleHomeFilterChange} />
            </div>
          </fieldset>

          <fieldset className={fieldSetClassName}>
            <legend className={legendClassName}>תשלום</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
              <Select label="סוג תשלום" name="paymentKind" options={PAYMENT_KIND_OPTIONS} value={homeFilters.paymentKind} onChange={handleHomeFilterChange} />
              {(homeFilters.paymentKind === 'any' || homeFilters.paymentKind === PaymentType.HOURLY) && (
                <RangeInputGroup label="שכר שעתי" minName="minHourlyRate" minValue={homeFilters.minHourlyRate} onMinChange={handleHomeFilterChange} maxName="maxHourlyRate" maxValue={homeFilters.maxHourlyRate} onMaxChange={handleHomeFilterChange} unitSymbol="₪ לשעה" />
              )}
              {(homeFilters.paymentKind === 'any' || homeFilters.paymentKind === PaymentType.GLOBAL) && (
                <RangeInputGroup label="שכר גלובלי" minName="minGlobalPayment" minValue={homeFilters.minGlobalPayment} onMinChange={handleHomeFilterChange} maxName="maxGlobalPayment" maxValue={homeFilters.maxGlobalPayment} onMaxChange={handleHomeFilterChange} unitSymbol="₪ סהכ" />
              )}
              <div className="md:col-span-2">
                <CheckboxGroup legend="אופן תשלום" name="home_selectedPaymentMethods" options={PAYMENT_METHOD_FILTER_OPTIONS} selectedValues={homeFilters.selectedPaymentMethods} onChange={handleHomePaymentMethodChange} legendClassName="text-sm font-medium text-gray-700 mb-1 text-right" />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldSetClassName}>
            <legend className={legendClassName}>התאמה ודרישות נוספות</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RangeInputGroup label="מספר אנשים דרושים" minName="minPeopleNeeded" minValue={homeFilters.minPeopleNeeded} onMinChange={handleHomeFilterChange} maxName="maxPeopleNeeded" maxValue={homeFilters.maxPeopleNeeded} onMaxChange={handleHomeFilterChange} unitSymbol="אנשים" />
              <Select label="מיועד ל..." name="suitabilityFor" options={SUITABILITY_FOR_OPTIONS} value={homeFilters.suitabilityFor} onChange={handleHomeFilterChange} />
              <RangeInputGroup label="גיל המועמד" minName="minAge" minValue={homeFilters.minAge} onMinChange={handleHomeFilterChange} maxName="maxAge" maxValue={homeFilters.maxAge} onMaxChange={handleHomeFilterChange} unitSymbol="שנים" />
              <Select label="רמת קושי" id="home_difficulty" name="difficulty" options={JOB_DIFFICULTY_FILTER_OPTIONS} value={homeFilters.difficulty} onChange={handleHomeFilterChange} containerClassName="mb-0" />
            </div>
          </fieldset>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
        <Button type="submit" variant="primary" size="lg" icon={<SearchIcon className="w-5 h-5" />} className="w-full sm:w-auto">
          סנן משרות מוצגות
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={resetHomeFilters} className="w-full sm:w-auto text-gray-700 hover:bg-gray-100">
          אפס מסננים
        </Button>
      </div>
    </form>
  );


  return (
    <div className="space-y-12">
      <section className="text-center py-10 md:py-16 animate-fade-in-down bg-blue-100 rounded-2xl mx-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-royal-blue mb-4">
          בין הסדורים - אתר העבודות הזמניות של הציבור החרדי
        </h1>
        <p className="text-lg sm:text-xl text-medium-text max-w-2xl mx-auto mb-8">
          לוח העבודות המוביל לציבור החרדי. מצאו עבודות זמניות וגמישות, או פרסמו משרות והגיעו לקהל איכותי וממוקד.
        </p>
        <Button variant="secondary" size="lg" onClick={() => setCurrentPage('postJob')} icon={<PlusCircleIcon className="w-7 h-7" />} className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 !px-8 !py-4 !text-xl mx-auto">
          פרסמו עבודה חדשה
        </Button>
      </section>

      <section className="animate-slide-in-right">
        <h2 className="text-3xl font-bold text-deep-pink mb-2 text-center">העבודות החמות של היום 🔥</h2>
        <p className="text-center text-gray-600 mb-8">משרות פופולריות שמתעדכנות באופן שוטף.</p>
        {loadingHotJobs ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-yellow-100/80 border border-yellow-300/60 p-6 rounded-xl shadow-lg animate-pulse">
                <div className="h-8 bg-light-blue/40 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-light-blue/40 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-light-blue/40 rounded w-1/3 mb-2"></div>
                <div className="h-10 bg-light-blue/40 rounded w-1/4 mt-4"></div>
              </div>
            ))}
          </div>
        ) : hotJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hotJobs.map((job) => (
              <JobCard key={job.id} job={job} setCurrentPage={setCurrentPage} isHotJob={true} onJobDeleted={handleJobDeleted} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">אין כרגע עבודות חמות. נסו לחפש או חזרו מאוחר יותר!</p>
        )}
      </section>

      <section className="animate-slide-in-left">
        <h2 className="text-3xl font-bold text-royal-blue mb-2 text-center">כל העבודות</h2>
        <p className="text-center text-gray-600 mb-8">סינון משרות זמינות.</p>

        <div className="md:hidden mb-4">
          <Button
            onClick={() => setIsMobileFilterSectionOpen(!isMobileFilterSectionOpen)}
            variant="secondary"
            size="lg"
            className="w-full flex items-center justify-center relative"
            icon={<FilterIcon className="w-5 h-5" />}
            aria-expanded={isMobileFilterSectionOpen}
            aria-controls="mobile-filter-section-home"
          >
            סינון משרות
            {activeFilterCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[1.5rem] h-6 px-2 bg-royal-blue text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {isMobileFilterSectionOpen && (
            <div id="mobile-filter-section-home" className="mt-4 p-4 bg-light-pink/60 rounded-lg shadow-md animate-fade-in-down border border-light-pink/40">
              {filterFormContent}
            </div>
          )}
        </div>

        <div className="hidden md:block mb-6 p-4 bg-light-pink/60 rounded-lg shadow-md border border-light-pink/40">
          {filterFormContent}
        </div>
        {!loadingDisplayedJobs && <p className="text-sm text-gray-600 text-center pt-0 pb-4 md:pt-4">מציג {displayedJobs.length} משרות התואמות את הסינון שלך מתוך המאגר.</p>}


        {loadingDisplayedJobs ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(Math.max(INITIAL_JOBS_DISPLAY_COUNT, 8))].map((_, i) => (
              <div key={i} className="bg-light-blue/20 border border-light-blue/30 p-6 rounded-xl shadow-lg animate-pulse">
                <div className="h-8 bg-light-pink/40 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-light-pink/40 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-light-pink/40 rounded w-1/3 mb-2"></div>
                <div className="h-10 bg-light-pink/40 rounded w-1/4 mt-4"></div>
              </div>
            ))}
          </div>
        ) : displayedJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedJobs.map((job) => (
              <JobCard key={job.id} job={job} setCurrentPage={setCurrentPage} onJobDeleted={handleJobDeleted} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">לא נמצאו משרות התואמות את הסינון. נסו לשנות את התנאים.</p>
        )}
        <div className="text-center mt-10">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              const paramsForSearchPage = Object.fromEntries(
                Object.entries(homeFilters)
                  .filter(([, value]) => value !== '' && value !== null && !(value instanceof Set && value.size === 0) && value !== undefined)
                  .map(([key, value]) => {
                    if (key === 'category') return null;
                    return [key, value instanceof Set ? Array.from(value).join(',') : String(value)];
                  })
                  .filter(Boolean) as [string, string][]
              );
              setCurrentPage('searchResults', paramsForSearchPage);
            }}
            icon={<SearchIcon className="w-5 h-5" />}
            className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            לכל המשרות (חיפוש מתקדם)
          </Button>
        </div>
      </section>

      <section className="bg-blue-100 py-12 px-6 rounded-xl shadow-lg text-center animate-fade-in-up border border-blue-200 mx-4">
        <UserIcon className="w-16 h-16 text-deep-pink mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-royal-blue mb-4">צריכים כוח עבודה זמין ואיכותי לעבודה מיידית?</h2>
        <p className="text-gray-700 mb-6 max-w-lg mx-auto">
          מחפשים עובדים לעבודה זמנית, פרויקט קצר מועד, או סיוע נקודתי?
          'בין הסדורים' הוא המקום המושלם למצוא בחורי ישיבות ובנות סמינר זריזים ומוכשרים,
          הזמינים לעבודות מזדמנות וקצרות. <strong>לא למשרות קבועות.</strong>
        </p>
        <Button variant="secondary" size="lg" onClick={() => setCurrentPage('postJob')} className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mx-auto">
          פרסמו עבודה חדשה
        </Button>
      </section>
    </div>
  );
};