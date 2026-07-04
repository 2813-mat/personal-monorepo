export interface FixedExpenseView {
  id: string;
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  memberId: string | null;
  paidThisMonth: boolean;
}

export interface CreateFixedExpenseData {
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  memberId?: string | null;
}

export abstract class FixedExpenseRepository {
  abstract findAllWithStatus(year: number, month: number): Promise<FixedExpenseView[]>;
  abstract create(data: CreateFixedExpenseData): Promise<FixedExpenseView>;
}
