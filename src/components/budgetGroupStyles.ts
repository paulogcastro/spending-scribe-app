import {
  Car,
  CreditCard,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  Package,
  PawPrint,
  Plane,
  Receipt,
  Repeat2,
  type LucideIcon,
} from 'lucide-react';
import type { BudgetGroupRecord } from '@/lib/expenseDomain';

export const groupIconOptions: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'home', label: 'Casa', icon: Home },
  { value: 'car', label: 'Carro', icon: Car },
  { value: 'repeat', label: 'Fixos', icon: Repeat2 },
  { value: 'credit-card', label: 'Parcelados', icon: CreditCard },
  { value: 'receipt', label: 'Diários', icon: Receipt },
  { value: 'paw', label: 'Pet', icon: PawPrint },
  { value: 'graduation-cap', label: 'Educação', icon: GraduationCap },
  { value: 'gamepad', label: 'Lazer', icon: Gamepad2 },
  { value: 'heart-pulse', label: 'Saúde', icon: HeartPulse },
  { value: 'plane', label: 'Viagem', icon: Plane },
  { value: 'package', label: 'Outros', icon: Package },
];

export function getGroupIcon(iconKey: string): LucideIcon {
  return groupIconOptions.find(item => item.value === iconKey)?.icon ?? Package;
}

export const groupColorOptions: {
  value: BudgetGroupRecord['color'];
  label: string;
  cardClass: string;
  badgeClass: string;
  barClass: string;
  dotClass: string;
}[] = [
  { value: 'amber', label: 'Âmbar', cardClass: 'group-card-casa', badgeClass: 'bg-warning/15 text-warning', barClass: 'bg-warning', dotClass: 'bg-warning' },
  { value: 'blue', label: 'Azul', cardClass: 'group-card-carro', badgeClass: 'bg-category-transport/15 text-category-transport', barClass: 'bg-category-transport', dotClass: 'bg-category-transport' },
  { value: 'purple', label: 'Roxo', cardClass: 'group-card-fixos', badgeClass: 'bg-category-entertainment/15 text-category-entertainment', barClass: 'bg-category-entertainment', dotClass: 'bg-category-entertainment' },
  { value: 'pink', label: 'Rosa', cardClass: 'group-card-parcelados', badgeClass: 'bg-category-shopping/15 text-category-shopping', barClass: 'bg-category-shopping', dotClass: 'bg-category-shopping' },
  { value: 'red', label: 'Vermelho', cardClass: 'group-card-diarias', badgeClass: 'bg-destructive/15 text-destructive', barClass: 'bg-destructive', dotClass: 'bg-destructive' },
  { value: 'emerald', label: 'Esmeralda', cardClass: 'group-card-emerald', badgeClass: 'bg-primary/15 text-primary', barClass: 'bg-primary', dotClass: 'bg-primary' },
  { value: 'cyan', label: 'Ciano', cardClass: 'group-card-cyan', badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400', barClass: 'bg-cyan-500', dotClass: 'bg-cyan-500' },
  { value: 'indigo', label: 'Índigo', cardClass: 'group-card-indigo', badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400', barClass: 'bg-indigo-500', dotClass: 'bg-indigo-500' },
  { value: 'orange', label: 'Laranja', cardClass: 'group-card-orange', badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400', barClass: 'bg-orange-500', dotClass: 'bg-orange-500' },
];

export function getGroupColorStyles(color: BudgetGroupRecord['color']) {
  return groupColorOptions.find(item => item.value === color) ?? groupColorOptions[5];
}
