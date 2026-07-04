export interface CategoryProps {
  id: string;
  slug: string;
  label: string;
  color: string;
  budget: number;
}

export class Category {
  constructor(private readonly props: CategoryProps) {
    if (props.budget < 0) throw new Error('budget não pode ser negativo');
  }
  get id() {
    return this.props.id;
  }
  toJSON(): CategoryProps {
    return { ...this.props };
  }
}
