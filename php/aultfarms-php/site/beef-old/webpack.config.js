var path = require('path');
var webpack = require('webpack');
var autoprefixer = require('autoprefixer');
var precss = require('precss');
var csswring = require('csswring');
var fs = require('fs');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var ProgressBarPlugin = require('progress-bar-webpack-plugin');

/////////////////////////////////////////////////////////
// The base configuration that the others modify for
// each situation (avoids a lot of code repeating below):

// NOTE: take out the 'DEV' for production in the jsx loader

var _configs = {
  base: function() {
    return {
      //debug: true,
      //devtool: 'cheap-module-eval-source-map',
      devtool: 'source-map',
      entry: './main.js',
      target: 'web',
      output: {
        path: __dirname + '/build/',
        filename: 'bundle.js',
        publicPath: '/build/',
      },
      module: {
        loaders: [
          //{ test: /\.jsx?$/, loaders: ['babel-loader?presets[]=react,presets[]=es2015,presets[]=stage-0,plugins[]=transform-decorators-legacy'], exclude: [ /node_modules/, /bower_components/ ] },
          { test: /\.jsx?$/, loaders: ['preprocess-loader?'] }, //[ 'preprocess-loader?+DEV' ] }, // gives c-style preprocessor directives liek @ifdef DEV
          // Note: you need optional[]=runtime as per Cerebral install docs for IE because cerebral needs promises
          { 
            test: /\.jsx?$/, 
            loader: 'babel-loader',
            exclude: [ /node_modules/ ],
            query: {
              presets: ['react','es2015'],
              plugins: [ 'transform-decorators-legacy', 
                         'transform-class-properties',
                         'transform-object-rest-spread',
                         'transform-runtime'], 
            },
          },
          { test: /\.less$/, loader: 'style!css!less-loader' },
          { test: /\.scss$/, loader: 'style!css!sass?outputStyle=expanded' },
          { test: /\.css$/, loader: 'style-loader!css-loader' },
          // lcss defined below for each config
          { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader?name=[name].[ext]' },
          { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url-loader?limit=10000&minetype=application/font-woff' },
          { test: /\.gif$/, loader: 'url-loader?mimetype=image/png' },
          { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192' }, // inline base64 URLs for <=8k images, direct URLs for the rest
          { test: /\.json$/, loader: 'json-loader' },
          { test: /\.lcss$/, loader: 'style-loader!css-loader?modules&localIdentName=[path][name]---[local]---[hash:base64:5]!postcss-loader?modules' },
          // The 'html' loader below copies any .html files to the output dir
          { test: /\.html?$/, loader: 'file-loader?name=[name]', },
          // Have to fix one of the jquery modules for webpack loading:
          // http://alexomara.com/blog/webpack-and-jquery-include-only-the-parts-you-need/
          { test: /jquery\/src\/selector\.js$/, loader: 'amd-define-factory-patcher-loader' },
          // Fix loading is_js. Tracking: arasatasaygin#100
//          { test: /is_js/, loader: 'imports?define=>undefined' }
        ],
        noParse: [/braintree-web/],
      },
      resolve: {
        // you can now require('file') instead of require('file.json')
        extensions: ['', '.js', '.jsx', '.json', '.css', '.less', '.lcss'],
        modulesDirectories: ['node_modules', 'bower_components' ],
        alias: {
          assets: path.resolve('./assets'),
        }
      },
      postcss: {
        // packs to use with post css
        defaults: [autoprefixer, precss]
      },
      plugins: [
        new webpack.optimize.DedupePlugin(),
        new ProgressBarPlugin({ clear: false }),
      ],
    };
  },

  node: function() {
    cfg = _configs.base();
    cfg.entry = {
      model: './controller-global/model.js',
      util: './lib/util',
    },
    cfg.output.path = __dirname + '/dist-node/',
    cfg.output.filename = '[name].js',

    // Tell react to use the node versions of required modules where possible
/*
    cfg.externals = {};
    fs.readdirSync('node_modules')
    .filter(function(x) {
      return ['.bin'].indexOf(x) === -1;
    }).forEach(function(mod) {
      cfg.externals[mod] = 'commonjs ' + mod;
    });
*/

    // Setup webpack to output a library as module.exports:
    cfg.target = 'node',
    cfg.output.libraryTarget = 'commonjs2',
    cfg.output.library = 'bundle',

    // Don't let the style-loader put a bunch of window junk in the node bundle:
    cfg.plugins.push(new webpack.NormalModuleReplacementPlugin(/\.css$/, 'node-noop'));
    cfg.plugins.push(new webpack.NormalModuleReplacementPlugin(/\.less$/, 'node-noop'));
    cfg.plugins.push(new webpack.NormalModuleReplacementPlugin(/\.scss$/, 'node-noop'));

    // Ask the css-loader to render just the local css names:
    cfg.module.loaders.push({ test: /\.lcss$/, loader: 'style-loader!css-loader/locals?modules&localIdentName=[path][name]---[local]---[hash:base64:5]!postcss-loader' });

    // For source maps (should probably turn off for production server):
    // From http://jlongster.com/Backend-Apps-with-Webpack--Part-I
    cfg.devtool = 'source-map';
    cfg.plugins.push(new webpack.BannerPlugin('require("source-map-support").install();', {
      raw: true,
      entryOnly: false
    }));
    cfg.module.preLoaders = [
      { test: /\.js$/, loader: "source-map-loader", }
    ];
    return cfg;
  },
};

module.exports = [ _configs.base(), _configs.node() ];
