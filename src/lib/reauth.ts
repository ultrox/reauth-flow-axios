// api.ts
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

export { authFailed, authComplete, api, setShowAuthUI };

/**
 * Single shared Axios instance used by BOTH React Query and Redux thunks.
 */
const api = axios.create({
  baseURL: '/swapi/api/', // same-origin via proxy
  withCredentials: false,
});

/** 401 handling state **/
let isAuthInProgress = false; // single-flight lock
let hasShownAuthUI = false; // avoid spamming the popup
type Resolver = (v?: unknown) => void;
type Rejecter = (err: any) => void;

const waiters: Array<{
  resolve: Resolver;
  reject: Rejecter;
  cfg: InternalAxiosRequestConfig;
}> = [];

/**
 * - showAuthUI(): render popup / open tab
 */
let showAuthUI: (() => void) | null = null;

/** Register how to show the popup/reauth UI */
function setShowAuthUI(fn: () => void) {
  showAuthUI = fn;
}

/** Call when reauth completed successfully (SPNEGO cookie refreshed) */
function authComplete() {
  const queued = [...waiters];
  waiters.length = 0;

  isAuthInProgress = false;
  hasShownAuthUI = false;

  for (const { resolve } of queued) {
    resolve();
  }
}

/** Call when reauth failed/canceled, reject all waiters */
function authFailed(err: unknown) {
  const queued = [...waiters];
  waiters.length = 0;
  isAuthInProgress = false;
  hasShownAuthUI = false;

  for (const { reject } of queued) {
    reject(err);
  }
}
type InternalAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

/**
 * Here is where magic happends
 * Enqueue a failed request to be retried AFTER auth completes.
 * Returns a promise that resolves by re-running the original request.
 */
function queueAndReplay(cfg: AxiosRequestConfig) {
  // queing part, this is where we return a PENDING promise,
  // that will be resolved by authComplete, after ensure session
  return new Promise((resolve, reject) => {
    waiters.push({ resolve, reject, cfg });

    // we need to set single flight lock here becouse
    // first 401 will trigger the UI popup, from there
    // we only need to silantly enqueue the request
    // and not show popup again
    if (!isAuthInProgress) {
      isAuthInProgress = true;

      if (!hasShownAuthUI && showAuthUI) {
        hasShownAuthUI = true;
        showAuthUI(); // controls the UI & flow
      }
    }

    // release part, when we flag them complete authComplete
    // this simply works by using the same config
  }).then(() => {
    // re-run the original request after auth is back
    const retryCfg = {
      ...cfg,
      _retry: true,
    } satisfies InternalAxiosRequestConfig;
    // here we make request with the catched configs
    return api.request(retryCfg);
  });
}

/** Interceptors **/
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as InternalAxiosRequestConfig;

    // Guard: if no response or non-401, just reject
    if (!status || status !== 401) {
      return Promise.reject(error);
    }

    // Prevent infinite loop: if this is a retried call and still 401, bail out
    if (original?._retry === true) {
      return Promise.reject(error);
    }

    // Queue and replay once auth completes
    return queueAndReplay(original);
  }
);

function is401(error: AxiosError) {
  return error.response?.status === 401;
}

// interceptors logger
api.interceptors.request.use(
  (config) => {
    console.log('Request: ', config);
    return config;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      if (is401(error)) {
        console.log('401 detection', error);
      }
    }
    return Promise.reject(error);
  }
);
