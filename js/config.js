(function configureApplication() {
  const SUPABASE_URL = 'https://ogioyzxqmahowxogwwbb.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_qQ17gKmqw8TEfiRSNIchSw_w7hLr5aL';
  const PASSWORD_RESET_REDIRECT_URL = 'https://cahitcokal.github.io/MyFinancialWebApp/';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authScreen = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginSubmit = document.getElementById('login-submit');
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const backToLogin = document.getElementById('back-to-login');
  const forgotEmail = document.getElementById('forgot-email');
  const forgotError = document.getElementById('forgot-error');
  const forgotMessage = document.getElementById('forgot-message');
  const forgotSubmit = document.getElementById('forgot-submit');
  const passwordModal = document.getElementById('password-modal');
  const changePasswordForm = document.getElementById('change-password-form');
  const changePasswordMessage = document.getElementById('change-password-message');
  const changePasswordSubmit = document.getElementById('change-password-submit');

  const setElementMessage = (element, message = '', type = 'error') => {
    element.textContent = message;
    element.classList.toggle('hidden', !message);
    element.classList.toggle('bg-rose-50', type === 'error' && Boolean(message));
    element.classList.toggle('border-rose-200', type === 'error' && Boolean(message));
    element.classList.toggle('text-rose-700', type === 'error' && Boolean(message));
    element.classList.toggle('bg-emerald-50', type === 'success' && Boolean(message));
    element.classList.toggle('border-emerald-200', type === 'success' && Boolean(message));
    element.classList.toggle('text-emerald-700', type === 'success' && Boolean(message));
  };

  const setLoginError = (message = '') => {
    loginError.textContent = message;
    loginError.classList.toggle('hidden', !message);
  };

  const showLoggedOut = (message = '') => {
    authScreen.classList.remove('hidden');
    app.classList.add('hidden');
    passwordModal.classList.add('hidden');
    passwordModal.classList.remove('flex');
    setLoginError(message);
  };

  const showLoggedIn = (role) => {
    authScreen.classList.add('hidden');
    app.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('app-authenticated', { detail: { role } }));
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
      return null;
    }

    const { data: role, error } = await db.rpc('get_my_role');
    if (error || !['admin', 'member'].includes(role)) {
      await db.auth.signOut({ scope: 'local' });
      showLoggedOut('Bu kullanıcı uygulamayı kullanmak için yetkilendirilmemiş.');
      return null;
    }

    showLoggedIn(role);
    return role;
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

  forgotPasswordLink.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    forgotPasswordLink.classList.add('hidden');
    forgotPasswordForm.classList.remove('hidden');
    setLoginError();
    setElementMessage(forgotError);
    setElementMessage(forgotMessage);
    forgotEmail.focus();
  });

  backToLogin.addEventListener('click', () => {
    forgotPasswordForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    forgotPasswordLink.classList.remove('hidden');
    setElementMessage(forgotError);
    setElementMessage(forgotMessage);
  });

  forgotPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setElementMessage(forgotError);
    setElementMessage(forgotMessage);
    forgotSubmit.disabled = true;
    forgotSubmit.textContent = 'Gönderiliyor...';

    const email = forgotEmail.value.trim().toLowerCase();
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL
    });

    if (error) {
      setElementMessage(forgotError, 'Sıfırlama bağlantısı gönderilemedi. Lütfen e-posta adresini kontrol edin.');
    } else {
      setElementMessage(forgotMessage, 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.', 'success');
    }
    forgotSubmit.disabled = false;
    forgotSubmit.textContent = 'Sıfırlama bağlantısı gönder';
  });

  const openPasswordModal = () => {
    changePasswordForm.reset();
    setElementMessage(changePasswordMessage);
    passwordModal.classList.remove('hidden');
    passwordModal.classList.add('flex');
    document.getElementById('new-password').focus();
  };

  const closePasswordModal = () => {
    passwordModal.classList.add('hidden');
    passwordModal.classList.remove('flex');
  };

  document.getElementById('open-password-modal').addEventListener('click', openPasswordModal);
  document.getElementById('close-password-modal').addEventListener('click', closePasswordModal);

  changePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setElementMessage(changePasswordMessage);
    const password = document.getElementById('new-password').value;
    const passwordConfirm = document.getElementById('new-password-confirm').value;

    if (password.length < 6) {
      setElementMessage(changePasswordMessage, 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      setElementMessage(changePasswordMessage, 'Şifreler aynı değil.');
      return;
    }

    changePasswordSubmit.disabled = true;
    changePasswordSubmit.textContent = 'Güncelleniyor...';
    const { error } = await db.auth.updateUser({ password });
    if (error) {
      setElementMessage(changePasswordMessage, 'Şifre güncellenemedi. Lütfen tekrar deneyin.');
    } else {
      setElementMessage(changePasswordMessage, 'Şifreniz başarıyla güncellendi.', 'success');
      changePasswordForm.reset();
    }
    changePasswordSubmit.disabled = false;
    changePasswordSubmit.textContent = 'Şifreyi Güncelle';
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
    .then(async ({ data }) => {
      const role = await verifyAuthorization(data.session);
      if (role && window.location.hash.includes('type=recovery')) openPasswordModal();
      return {
        session: role ? data.session : null,
        role
      };
    })
    .catch(() => {
      showLoggedOut('Oturum kontrol edilemedi. Lütfen sayfayı yenileyin.');
      return { session: null, role: null };
    });

  db.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      if (event === 'SIGNED_OUT') {
        showLoggedOut();
      } else if (session) {
        const role = await verifyAuthorization(session);
        if (event === 'PASSWORD_RECOVERY' && role) openPasswordModal();
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
