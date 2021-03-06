// config specific to headless/ server side renderer build
var fs = require('fs')
var path = require('path')
var webpack = require('webpack')

var srcPath = 'src'

// add any extra folders we want to apply loaders to
var pathsToInclude = path.join(__dirname, srcPath)

var nodeModules = {}
fs.readdirSync('node_modules')
  .filter(function (x) {
    return ['.bin'].indexOf(x) === -1
  })
  .forEach(function (mod) {
    nodeModules[mod] = 'commonjs ' + mod
  })

var config = {
  // devtool: 'sourcemap',
  target: 'node',
  entry: [
    './' + srcPath + '/components/webgl/serverSide/rendererCLI.js'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'jam-headless.js',
    publicPath: '/dist/' // '/'+'dist'+'/'
  },
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.ProvidePlugin({
      rx: 'rx',
      Rx: 'rx',
      'window.Rx': 'rx'
    })
  ],
  externals: nodeModules,
  module: {
    loaders: [
      { test: /\.js?$/, loaders: ['babel'], include: pathsToInclude, exclude: /(node_modules|bower_components)/ }
    ],
    noParse: /\.min\.js/
  },
  resolve: {
    extensions: ['', '.js'],
    root: [
      path.join(__dirname, 'node_modules')
    ]
  },
  resolveLoader: {
    root: path.join(__dirname, 'node_modules')
  }
}

// console.log("production",production,"dev",dev)
config.bail = true
config.debug = false
config.profile = false
config.output.pathInfo = false
config.output.publicPath = './dist/' // withouth this, issues with webworker paths

// config.devtool = "#source-map"
// config.output.filename = "[name].min.js"//"[name].[hash].min.js"
// config.output.chunkFilename = '[id].js'
config.plugins = config.plugins.concat([
  // new webpack.DefinePlugin({'process.env': {NODE_ENV: JSON.stringify('production') } })
  // , new webpack.NoErrorsPlugin()
])

module.exports = config
