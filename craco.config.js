/**
 * CRACO (Create React App Configuration Override) configuration
 * This allows us to customize webpack without ejecting
 */

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Optimization for production builds
      if (process.env.NODE_ENV === 'production') {
        // Disable source maps in production
        webpackConfig.devtool = false;
        
        // Optimize bundle splitting
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              // Vendor chunk
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /node_modules/,
                priority: 20
              },
              // Common chunk
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true
              }
            }
          }
        };
      }
      
      return webpackConfig;
    }
  }
};
