
import { JobSearchFilters, PaymentMethod, PaymentType, JobDateType } from '../types';

export const countActiveFilters = (currentFilters: JobSearchFilters, initialFilters: JobSearchFilters): number => {
  let count = 0;

  // Basic text/select filters
  if (currentFilters.term && currentFilters.term.trim() !== initialFilters.term) count++;
  if (currentFilters.location && currentFilters.location !== initialFilters.location) count++;
  if (currentFilters.difficulty && currentFilters.difficulty !== initialFilters.difficulty) count++;
  
  // DateType and specific dates
  if (currentFilters.dateType && currentFilters.dateType !== initialFilters.dateType) {
    count++;
    // If dateType itself changed to/from 'specificDate', it's already counted.
    // If it is 'specificDate', and either start/end changed, this specific date criterion is active.
    // We consider the specific date range (start/end) as one filter criterion if dateType is 'specificDate'.
    // The change to dateType itself already signals engagement with date filtering.
    // If dateType IS 'specificDate', we further check if the dates themselves are set beyond initial.
    if (currentFilters.dateType === 'specificDate') {
        // This is a refinement: if dateType is specificDate, the presence of *any* date makes it "more specific"
        // than just selecting 'specificDate' type. However, the primary count comes from dateType changing.
        // For simplicity, we can say if dateType itself is active, that's the filter.
        // A more granular count could be:
        // let specificDateFilterActive = false;
        // if (currentFilters.specificDateStart && currentFilters.specificDateStart !== initialFilters.specificDateStart) specificDateFilterActive = true;
        // if (currentFilters.specificDateEnd && currentFilters.specificDateEnd !== initialFilters.specificDateEnd) specificDateFilterActive = true;
        // if (specificDateFilterActive) { /* Potentially add to count if dateType was already 'specificDate' initially but dates changed */ }
        // For now, if dateType is active, it covers this.
    }
  } else if ( // Case where dateType didn't change from initial, but if initial was 'specificDate', the dates might have.
      initialFilters.dateType === 'specificDate' &&
      currentFilters.dateType === 'specificDate' &&
      ( (currentFilters.specificDateStart && currentFilters.specificDateStart !== initialFilters.specificDateStart) ||
        (currentFilters.specificDateEnd && currentFilters.specificDateEnd !== initialFilters.specificDateEnd) )
    ) {
      count++;
  }


  // Range: Estimated Duration
  const minDurationActive = currentFilters.minEstimatedDurationHours && currentFilters.minEstimatedDurationHours !== initialFilters.minEstimatedDurationHours;
  const maxDurationActive = currentFilters.maxEstimatedDurationHours && currentFilters.maxEstimatedDurationHours !== initialFilters.maxEstimatedDurationHours;
  if (minDurationActive || maxDurationActive) {
    count++;
  }

  // Select: Duration Flexibility
  if (currentFilters.filterDurationFlexible !== 'any' && currentFilters.filterDurationFlexible !== initialFilters.filterDurationFlexible) count++;
  
  // Select: Payment Kind
  if (currentFilters.paymentKind !== 'any' && currentFilters.paymentKind !== initialFilters.paymentKind) count++;
  
  // Range: Hourly Rate (conditional)
  if (currentFilters.paymentKind === PaymentType.HOURLY || currentFilters.paymentKind === 'any') {
    const minHourlyRateActive = currentFilters.minHourlyRate && currentFilters.minHourlyRate !== initialFilters.minHourlyRate;
    const maxHourlyRateActive = currentFilters.maxHourlyRate && currentFilters.maxHourlyRate !== initialFilters.maxHourlyRate;
    if (minHourlyRateActive || maxHourlyRateActive) {
      // If paymentKind was already active and it's 'any', this is an additional refinement.
      // If paymentKind became active (e.g. from 'any' to 'HOURLY'), that's one count.
      // If paymentKind is 'HOURLY' and rates are set, it makes that selection more specific.
      // To avoid double counting when paymentKind also changed, we check if paymentKind itself wasn't the source of a new count.
      if (currentFilters.paymentKind === initialFilters.paymentKind || initialFilters.paymentKind === 'any') {
         count++;
      } else if (currentFilters.paymentKind !== 'any' && !initialFilters.paymentKind && (minHourlyRateActive || maxHourlyRateActive)) {
         // This case might be tricky: if paymentKind was empty, became HOURLY (counted), and then rates set.
         // The goal is "number of active filter criteria". "Hourly Rate" is one such criterion.
         // If paymentKind *just* changed to HOURLY, that's the activation. If it was already HOURLY and rates changed, that's activation of the rate sub-filter.
         // The current logic adds 1 if paymentKind changes. If it doesn't change from 'any', but rates are added, it's fair to count.
         // Let's refine: if paymentKind is 'any', then any rate range makes it active.
         // If paymentKind is specific (HOURLY/GLOBAL), its change is one filter. Applying a range within it is a sub-filter.
         // The current structure counts change in paymentKind. Then for rates:
         // This is complex. Simpler: is "Hourly Rate Range" filter active?
         // This only adds to count if paymentKind was already 'HOURLY' or 'any' (and paymentKind itself didn't just become active)
      }
    }
  }
   // Range: Global Payment (conditional)
  if (currentFilters.paymentKind === PaymentType.GLOBAL || currentFilters.paymentKind === 'any') {
    const minGlobalPaymentActive = currentFilters.minGlobalPayment && currentFilters.minGlobalPayment !== initialFilters.minGlobalPayment;
    const maxGlobalPaymentActive = currentFilters.maxGlobalPayment && currentFilters.maxGlobalPayment !== initialFilters.maxGlobalPayment;
     if (minGlobalPaymentActive || maxGlobalPaymentActive) {
       if (currentFilters.paymentKind === initialFilters.paymentKind || initialFilters.paymentKind === 'any') {
          count++;
       }
    }
  }
  
  // CheckboxGroup: Payment Methods
  if (currentFilters.selectedPaymentMethods.size > initialFilters.selectedPaymentMethods.size || 
      (currentFilters.selectedPaymentMethods.size > 0 && initialFilters.selectedPaymentMethods.size === 0) ||
      (currentFilters.selectedPaymentMethods.size > 0 && ![...currentFilters.selectedPaymentMethods].every(pm => initialFilters.selectedPaymentMethods.has(pm)))
     ) {
    if(initialFilters.selectedPaymentMethods.size === 0 && currentFilters.selectedPaymentMethods.size > 0) count++;
    else if (initialFilters.selectedPaymentMethods.size > 0 && currentFilters.selectedPaymentMethods.size > 0 && ![...currentFilters.selectedPaymentMethods].every(pm => initialFilters.selectedPaymentMethods.has(pm))) count++;

  }
  
  // Range: People Needed
  const minPeopleNeededActive = currentFilters.minPeopleNeeded && currentFilters.minPeopleNeeded !== initialFilters.minPeopleNeeded;
  const maxPeopleNeededActive = currentFilters.maxPeopleNeeded && currentFilters.maxPeopleNeeded !== initialFilters.maxPeopleNeeded;
  if (minPeopleNeededActive || maxPeopleNeededActive) {
    count++;
  }

  // Select: Suitability For
  if (currentFilters.suitabilityFor !== 'any' && currentFilters.suitabilityFor !== initialFilters.suitabilityFor) count++;
  
  // Range: Age
  const minAgeActive = currentFilters.minAge && currentFilters.minAge !== initialFilters.minAge;
  const maxAgeActive = currentFilters.maxAge && currentFilters.maxAge !== initialFilters.maxAge;
  if (minAgeActive || maxAgeActive) {
    count++;
  }
  
  // sortBy is typically not counted as an "active filter" for restricting results.
  // if (currentFilters.sortBy !== initialFilters.sortBy) count++;

  return count;
};

