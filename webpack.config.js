const webpack = require('webpack');
const ejs = require('ejs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtensionReloader = require('webpack-extension-reloader');
const { VueLoaderPlugin } = require('vue-loader');
const { version } = require('./package.json');

const config = {
  mode: process.env.NODE_ENV,
  context: __dirname + '/src',
  entry: {
    background: './background.ts',
    'popup/popup': './popup/popup.ts',
    'options/options': './options/options.ts',
    inject: './lib/inject.ts',
    'inject-bridge': './lib/inject-bridge.ts',
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.ts', '.vue'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loaders: 'vue-loader',
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        use: {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: '/images/',
          emitFile: false,
        },
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: '/fonts/',
          emitFile: false,
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      global: 'window',
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyWebpackPlugin([
      { from: 'icons', to: 'icons', ignore: ['icon.xcf'] },
      { from: 'popup/popup.html', to: 'popup/popup.html', transform: transformHtml },
      { from: 'options/options.html', to: 'options/options.html', transform: transformHtml },
      {
        from: '_locales',
        to: '_locales',
        transform: (content, filePath) => {
          if (!filePath.endsWith('messages.json')) {
            return content;
          }

          return transformLocaleMessages(content);
        },
      },
      {
        from: 'manifest.json',
        to: 'manifest.json',
        transform: content => {
          const jsonContent = JSON.parse(content);

          if (config.mode === 'development') {
            if (jsonContent.manifest_version === 3) {
              jsonContent['content_security_policy'] = {
                extension_pages: "script-src 'self' 'unsafe-eval'; object-src 'self'",
              };
            } else {
              jsonContent['content_security_policy'] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
            }
          }

          return JSON.stringify(jsonContent, null, 2);
        },
      },
    ]),
  ],
};

if (config.mode === 'production') {
  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
  ]);
}

if (process.env.HMR === 'true') {
  config.plugins = (config.plugins || []).concat([
    new ExtensionReloader({
      manifest: __dirname + '/src/manifest.json',
    }),
  ]);
}

function transformHtml(content) {
  return ejs.render(content.toString(), {
    ...process.env,
  });
}

function transformLocaleMessages(content) {
  const parsed = JSON.parse(content.toString());
  const transformed = {};

  for (const key of Object.keys(parsed)) {
    const normalizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');

    if (normalizedKey in transformed) {
      throw new Error(`Locale key collision while normalizing '${key}' -> '${normalizedKey}'`);
    }

    transformed[normalizedKey] = parsed[key];
  }

  return JSON.stringify(transformed, null, 2);
}

module.exports = config;
