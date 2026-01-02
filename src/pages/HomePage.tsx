
import React, { useState, useEffect, useCallback } from 'react';
import { Job, JobSearchFilters, PaymentMethod } from '../types';
import { JobCard } from '../components/JobCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { CheckboxGroup } from '../components/CheckboxGroup';
import { RangeInputGroup } from '../components/RangeInputGroup';
import { HebrewDatePicker } from '../components/HebrewDatePicker';
import type { PageProps } from '../App';
import {
  SORT_OPTIONS,
  PAYMENT_KIND_OPTIONS,
  SUITABILITY_FOR_OPTIONS,
  JOB_DIFFICULTY_FILTER_OPTIONS,
  DURATION_FLEXIBILITY_OPTIONS,
  PaymentType,
  useDateTypeOptions,
  getCityOptions,
  INITIAL_JOBS_DISPLAY_COUNT
} from '../constants';
import { SearchIcon, FilterIcon, RefreshIcon, CheckCircleIcon, PlusCircleIcon, AdjustmentsIcon, UserIcon } from '../components/icons';
import { countActiveFilters } from '../utils/filterUtils';
import { useAuth } from '../hooks/useAuth';
import * as jobService from '../services/jobService';

const initialFiltersState: JobSearchFilters = {
  term: '',
  location: '',
  difficulty: '',
  sortBy: 'newest',
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

type SortById = typeof SORT_OPTIONS[number]['id'];

export const HomePage: React.FC<PageProps> = ({ setCurrentPage }) => {
  const { user } = useAuth();
  const [hotJobs, setHotJobs] = useState<Job[]>([]);
  const [loadingHotJobs, setLoadingHotJobs] = useState(true);
  const dateTypeOptions = useDateTypeOptions();

  const [allFetchedJobs, setAllFetchedJobs] = useState<Job[]>([]);
  const [displayedJobs, setDisplayedJobs] = useState<Job[]>([]);
  const [displayLimit, setDisplayLimit] = useState(12);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); // New state for collapse
  const [loadingDisplayedJobs, setLoadingDisplayedJobs] = useState(true);
  const [homeFilters, setHomeFilters] = useState<JobSearchFilters>(initialFiltersState);
  const [debouncedTerm, setDebouncedTerm] = useState(initialFiltersState.term);
  const [showHomeAdvancedFilters, setShowHomeAdvancedFilters] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(homeFilters.term);
    }, 500); // Increased to 500ms for smoother experience
    return () => clearTimeout(timer);
  }, [homeFilters.term]);

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
    if (!isRefresh) {
      setLoadingDisplayedJobs(true);
      setAllFetchedJobs([]);
      setDisplayedJobs([]);
    }
    try {
      const results = await jobService.searchJobs(currentFilters);
      setAllFetchedJobs(results);
      setDisplayedJobs(results.slice(0, displayLimit));
    } catch (error) {
      console.error("Error fetching displayed jobs:", error);
      setAllFetchedJobs([]);
      setDisplayedJobs([]);
    }
    setLoadingDisplayedJobs(false);
  }, [displayLimit]);

  // Update displayed jobs when limit changes or fetched jobs change
  useEffect(() => {
    setDisplayedJobs(allFetchedJobs.slice(0, displayLimit));
  }, [allFetchedJobs, displayLimit]);

  useEffect(() => {
    fetchHotJobs();
  }, [fetchHotJobs]);

  useEffect(() => {
    // Re-fetch only when debounced term or other filters change
    const filtersToSync = { ...homeFilters, term: debouncedTerm };
    fetchDisplayedJobs(filtersToSync);

    const refreshInterval = setInterval(() => {
      fetchHotJobs(true);
      fetchDisplayedJobs(filtersToSync, true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchHotJobs, fetchDisplayedJobs, debouncedTerm,
    homeFilters.location, homeFilters.sortBy, homeFilters.dateType,
    homeFilters.specificDateStart, homeFilters.specificDateEnd,
    homeFilters.minEstimatedDurationHours, homeFilters.maxEstimatedDurationHours,
    homeFilters.filterDurationFlexible, homeFilters.paymentKind,
    homeFilters.minHourlyRate, homeFilters.maxHourlyRate,
    homeFilters.minGlobalPayment, homeFilters.maxGlobalPayment,
    homeFilters.selectedPaymentMethods, homeFilters.minPeopleNeeded,
    homeFilters.suitabilityFor, homeFilters.minAge, homeFilters.maxAge,
    homeFilters.difficulty]);

  const handleJobDeleted = useCallback((deletedJobId: string) => {
    setHotJobs(prev => prev.filter(job => job.id !== deletedJobId));
    setAllFetchedJobs(prev => prev.filter(job => job.id !== deletedJobId));
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
    fetchDisplayedJobs(homeFilters, true);
  };

  const resetHomeFilters = () => {
    setHomeFilters(initialFiltersState);
    fetchDisplayedJobs(initialFiltersState, true);
  }

  const cityOptions = getCityOptions();
  const activeFilterCount = countActiveFilters(homeFilters, initialFiltersState);

  const filterFormContent = (
    <>
      {/* Mobile Collapsed State */}
      <div className={`md:hidden ${isSearchExpanded ? 'hidden' : 'block'}`}>
        <button
          onClick={() => setIsSearchExpanded(true)}
          className="w-full bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center gap-3 text-gray-500"
        >
          <SearchIcon className="w-5 h-5 text-royal-blue" />
          <span className="text-sm font-medium">מה אתם מחפשים?</span>
        </button>
      </div>

      {/* Expanded State (Always visible on Desktop) */}
      <form
        onSubmit={(e) => {
          handleHomeSearchSubmit(e);
          setIsSearchExpanded(false); // Close on submit if desired
        }}
        className={`space-y-2 md:space-y-6 ${!isSearchExpanded ? 'hidden md:block' : 'block animate-fade-in-down'}`}
        noValidate
      >
        {/* Mobile: Close Button */}
        <div className="md:hidden flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setIsSearchExpanded(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <span className="text-sm border-b border-gray-300">סגור חיפוש</span>
          </button>
        </div>
        {/* Quick Search Row - CONDENSED on mobile */}
        <div className="bg-white/95 backdrop-blur-sm p-2 md:p-10 rounded-xl md:rounded-[2.5rem] shadow-md md:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/20 space-y-2 md:space-y-10 relative z-[100]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 items-end">
            <div className="md:col-span-5 lg:col-span-6">
              <Input
                label="מה אתם מחפשים?"
                id="home_term"
                name="term"
                value={homeFilters.term}
                onChange={handleHomeFilterChange}
                placeholder="לדוגמה: מלצרות..."
                containerClassName="mb-0"
                labelClassName="block text-[8px] md:text-sm font-bold text-gray-500 mb-0.5 md:mb-3 uppercase tracking-widest text-right px-1"
                inputClassName="!rounded-lg md:!rounded-2xl !py-1.5 md:!py-5 !px-2 md:!px-8 border-gray-200 bg-white shadow-sm focus:border-royal-blue focus:ring-8 focus:ring-royal-blue/5 transition-all text-xs md:text-xl font-semibold placeholder:text-gray-300"
              />
            </div>
            <div className="md:col-span-4 lg:col-span-3">
              <SearchableSelect
                label="איפה?"
                id="home_location"
                options={cityOptions}
                value={homeFilters.location}
                onChange={(val) => setHomeFilters(prev => ({ ...prev, location: val as string }))}
                className="mb-0"
              />
            </div>
            <div className="md:col-span-3 lg:col-span-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                icon={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
                className="w-full !rounded-lg md:!rounded-2xl !py-2 md:!py-5 shadow-lg shadow-royal-blue/20 transform hover:-translate-y-1 active:scale-[0.98] transition-all bg-gradient-to-r from-royal-blue to-blue-600 text-xs md:text-xl font-bold"
              >
                מצא עבודה
              </Button>
            </div>
          </div>

          {/* Sort & Quick Actions - CONDENSED on mobile */}
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 pt-2 md:pt-6 border-t border-gray-100/50">
            <div className="flex items-center gap-1 md:gap-4">
              <span className="text-[8px] md:text-sm font-bold text-gray-400 uppercase tracking-wider">מיין:</span>
              <div className="flex bg-gray-50 p-0.5 md:p-1 rounded-lg md:rounded-2xl border border-gray-100">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHomeFilters(prev => ({ ...prev, sortBy: opt.id as SortById }))}
                    className={`px-2 md:px-5 py-1 md:py-2 text-[9px] md:text-sm font-bold rounded-md md:rounded-xl transition-all ${homeFilters.sortBy === opt.id
                      ? 'bg-white text-royal-blue shadow-md shadow-gray-200/50'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={resetHomeFilters}
                className="px-6 py-2.5 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100/80 rounded-xl transition-all flex items-center gap-2 border border-red-100 shadow-sm active:scale-95"
              >
                <CheckCircleIcon className="w-4 h-4" />
                איפוס כל המסננים
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6 relative z-20">
          <button
            type="button"
            onClick={() => setShowHomeAdvancedFilters(!showHomeAdvancedFilters)}
            className={`group flex items-center gap-3 px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-xl ${showHomeAdvancedFilters
              ? 'bg-royal-blue text-white ring-4 ring-royal-blue/20'
              : 'bg-white text-royal-blue border border-gray-100 hover:border-royal-blue/30'
              }`}
          >
            <span className={`p-1.5 rounded-full transition-colors ${showHomeAdvancedFilters ? 'bg-white/20' : 'bg-royal-blue/10 group-hover:bg-royal-blue/20'}`}>
              <AdjustmentsIcon className={`w-5 h-5 transition-transform duration-500 ${showHomeAdvancedFilters ? 'text-white rotate-180' : 'text-royal-blue group-hover:text-royal-blue/80 group-hover:rotate-12'}`} />
            </span>
            {showHomeAdvancedFilters ? 'הסתר אפשרויות סינון' : `אפשרויות סינון מתקדמות (${activeFilterCount} פעילים)`}
          </button>
        </div>

        {showHomeAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mt-2 md:mt-4 animate-fade-in-down">
            <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
              <h4 className="flex items-center gap-2 text-royal-blue font-bold mb-2 pb-2 border-b border-gray-50 text-xs md:text-sm">
                <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-emerald-500"></span>
                זמן ותאריך
              </h4>
              <div className="space-y-2">
                <Select label="תאריך" name="dateType" options={dateTypeOptions} value={homeFilters.dateType} onChange={handleHomeFilterChange} className="!rounded-lg !py-1.5 md:!py-2 !text-xs md:!text-sm" labelClassName="!text-[10px] md:!text-xs !mb-0.5" containerClassName="!mb-1" />
                {homeFilters.dateType === 'specificDate' && (
                  <div className="grid grid-cols-2 gap-2">
                    <HebrewDatePicker label="מתאריך" value={homeFilters.specificDateStart} onChange={(date: any) => handleHomeDateChange('specificDateStart', date)} id="home_specificDateStart" />
                    <HebrewDatePicker label="עד תאריך" value={homeFilters.specificDateEnd} onChange={(date: any) => handleHomeDateChange('specificDateEnd', date)} id="home_specificDateEnd" />
                  </div>
                )}
                <RangeInputGroup label="משך (שעות)" minName="minEstimatedDurationHours" minValue={homeFilters.minEstimatedDurationHours} onMinChange={handleHomeFilterChange} maxName="maxEstimatedDurationHours" maxValue={homeFilters.maxEstimatedDurationHours} onMaxChange={handleHomeFilterChange} unitSymbol="ש'" labelClassName="!text-[10px] md:!text-xs !mb-0.5" inputClassName="!py-1.5 md:!py-2 !text-xs md:!text-sm" disabled={homeFilters.filterDurationFlexible === 'yes'} />
                <Select label="משך גמיש?" name="filterDurationFlexible" options={DURATION_FLEXIBILITY_OPTIONS} value={homeFilters.filterDurationFlexible} onChange={handleHomeFilterChange} className="!rounded-lg !py-1.5 md:!py-2 !text-xs md:!text-sm" labelClassName="!text-[10px] md:!text-xs !mb-0.5" containerClassName="!mb-1" />
              </div>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
              <h4 className="flex items-center gap-2 text-royal-blue font-bold mb-2 pb-2 border-b border-gray-50 text-xs md:text-sm">
                <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-amber-500"></span>
                תשלום ותנאים
              </h4>
              <div className="space-y-2">
                <Select label="סוג תשלום" name="paymentKind" options={PAYMENT_KIND_OPTIONS} value={homeFilters.paymentKind} onChange={handleHomeFilterChange} className="!rounded-lg !py-1.5 md:!py-2 !text-xs md:!text-sm" labelClassName="!text-[10px] md:!text-xs !mb-0.5" containerClassName="!mb-1" />
                {(homeFilters.paymentKind === 'any' || homeFilters.paymentKind === PaymentType.HOURLY) && (
                  <RangeInputGroup label="שכר שעתי" minName="minHourlyRate" minValue={homeFilters.minHourlyRate} onMinChange={handleHomeFilterChange} maxName="maxHourlyRate" maxValue={homeFilters.maxHourlyRate} onMaxChange={handleHomeFilterChange} unitSymbol="₪/ש'" labelClassName="!text-[10px] md:!text-xs !mb-0.5" inputClassName="!py-1.5 md:!py-2 !text-xs md:!text-sm" />
                )}
                {(homeFilters.paymentKind === 'any' || homeFilters.paymentKind === PaymentType.GLOBAL) && (
                  <RangeInputGroup label="שכר גלובלי" minName="minGlobalPayment" minValue={homeFilters.minGlobalPayment} onMinChange={handleHomeFilterChange} maxName="maxGlobalPayment" maxValue={homeFilters.maxGlobalPayment} onMaxChange={handleHomeFilterChange} unitSymbol="₪" labelClassName="!text-[10px] md:!text-xs !mb-0.5" inputClassName="!py-1.5 md:!py-2 !text-xs md:!text-sm" />
                )}
              </div>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
              <h4 className="flex items-center gap-2 text-royal-blue font-bold mb-2 pb-2 border-b border-gray-50 text-xs md:text-sm">
                <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-indigo-500"></span>
                קהל יעד ומורכבות
              </h4>
              <div className="space-y-2">
                <RangeInputGroup label="מספר אנשים" minName="minPeopleNeeded" minValue={homeFilters.minPeopleNeeded} onMinChange={handleHomeFilterChange} maxName="maxPeopleNeeded" maxValue={homeFilters.maxPeopleNeeded} onMaxChange={handleHomeFilterChange} unitSymbol="איש" labelClassName="!text-[10px] md:!text-xs !mb-0.5" inputClassName="!py-1.5 md:!py-2 !text-xs md:!text-sm" />
                <Select label="מיועד ל..." name="suitabilityFor" options={SUITABILITY_FOR_OPTIONS} value={homeFilters.suitabilityFor} onChange={handleHomeFilterChange} className="!rounded-lg !py-1.5 md:!py-2 !text-xs md:!text-sm" labelClassName="!text-[10px] md:!text-xs !mb-0.5" containerClassName="!mb-1" />
                <RangeInputGroup label="גיל" minName="minAge" minValue={homeFilters.minAge} onMinChange={handleHomeFilterChange} maxName="maxAge" maxValue={homeFilters.maxAge} onMaxChange={handleHomeFilterChange} unitSymbol="ש'" labelClassName="!text-[10px] md:!text-xs !mb-0.5" inputClassName="!py-1.5 md:!py-2 !text-xs md:!text-sm" />
                <Select label="רמת קושי" id="home_difficulty" name="difficulty" options={JOB_DIFFICULTY_FILTER_OPTIONS} value={homeFilters.difficulty} onChange={handleHomeFilterChange} containerClassName="!mb-0" className="!rounded-lg !py-1.5 md:!py-2 !text-xs md:!text-sm" labelClassName="!text-[10px] md:!text-xs !mb-0.5" />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 mt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={<SearchIcon className="w-5 h-5" />}
            className="w-full sm:w-auto !px-12 shadow-md hover:shadow-lg transition-all !rounded-xl"
          >
            חפש משרות
          </Button>
          <Button
            onClick={resetHomeFilters}
            variant="outline"
            size="sm"
            icon={<CheckCircleIcon className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto text-[10px] md:text-xs py-1.5 px-3 border-red-100 text-red-500 hover:bg-red-50"
          >
            אפס הכל
          </Button>
        </div>
      </form>
    </>
  );

  return (
    <div className="space-y-12">
      <section className="text-center py-8 md:py-16 animate-fade-in-down bg-blue-100 rounded-2xl mx-4 mt-4">
        <h1 className="text-2xl sm:text-5xl font-extrabold text-royal-blue mb-3 leading-tight">
          בין הסדורים - אתר העבודות הזמניות של הציבור החרדי
        </h1>
        <p className="text-sm sm:text-xl text-medium-text max-w-2xl mx-auto mb-6 px-2">
          לוח העבודות המוביל לציבור החרדי. מצאו עבודות זמניות וגמישות, או פרסמו משרות והגיעו לקהל איכותי וממוקד.
        </p>
        <Button variant="secondary" size="lg" onClick={() => setCurrentPage('postJob')} icon={<PlusCircleIcon className="w-7 h-7" />} className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 !px-8 !py-4 !text-xl mx-auto">
          פרסמו עבודה חדשה
        </Button>
      </section>

      <section className="animate-slide-in-right px-2">
        <h2 className="text-xl sm:text-3xl font-bold text-deep-pink mb-1 sm:mb-2 text-center">העבודות החמות של היום 🔥</h2>
        <p className="text-center text-xs sm:text-base text-gray-600 mb-6 sm:mb-8 px-4">משרות פופולריות שמתעדכנות באופן שוטף.</p>
        {loadingHotJobs ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 justify-items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-yellow-100/80 border border-yellow-300/60 p-4 sm:p-6 rounded-xl shadow-lg animate-pulse w-full max-w-[175px] sm:max-w-none">
                <div className="h-6 sm:h-8 bg-light-blue/40 rounded w-3/4 mb-4"></div>
                <div className="h-3 sm:h-4 bg-light-blue/40 rounded w-1/2 mb-2"></div>
                <div className="h-3 sm:h-4 bg-light-blue/40 rounded w-1/3 mb-2"></div>
                <div className="h-8 sm:h-10 bg-light-blue/40 rounded w-1/4 mt-4"></div>
              </div>
            ))}
          </div>
        ) : hotJobs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 justify-items-center justify-center">
            {hotJobs.map((job) => (
              <JobCard key={job.id} job={job} setCurrentPage={setCurrentPage} isHotJob={true} onJobDeleted={handleJobDeleted} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">אין כרגע עבודות חמות. נסו לחפש או חזרו מאוחר יותר!</p>
        )}
      </section>

      <section className="animate-slide-in-left px-2">
        <h2 className="text-xl sm:text-3xl font-bold text-royal-blue mb-1 sm:mb-2 text-center">כל העבודות</h2>
        <p className="text-center text-xs sm:text-base text-gray-600 mb-6 sm:mb-8">סינון משרות זמינות.</p>

        <div className="mb-6">
          {filterFormContent}
        </div>
        {!loadingDisplayedJobs && <p className="text-sm text-gray-600 text-center pt-0 pb-4 md:pt-4">מציג {displayedJobs.length} משרות התואמות את הסינון שלך מתוך המאגר.</p>}

        {loadingDisplayedJobs ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 justify-items-center justify-center">
            {[...Array(Math.max(INITIAL_JOBS_DISPLAY_COUNT, 8))].map((_, i) => (
              <div key={i} className="bg-light-blue/20 border border-light-blue/30 p-4 sm:p-6 rounded-xl shadow-lg animate-pulse w-full max-w-[175px] sm:max-w-none">
                <div className="h-6 sm:h-8 bg-light-pink/40 rounded w-3/4 mb-4"></div>
                <div className="h-3 sm:h-4 bg-light-pink/40 rounded w-1/2 mb-2"></div>
                <div className="h-3 sm:h-4 bg-light-pink/40 rounded w-1/3 mb-2"></div>
                <div className="h-8 sm:h-10 bg-light-pink/40 rounded w-1/4 mt-4"></div>
              </div>
            ))}
          </div>
        ) : displayedJobs.length > 0 ? (
          <div className="px-4 md:px-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 justify-items-center justify-center">
              {displayedJobs.map((job) => (
                <JobCard key={job.id} job={job} setCurrentPage={setCurrentPage} onJobDeleted={handleJobDeleted} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">לא נמצאו משרות תואמות כרגע.</p>
        )}

        {/* Load More Button */}
        {displayedJobs.length < allFetchedJobs.length && (
          <div className="flex justify-center mt-8 pb-4">
            <Button
              variant="outline"
              onClick={() => setDisplayLimit(prev => prev + 12)}
              className="!rounded-full px-8 py-2 border-royal-blue text-royal-blue hover:bg-royal-blue hover:text-white transition-all shadow-sm transform hover:scale-105"
            >
              טען עוד משרות
            </Button>
          </div>
        )}
      </section>

      <div className="text-center mt-10">
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            const paramsForSearchPage = Object.fromEntries(
              Object.entries(homeFilters)
                .filter(([, value]) => value !== '' && value !== null && !(value instanceof Set && value.size === 0) && value !== undefined)
                .map(([key, value]) => {
                  return [key, value instanceof Set ? Array.from(value).join(',') : String(value)];
                })
            );
            setCurrentPage('searchResults', paramsForSearchPage);
          }}
          icon={<SearchIcon className="w-5 h-5" />}
          className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          לכל המשרות (חיפוש מתקדם)
        </Button>
      </div>

      <section className="bg-blue-50 py-8 text-center rounded-2xl mb-8 mx-4">
        <h2 className="text-xl md:text-2xl font-bold text-royal-blue mb-4">מחפשים עובדים?</h2>
        <p className="text-gray-600 mb-6">פרסמו משרה בחינם והגיעו לאלפי מועמדים</p>
        <p className="text-gray-700 mb-6 max-w-lg mx-auto">
          מחפשים עובדים לעבודה זמנית, פרויקט קצר מועד, או סיוע נקודתי?
          'בין הסדורים' הוא המקום המושלם למצוא בחורי ישיבות ובנות סמינר זריזים ומוכשרים,
          הזמינים לעבודות מזדמנות וקצרות. <strong>לא למשרות קבועות.</strong>
        </p>
        <Button variant="secondary" size="lg" onClick={() => setCurrentPage('postJob')} className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mx-auto">
          פרסמו עבודה חדשה
        </Button>
      </section>

      {/* Spacing for bottom of page to prevent clash with footer/edge */}
      <div className="h-16 md:h-24"></div>
    </div>
  );
};

export default HomePage;