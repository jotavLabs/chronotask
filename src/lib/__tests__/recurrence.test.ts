import type { MonthlyRoutine } from '@/db/schema';
import { getMonthlyStatus, isDoneThisMonth, MONTHLY_STATUS_LABEL } from '../recurrence';

const TODAY = new Date(2026, 5, 12); // 2026-06-12

function routine(overrides: Partial<MonthlyRoutine> = {}): MonthlyRoutine {
  return {
    id: 1,
    name: 'Teste',
    windowStartDay: 11,
    windowEndDay: 17,
    durationMin: 60,
    scheduledDate: null,
    lastDone: null,
    suggestedBlock: null,
    categoryId: 1,
    ...overrides,
  };
}

describe('getMonthlyStatus', () => {
  it('HOJE when scheduled for today', () => {
    expect(getMonthlyStatus(routine({ scheduledDate: '2026-06-12' }), TODAY)).toBe('HOJE');
  });

  it('FEITA when done in current month (even if window passed)', () => {
    expect(
      getMonthlyStatus(routine({ windowStartDay: 1, windowEndDay: 5, lastDone: '2026-06-03' }), TODAY),
    ).toBe('FEITA');
  });

  it('AGENDADA when scheduled for a future day this month', () => {
    expect(getMonthlyStatus(routine({ scheduledDate: '2026-06-20' }), TODAY)).toBe('AGENDADA');
  });

  it('AGENDAR when today is inside the window and not scheduled/done', () => {
    expect(getMonthlyStatus(routine({ windowStartDay: 11, windowEndDay: 17 }), TODAY)).toBe('AGENDAR');
  });

  it('ATRASADA when window end passed and not done', () => {
    expect(getMonthlyStatus(routine({ windowStartDay: 1, windowEndDay: 5 }), TODAY)).toBe('ATRASADA');
  });

  it('ATRASADA ignores lastDone from a previous month', () => {
    expect(
      getMonthlyStatus(routine({ windowStartDay: 1, windowEndDay: 5, lastDone: '2026-05-03' }), TODAY),
    ).toBe('ATRASADA');
  });

  it('AGUARDANDO before the window opens', () => {
    expect(getMonthlyStatus(routine({ windowStartDay: 20, windowEndDay: 25 }), TODAY)).toBe('AGUARDANDO');
  });
});

describe('isDoneThisMonth', () => {
  it('matches same month/year only', () => {
    expect(isDoneThisMonth('2026-06-01', TODAY)).toBe(true);
    expect(isDoneThisMonth('2026-05-31', TODAY)).toBe(false);
    expect(isDoneThisMonth(null, TODAY)).toBe(false);
  });
});

describe('MONTHLY_STATUS_LABEL', () => {
  it('maps AGUARDANDO to an empty label', () => {
    expect(MONTHLY_STATUS_LABEL.AGUARDANDO).toBe('');
    expect(MONTHLY_STATUS_LABEL.ATRASADA).toBe('ATRASADA');
  });
});
