// Path: /scripts/postcssPlugins.js
function safeRequire(name) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(name);
  } catch {
    return null;
  }
}

function buildPlugins() {
  const plugins = {};

  const autoprefixer = safeRequire("autoprefixer");
  if (autoprefixer) {
    plugins.autoprefixer = {};
  }

  return plugins;
}

module.exports = { buildPlugins };

