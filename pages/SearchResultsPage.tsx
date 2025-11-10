import React, { useState, useEffect, useCallback } from 'react';
import { Job, JobDifficulty, JobSearchFilters, PaymentMethod, PaymentType, JobDateType, SelectFilterOption } from '../types';
import { JobCard } from '../components/JobCard';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { CheckboxGroup } from '../components/CheckboxGroup';
import { RangeInputGroup } from '../components/RangeInputGroup';
import { HebrewDatePicker } from '../components/HebrewDatePicker';
import { Modal } from '../components/Modal'; 
import type { PageProps } from '../App';
import { 
    ISRAELI_CITIES, SORT_OPTIONS, SortById, 
    PAYMENT_KIND_OPTIONS, PAYMENT_METHOD_FILTER_OPTIONS, useDateTypeOptions, 
    DURATION_FLEXIBILITY_OPTIONS, SUITABILITY_FOR_OPTIONS, JOB_DIFFICULTY_FILTER_OPTIONS
} from '../constants';
import { SearchIcon, FilterIcon } from '../components/icons';
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


  const performSearch = useCallback(async (currentFilters: JobSearchFilters, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
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
      setJobs(results);
    } catch (error) {
      console.error("Error searching jobs:", error);
    }
    setLoading(false);
  }, []);

   useEffect(() => {
    const newFiltersFromParams = { ...initialFiltersState, sortBy: 'newest' as SortById};
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
        if (pageParams.selectedPaymentMethods && typeof pageParams.selectedPaymentMethods === 'string') {
             newFiltersFromParams.selectedPaymentMethods = new Set(pageParams.selectedPaymentMethods.split(',') as PaymentMethod[]);
        } else {
            newFiltersFromParams.selectedPaymentMethods = new Set();
        }
        newFiltersFromParams.minPeopleNeeded = (pageParams.minPeopleNeeded as string) || '';
        newFiltersFromParams.maxPeopleNeeded = (pageParams.maxPeopleNeeded as string) || '';
        newFiltersFromParams.suitabilityFor = (pageParams.suitabilityFor as 'any' | 'men' | 'women' | 'general') || 'any';
        newFiltersFromParams.minAge = (pageParams.minAge as string) || '';
        newFiltersFromParams.maxAge = (pageParams.maxAge as string) || '';
    }
    setFilters(newFiltersFromParams);
    performSearch(newFiltersFromParams);
    
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

  }, [pageParams, performSearch]);

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
    performSearch(filters); 
    setIsMobileFilterSectionOpen(false); 
    
    const currentParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const newParamsToSet: Record<string, string> = {};

    if (filters.term) newParamsToSet.term = filters.term; else currentParams.delete('term');
    if (filters.location) newParamsToSet.location = filters.location; else currentParams.delete('location');
    if (filters.sortBy && filters.sortBy !== 'newest') newParamsToSet.sortBy = filters.sortBy; else currentParams.delete('sortBy');
    if (filters.difficulty) newParamsToSet.difficulty = filters.difficulty; else currentParams.delete('difficulty');

    if (filters.dateType) newParamsToSet.dateType = filters.dateType; else currentParams.delete('dateType');
    if (filters.specificDateStart) newParamsToSet.specificDateStart = filters.specificDateStart; else currentParams.delete('specificDateStart');
    if (filters.specificDateEnd) newParamsToSet.specificDateEnd = filters.specificDateEnd; else currentParams.delete('specificDateEnd');
    if (filters.minEstimatedDurationHours) newParamsToSet.minEstimatedDurationHours = filters.minEstimatedDurationHours; else currentParams.delete('minEstimatedDurationHours');
    if (filters.maxEstimatedDurationHours) newParamsToSet.maxEstimatedDurationHours = filters.maxEstimatedDurationHours; else currentParams.delete('maxEstimatedDurationHours');
    if (filters.filterDurationFlexible && filters.filterDurationFlexible !== 'any') newParamsToSet.filterDurationFlexible = filters.filterDurationFlexible; else currentParams.delete('filterDurationFlexible');
    if (filters.paymentKind && filters.paymentKind !== 'any') newParamsToSet.paymentKind = filters.paymentKind; else currentParams.delete('paymentKind');
    if (filters.minHourlyRate) newParamsToSet.minHourlyRate = filters.minHourlyRate; else currentParams.delete('minHourlyRate');
    if (filters.maxHourlyRate) newParamsToSet.maxHourlyRate = filters.maxHourlyRate; else currentParams.delete('maxHourlyRate');
    if (filters.minGlobalPayment) newParamsToSet.minGlobalPayment = filters.minGlobalPayment; else currentParams.delete('minGlobalPayment');
    if (filters.maxGlobalPayment) newParamsToSet.maxGlobalPayment = filters.maxGlobalPayment; else currentParams.delete('maxGlobalPayment');
    if (filters.selectedPaymentMethods.size > 0) newParamsToSet.selectedPaymentMethods = Array.from(filters.selectedPaymentMethods).join(','); else currentParams.delete('selectedPaymentMethods');
    if (filters.minPeopleNeeded) newParamsToSet.minPeopleNeeded = filters.minPeopleNeeded; else currentParams.delete('minPeopleNeeded');
    if (filters.maxPeopleNeeded) newParamsToSet.maxPeopleNeeded = filters.maxPeopleNeeded; else currentParams.delete('maxPeopleNeeded');
    if (filters.suitabilityFor && filters.suitabilityFor !== 'any') newParamsToSet.suitabilityFor = filters.suitabilityFor; else currentParams.delete('suitabilityFor');
    if (filters.minAge) newParamsToSet.minAge = filters.minAge; else currentParams.delete('minAge');
    if (filters.maxAge) newParamsToSet.maxAge = filters.maxAge; else currentParams.delete('maxAge');
    
    const finalParams = new URLSearchParams(newParamsToSet);
    const finalParamString = finalParams.toString();
    
    setCurrentPage('searchResults', finalParamString ? Object.fromEntries(finalParams) : {});
  };
  
  const resetFilters = () => {
    setFilters(initialFiltersState);
    performSearch(initialFiltersState, true); 
    setCurrentPage('searchResults', {}); 
  }
  
  const cityOptions = ISRAELI_CITIES.map(city => ({ value: city.name, label: city.name }));
  const fieldSetClassName = "p-4 border border-light-blue/30 rounded-md bg-light-blue/10";
  const legendClassName = "text-md font-semibold text-royal-blue mb-3 text-right px-1";
  
  const activeFilterCount = countActiveFilters(filters, initialFiltersState);

  const filterFormContent = (
    <form onSubmit={handleSearchSubmit} className="space-y-4">
        <div className={`${fieldSetClassName} space-y-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"> 
                <Input label="חיפוש חופשי (כותרת, תיאור)" id="search_term" name="term" value={filters.term} onChange={handleFilterChange} placeholder="לדוגמה: מלצרות, הובלה דחופה..." containerClassName="mb-0"/>
                <Select label="אזור / עיר" id="search_location" name="location" options={[{ value: '', label: 'כל הארץ' }, ...cityOptions]} value={filters.location} onChange={handleFilterChange} containerClassName="mb-0" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                <span className="font-semibold text-gray-700 text-sm">מיין לפי:</span>
                {SORT_OPTIONS.map(opt => (
                    <Button key={opt.id} type="button" variant={filters.sortBy === opt.id ? 'primary' : 'outline'} size="sm" onClick={() => setFilters(prev => ({...prev, sortBy: opt.id}))} className="!px-3 !py-1.5 text-xs sm:text-sm">
                        {opt.label}
                    </Button>
                ))}
            </div>
        </div>

        <Button type="button" variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="w-full text-royal-blue hover:bg-light-pink">
            {showAdvancedFilters ? 'הסתר מסננים מתקדמים ➖' : `הצג מסננים מתקדמים ➕ (${activeFilterCount} פעילים)`}
        </Button>

        {showAdvancedFilters && (
            <div className="space-y-6 animate-fade-in-down">
                <fieldset className={fieldSetClassName}>
                    <legend className={legendClassName}>תאריך וזמן</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="זמינות העבודה" name="dateType" options={useDateTypeOptions()} value={filters.dateType} onChange={handleFilterChange} />
                        {filters.dateType === 'specificDate' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                                <HebrewDatePicker label="מתאריך" value={filters.specificDateStart} onChange={(date) => handleDateChange('specificDateStart', date)} id="search_specificDateStart" />
                                <HebrewDatePicker label="עד תאריך" value={filters.specificDateEnd} onChange={(date) => handleDateChange('specificDateEnd', date)} id="search_specificDateEnd" />
                            </div>
                        )}
                        <RangeInputGroup label="משך משוער (שעות)" minName="minEstimatedDurationHours" minValue={filters.minEstimatedDurationHours} onMinChange={handleFilterChange} maxName="maxEstimatedDurationHours" maxValue={filters.maxEstimatedDurationHours} onMaxChange={handleFilterChange} unitSymbol="שעות" disabled={filters.filterDurationFlexible === 'yes'} />
                        <Select label="האם משך הזמן גמיש?" name="filterDurationFlexible" options={DURATION_FLEXIBILITY_OPTIONS} value={filters.filterDurationFlexible} onChange={handleFilterChange} />
                    </div>
                </fieldset>

                <fieldset className={fieldSetClassName}>
                    <legend className={legendClassName}>תשלום</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                        <Select label="סוג תשלום" name="paymentKind" options={PAYMENT_KIND_OPTIONS} value={filters.paymentKind} onChange={handleFilterChange} />
                        {(filters.paymentKind === 'any' || filters.paymentKind === PaymentType.HOURLY) && (
                            <RangeInputGroup label="שכר שעתי" minName="minHourlyRate" minValue={filters.minHourlyRate} onMinChange={handleFilterChange} maxName="maxHourlyRate" maxValue={filters.maxHourlyRate} onMaxChange={handleFilterChange} unitSymbol="₪ לשעה"/>
                        )}
                        {(filters.paymentKind === 'any' || filters.paymentKind === PaymentType.GLOBAL) && (
                            <RangeInputGroup label="שכר גלובלי" minName="minGlobalPayment" minValue={filters.minGlobalPayment} onMinChange={handleFilterChange} maxName="maxGlobalPayment" maxValue={filters.maxGlobalPayment} onMaxChange={handleFilterChange} unitSymbol="₪ סהכ"/>
                        )}
                        <div className="md:col-span-2">
                            <CheckboxGroup legend="אופן תשלום" name="search_selectedPaymentMethods" options={PAYMENT_METHOD_FILTER_OPTIONS} selectedValues={filters.selectedPaymentMethods} onChange={handlePaymentMethodChange} legendClassName="text-sm font-medium text-gray-700 mb-1 text-right" />
                        </div>
                    </div>
                </fieldset>

                <fieldset className={fieldSetClassName}>
                    <legend className={legendClassName}>התאמה ודרישות נוספות</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RangeInputGroup label="מספר אנשים דרושים" minName="minPeopleNeeded" minValue={filters.minPeopleNeeded} onMinChange={handleFilterChange} maxName="maxPeopleNeeded" maxValue={filters.maxPeopleNeeded} onMaxChange={handleFilterChange} unitSymbol="אנשים"/>
                        <Select label="מיועד ל..." name="suitabilityFor" options={SUITABILITY_FOR_OPTIONS} value={filters.suitabilityFor} onChange={handleFilterChange} />
                        <RangeInputGroup label="גיל המועמד" minName="minAge" minValue={filters.minAge} onMinChange={handleFilterChange} maxName="maxAge" maxValue={filters.maxAge} onMaxChange={handleFilterChange} unitSymbol="שנים"/>
                        <Select label="רמת קושי" id="search_difficulty" name="difficulty" options={JOB_DIFFICULTY_FILTER_OPTIONS} value={filters.difficulty} onChange={handleFilterChange} containerClassName="mb-0"/>
                    </div>
                </fieldset>
            </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
            <Button type="submit" variant="primary" size="lg" icon={<SearchIcon className="w-5 h-5"/>} className="w-full sm:w-auto">
                חיפוש
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={resetFilters} className="w-full sm:w-auto text-gray-700 hover:bg-gray-100">
                אפס מסננים
            </Button>
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
                icon={<FilterIcon className="w-5 h-5"/>}
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
                <div id="mobile-filter-section-search" className="mt-4 p-4 bg-light-pink rounded-lg shadow-md animate-fade-in-down">
                    {filterFormContent}
                </div>
            )}
        </div>

        <div className="hidden md:block mb-6 p-4 bg-light-pink rounded-lg shadow-md">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} setCurrentPage={setCurrentPage} onJobDeleted={handleJobDeleted}/>
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