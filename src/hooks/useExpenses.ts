import { useState, useEffect, useCallback } from 'react';
import { Expense, Category } from '@/types/expense';

const STORAGE_KEY = 'expense-tracker-data';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setExpenses(JSON.parse(stored));
      } catch {
        setExpenses([]);
      }
    }
  }, []);

  const saveToStorage = useCallback((data: Expense[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const removeExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const getExpensesByMonth = useCallback((year: number, month: number) => {
    return expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }, [expenses]);

  const getTotalByCategory = useCallback((expenseList: Expense[]) => {
    const totals: Record<Category, number> = {
      food: 0,
      transport: 0,
      entertainment: 0,
      shopping: 0,
      health: 0,
      bills: 0,
      other: 0,
    };
    
    expenseList.forEach((expense) => {
      totals[expense.category] += expense.amount;
    });
    
    return totals;
  }, []);

  const getTotal = useCallback((expenseList: Expense[]) => {
    return expenseList.reduce((sum, e) => sum + e.amount, 0);
  }, []);

  return {
    expenses,
    addExpense,
    removeExpense,
    getExpensesByMonth,
    getTotalByCategory,
    getTotal,
  };
}
