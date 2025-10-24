const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: process.env.NODE_ENV || 'production',

  // Entry points for bundling
  entry: {
    // Main application bundle
    app: './public/js/app.js',

    // Vendor bundle for third-party libraries
    vendor: [
      'axios',
      'moment',
      'lodash',
      'chart.js'
    ],

    // Admin dashboard bundle
    admin: './public/js/admin.js',

    // Customer portal bundle
    customer: './public/js/customer.js'
  },

  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: '[name].[contenthash].bundle.js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              '@babel/plugin-transform-runtime',
              '@babel/plugin-proposal-class-properties'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
            passes: 2
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ],

    // Code splitting configuration
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        },
        // Separate async chunks
        async: {
          test: /[\\/]node_modules[\\/]/,
          chunks: 'async',
          name: 'async-vendors',
          priority: 15
        }
      }
    },

    // Module concatenation for smaller bundle size
    concatenateModules: true,

    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime'
    }
  },

  plugins: [
    // Gzip compression
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),

    // Brotli compression
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        level: 11
      },
      threshold: 10240,
      minRatio: 0.8
    }),

    // Bundle analyzer (only in development)
    ...(process.env.ANALYZE === 'true' ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        openAnalyzer: true
      })
    ] : [])
  ],

  // Performance hints
  performance: {
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false
  },

  // Source maps for debugging (only in development)
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',

  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'public/js'),
      '@components': path.resolve(__dirname, 'public/js/components'),
      '@utils': path.resolve(__dirname, 'public/js/utils'),
      '@services': path.resolve(__dirname, 'public/js/services')
    }
  }
};