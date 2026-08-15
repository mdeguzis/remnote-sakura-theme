const path = require('path');
const { resolve } = require('path');
const { globSync } = require('glob');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { EsbuildPlugin } = require('esbuild-loader');
const { ProvidePlugin, BannerPlugin } = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const { execFileSync } = require('child_process');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Re-inline assets/ and src/css/ before every compile.
 *
 * Those directories are the real source, but the bundle imports them through
 * generated modules that only exist because a build step wrote them. Without
 * this, editing a stylesheet fragment or a piece of artwork during npm run dev
 * does nothing at all: webpack sees no change, because the file it actually
 * imports has not been touched. The fix looks like "the dev server is broken"
 * rather than "you need to run another command".
 */
class InlineSourcesPlugin {
  apply(compiler) {
    compiler.hooks.beforeCompile.tap('InlineSourcesPlugin', () => {
      try {
        execFileSync('node', [resolve(__dirname, 'scripts/build-sources.mjs')], { stdio: 'inherit' });
      } catch (error) {
        // Do not take the whole dev server down for one bad edit. The compile
        // continues against the previous generated modules and the next save
        // gets another attempt.
        console.error('[webpack] failed to inline sources:', error.message);
      }
    });
  }
}

// RemNote loads each widget twice: once directly and once inside a sandboxed
// iframe. Both bundles come from the same entry file.
const SANDBOX_SUFFIX = '-sandbox';

const DEV_PORT = Number(process.env.PORT || 8080);
const DEV_HOST = process.env.HOST || 'localhost';

const config = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'eval-cheap-module-source-map',

  // glob v11 returns paths without a leading "./", which webpack would treat as
  // a request into node_modules, so make each one explicitly relative.
  entry: globSync('src/widgets/*.tsx').reduce(function (obj, el) {
    const entryPath = './' + el.split(path.sep).join('/');
    obj[path.parse(el).name] = entryPath;
    obj[path.parse(el).name + SANDBOX_SUFFIX] = entryPath;
    return obj;
  }, {}),

  output: {
    path: resolve(__dirname, 'dist'),
    filename: '[name].js',
    publicPath: '',
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  module: {
    rules: [
      {
        test: /\.(ts|tsx|jsx|js)?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2020',
          minify: false,
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      templateContent: `
      <body></body>
      <script type="text/javascript">
      const urlSearchParams = new URLSearchParams(window.location.search);
      const queryParams = Object.fromEntries(urlSearchParams.entries());
      const widgetName = queryParams["widgetName"];
      if (widgetName == undefined) {document.body.innerHTML+="Widget ID not specified."}

      const s = document.createElement('script');
      s.type = "module";
      s.src = widgetName+"${SANDBOX_SUFFIX}.js";
      document.body.appendChild(s);
      </script>
    `,
      filename: 'index.html',
      inject: false,
    }),
    new ProvidePlugin({
      React: 'react',
      reactDOM: 'react-dom',
    }),
    new BannerPlugin({
      banner: (file) => (!file.chunk.name.includes(SANDBOX_SUFFIX) ? 'const IMPORT_META=import.meta;' : ''),
      raw: true,
    }),
    // manifest.json has to land at the server root. RemNote's "Develop from
    // localhost" dialog fetches http://localhost:8080/manifest.json first, and
    // reports a network error if it is missing.
    new InlineSourcesPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '' },
        { from: 'README.md', to: '' },
        { from: 'logo.png', to: '' },
      ],
    }),
  ].filter(Boolean),
};

if (isProd) {
  config.optimization = {
    minimize: true,
    minimizer: [new EsbuildPlugin({ target: 'es2020' })],
  };
} else {
  config.devServer = {
    host: DEV_HOST,
    port: DEV_PORT,
    open: false,
    hot: true,
    compress: true,
    // assets and src/css are watched explicitly: they are not imported by the
    // bundle directly, only through the generated modules.
    watchFiles: ['src/**/*', 'public/**/*', 'assets/**/*', 'scripts/**/*'],
    // RemNote runs on remnote.com (or in Electron) and fetches this server
    // cross-origin, so both of these are required or the manifest fetch fails.
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    allowedHosts: 'all',
    // Belt and braces: CopyPlugin already emits public/ into the compilation,
    // but serving the directory too means a stale build still resolves.
    static: [{ directory: resolve(__dirname, 'public'), publicPath: '/' }],
    client: {
      overlay: { errors: true, warnings: false },
    },
  };
}

module.exports = config;
