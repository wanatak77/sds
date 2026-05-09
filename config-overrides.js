module.exports = function override(config, env) {
  config.module.rules = config.module.rules.map(rule => {
    if (rule.test && rule.test.toString().includes('mjs') && Array.isArray(rule.use)) {
      return {
        ...rule,
        use: rule.use.map(loader => {
          if (loader && loader.loader && loader.loader.includes('source-map-loader')) {
            return {
              ...loader,
              options: {
                ...loader.options,
                filterSourceMappingUrl: (url, resource) => {
                  if (resource && resource.includes('react-router-dom')) return false;
                  return true;
                }
              }
            };
          }
          return loader;
        })
      };
    }
    return rule;
  });

  return config;
};
