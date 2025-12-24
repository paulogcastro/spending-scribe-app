export type Category = 
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'bills'
  | 'other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  createdAt: string;
}

export const categoryLabels: Record<Category, string> = {
  food: 'Alimentação',
  transport: 'Transporte',
  entertainment: 'Lazer',
  shopping: 'Compras',
  health: 'Saúde',
  bills: 'Contas',
  other: 'Outros',
};

export const categoryIcons: Record<Category, string> = {
  food: '🍽️',
  transport: '🚗',
  entertainment: '🎬',
  shopping: '🛒',
  health: '💊',
  bills: '📄',
  other: '📦',
};
