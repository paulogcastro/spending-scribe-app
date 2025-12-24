// Grupos de despesas baseados na planilha
export type ExpenseGroup = 'casa' | 'carro' | 'parcelados' | 'diarias';

// Categorias para despesas diárias
export type DailyCategory = 
  | 'alimentacao'
  | 'lazer'
  | 'saude'
  | 'carro'
  | 'roupa'
  | 'outros';

export const dailyCategoryLabels: Record<DailyCategory, string> = {
  alimentacao: 'Alimentação',
  lazer: 'Lazer',
  saude: 'Saúde',
  carro: 'Carro',
  roupa: 'Roupa',
  outros: 'Outros',
};

export const dailyCategoryIcons: Record<DailyCategory, string> = {
  alimentacao: '🍽️',
  lazer: '🎬',
  saude: '💊',
  carro: '🚗',
  roupa: '👕',
  outros: '📦',
};

// Item de despesa fixa (Casa ou Carro)
export interface FixedExpenseItem {
  id: string;
  description: string;
  planned: number;
  actual: number;
  note?: string; // Ex: "[Até Mar/26]"
}

// Item parcelado
export interface InstallmentItem {
  id: string;
  description: string;
  totalValue: number;
  installments: number;
  currentInstallment: number;
  startDate: string; // YYYY-MM
  note?: string;
}

// Despesa diária
export interface DailyExpense {
  id: string;
  description: string;
  amount: number;
  category: DailyCategory;
  date: string;
  createdAt: string;
}

// Renda
export interface IncomeItem {
  id: string;
  description: string;
  planned: number;
  actual: number;
  note?: string;
}

// Estado mensal completo
export interface MonthlyData {
  yearMonth: string; // YYYY-MM
  income: IncomeItem[];
  casa: FixedExpenseItem[];
  carro: FixedExpenseItem[];
  parcelados: InstallmentItem[];
  diarias: DailyExpense[];
}

// Estado global da aplicação
export interface FinanceState {
  months: Record<string, MonthlyData>;
}

// Helpers para cálculos
export function calculateInstallmentValue(item: InstallmentItem): number {
  return item.totalValue / item.installments;
}

export function getInstallmentLabel(item: InstallmentItem): string {
  return `(${item.currentInstallment}/${item.installments})`;
}

export function calculateDifference(planned: number, actual: number): number {
  return planned - actual;
}

export function formatDifference(diff: number): { text: string; isPositive: boolean } {
  if (diff === 0) return { text: '-', isPositive: true };
  const isPositive = diff > 0;
  return {
    text: isPositive ? `+${diff.toFixed(2)}` : diff.toFixed(2),
    isPositive,
  };
}
