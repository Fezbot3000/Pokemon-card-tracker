module.exports = {
  extends: [
    'react-app',
    'react-app/jest',
    'plugin:tailwindcss/recommended'
  ],
  plugins: ['tailwindcss'],
  rules: {
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/no-custom-classname': 'warn',
    'tailwindcss/no-contradicting-classname': 'error',
    'tailwindcss/enforces-negative-arbitrary-values': 'error',
    'tailwindcss/enforces-shorthand': 'error',
    'tailwindcss/migration-from-tailwind-2': 'error',
    'tailwindcss/no-arbitrary-value': 'off',
    'tailwindcss/no-unnecessary-arbitrary-value': 'error',
    // Additional React and TypeScript rules
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-key': 'error',
    'react/no-array-index-key': 'warn',
    'react/no-unused-prop-types': 'warn',
    'react/no-unused-state': 'warn',
    'react/prop-types': 'off', // We'll use TypeScript instead
    'no-unused-vars': 'off', // Let TypeScript handle this
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'warn',
    'no-debugger': 'error'
  },
  settings: {
    tailwindcss: {
      config: './tailwind.config.js',
      classRegex: '^(class(Name)?|tw)$'
    }
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  }
};
