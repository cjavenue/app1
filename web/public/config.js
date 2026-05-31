// Runtime config for the Nearby web app.
//
// These are PUBLIC client keys (Stadia public key + Supabase *publishable* key).
// They are designed to ship in the browser and are protected by Stadia domain
// restrictions + Supabase Row-Level Security — committing them is the same
// exposure as the built JS bundle, with the bonus that the app works on ANY
// host with no environment-variable setup.
//
// To rotate or point at a different project, just edit this file.
window.__NEARBY_CONFIG__ = {
  STADIA_API_KEY: 'd67a8ada-9108-4329-ad56-3461b6f7ac47',
  MAP_STYLE: '',
  SUPABASE_URL: 'https://jblvzezhvqgexlrtbfir.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_frCPpPDWDr6cjM6HqG_D4Q_UTmwqCPy',
};
