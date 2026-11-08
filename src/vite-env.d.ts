/// <reference types="vite/client" />


interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  // more env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const pngUrl: string;
  export default pngUrl;
}
