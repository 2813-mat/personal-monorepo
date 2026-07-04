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

export abstract class GoalRepository {
  abstract findAll(): Promise<GoalView[]>;
  abstract addContribution(goalId: string, data: AddContributionData): Promise<void>;
}
