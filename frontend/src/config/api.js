/**
 * API Base URL resolution:
 * - When deployed on Vercel or production: defaults to '/api'
 * - In local development (localhost / 127.0.0.1): defaults to 'http://localhost:8000'
 * - Can be overridden anytime via VITE_API_BASE environment variable
 */
export const API_BASE = (
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' &&
   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:8000`
    : '/api')
).replace(/\/$/, '');
