// Grupos de despesas baseados na planilha
export type ExpenseGroup = 'casa' | 'carro' | 'parcelados' | 'diarias';

// Categorias gerais para todas as despesas
export type ExpenseCategory = 
  | 'casa'
  | 'carro'
  | 'alimentacao'
  | 'almoco'
  | 'besteira'
  | 'lazer'
  | 'hobbies'
  | 'saude'
  | 'roupa'
  | 'tiriri'
  | 'estudos'
  | 'investimento'
  | 'outros';

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  casa: 'Casa',
  carro: 'Carro',
  alimentacao: 'Alimentação',
  almoco: 'Almoço',
  besteira: 'Besteira',
  lazer: 'Lazer',
  hobbies: 'Hobbies',
  saude: 'Saúde',
  roupa: 'Roupa',
  tiriri: 'Tiriri',
  estudos: 'Estudos',
  investimento: 'Investimento',
  outros: 'Outros',
};

export const expenseCategoryIcons: Record<ExpenseCategory, string> = {
  casa: '🏠',
  carro: '🚗',
  alimentacao: '🍽️',
  almoco: '🍛',
  besteira: '🍔',
  lazer: '🎬',
  hobbies: '🎮',
  saude: '💊',
  roupa: '👕',
  tiriri: '🐱',
  estudos: '📚',
  investimento: '💰',
  outros: '📦',
};

// Categorias para despesas diárias (subset)
export type DailyCategory = 
  | 'alimentacao'
  | 'almoco'
  | 'besteira'
  | 'lazer'
  | 'hobbies'
  | 'saude'
  | 'carro'
  | 'roupa'
  | 'tiriri'
  | 'estudos'
  | 'outros';

export const dailyCategoryLabels: Record<DailyCategory, string> = {
  alimentacao: 'Alimentação',
  almoco: 'Almoço',
  besteira: 'Besteira',
  lazer: 'Lazer',
  hobbies: 'Hobbies',
  saude: 'Saúde',
  carro: 'Carro',
  roupa: 'Roupa',
  tiriri: 'Tiriri',
  estudos: 'Estudos',
  outros: 'Outros',
};

export const dailyCategoryIcons: Record<DailyCategory, string> = {
  alimentacao: '🍽️',
  almoco: '🍛',
  besteira: '🍔',
  lazer: '🎬',
  hobbies: '🎮',
  saude: '💊',
  carro: '🚗',
  roupa: '👕',
  tiriri: '🐱',
  estudos: '📚',
  outros: '📦',
};

// Item de despesa fixa (Casa ou Carro)
export interface FixedExpenseItem {
  id: string;
  description: string;
  actual: number;
  installments?: string; // Para carro - ex: "1/12"
  note?: string; // Ex: "[Até Mar/26]"
}

// Tipo de cartão para parcelados
export type CardType = 'cartao_mae' | 'cartao_inter' | 'mercado_pago' | 'pix';

export const cardTypeLabels: Record<CardType, string> = {
  cartao_mae: 'Cartão Mãe',
  cartao_inter: 'Cartão Inter',
  mercado_pago: 'Mercado Pago',
  pix: 'Pix',
};

// Fonte de pagamento para despesas diárias
export type PaymentSource = 'inter_credito' | 'pix' | 'neon' | 'mercado_pago';

export const paymentSourceLabels: Record<PaymentSource, string> = {
  inter_credito: 'Inter Crédito',
  pix: 'Pix',
  neon: 'Neon',
  mercado_pago: 'Mercado Pago',
};

// Item parcelado
export interface InstallmentItem {
  id: string;
  description: string;
  actual: number;
  installments?: string; // Ex: "1/12"
  card: CardType;
  category?: ExpenseCategory;
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
  note?: string;
  importKey?: string;
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

// Planejamento por ciclo (Bloco 2): estrutura própria, separada do MonthlyData legado.
export interface ExtraIncome {
  id: string;
  description: string;
  amount: number;
  date?: string; // Data civil local do recebimento (YYYY-MM-DD)
}

// Grupos com percentual editável; Gastos diários é sempre o residual.
export type BudgetGroup = string;

export interface CyclePlanning {
  cycleId: string; // Mesmo identificador do FinancialCycle (YYYY-MM-DD, dia 04)
  plannedSalary: number; // Salário CLT planejado
  receivedSalary: number; // Salário efetivamente recebido (realização, nunca copiada)
  extraIncomes: ExtraIncome[]; // Rendas extras: aumentam o caixa livre do ciclo
  investmentBaseGoal: number; // Meta fixa de investimento (0..plannedSalary)
  investedAmount?: number; // Valor efetivamente investido no ciclo (realização, nunca copiada)
  distribution: Record<BudgetGroup, number>; // Percentuais 0–100
}

export interface CyclePlanningState {
  version: 1;
  plans: Record<string, CyclePlanning>;
}

// Cycle metadata is deliberately separate from legacy monthly financial data.
export interface FinancialCycle {
  id: string; // Local start date, YYYY-MM-DD
  startDate: string; // Inclusive
  endDate: string; // Exclusive: the next day-4 boundary
}

export interface FinancialCycleState {
  version: 1;
  selectedCycleId: string;
  cycles: Record<string, FinancialCycle>;
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
