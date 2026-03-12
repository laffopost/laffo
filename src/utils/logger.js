/**
 * Shared logger utility for LaughCoin.
 * Only logs in development mode — completely silent in production.
 */
const isDev =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

const logger = {
  log: isDev ? console.log.bind(console) : () => {},
  warn: isDev ? console.warn.bind(console) : () => {},
  error: isDev ? console.error.bind(console) : () => {},
  info: isDev ? console.info.bind(console) : () => {},
};

export default logger;
