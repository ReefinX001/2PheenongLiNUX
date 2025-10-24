const html = require('eslint-plugin-html');

module.exports = [
  {
    files: ['**/*.js', '**/*.html'],
    plugins: {
      html
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        location: 'readonly',
        navigator: 'readonly',

        // Node.js globals (for scripts)
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        Buffer: 'readonly',

        // Browser Crypto & Encoding APIs
        crypto: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',

        // Browser APIs
        XMLHttpRequest: 'readonly',
        MutationObserver: 'readonly',
        Image: 'readonly',
        URL: 'readonly',
        Element: 'readonly',
        Document: 'readonly',

        // Application-specific globals
        tailwind: 'readonly',
        LoadingSystem: 'readonly',
        lottie: 'readonly',
        Chart: 'readonly',
        dayjs: 'readonly',
        XLSX: 'readonly',
        html2pdf: 'readonly',
        showLoading: 'readonly',
        fetchUserProfile: 'readonly',
        resolvePhotoUrl: 'readonly',
        logout: 'readonly',
        API_BASE: 'readonly',
        token: 'readonly',

        // Security utilities
        SecurityScanner: 'readonly',
        SecurityLogger: 'readonly',
        SecurityUtils: 'readonly',
        SecureAuth: 'readonly',

        // Third-party libraries
        CryptoAES: 'readonly',
        io: 'readonly',

        // Browser screen API
        screen: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'warn',
      'quotes': ['error', 'single', {
        avoidEscape: true,
        allowTemplateLiterals: true
      }],
      'semi': ['error', 'always'],
      'no-trailing-spaces': 'warn'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.history/**',
      'coverage/**',
      'build/**',
      'public/socket.io.min.js',
      '*.min.js',
      'ZKFinger SDK V10.0-Windows-Lite/**'
    ]
  }
];
