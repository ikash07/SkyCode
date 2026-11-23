import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://skycode-t3ry.onrender.com/api' : 'http://localhost:4000/api');

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 35000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Cache in-flight GET requests to eliminate duplicate duplicate fetches
const inFlightRequests = new Map();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('skycode_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Resilient response interceptor with automatic exponential-backoff retries for 429, 502, 503, 504, and network timeouts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;
    const isGet = (config.method || 'get').toLowerCase() === 'get';
    const maxRetries = isGet ? 3 : 1;

    const status = error.response?.status;
    const isNetworkOrTimeout = !error.response || error.code === 'ECONNABORTED' || error.message.includes('Network Error');
    const isRetryableStatus = status === 429 || status === 502 || status === 503 || status === 504;

    if ((isNetworkOrTimeout || isRetryableStatus) && config.__retryCount < maxRetries) {
      config.__retryCount += 1;
      const baseDelay = Math.min(800 * Math.pow(2, config.__retryCount - 1), 4000);
      const jitter = Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
      return api(config);
    }

    const serverMessage = error.response?.data?.message;
    if (serverMessage) {
      error.message = serverMessage;
    }
    return Promise.reject(error);
  }
);
