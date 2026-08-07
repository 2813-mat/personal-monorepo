export interface RecurringIncomeProps {
  id: string;
  label: string;
  holder: string;
  value: number;
  /** Dia do mês em que cai. Meses curtos truncam para o último dia. */
  day: number;
  startDate: string;
}

export class RecurringIncome {
  constructor(private readonly props: RecurringIncomeProps) {
    if (props.value < 0) throw new Error('value não pode ser negativo');
    if (props.day < 1 || props.day > 31) throw new Error('day deve estar entre 1 e 31');
  }
  get id() {
    return this.props.id;
  }
  toJSON(): RecurringIncomeProps {
    return { ...this.props };
  }
}
