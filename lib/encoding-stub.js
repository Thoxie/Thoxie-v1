// PATH: lib/encoding-stub.js

// Minimal stub for `encoding` (optional dep used by node-fetch@2).
// It is only needed so webpack can resolve the module during build.

function convert(input) {
  return input;
}

function detect() {
  return "utf8";
}

module.exports = {
  convert,
  detect,
};

