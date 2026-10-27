(function configureApplication() {
  const SUPABASE_URL = 'https://ogioyzxqmahowxogwwbb.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_qQ17gKmqw8TEfiRSNIchSw_w7hLr5aL';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authScreen = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginSubmit = document.getElementById('login-submit');

  const setLoginError = (message = '') => {
    loginError.textContent = message;
    loginError.classList.toggle('hidden', !message);
  };

  const showLoggedOut = (message = '') => {
    authScreen.classList.remove('hidden');
    app.classList.add('hidden');
    setLoginError(message);
  };

  const showLoggedIn = () => {
    authScreen.classList.add('hidden');
    app.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('app-authenticated'));
  };

  const authErrorMessage = (error) => {
    if (error?.message?.toLowerCase().includes('invalid login credentials')) {
      return 'E-posta veya şifre hatalı.';
    }
    return 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
  };

  const verifyAuthorization = async (session) => {
    if (!session) {
      showLoggedOut();
      return false;
    }

    const { data: allowed, error } = await db.rpc('is_allowed_user');
    if (error || allowed !== true) {
      await db.auth.signOut({ scope: 'local' });
      showLoggedOut('Bu kullanıcı uygulamayı kullanmak için yetkilendirilmemiş.');
      return false;
    }

    showLoggedIn();
    return true;
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setLoginError();
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Giriş yapılıyor...';

    const formData = new FormData(loginForm);
    const { error } = await db.auth.signInWithPassword({
      email: String(formData.get('email')).trim().toLowerCase(),
      password: String(formData.get('password'))
    });

    if (error) setLoginError(authErrorMessage(error));
    loginSubmit.disabled = false;
    loginSubmit.textContent = 'Giriş Yap';
  });

  window.APP_AUTH = Object.freeze({
    client: db,
    signOut: () => db.auth.signOut({ scope: 'local' })
  });

  window.APP_CONFIG = Object.freeze({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });

  window.APP_AUTH_READY = db.auth.getSession()
    .then(async ({ data }) => ({
      session: await verifyAuthorization(data.session) ? data.session : null
    }))
    .catch(() => {
      showLoggedOut('Oturum kontrol edilemedi. Lütfen sayfayı yenileyin.');
      return { session: null };
    });

  db.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === 'SIGNED_OUT') {
        showLoggedOut();
      } else if (session) {
        verifyAuthorization(session);
      }
    }, 0);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.log('Service Worker kaydı yapılamadı:', error);
      });
    });
  }
})();
