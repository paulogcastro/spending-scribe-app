export function getBudgetPace(goal: number, spent: number, year: number, month: number, today = new Date()) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const current = today.getFullYear() * 12 + today.getMonth();
  const selected = year * 12 + month;
  const daysRemaining = selected < current ? 0 : selected > current ? daysInMonth : daysInMonth - today.getDate() + 1;
  const remaining = goal - spent;
  const available = Math.max(0, remaining);
  const daily = goal > 0 && daysRemaining > 0 ? available / daysRemaining : 0;
  return { remaining, daysRemaining, daily, weekly: daily * Math.min(7, daysRemaining), percent: goal > 0 ? spent / goal * 100 : 0, hasGoal: goal > 0 };
}

export function getGoalStatus(goal: number, actual: number) {
  if (goal <= 0) return 'unset';
  const ratio = actual / goal;
  return ratio > 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'safe';
}