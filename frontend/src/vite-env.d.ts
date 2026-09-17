/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_POWERBI_WORKSPACE_ID: string;
  readonly VITE_POWERBI_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
