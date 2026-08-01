/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute backend API base URL, e.g. http://localhost:8000/api/v1 in dev.
   *  Falls back to the relative /api/v1 (Vite dev proxy) when unset. */
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
