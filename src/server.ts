import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Proxy for MeshView API to avoid CORS issues in SSR
 */
app.get('/mesh-api/*', async (req, res) => {
  try {
    // Extract everything after /mesh-api/
    const targetPath = req.url.split('/mesh-api/')[1];
    const apiUrl = `https://my.meshview.world/mexico/api/${targetPath}`;

    console.log(`[Proxy] Fetching: ${apiUrl}`);
    const response = await fetch(apiUrl);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from MeshView API' });
  }
});

/**
 * Proxy for Meshtastic Official API
 */
app.get('/meshtastic-api/*', async (req, res) => {
  try {
    const targetPath = req.url.split('/meshtastic-api/')[1];
    const apiUrl = `https://api.meshtastic.org/${targetPath}`;

    const response = await fetch(apiUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Meshtastic API Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from Meshtastic API' });
  }
});

/**
 * Proxy for Meshtastic Official Resource API
 */
app.get('/meshtastic-resource/*', async (req, res) => {
  try {
    const targetPath = req.url.split('/meshtastic-resource/')[1];
    const apiUrl = `https://api.meshtastic.org/resource/${targetPath}`;

    const response = await fetch(apiUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Meshtastic Resource API Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from Meshtastic Resource API' });
  }
});



/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
