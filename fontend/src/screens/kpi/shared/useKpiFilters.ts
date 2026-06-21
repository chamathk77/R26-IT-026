import { useCallback, useMemo, useState } from 'react';
import { KpiPeriodKey } from './kpiMockData';

const DEFAULT_PERIOD: KpiPeriodKey = 'this_month';

export function useKpiFilters() {
  const [selectedPeriod, setSelectedPeriod] = useState<KpiPeriodKey | null>(DEFAULT_PERIOD);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isCustomRange = Boolean(startDate.trim() && endDate.trim());
  const hasPartialCustomRange = Boolean(
    (startDate.trim() && !endDate.trim()) || (!startDate.trim() && endDate.trim()),
  );
  const hasActiveFilter = isCustomRange || (selectedPeriod !== null && !hasPartialCustomRange);

  const handleSelectPeriod = useCallback((key: KpiPeriodKey) => {
    setSelectedPeriod(key);
    setStartDate('');
    setEndDate('');
  }, []);

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    if (value.trim()) {
      setSelectedPeriod(null);
    }
  }, []);

  const handleEndDateChange = useCallback((value: string) => {
    setEndDate(value);
    if (value.trim()) {
      setSelectedPeriod(null);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedPeriod(DEFAULT_PERIOD);
    setStartDate('');
    setEndDate('');
  }, []);

  const filterSubtitle = useMemo(() => {
    if (isCustomRange) {
      return `${startDate} – ${endDate}`;
    }
    if (selectedPeriod) {
      return selectedPeriod;
    }
    return '';
  }, [endDate, isCustomRange, selectedPeriod, startDate]);

  return {
    selectedPeriod,
    startDate,
    endDate,
    isCustomRange,
    hasPartialCustomRange,
    hasActiveFilter,
    filterSubtitle,
    handleSelectPeriod,
    handleStartDateChange,
    handleEndDateChange,
    resetFilters,
  };
}
