export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', route: '/dashboard' },
  {
    id: 'transactions',
    label: 'Transações',
    icon: 'list',
    route: '/transactions',
  },
  { id: 'cards', label: 'Cartões', icon: 'card', route: '/cards' },
  { id: 'incomes', label: 'Receitas', icon: 'arrowUp', route: '/incomes' },
  { id: 'fixed', label: 'Gastos fixos', icon: 'repeat', route: '/fixed' },
  { id: 'budgets', label: 'Orçamentos', icon: 'target', route: '/budgets' },
  { id: 'goals', label: 'Metas', icon: 'flame', route: '/goals' },
  { id: 'reports', label: 'Relatórios', icon: 'chart', route: '/reports' },
  {
    id: 'settings',
    label: 'Configurações',
    icon: 'settings',
    route: '/settings',
  },
];

/** Grupos da sidebar (desktop). Receitas é operação: entra junto de Transações. */
export const OPERACAO = NAV_ITEMS.slice(0, 5);
export const PLANEJAMENTO = NAV_ITEMS.slice(5, 8);
export const SISTEMA = NAV_ITEMS.slice(8);

export function navItem(id: string): NavItem {
  const found = NAV_ITEMS.find(i => i.id === id);
  if (!found) throw new Error(`NavItem desconhecido: ${id}`);
  return found;
}

/** Destinos fixos da bottom-nav. O botão central de novo gasto não é rota. */
export const BOTTOM_NAV_IDS = ['dashboard', 'transactions', 'cards'] as const;

/** Tudo que não coube na bottom-nav, na ordem da folha "Mais". */
export const MORE_IDS = [
  'incomes',
  'fixed',
  'budgets',
  'goals',
  'reports',
  'settings',
] as const;
