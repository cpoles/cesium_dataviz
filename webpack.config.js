var HtmlPlugin = require('html-webpack-plugin');
var path = require('path');
var webpack = require('webpack');


module.exports = {
    entry: "./src/app.js",
    output: {
        path: path.join(__dirname, '/dist'),
        filename: "bundle.js",
        sourcePrefix: ''
    },
    plugins: [
        new HtmlPlugin({
            template: 'index.html',
            inject : true
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            "window.jQuery": "jquery'",
            "window.$": "jquery"
        })
    ],
    devServer: {
        contentBase: './public',
    },
    module: {
        unknownContextCritical: false,
        unknownContextRegExp: /^.\/.*$/,
        loaders: [
            { test: /\.css$/, loader: 'style-loader!css-loader' },
            { test: /\.(png|gif|jpg|jpeg)$/, loader: 'file-loader'},
            { test: /\.csv$/, loader: 'dsv-loader' },
            {
            loader: "babel-loader",

                // Skip any files outside of your project's `src` directory
                include: [
                    path.resolve(__dirname),
                ],
                exclude: [
                    path.resolve(__dirname, "node_modules"),
                ],

                // Only run `.js` and `.jsx` files through Babel
                test: /\.jsx?$/,

                // Options to configure babel with
                query: {
                    plugins: ['transform-runtime'],
                    presets: ['es2015']
                }
            }
        ]
    }
};
