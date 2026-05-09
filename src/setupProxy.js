const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      onError: (err, req, res) => {
        console.warn('API proxy error (server may not be running):', err.message);
        res.status(503).json({ error: 'API server unavailable' });
      }
    })
  );
  
  app.use(
    '/xai-api',
    createProxyMiddleware({
      target: 'https://api.x.ai',
      changeOrigin: true,
      secure: false, // Prevents SSL issues on some local environments
      pathRewrite: { '^/xai-api': '' },
    })
  );

  app.use(
    '/gemini-api',
    createProxyMiddleware({
      target: 'https://generativelanguage.googleapis.com',
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/gemini-api': '' },
    })
  );
};
