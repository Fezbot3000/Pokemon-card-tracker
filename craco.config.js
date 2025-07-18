/**
 * CRACO (Create React App Configuration Override) configuration
 * This allows us to customize webpack without ejecting
 */

const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  eslint: {
    configure: {
      rules: {
        'tailwindcss/migration-from-tailwind-2': 'warn',
        'tailwindcss/enforces-shorthand': 'warn'
      }
    }
  },
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
            maxInitialRequests: 25,
            maxAsyncRequests: 30,
            cacheGroups: {
              default: false,
              vendors: false,
              
              // React vendor chunk
              react: {
                name: 'react',
                chunks: 'all',
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
                priority: 40,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // UI library chunk
              ui: {
                name: 'ui',
                chunks: 'all',
                test: /[\\/]node_modules[\\/](react-hot-toast|react-helmet-async)[\\/]/,
                priority: 35,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Firebase chunk
              firebase: {
                name: 'firebase',
                chunks: 'all',
                test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
                priority: 30,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Vendor chunk for other libraries
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /[\\/]node_modules[\\/]/,
                priority: 20,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Common chunk for app code
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
