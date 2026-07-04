module.exports = {
  displayName: 'api-financial',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api-financial',
  // e2e specs precisam da stack Docker + servidor no ar; rodam via target `e2e`.
  testPathIgnorePatterns: ['/node_modules/', '\\.e2e\\.spec\\.ts$'],
};
