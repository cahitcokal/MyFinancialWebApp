const { createApp, ref, computed } = Vue;
const db = window.supabase.createClient('https://ogioyzxqmahowxogwwbb.supabase.co', 'sb_publishable_qQ17GqKmqw8TEfiRSNIchSw_w7hLr5aL');
const currencies = ['USD', 'EUR', 'OMR', 'CAD'];

createApp({
  setup() {
    const ready = ref(false), session = ref(null), isAdmin = ref(false), errorMessage = ref('');
    const trips = ref([]), expenses = ref([]), selectedTrip = ref(null);
    const editingTrip = ref(null), editingExpense = ref(null);
    const loginForm = ref({ email: '', password: '' });
    const emptyTrip = () => ({ name: '', country: '', allowance_amount: null, currency: 'USD', allowance_try: null });
    const emptyExpense = () => ({ trip_id: '', name: '', amount_try: null, amount_currency: null, currency: 'USD' });
    const tripForm = ref(emptyTrip()), expenseForm = ref(emptyExpense());
    const activeTrips = computed(() => trips.value.filter(t => t.status === 'AKTIF'));
    const selectedExpenses = computed(() => selectedTrip.value ? expenses.value.filter(e => e.trip_id === selectedTrip.value.id) : []);
    const detailTotals = computed(() => selectedExpenses.value.reduce((sum, e) => ({ try: sum.try + Number(e.amount_try || 0), currency: sum.currency + (e.currency === selectedTrip.value.currency ? Number(e.amount_currency || 0) : 0) }), { try: 0, currency: 0 }));
    const money = (value, currency) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
    const load = async () => { const [{ data: t }, { data: e }] = await Promise.all([db.from('trips').select('*').order('created_at', { ascending: false }), db.from('trip_expenses').select('*').order('created_at', { ascending: false })]); trips.value = t || []; expenses.value = e || []; };
    const authenticate = async (currentSession) => {
      session.value = currentSession;
      if (currentSession) {
        const { data: role, error: roleError } = await db.rpc('get_my_role');
        const normalizedRole = Array.isArray(role) ? role[0]?.role : role;
        isAdmin.value = String(normalizedRole || '').trim().toLowerCase() === 'admin';
        if (roleError) errorMessage.value = `Rol kontrolü başarısız: ${roleError.message}`;
        else if (!isAdmin.value) errorMessage.value = 'Bu hesap admin değil. Supabase allowed_users tablosunda bu e-posta için role = admin olmalı.';
        if (isAdmin.value) await load();
      }
      ready.value = true;
    };
    const login = async () => {
      errorMessage.value = '';
      const { data, error } = await db.auth.signInWithPassword({ email: loginForm.value.email.trim().toLowerCase(), password: loginForm.value.password });
      if (error) errorMessage.value = 'E-posta veya şifre hatalı.';
      else { const { data: sessionData } = await db.auth.getSession(); await authenticate(sessionData.session || data.session); }
    };
    const logout = async () => { await db.auth.signOut({ scope: 'local' }); session.value = null; isAdmin.value = false; };
    const optionalValues = (form, keys) => Object.fromEntries(keys.filter(key => form[key] !== null && form[key] !== undefined && form[key] !== '').map(key => [key, form[key]]));
    const addTrip = async () => { const payload = { name: tripForm.value.name, country: tripForm.value.country, status: 'AKTIF', ...optionalValues(tripForm.value, ['allowance_amount', 'currency', 'allowance_try']) }; const { error } = await db.from('trips').insert([payload]); if (error) return alert(error.message); tripForm.value = emptyTrip(); await load(); };
    const addExpense = async () => { const payload = { trip_id: expenseForm.value.trip_id, name: expenseForm.value.name, amount_try: expenseForm.value.amount_try, ...optionalValues(expenseForm.value, ['amount_currency', 'currency']) }; const { error } = await db.from('trip_expenses').insert([payload]); if (error) return alert(error.message); expenseForm.value = emptyExpense(); await load(); if (selectedTrip.value) selectedTrip.value = trips.value.find(t => t.id === selectedTrip.value.id); };
    const openDetails = (trip) => { selectedTrip.value = trip; };
    const refreshSelectedTrip = () => { if (selectedTrip.value) selectedTrip.value = trips.value.find(t => t.id === selectedTrip.value.id) || null; };
    const toggleStatus = async () => { const nextStatus = selectedTrip.value.status === 'AKTIF' ? 'PASIF' : 'AKTIF'; const { error } = await db.from('trips').update({ status: nextStatus }).eq('id', selectedTrip.value.id); if (error) return alert(error.message); await load(); refreshSelectedTrip(); };
    const startTripEdit = (trip) => { editingTrip.value = { ...trip }; };
    const updateTrip = async () => { const payload = optionalValues(editingTrip.value, ['name', 'country', 'allowance_amount', 'currency', 'allowance_try']); const { error } = await db.from('trips').update(payload).eq('id', editingTrip.value.id); if (error) return alert(error.message); editingTrip.value = null; await load(); refreshSelectedTrip(); };
    const deleteTrip = async (trip) => { const hasExpenses = expenses.value.some(e => e.trip_id === trip.id); if (hasExpenses) return alert('Bu seyahat masraf kaydı içerdiği için silinemez. Önce masrafları silin.'); if (!confirm(`“${trip.name}” seyahatini silmek istiyor musunuz?`)) return; const { error } = await db.from('trips').delete().eq('id', trip.id); if (error) return alert(error.message); if (selectedTrip.value?.id === trip.id) selectedTrip.value = null; await load(); };
    const startExpenseEdit = (expense) => { editingExpense.value = { ...expense }; };
    const updateExpense = async () => { const payload = optionalValues(editingExpense.value, ['trip_id', 'name', 'amount_try', 'amount_currency', 'currency']); const { error } = await db.from('trip_expenses').update(payload).eq('id', editingExpense.value.id); if (error) return alert(error.message); editingExpense.value = null; await load(); refreshSelectedTrip(); };
    const deleteExpense = async (expense) => { if (!confirm(`“${expense.name}” masrafını silmek istiyor musunuz?`)) return; const { error } = await db.from('trip_expenses').delete().eq('id', expense.id); if (error) return alert(error.message); await load(); refreshSelectedTrip(); };
    db.auth.getSession().then(({ data }) => authenticate(data.session));
    return { ready, session, isAdmin, errorMessage, loginForm, login, logout, trips, activeTrips, currencies, tripForm, addTrip, expenseForm, addExpense, selectedTrip, openDetails, selectedExpenses, detailTotals, toggleStatus, editingTrip, startTripEdit, updateTrip, deleteTrip, editingExpense, startExpenseEdit, updateExpense, deleteExpense, money };
  }
}).mount('#app');
