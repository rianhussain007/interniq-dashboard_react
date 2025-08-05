/// <reference types="vite/client" />


interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // more env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const pngUrl: string;
  export default pngUrl;
}
