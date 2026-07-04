const { override } = require('customize-cra');

module.exports = override((config) => {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    os: false,
  };
  return config;
});
