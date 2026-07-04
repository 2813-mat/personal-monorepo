export interface IncomeProps {
  id: string;
  label: string;
  memberId: string | null;
  value: number;
  date: string;
  recurring: boolean;
}

export class Income {
  constructor(private readonly props: IncomeProps) {
    if (props.value < 0) throw new Error('value não pode ser negativo');
  }
  get id() {
    return this.props.id;
  }
  toJSON(): IncomeProps {
    return { ...this.props };
  }
}
