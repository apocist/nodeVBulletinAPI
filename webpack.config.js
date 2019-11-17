const path = require("path");

module.exports = {
    mode: 'development',
    entry: "./src/index.ts",

    output: {
        path: path.join(__dirname, "dist"),
        filename: "bundle.js",
        chunkFilename: "[name].chunk.js"
    },

    resolve: {
        extensions: [".js", ".ts"]
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                include: path.join(__dirname, "src"),
                loader: "ts-loader",
                options: {
                    configFile: "tsconfig.commonjs.json"
                }
            }
        ]
    },

    devServer: {
        contentBase: "./dist"
    }
};