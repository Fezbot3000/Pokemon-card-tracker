/**
 * CRACO (Create React App Configuration Override) configuration
 * This allows us to customize webpack without ejecting
 */

const TerserPlugin = require('terser-webpack-plugin');
const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  // Disable ESLint in dev to avoid noisy overlay; keep it in prod builds
  eslint: isDev
    ? { enable: false }
    : {
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
            maxInitialRequests: 8, // Balanced for mobile performance
            maxAsyncRequests: 15,
            minSize: 20000, // Smaller chunks for better caching
            maxSize: 200000, // Prevent overly large chunks
            cacheGroups: {
              default: false,
              vendors: false,

              // React vendor chunk (async only to avoid initial bundle bloat)
              react: {
                name: 'react',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                priority: 40,
                enforce: true,
                reuseExistingChunk: true
              },

              // React Router (separate from React)
              router: {
                name: 'router',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/,
                priority: 35,
                enforce: true,
                reuseExistingChunk: true
              },

              // Firebase chunk (async only)
              firebase: {
                name: 'firebase',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
                priority: 30,
                enforce: true,
                reuseExistingChunk: true
              },

              // Charts and visualization libraries
              charts: {
                name: 'charts',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts|d3)[\\/]/,
                priority: 28,
                enforce: true,
                reuseExistingChunk: true
              },

              // File processing libraries
              files: {
                name: 'files',
                chunks: 'async', 
                test: /[\\/]node_modules[\\/](papaparse|file-saver|jszip)[\\/]/,
                priority: 27,
                enforce: true,
                reuseExistingChunk: true
              },

              // Payment libraries
              payments: {
                name: 'payments',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](@stripe|stripe)[\\/]/,
                priority: 26,
                enforce: true,
                reuseExistingChunk: true
              },

              // UI libraries (non-critical)
              ui: {
                name: 'ui',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](framer-motion|react-spring|@headlessui|@heroicons)[\\/]/,
                priority: 25,
                enforce: true,
                reuseExistingChunk: true
              },

              // Utility libraries
              utils: {
                name: 'utils',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](lodash|date-fns|moment|uuid)[\\/]/,
                priority: 24,
                enforce: true,
                reuseExistingChunk: true
              },

              // General vendor chunk for remaining node_modules
              vendor: {
                name: 'vendor',
                chunks: 'async',
                test: /[\\/]node_modules[\\/]/,
                priority: 20,
                enforce: true,
                reuseExistingChunk: true,
                minSize: 30000
              },

              // Common app code
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true,
                minSize: 15000
              }
            }
          }
        };
      }
      
      return webpackConfig;
    }
  }
};
