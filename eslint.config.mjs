import nx from '@nx/eslint-plugin';

// Regras de fronteira comuns a produção e teste.
const sharedConstraints = [
  {
    sourceTag: 'scope:api',
    onlyDependOnLibsWithTags: ['scope:api', 'scope:shared'],
  },
  {
    sourceTag: 'scope:shared',
    onlyDependOnLibsWithTags: ['scope:shared'],
  },
  {
    sourceTag: 'type:types',
    onlyDependOnLibsWithTags: [],
  },
  {
    sourceTag: 'type:utils',
    onlyDependOnLibsWithTags: ['type:types'],
  },
  {
    sourceTag: 'type:data',
    onlyDependOnLibsWithTags: ['type:types', 'type:utils'],
  },
];

const webCanUseShared = {
  sourceTag: 'scope:web',
  onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
};

const boundaryRule = (constraints) => ({
  '@nx/enforce-module-boundaries': [
    'error',
    {
      enforceBuildableLibDependency: true,
      allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
      depConstraints: constraints,
    },
  ],
});

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc'],
  },
  {
    // Produção: a migração API↔front acabou, então nenhum arquivo de app pode
    // voltar a importar fixtures (`shared-mocks` é `type:data`).
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: boundaryRule([
      { ...webCanUseShared, notDependOnLibsWithTags: ['type:data'] },
      ...sharedConstraints,
    ]),
  },
  {
    // Testes seguem podendo usar fixtures.
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: boundaryRule([webCanUseShared, ...sharedConstraints]),
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];
