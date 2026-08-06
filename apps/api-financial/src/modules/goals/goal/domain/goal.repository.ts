export interface GoalView {
  id: string;
  slug: string;
  label: string;
  target: number;
  monthly: number;
  color: string;
  subtitle: string;
  type: 'SONHO' | 'EMERGENCIA';
  balance: number;
  history: number[];
}

export interface AddContributionData {
  amount: number;
  date: string;
}

export interface UpdateGoalData {
  label?: string;
  target?: number;
  monthly?: number;
  color?: string;
  subtitle?: string;
  type?: 'SONHO' | 'EMERGENCIA';
}

export abstract class GoalRepository {
  abstract findAll(): Promise<GoalView[]>;
  abstract addContribution(slug: string, data: AddContributionData): Promise<void>;
  /** `null` quando a meta não existe neste household. */
  abstract update(slug: string, data: UpdateGoalData): Promise<GoalView | null>;
}
