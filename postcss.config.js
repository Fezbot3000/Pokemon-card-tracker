module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    // CSS optimization for production builds
    ...(process.env.NODE_ENV === 'production' ? [
      require('cssnano')({
        preset: [
          'default',
          {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            colormin: true,
            convertValues: true,
            discardDuplicates: true,
            discardEmpty: true,
            mergeRules: true,
            minifySelectors: true,
            reduceTransforms: true,
          },
        ],
      }),
    ] : []),
  ],
} 