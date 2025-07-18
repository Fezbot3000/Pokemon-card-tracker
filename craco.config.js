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
          
          // Optimize CSS loading strategy
          const HtmlWebpackPlugin = require('html-webpack-plugin');
          
          // Find and configure HtmlWebpackPlugin for better CSS loading
          webpackConfig.plugins = webpackConfig.plugins.map(plugin => {
            if (plugin.constructor.name === 'HtmlWebpackPlugin') {
              return new HtmlWebpackPlugin({
                ...plugin.options,
                inject: 'body', // Inject JS at body end for better loading
                scriptLoading: 'defer', // Defer script loading
                minify: {
                  removeComments: true,
                  collapseWhitespace: true,
                  removeRedundantAttributes: true,
                  useShortDoctype: true,
                  removeEmptyAttributes: true,
                  removeStyleLinkTypeAttributes: true,
                  keepClosingSlash: true,
                  minifyJS: true,
                  minifyCSS: true,
                  minifyURLs: true,
                }
              });
            }
            return plugin;
          });
        
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
            maxInitialRequests: 5, // Reduce network requests for better mobile performance
            maxAsyncRequests: 10,
            minSize: 30000, // Larger minimum chunk size
            maxSize: 500000, // Larger maximum chunk size
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
              
              // Firebase chunk
              firebase: {
                name: 'firebase',
                chunks: 'all',
                test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
                priority: 30,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Large utility libraries
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /[\\/]node_modules[\\/]/,
                priority: 20,
                enforce: true,
                reuseExistingChunk: true,
                minSize: 50000 // Only create vendor chunks for large libraries
              },
              
              // Common app code
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true,
                minSize: 20000
              }
            }
          }
        };
      }
      
      return webpackConfig;
    }
  }
};
