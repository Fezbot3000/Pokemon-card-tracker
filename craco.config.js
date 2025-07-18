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
            maxInitialRequests: 10, // Further reduce initial requests for mobile
            maxAsyncRequests: 20,
            minSize: 15000, // Smaller minimum chunk size for better splitting
            maxSize: 150000, // Smaller maximum chunk size for mobile
            cacheGroups: {
              default: false,
              vendors: false,
              
              // React vendor chunk (critical)
              react: {
                name: 'react',
                chunks: 'initial', // Only for initial load
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                priority: 50,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // React Router (lazy loaded)
              router: {
                name: 'router',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/,
                priority: 45,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Firebase chunk (lazy loaded)
              firebase: {
                name: 'firebase',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
                priority: 40,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Chart.js and heavy visualization libraries
              charts: {
                name: 'charts',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
                priority: 35,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // PDF and file handling libraries
              files: {
                name: 'files',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](@react-pdf\/renderer|jszip|papaparse|file-saver)[\\/]/,
                priority: 32,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Stripe and payment libraries
              payments: {
                name: 'payments',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](@stripe\/stripe-js|stripe)[\\/]/,
                priority: 30,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Maps and geolocation libraries
              maps: {
                name: 'maps',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
                priority: 28,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // UI utility libraries (async)
              ui: {
                name: 'ui',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](react-hot-toast|react-helmet-async|react-intersection-observer)[\\/]/,
                priority: 25,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Utility libraries
              utils: {
                name: 'utils',
                chunks: 'async',
                test: /[\\/]node_modules[\\/](class-variance-authority|clsx|tailwind-merge)[\\/]/,
                priority: 22,
                enforce: true,
                reuseExistingChunk: true
              },
              
              // Other vendor libraries (async only)
              vendor: {
                name: 'vendor',
                chunks: 'async',
                test: /[\\/]node_modules[\\/]/,
                priority: 20,
                enforce: true,
                reuseExistingChunk: true,
                minSize: 30000 // Larger minimum for vendor chunks
              },
              
              // Common app code (only if shared by 3+ chunks)
              common: {
                name: 'common',
                minChunks: 3, // Increase threshold
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
