
import React, { useState, useEffect, useCallback } from 'react';
import { Job, JobDifficulty, JobSearchFilters, PaymentMethod, PaymentType, JobDateType } from '../types';
import { JobCard } from '../components/JobCard';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { Button } from '../components/Button';
import { CheckboxGroup } from '../components/CheckboxGroup';
import { RangeInputGroup } from '../components/RangeInputGroup';
import { HebrewDatePicker } from '../components/HebrewDatePicker';
import type { PageProps } from '../App';
import {
  SORT_OPTIONS, SortById,
  PAYMENT_KIND_OPTIONS, PAYMENT_METHOD_FILTER_OPTIONS, useDateTypeOptions,
  DURATION_FLEXIBILITY_OPTIONS, SUITABILITY_FOR_OPTIONS, JOB_DIFFICULTY_FILTER_OPTIONS,
  getCityOptions, INITIAL_JOBS_DISPLAY_COUNT
} from '../constants';
import { SearchIcon, FilterIcon, RefreshIcon, XCircleIcon } from '../components/icons';
import { countActiveFilters } from '../utils/filterUtils';
import { useAuth } from '../hooks/useAuth';
import * as jobService from '../services/jobService';

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

export const SearchResultsPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<JobSearchFilters>(() => {
    const defaultState = { ...initialFiltersState };
    if (pageParams) {
      defaultState.term = pageParams.term as string || '';
      defaultState.location = pageParams.location as string || '';
      defaultState.sortBy = pageParams.sortBy as SortById || 'newest';
      defaultState.difficulty = pageParams.difficulty as JobDifficulty || '';
      defaultState.dateType = (pageParams.dateType as JobDateType) || '';
      defaultState.specificDateStart = (pageParams.specificDateStart as string) || null;
      defaultState.specificDateEnd = (pageParams.specificDateEnd as string) || null;
      defaultState.minEstimatedDurationHours = (pageParams.minEstimatedDurationHours as string) || '';
      defaultState.maxEstimatedDurationHours = (pageParams.maxEstimatedDurationHours as string) || '';
      defaultState.filterDurationFlexible = (pageParams.filterDurationFlexible as 'yes' | 'no' | 'any') || 'any';
      defaultState.paymentKind = (pageParams.paymentKind as 'any' | PaymentType.HOURLY | PaymentType.GLOBAL) || 'any';
      defaultState.minHourlyRate = (pageParams.minHourlyRate as string) || '';
      defaultState.maxHourlyRate = (pageParams.maxHourlyRate as string) || '';
      defaultState.minGlobalPayment = (pageParams.minGlobalPayment as string) || '';
      defaultState.maxGlobalPayment = (pageParams.maxGlobalPayment as string) || '';
      if (pageParams.selectedPaymentMethods && typeof pageParams.selectedPaymentMethods === 'string') {
        defaultState.selectedPaymentMethods = new Set(pageParams.selectedPaymentMethods.split(',') as PaymentMethod[]);
      }
      defaultState.minPeopleNeeded = (pageParams.minPeopleNeeded as string) || '';
      defaultState.maxPeopleNeeded = (pageParams.maxPeopleNeeded as string) || '';
      defaultState.suitabilityFor = (pageParams.suitabilityFor as 'any' | 'men' | 'women' | 'general') || 'any';
      defaultState.minAge = (pageParams.minAge as string) || '';
      defaultState.maxAge = (pageParams.maxAge as string) || '';
    }
    return defaultState;
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isMobileFilterSectionOpen, setIsMobileFilterSectionOpen] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState(filters.term);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(filters.term);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.term]);

  const performSearch = useCallback(async (currentFilters: JobSearchFilters, isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
      setJobs([]);
    }
    try {
      const results = await jobService.searchJobs(currentFilters);
      setJobs(results);
    } catch (error) {
      console.error("Error searching jobs:", error);
      setJobs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const newFiltersFromParams = { ...initialFiltersState, sortBy: 'newest' as SortById };
    if (pageParams) {
      newFiltersFromParams.term = (pageParams.term as string) || '';
      newFiltersFromParams.location = (pageParams.location as string) || '';
      newFiltersFromParams.sortBy = (pageParams.sortBy as SortById) || 'newest';
      newFiltersFromParams.difficulty = (pageParams.difficulty as JobDifficulty) || '';
      newFiltersFromParams.dateType = (pageParams.dateType as JobDateType) || '';
      newFiltersFromParams.specificDateStart = (pageParams.specificDateStart as string) || null;
      newFiltersFromParams.specificDateEnd = (pageParams.specificDateEnd as string) || null;
      newFiltersFromParams.minEstimatedDurationHours = (pageParams.minEstimatedDurationHours as string) || '';
      newFiltersFromParams.maxEstimatedDurationHours = (pageParams.maxEstimatedDurationHours as string) || '';
      newFiltersFromParams.filterDurationFlexible = (pageParams.filterDurationFlexible as 'yes' | 'no' | 'any') || 'any';
      newFiltersFromParams.paymentKind = (pageParams.paymentKind as 'any' | PaymentType.HOURLY | PaymentType.GLOBAL) || 'any';
      newFiltersFromParams.minHourlyRate = (pageParams.minHourlyRate as string) || '';
      newFiltersFromParams.maxHourlyRate = (pageParams.maxHourlyRate as string) || '';
      newFiltersFromParams.minGlobalPayment = (pageParams.minGlobalPayment as string) || '';
      newFiltersFromParams.maxGlobalPayment = (pageParams.maxGlobalPayment as string) || '';
      newFiltersFromParams.minPeopleNeeded = (pageParams.minPeopleNeeded as string) || '';
      newFiltersFromParams.maxPeopleNeeded = (pageParams.maxPeopleNeeded as string) || '';
      newFiltersFromParams.suitabilityFor = (pageParams.suitabilityFor as 'any' | 'men' | 'women' | 'general') || 'any';
      newFiltersFromParams.minAge = (pageParams.minAge as string) || '';
      newFiltersFromParams.maxAge = (pageParams.maxAge as string) || '';
    }
    setFilters(newFiltersFromParams);
    const hasAdvancedFiltersSet =
      newFiltersFromParams.dateType !== '' ||
      newFiltersFromParams.specificDateStart !== null ||
      newFiltersFromParams.specificDateEnd !== null ||
      newFiltersFromParams.minEstimatedDurationHours !== '' ||
      newFiltersFromParams.maxEstimatedDurationHours !== '' ||
      newFiltersFromParams.filterDurationFlexible !== 'any' ||
      newFiltersFromParams.paymentKind !== 'any' ||
      newFiltersFromParams.minHourlyRate !== '' ||
      newFiltersFromParams.maxHourlyRate !== '' ||
      newFiltersFromParams.minGlobalPayment !== '' ||
      newFiltersFromParams.maxGlobalPayment !== '' ||
      newFiltersFromParams.selectedPaymentMethods.size > 0 ||
      newFiltersFromParams.minPeopleNeeded !== '' ||
      newFiltersFromParams.maxPeopleNeeded !== '' ||
      newFiltersFromParams.suitabilityFor !== 'any' ||
      newFiltersFromParams.minAge !== '' ||
      newFiltersFromParams.maxAge !== '';

    setShowAdvancedFilters(hasAdvancedFiltersSet);
  }, [pageParams]);

  useEffect(() => {
    const filtersToSync = { ...filters, term: debouncedTerm };
    performSearch(filtersToSync);
  }, [performSearch, debouncedTerm,
    filters.location, filters.sortBy, filters.difficulty,
    filters.dateType, filters.specificDateStart, filters.specificDateEnd,
    filters.minEstimatedDurationHours, filters.maxEstimatedDurationHours,
    filters.filterDurationFlexible, filters.paymentKind,
    filters.minHourlyRate, filters.maxHourlyRate,
    filters.minGlobalPayment, filters.maxGlobalPayment,
    filters.selectedPaymentMethods, filters.minPeopleNeeded,
    filters.maxPeopleNeeded, filters.suitabilityFor,
    filters.minAge, filters.maxAge]);

  const handleJobDeleted = useCallback((deletedJobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== deletedJobId));
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePaymentMethodChange = (valueKey: string, checked: boolean) => {
    setFilters(prev => {
      const newSet = new Set(prev.selectedPaymentMethods);
      if (checked) newSet.add(valueKey as PaymentMethod);
      else newSet.delete(valueKey as PaymentMethod);
      return { ...prev, selectedPaymentMethods: newSet };
    });
  };

  const handleDateChange = (name: 'specificDateStart' | 'specificDateEnd', date: string | null) => {
    setFilters(prev => ({ ...prev, [name]: date }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(filters, true);
    setIsMobileFilterSectionOpen(false);

    const newParamsToSet: Record<string, string> = {};
    if (filters.term) newParamsToSet.term = filters.term;
    if (filters.location) newParamsToSet.location = filters.location;
    if (filters.sortBy && filters.sortBy !== 'newest') newParamsToSet.sortBy = filters.sortBy;
    if (filters.difficulty) newParamsToSet.difficulty = filters.difficulty;
    if (filters.dateType) newParamsToSet.dateType = filters.dateType;
    if (filters.specificDateStart) newParamsToSet.specificDateStart = filters.specificDateStart;
    if (filters.specificDateEnd) newParamsToSet.specificDateEnd = filters.specificDateEnd;
    if (filters.minEstimatedDurationHours) newParamsToSet.minEstimatedDurationHours = filters.minEstimatedDurationHours;
    if (filters.maxEstimatedDurationHours) newParamsToSet.maxEstimatedDurationHours = filters.maxEstimatedDurationHours;
    if (filters.filterDurationFlexible && filters.filterDurationFlexible !== 'any') newParamsToSet.filterDurationFlexible = filters.filterDurationFlexible;
    if (filters.paymentKind && filters.paymentKind !== 'any') newParamsToSet.paymentKind = filters.paymentKind;
    if (filters.minHourlyRate) newParamsToSet.minHourlyRate = filters.minHourlyRate;
    if (filters.maxHourlyRate) newParamsToSet.maxHourlyRate = filters.maxHourlyRate;
    if (filters.minGlobalPayment) newParamsToSet.minGlobalPayment = filters.minGlobalPayment;
    if (filters.maxGlobalPayment) newParamsToSet.maxGlobalPayment = filters.maxGlobalPayment;
    if (filters.selectedPaymentMethods.size > 0) newParamsToSet.selectedPaymentMethods = Array.from(filters.selectedPaymentMethods).join(',');
    if (filters.minPeopleNeeded) newParamsToSet.minPeopleNeeded = filters.minPeopleNeeded;
    if (filters.maxPeopleNeeded) newParamsToSet.maxPeopleNeeded = filters.maxPeopleNeeded;
    if (filters.suitabilityFor && filters.suitabilityFor !== 'any') newParamsToSet.suitabilityFor = filters.suitabilityFor;
    if (filters.minAge) newParamsToSet.minAge = filters.minAge;
    if (filters.maxAge) newParamsToSet.maxAge = filters.maxAge;

    setCurrentPage('searchResults', newParamsToSet);
  };

  const resetFilters = () => {
    setFilters(initialFiltersState);
    performSearch(initialFiltersState, true);
    setCurrentPage('searchResults', {});
  }

  const cityOptions = getCityOptions();
  const activeFilterCount = countActiveFilters(filters, initialFiltersState);

  const filterFormContent = (
    <form onSubmit={handleSearchSubmit} className="space-y-6">
      {/* Quick Search Row - The "Magic Bar" */}
      <div className="bg-white/95 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/20 space-y-10 relative z-[100]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-5 lg:col-span-6">
            <Input
              label="מה אתם מחפשים?"
              id="search_term"
              name="term"
              value={filters.term}
              onChange={handleFilterChange}
              placeholder="לדוגמה: מלצרות, הובלה דחופה..."
              containerClassName="mb-0"
              labelClassName="block text-sm font-bold text-gray-500 mb-3 uppercase tracking-widest text-right px-1"
              inputClassName="!rounded-2xl !py-5 !px-8 border-gray-200 bg-white shadow-sm focus:border-royal-blue focus:ring-8 focus:ring-royal-blue/5 transition-all text-xl font-semibold placeholder:text-gray-300"
            />
          </div>
          <div className="md:col-span-4 lg:col-span-3">
            <SearchableSelect
              label="איפה?"
              id="search_location"
              options={cityOptions}
              value={filters.location}
              onChange={(val) => setFilters(prev => ({ ...prev, location: val as string }))}
              className="mb-0"
            />
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={<SearchIcon className="w-6 h-6" />}
              className="w-full !rounded-2xl !py-5 shadow-lg shadow-royal-blue/20 hover:shadow-royal-blue/40 transform hover:-translate-y-1 active:scale-[0.98] transition-all bg-gradient-to-r from-royal-blue to-blue-600 !text-xl font-bold"
            >
              מצא עבודה
            </Button>
          </div>
        </div>

        {/* Sort & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-gray-100/50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">מיין משרות:</span>
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: opt.id as SortById }))}
                  className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${filters.sortBy === opt.id
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
              onClick={resetFilters}
              className="px-6 py-2.5 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100/80 rounded-xl transition-all flex items-center gap-2 border border-red-100 shadow-sm active:scale-95"
            >
              <XCircleIcon className="w-4 h-4" />
              איפוס כל המסננים
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center -mt-4 relative z-20">
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`group flex items-center gap-3 px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-xl ${showAdvancedFilters
            ? 'bg-royal-blue text-white ring-4 ring-royal-blue/20'
            : 'bg-white text-royal-blue border border-gray-100 hover:border-royal-blue/30'
            }`}
        >
          <FilterIcon className={`w-5 h-5 transition-transform duration-500 ${showAdvancedFilters ? 'rotate-180' : 'group-hover:rotate-12'}`} />
          {showAdvancedFilters ? 'הסתר אפשרויות סינון' : `אפשרויות סינון מתקדמות (${activeFilterCount} פעילים)`}
        </button>
      </div>

      {showAdvancedFilters && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-down">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h4 className="flex items-center gap-2 text-royal-blue font-bold mb-4 pb-2 border-b border-gray-50">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              זמן ומועד
            </h4>
            <div className="space-y-4 flex-grow">
              <Select label="זמינות העבודה" name="dateType" options={useDateTypeOptions()} value={filters.dateType} onChange={handleFilterChange} className="!rounded-xl" />
              {filters.dateType === 'specificDate' && (
                <div className="grid grid-cols-1 gap-2">
                  <HebrewDatePicker label="מתאריך" value={filters.specificDateStart} onChange={(date: any) => handleDateChange('specificDateStart', date)} id="search_specificDateStart" />
                  <HebrewDatePicker label="עד תאריך" value={filters.specificDateEnd} onChange={(date: any) => handleDateChange('specificDateEnd', date)} id="search_specificDateEnd" />
                </div>
              )}
              <RangeInputGroup
                label="משך משוער (שעות)"
                minName="minEstimatedDurationHours"
                minValue={filters.minEstimatedDurationHours}
                onMinChange={handleFilterChange}
                maxName="maxEstimatedDurationHours"
                maxValue={filters.maxEstimatedDurationHours}
                onMaxChange={handleFilterChange}
                unitSymbol="ש'"
                disabled={filters.filterDurationFlexible === 'yes'}
              />
              <Select label="האם משך הזמן גמיש?" name="filterDurationFlexible" options={DURATION_FLEXIBILITY_OPTIONS} value={filters.filterDurationFlexible} onChange={handleFilterChange} className="!rounded-xl" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h4 className="flex items-center gap-2 text-royal-blue font-bold mb-4 pb-2 border-b border-gray-50">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              תשלום ותנאים
            </h4>
            <div className="space-y-4 flex-grow">
              <Select label="סוג תשלום" name="paymentKind" options={PAYMENT_KIND_OPTIONS} value={filters.paymentKind} onChange={handleFilterChange} className="!rounded-xl" />
              {(filters.paymentKind === 'any' || filters.paymentKind === PaymentType.HOURLY) && (
                <RangeInputGroup label="שכר שעתי" minName="minHourlyRate" minValue={filters.minHourlyRate} onMinChange={handleFilterChange} maxName="maxHourlyRate" maxValue={filters.maxHourlyRate} onMaxChange={handleFilterChange} unitSymbol="₪/ש'" />
              )}
              {(filters.paymentKind === 'any' || filters.paymentKind === PaymentType.GLOBAL) && (
                <RangeInputGroup label="שכר גלובלי" minName="minGlobalPayment" minValue={filters.minGlobalPayment} onMinChange={handleFilterChange} maxName="maxGlobalPayment" maxValue={filters.maxGlobalPayment} onMaxChange={handleFilterChange} unitSymbol="₪" />
              )}
              <div className="pt-2">
                <CheckboxGroup legend="אופן תשלום" name="search_selectedPaymentMethods" options={PAYMENT_METHOD_FILTER_OPTIONS as any} selectedValues={filters.selectedPaymentMethods} onChange={handlePaymentMethodChange} legendClassName="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h4 className="flex items-center gap-2 text-royal-blue font-bold mb-4 pb-2 border-b border-gray-50">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              קהל יעד ומורכבות
            </h4>
            <div className="space-y-4 flex-grow">
              <RangeInputGroup label="מספר אנשים דרושים" minName="minPeopleNeeded" minValue={filters.minPeopleNeeded} onMinChange={handleFilterChange} maxName="maxPeopleNeeded" maxValue={filters.maxPeopleNeeded} onMaxChange={handleFilterChange} unitSymbol="איש" />
              <Select label="מיועד ל..." name="suitabilityFor" options={SUITABILITY_FOR_OPTIONS} value={filters.suitabilityFor} onChange={handleFilterChange} className="!rounded-xl" />
              <RangeInputGroup label="גיל המועמד" minName="minAge" minValue={filters.minAge} onMinChange={handleFilterChange} maxName="maxAge" maxValue={filters.maxAge} onMaxChange={handleFilterChange} unitSymbol="ש'" />
              <Select label="רמת קושי" id="search_difficulty" name="difficulty" options={JOB_DIFFICULTY_FILTER_OPTIONS} value={filters.difficulty} onChange={handleFilterChange} containerClassName="mb-0" className="!rounded-xl" />
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
        <button
          type="button"
          onClick={resetFilters}
          className="w-full sm:w-auto text-gray-400 hover:text-gray-600 font-bold transition-all px-4"
        >
          אפס הכל
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-8">
      <section className="animate-fade-in-down pt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-royal-blue mb-6 text-center">חיפוש משרות</h1>

        <div className="md:hidden mb-4">
          <Button
            onClick={() => setIsMobileFilterSectionOpen(!isMobileFilterSectionOpen)}
            variant="secondary"
            size="lg"
            className="w-full flex items-center justify-center relative"
            icon={<FilterIcon className="w-5 h-5" />}
            aria-expanded={isMobileFilterSectionOpen}
            aria-controls="mobile-filter-section-search"
          >
            סינון משרות
            {activeFilterCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[1.5rem] h-6 px-2 bg-royal-blue text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {isMobileFilterSectionOpen && (
            <div id="mobile-filter-section-search" className="mt-4 p-4 bg-light-pink/60 rounded-lg shadow-md animate-fade-in-down border border-light-pink/40">
              {filterFormContent}
            </div>
          )}
        </div>

        <div className="hidden md:block mb-6 p-4 bg-light-pink/60 rounded-lg shadow-md border border-light-pink/40">
          {filterFormContent}
        </div>

        {!loading && (
          <p className="text-sm text-gray-600 text-center pt-0 pb-4 md:pt-4">
            נמצאו {jobs.length} משרות התואמות את החיפוש שלך.
          </p>
        )}

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-royal-blue mx-auto mb-4"></div>
            <p>מחפש משרות...</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} setCurrentPage={setCurrentPage} onJobDeleted={handleJobDeleted} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-light-pink/40 rounded-xl border border-light-pink/40">
            <h2 className="text-2xl font-semibold text-royal-blue mb-2">לא נמצאו משרות</h2>
            <p className="text-gray-600">נסו לשנות את תנאי החיפוש או לאפס את המסננים.</p>
          </div>
        )}
      </section>
    </div>
  );
};