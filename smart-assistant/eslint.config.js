export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly', location: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', crypto: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', navigator: 'readonly', MutationObserver: 'readonly', Blob: 'readonly', URL: 'readonly', prompt: 'readonly', TextEncoder: 'readonly', structuredClone: 'readonly', self: 'readonly', caches: 'readonly', fetch: 'readonly', process: 'readonly' }
    },
    rules: { 'no-unused-vars': ['error', { args: 'none' }], 'no-undef': 'error' }
  }
];
