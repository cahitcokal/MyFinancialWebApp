(function configureApplication() {
  const SUPABASE_URL = 'https://ogioyzxqmahowxogwwbb.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_qQ17gKmqw8TEfiRSNIchSw_w7hLr5aL';

  window.APP_CONFIG = Object.freeze({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.log('Service Worker kaydı yapılamadı:', error);
      });
    });
  }
})();
