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
  installments?: string; // Para carro - ex: "1/12"
  note?: string; // Ex: "[Até Mar/26]"
}

// Tipo de cartão para parcelados
export type CardType = 'cartao_mae' | 'cartao_inter';

export const cardTypeLabels: Record<CardType, string> = {
  cartao_mae: 'Cartão Mãe',
  cartao_inter: 'Cartão Inter',
};

// Fonte de pagamento para despesas diárias
export type PaymentSource = 'inter_credito' | 'pix' | 'neon';

export const paymentSourceLabels: Record<PaymentSource, string> = {
  inter_credito: 'Inter Crédito',
  pix: 'Pix',
  neon: 'Neon',
};

// Item parcelado
export interface InstallmentItem {
  id: string;
  description: string;
  planned: number;
  actual: number;
  installments?: string; // Ex: "1/12"
  card: CardType;
  isRecurring?: boolean;
  note?: string;
}

// Investimento
export interface InvestmentItem {
  id: string;
  description: string;
  amount: number;
}

// Despesa diária
export interface DailyExpense {
  id: string;
  description: string;
  amount: number;
  category: DailyCategory;
  source: PaymentSource;
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

// Metas de gastos por grupo
export interface ExpenseGoals {
  casa: number;
  carro: number;
  parcelados: number;
  diarias: number;
}

// Estado mensal completo
export interface MonthlyData {
  yearMonth: string; // YYYY-MM
  income: IncomeItem[];
  casa: FixedExpenseItem[];
  carro: FixedExpenseItem[];
  parcelados: InstallmentItem[];
  diarias: DailyExpense[];
  investments: InvestmentItem[];
  investmentGoal: number;
  expenseGoals: ExpenseGoals;
}

// Estado global da aplicação
export interface FinanceState {
  months: Record<string, MonthlyData>;
}

// Helpers para cálculos
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
