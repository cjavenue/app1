/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_STADIA_API_KEY?: string;
  readonly VITE_MAP_STYLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __NEARBY_CONFIG__?: {
    STADIA_API_KEY?: string;
    MAP_STYLE?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
}
