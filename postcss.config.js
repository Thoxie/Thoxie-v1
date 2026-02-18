// Path: /postcss.config.js
const { buildPlugins } = require("./scripts/postcssPlugins");

module.exports = {
  plugins: buildPlugins()
};
