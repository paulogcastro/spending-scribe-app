import { useState, useEffect, useCallback } from 'react';
import {
  MonthlyData,
  FixedExpenseItem,
  InstallmentItem,
  DailyExpense,
  IncomeItem,
  DailyCategory,
  calculateInstallmentValue,
} from '@/types/finance';

const STORAGE_KEY = 'finance-tracker-data';

function getYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function createEmptyMonthData(yearMonth: string): MonthlyData {
  return {
    yearMonth,
    income: [],
    casa: [],
    carro: [],
    parcelados: [],
    diarias: [],
  };
}

export function useFinances() {
  const [data, setData] = useState<Record<string, MonthlyData>>({});

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        setData({});
      }
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((newData: Record<string, MonthlyData>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  // Get or create month data
  const getMonthData = useCallback((year: number, month: number): MonthlyData => {
    const key = getYearMonth(year, month);
    return data[key] || createEmptyMonthData(key);
  }, [data]);

  // Update month data
  const updateMonthData = useCallback((year: number, month: number, updater: (prev: MonthlyData) => MonthlyData) => {
    const key = getYearMonth(year, month);
    setData((prev) => {
      const currentData = prev[key] || createEmptyMonthData(key);
      const updated = { ...prev, [key]: updater(currentData) };
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // === INCOME ===
  const addIncome = useCallback((year: number, month: number, item: Omit<IncomeItem, 'id'>) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      income: [...prev.income, { ...item, id: crypto.randomUUID() }],
    }));
  }, [updateMonthData]);

  const updateIncome = useCallback((year: number, month: number, id: string, updates: Partial<IncomeItem>) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      income: prev.income.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  }, [updateMonthData]);

  const removeIncome = useCallback((year: number, month: number, id: string) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      income: prev.income.filter((item) => item.id !== id),
    }));
  }, [updateMonthData]);

  // === FIXED EXPENSES (Casa/Carro) ===
  const addFixedExpense = useCallback((
    year: number, 
    month: number, 
    group: 'casa' | 'carro', 
    item: Omit<FixedExpenseItem, 'id'>
  ) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      [group]: [...prev[group], { ...item, id: crypto.randomUUID() }],
    }));
  }, [updateMonthData]);

  const updateFixedExpense = useCallback((
    year: number, 
    month: number, 
    group: 'casa' | 'carro', 
    id: string, 
    updates: Partial<FixedExpenseItem>
  ) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      [group]: prev[group].map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  }, [updateMonthData]);

  const removeFixedExpense = useCallback((year: number, month: number, group: 'casa' | 'carro', id: string) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      [group]: prev[group].filter((item) => item.id !== id),
    }));
  }, [updateMonthData]);

  // === INSTALLMENTS (Parcelados) ===
  const addInstallment = useCallback((
    year: number, 
    month: number, 
    item: Omit<InstallmentItem, 'id' | 'currentInstallment' | 'startDate'>
  ) => {
    const startDate = getYearMonth(year, month);
    updateMonthData(year, month, (prev) => ({
      ...prev,
      parcelados: [...prev.parcelados, { 
        ...item, 
        id: crypto.randomUUID(),
        currentInstallment: 1,
        startDate,
      }],
    }));
  }, [updateMonthData]);

  const updateInstallment = useCallback((
    year: number, 
    month: number, 
    id: string, 
    updates: Partial<InstallmentItem>
  ) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      parcelados: prev.parcelados.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  }, [updateMonthData]);

  const removeInstallment = useCallback((year: number, month: number, id: string) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      parcelados: prev.parcelados.filter((item) => item.id !== id),
    }));
  }, [updateMonthData]);

  // === DAILY EXPENSES ===
  const addDailyExpense = useCallback((
    year: number, 
    month: number, 
    expense: { description: string; amount: number; category: DailyCategory; date: string }
  ) => {
    const newExpense: DailyExpense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    updateMonthData(year, month, (prev) => ({
      ...prev,
      diarias: [newExpense, ...prev.diarias],
    }));
  }, [updateMonthData]);

  const removeDailyExpense = useCallback((year: number, month: number, id: string) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      diarias: prev.diarias.filter((item) => item.id !== id),
    }));
  }, [updateMonthData]);

  // === CALCULATIONS ===
  const calculateGroupTotal = useCallback((items: FixedExpenseItem[], type: 'planned' | 'actual'): number => {
    return items.reduce((sum, item) => sum + item[type], 0);
  }, []);

  const calculateInstallmentsTotal = useCallback((items: InstallmentItem[], type: 'planned' | 'actual'): number => {
    return items.reduce((sum, item) => {
      const value = calculateInstallmentValue(item);
      return sum + value;
    }, 0);
  }, []);

  const calculateDailyTotal = useCallback((items: DailyExpense[]): number => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, []);

  const calculateIncomeTotal = useCallback((items: IncomeItem[], type: 'planned' | 'actual'): number => {
    return items.reduce((sum, item) => sum + item[type], 0);
  }, []);

  const getDailyByCategory = useCallback((items: DailyExpense[]): Record<DailyCategory, number> => {
    const totals: Record<DailyCategory, number> = {
      alimentacao: 0,
      lazer: 0,
      saude: 0,
      carro: 0,
      roupa: 0,
      outros: 0,
    };
    items.forEach((item) => {
      totals[item.category] += item.amount;
    });
    return totals;
  }, []);

  const getMonthSummary = useCallback((year: number, month: number) => {
    const monthData = getMonthData(year, month);
    
    const incomePlanned = calculateIncomeTotal(monthData.income, 'planned');
    const incomeActual = calculateIncomeTotal(monthData.income, 'actual');
    
    const casaPlanned = calculateGroupTotal(monthData.casa, 'planned');
    const casaActual = calculateGroupTotal(monthData.casa, 'actual');
    
    const carroPlanned = calculateGroupTotal(monthData.carro, 'planned');
    const carroActual = calculateGroupTotal(monthData.carro, 'actual');
    
    const parceladosValue = calculateInstallmentsTotal(monthData.parcelados, 'actual');
    
    const diariasTotal = calculateDailyTotal(monthData.diarias);
    
    const expensesPlanned = casaPlanned + carroPlanned + parceladosValue;
    const expensesActual = casaActual + carroActual + parceladosValue + diariasTotal;
    
    return {
      incomePlanned,
      incomeActual,
      expensesPlanned,
      expensesActual,
      casaPlanned,
      casaActual,
      carroPlanned,
      carroActual,
      parceladosValue,
      diariasTotal,
      result: incomeActual - expensesActual,
    };
  }, [getMonthData, calculateIncomeTotal, calculateGroupTotal, calculateInstallmentsTotal, calculateDailyTotal]);

  // === COPY FIXED DATA TO NEXT MONTH ===
  const copyToNextMonth = useCallback((year: number, month: number) => {
    const currentData = getMonthData(year, month);
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    
    updateMonthData(nextYear, nextMonth, (prev) => ({
      ...prev,
      income: currentData.income.map((item) => ({ ...item, id: crypto.randomUUID(), actual: 0 })),
      casa: currentData.casa.map((item) => ({ ...item, id: crypto.randomUUID(), actual: 0 })),
      carro: currentData.carro.map((item) => ({ ...item, id: crypto.randomUUID(), actual: 0 })),
      parcelados: currentData.parcelados
        .filter((item) => item.currentInstallment < item.installments)
        .map((item) => ({ 
          ...item, 
          id: crypto.randomUUID(), 
          currentInstallment: item.currentInstallment + 1 
        })),
    }));
  }, [getMonthData, updateMonthData]);

  return {
    getMonthData,
    // Income
    addIncome,
    updateIncome,
    removeIncome,
    // Fixed expenses
    addFixedExpense,
    updateFixedExpense,
    removeFixedExpense,
    // Installments
    addInstallment,
    updateInstallment,
    removeInstallment,
    // Daily expenses
    addDailyExpense,
    removeDailyExpense,
    // Calculations
    calculateGroupTotal,
    calculateInstallmentsTotal,
    calculateDailyTotal,
    calculateIncomeTotal,
    getDailyByCategory,
    getMonthSummary,
    // Utils
    copyToNextMonth,
  };
}
