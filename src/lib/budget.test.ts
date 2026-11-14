import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBudgetPace, getGoalStatus } from './budget';

test('weekly tracking distributes the daily expense goal across remaining days including today', () => {
  const pace = getBudgetPace(1000, 660, 2026, 10, new Date(2026, 10, 14));
  assert.equal(pace.remaining, 340);
  assert.equal(pace.daysRemaining, 17);
  assert.equal(pace.daily, 20);
  assert.equal(pace.weekly, 140);
});
test('overspending does not produce a negative daily or weekly allowance', () => {
  const pace = getBudgetPace(100, 150, 2026, 10, new Date(2026, 10, 14));
  assert.equal(pace.remaining, -50);
  assert.equal(pace.daily, 0);
  assert.equal(pace.weekly, 0);
});
test('weekly allowance is capped to the days left in the month', () => {
  const pace = getBudgetPace(200, 100, 2026, 10, new Date(2026, 10, 29));
  assert.equal(pace.daily, 50);
  assert.equal(pace.weekly, 100);
});
test('past months have no future allowance and future months use the full month', () => {
  assert.equal(getBudgetPace(300, 0, 2026, 9, new Date(2026, 10, 14)).weekly, 0);
  assert.equal(getBudgetPace(310, 0, 2026, 11, new Date(2026, 10, 14)).daily, 10);
});
test('no goal is distinct from an exhausted goal', () => {
  assert.equal(getBudgetPace(0, 10, 2026, 10).hasGoal, false);
  assert.equal(getGoalStatus(0, 10), 'unset');
});
test('expense progress warns at 80% and exceeds the limit only above 100%', () => {
  assert.equal(getGoalStatus(100, 79), 'safe');
  assert.equal(getGoalStatus(100, 80), 'warning');
  assert.equal(getGoalStatus(100, 100), 'warning');
  assert.equal(getGoalStatus(100, 101), 'over');
});