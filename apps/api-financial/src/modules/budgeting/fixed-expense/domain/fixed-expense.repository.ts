export interface FixedExpenseView {
  id: string;
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
  startDate: string;
  /** Data do pagamento no mês consultado. Ausente = pendente. */
  paidAt?: string;
  /** Valor de fato lançado, que pode divergir do cadastro. */
  paidValue?: number;
}

export interface CreateFixedExpenseData {
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
  /** Ausente = primeiro dia do mês corrente. */
  startDate?: string;
}

export interface UpdateFixedExpenseData {
  label?: string;
  value?: number;
  dueDay?: number;
  categorySlug?: string;
  holder?: string;
  startDate?: string;
}

export interface PayFixedExpenseData {
  /** Data em que o pagamento saiu. O mês do pagamento vem dela. */
  date: string;
  /** Ausente = o valor do cadastro. */
  value?: number;
  method: 'PIX' | 'CARD';
  cardId?: string;
}

export abstract class FixedExpenseRepository {
  abstract findAllWithStatus(year: number, month: number): Promise<FixedExpenseView[]>;
  abstract create(data: CreateFixedExpenseData): Promise<FixedExpenseView>;
  /**
   * `null` quando o id não existe neste household. Recebe ano/mês porque o
   * pagamento da view devolvida é relativo a um mês.
   */
  abstract update(
    id: string,
    data: UpdateFixedExpenseData,
    year: number,
    month: number,
  ): Promise<FixedExpenseView | null>;
  /**
   * Lança o pagamento do mês como transação vinculada ao fixo. `null` quando o
   * id não existe neste household.
   */
  abstract pay(id: string, data: PayFixedExpenseData): Promise<FixedExpenseView | null>;
  /**
   * Desfaz o pagamento do mês, apagando a transação que o representava. `null`
   * quando o id não existe neste household.
   */
  abstract unpay(id: string, year: number, month: number): Promise<FixedExpenseView | null>;
  /** `false` quando o id não existe neste household. */
  abstract remove(id: string): Promise<boolean>;
}
