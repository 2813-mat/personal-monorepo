export interface CardProps {
  id: string;
  name: string;
  bank: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  last4: string;
  ownerMemberId: string | null;
  current: number;
}

export class Card {
  constructor(private readonly props: CardProps) {}
  get id() {
    return this.props.id;
  }
  toJSON(): CardProps {
    return { ...this.props };
  }
}
