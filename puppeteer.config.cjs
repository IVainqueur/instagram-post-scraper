const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  ...(process.env.NODE_ENV === 'production' ? {
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  }: {})
};