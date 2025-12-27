import { useState, useEffect, useCallback } from 'react';
import {
  MonthlyData,
  FixedExpenseItem,
  InstallmentItem,
  DailyExpense,
  IncomeItem,
  InvestmentItem,
  DailyCategory,
  PaymentSource,
  ExpenseGoals,
  ExpenseCategory,
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
    investments: [],
    investmentGoal: 0,
    expenseGoals: {
      casa: 0,
      carro: 0,
      parcelados: 0,
      diarias: 0,
    },
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
    const stored = data[key];
    if (!stored) return createEmptyMonthData(key);
    // Ensure new fields exist for backwards compatibility
    return {
      ...createEmptyMonthData(key),
      ...stored,
    };
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

  // === INVESTMENTS ===
  const addInvestment = useCallback((year: number, month: number, item: Omit<InvestmentItem, 'id'>) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      investments: [...(prev.investments || []), { ...item, id: crypto.randomUUID() }],
    }));
  }, [updateMonthData]);

  const updateInvestment = useCallback((year: number, month: number, id: string, updates: Partial<InvestmentItem>) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      investments: (prev.investments || []).map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  }, [updateMonthData]);

  const removeInvestment = useCallback((year: number, month: number, id: string) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      investments: (prev.investments || []).filter((item) => item.id !== id),
    }));
  }, [updateMonthData]);

  const setInvestmentGoal = useCallback((year: number, month: number, goal: number) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      investmentGoal: goal,
    }));
  }, [updateMonthData]);

  // === EXPENSE GOALS ===
  const setExpenseGoal = useCallback((year: number, month: number, group: keyof ExpenseGoals, goal: number) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      expenseGoals: {
        ...prev.expenseGoals,
        [group]: goal,
      },
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
    item: Omit<InstallmentItem, 'id'>
  ) => {
    updateMonthData(year, month, (prev) => ({
      ...prev,
      parcelados: [...prev.parcelados, { 
        ...item, 
        id: crypto.randomUUID(),
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
    expense: { description: string; amount: number; category: DailyCategory; source: PaymentSource; date: string }
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
  const calculateGroupTotal = useCallback((items: FixedExpenseItem[]): number => {
    return items.reduce((sum, item) => sum + item.actual, 0);
  }, []);

  const calculateInstallmentsTotal = useCallback((items: InstallmentItem[]): number => {
    return items.reduce((sum, item) => sum + item.actual, 0);
  }, []);

  const calculateDailyTotal = useCallback((items: DailyExpense[]): number => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, []);

  const calculateIncomeTotal = useCallback((items: IncomeItem[]): number => {
    return items.reduce((sum, item) => sum + item.actual, 0);
  }, []);

  const calculateInvestmentTotal = useCallback((items: InvestmentItem[]): number => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, []);

  const getDailyByCategory = useCallback((items: DailyExpense[]): Record<DailyCategory, number> => {
    const totals: Record<DailyCategory, number> = {
      alimentacao: 0,
      ifood: 0,
      lazer: 0,
      hobbies: 0,
      saude: 0,
      carro: 0,
      roupa: 0,
      tiriri: 0,
      outros: 0,
    };
    items.forEach((item) => {
      totals[item.category] += item.amount;
    });
    return totals;
  }, []);

  // Calculate expenses by category (combining all sources)
  const getExpensesByCategory = useCallback((monthData: MonthlyData): Record<ExpenseCategory, number> => {
    const totals: Record<ExpenseCategory, number> = {
      casa: 0,
      carro: 0,
      alimentacao: 0,
      ifood: 0,
      lazer: 0,
      hobbies: 0,
      saude: 0,
      roupa: 0,
      tiriri: 0,
      investimento: 0,
      outros: 0,
    };

    // Casa expenses have 'casa' category by default
    monthData.casa.forEach((item) => {
      totals.casa += item.actual;
    });

    // Carro expenses have 'carro' category by default
    monthData.carro.forEach((item) => {
      totals.carro += item.actual;
    });

    // Parcelados use their own category
    monthData.parcelados.forEach((item) => {
      const cat = item.category || 'outros';
      totals[cat] += item.actual;
    });

    // Daily expenses use their own category
    monthData.diarias.forEach((item) => {
      totals[item.category] += item.amount;
    });

    return totals;
  }, []);

  const getMonthSummary = useCallback((year: number, month: number) => {
    const monthData = getMonthData(year, month);
    
    const incomeActual = calculateIncomeTotal(monthData.income);
    
    const casaActual = calculateGroupTotal(monthData.casa);
    const carroActual = calculateGroupTotal(monthData.carro);
    const parceladosActual = calculateInstallmentsTotal(monthData.parcelados);
    const diariasTotal = calculateDailyTotal(monthData.diarias);
    
    const investmentsTotal = calculateInvestmentTotal(monthData.investments || []);
    const investmentGoal = monthData.investmentGoal || 0;
    
    const expenseGoals = monthData.expenseGoals || { casa: 0, carro: 0, parcelados: 0, diarias: 0 };
    const expensesPlanned = expenseGoals.casa + expenseGoals.carro + expenseGoals.parcelados + expenseGoals.diarias;
    const expensesActual = casaActual + carroActual + parceladosActual + diariasTotal;
    
    const result = incomeActual - expensesActual;
    const resultAfterInvestment = result - investmentGoal;
    
    const expensesByCategory = getExpensesByCategory(monthData);
    
    return {
      incomeActual,
      expensesPlanned,
      expensesActual,
      casaActual,
      carroActual,
      parceladosActual,
      diariasTotal,
      investmentsTotal,
      investmentGoal,
      result,
      resultAfterInvestment,
      expenseGoals,
      expensesByCategory,
    };
  }, [getMonthData, calculateIncomeTotal, calculateGroupTotal, calculateInstallmentsTotal, calculateDailyTotal, calculateInvestmentTotal, getExpensesByCategory]);

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
        .filter((item) => item.isRecurring || (item.installments && item.installments.includes('/')))
        .map((item) => ({ 
          ...item, 
          id: crypto.randomUUID(),
          actual: 0,
        })),
      investmentGoal: currentData.investmentGoal,
      expenseGoals: currentData.expenseGoals,
    }));
  }, [getMonthData, updateMonthData]);

  return {
    getMonthData,
    // Income
    addIncome,
    updateIncome,
    removeIncome,
    // Investments
    addInvestment,
    updateInvestment,
    removeInvestment,
    setInvestmentGoal,
    // Expense goals
    setExpenseGoal,
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
    calculateInvestmentTotal,
    getDailyByCategory,
    getExpensesByCategory,
    getMonthSummary,
    // Utils
    copyToNextMonth,
  };
}