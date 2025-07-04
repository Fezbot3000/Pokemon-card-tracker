/**
 * CRACO (Create React App Configuration Override) configuration
 * This allows us to customize webpack without ejecting
 */

const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Optimization for production builds
      if (process.env.NODE_ENV === 'production') {
        // Disable source maps in production
        webpackConfig.devtool = false;
        
        // Optimize bundle splitting and remove console logs
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: false, // Keep console.* calls for debugging
                  drop_debugger: true, // Remove debugger statements
                  pure_funcs: [] // Keep all console methods for debugging
                },
                mangle: true,
                format: {
                  comments: false // Remove all comments
                }
              },
              extractComments: false // Don't extract comments to separate file
            })
          ],
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
