import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category, categoryLabels, categoryIcons } from '@/types/expense';
import { Plus } from 'lucide-react';

interface ExpenseFormProps {
  onSubmit: (expense: {
    description: string;
    amount: number;
    category: Category;
    date: string;
  }) => void;
}

const categories: Category[] = [
  'food',
  'transport',
  'entertainment',
  'shopping',
  'health',
  'bills',
  'other',
];

export function ExpenseForm({ onSubmit }: ExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !category || !date) return;

    onSubmit({
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      date,
    });

    setDescription('');
    setAmount('');
    setCategory('food');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            placeholder="Ex: Almoço no restaurante"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <span className="flex items-center gap-2">
                    <span>{categoryIcons[cat]}</span>
                    <span>{categoryLabels[cat]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Adicionar Gasto
      </Button>
    </form>
  );
}
