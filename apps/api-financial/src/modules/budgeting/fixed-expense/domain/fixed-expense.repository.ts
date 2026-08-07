export interface FixedExpenseView {
  id: string;
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
  paidThisMonth: boolean;
}

export interface CreateFixedExpenseData {
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
}

export interface UpdateFixedExpenseData {
  label?: string;
  value?: number;
  dueDay?: number;
  categorySlug?: string;
  holder?: string;
}

export abstract class FixedExpenseRepository {
  abstract findAllWithStatus(year: number, month: number): Promise<FixedExpenseView[]>;
  abstract create(data: CreateFixedExpenseData): Promise<FixedExpenseView>;
  /**
   * `null` quando o id não existe neste household. Recebe ano/mês porque
   * `paidThisMonth` da view devolvida é relativo a um mês.
   */
  abstract update(
    id: string,
    data: UpdateFixedExpenseData,
    year: number,
    month: number,
  ): Promise<FixedExpenseView | null>;
  /** `false` quando o id não existe neste household. */
  abstract remove(id: string): Promise<boolean>;
}
