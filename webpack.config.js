const path = require("path");

module.exports = {
    mode: 'development',
    entry: "./src/VBApi.ts",

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
            /*{
                test: /\.ts$/,
                include: path.join(__dirname, "src"),
                loader: "ts-loader",
                options: {
                    configFile: "tsconfig.umd.json"
                }
            },*/
            {
                test: /\.tsx?$/,
                include: path.join(__dirname, "src"),
                loader: 'awesome-typescript-loader',
                options: {
                    configFileName: "tsconfig.umd.json"
                }
            }
        ]
    },

    devServer: {
        contentBase: "./dist"
    }
};