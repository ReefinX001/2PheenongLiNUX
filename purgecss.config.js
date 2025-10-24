module.exports = {
  // ไฟล์ที่ต้องการตรวจสอบ (HTML, JS)
  content: [
    './views/account/**/*.html',
    './views/account/**/*.js',
    './public/**/*.js',
  ],

  // ไฟล์ CSS ที่ต้องการ purge
  css: [
    './views/account/**/*.css'
  ],

  // Classes, IDs, และ patterns ที่ต้องการเก็บไว้แม้ไม่เจอใน HTML
  safelist: {
    standard: [
      /^dark/,           // Dark mode classes
      /^light/,          // Light mode classes
      /^tree-/,          // Tree structure classes
      /^dropdown/,       // Dropdown classes
      /^modal/,          // Modal classes
      /^tooltip/,        // Tooltip classes
      /^active$/,        // Active state
      /^show$/,          // Show state
      /^hide$/,          // Hide state
      /^expanded$/,      // Expanded state
      /^collapsed$/,     // Collapsed state
      /^loading$/,       // Loading state
      /^error$/,         // Error state
      /^success$/,       // Success state
      /^warning$/,       // Warning state
    ],
    deep: [
      /^data-/,          // Data attributes
      /^aria-/,          // ARIA attributes
    ],
    greedy: [
      /^hover:/,         // Hover states
      /^focus:/,         // Focus states
      /^active:/,        // Active states
    ]
  },

  // Options
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],

  // Font faces และ keyframes จะไม่ถูกลบ
  fontFace: true,
  keyframes: true,

  // Variables จะไม่ถูกลบ
  variables: true,

  // Output directory
  output: './views/account/purged/'
};
