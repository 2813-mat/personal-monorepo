export interface BillingCycle {
  start: Date;
  end: Date;
}

export function billingCycleFor(closingDay: number, ref: Date = new Date()): BillingCycle {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  let end = new Date(y, m, closingDay);
  if (ref.getDate() > closingDay) end = new Date(y, m + 1, closingDay);
  const start = new Date(end.getFullYear(), end.getMonth() - 1, closingDay + 1);
  return { start, end };
}
