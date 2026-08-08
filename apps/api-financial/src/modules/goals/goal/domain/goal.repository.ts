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
  /**
   * Quantos aportes a meta recebeu ao todo. `history` tem sempre 12 posições —
   * é uma janela de meses, não uma lista de aportes — então não dá para contar
   * a partir dela.
   */
  contributionCount: number;
}

export interface CreateGoalData {
  label: string;
  subtitle: string;
  target: number;
  monthly: number;
  color: string;
  type: 'SONHO' | 'EMERGENCIA';
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
  /** O slug é derivado do label pela infraestrutura; não vem do cliente. */
  abstract create(data: CreateGoalData): Promise<GoalView>;
  abstract addContribution(slug: string, data: AddContributionData): Promise<void>;
  /** `null` quando a meta não existe neste household. */
  abstract update(slug: string, data: UpdateGoalData): Promise<GoalView | null>;
}
