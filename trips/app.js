const { createApp, ref, computed } = Vue;
const db = window.supabase.createClient('https://ogioyzxqmahowxogwwbb.supabase.co', 'sb_publishable_qQ17gKmqw8TEfiRSNIchSw_w7hLr5aL');
const currencies = ['USD', 'EUR', 'OMR', 'CAD'];

createApp({
  setup() {
    const ready = ref(false), session = ref(null), isAdmin = ref(false), errorMessage = ref('');
    const trips = ref([]), expenses = ref([]), selectedTrip = ref(null);
    const loginForm = ref({ email: '', password: '' });
    const tripForm = ref({ name: '', country: '', allowance_amount: null, currency: 'USD', allowance_try: null });
    const expenseForm = ref({ trip_id: '', name: '', amount_try: null, amount_currency: null, currency: 'USD' });
    const activeTrips = computed(() => trips.value.filter(t => t.status === 'AKTIF'));
    const selectedExpenses = computed(() => selectedTrip.value ? expenses.value.filter(e => e.trip_id === selectedTrip.value.id) : []);
    const detailTotals = computed(() => selectedExpenses.value.reduce((sum, e) => ({ try: sum.try + Number(e.amount_try || 0), currency: sum.currency + (e.currency === selectedTrip.value.currency ? Number(e.amount_currency || 0) : 0) }), { try: 0, currency: 0 }));
    const money = (value, currency) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
    const load = async () => { const [{ data: t }, { data: e }] = await Promise.all([db.from('trips').select('*').order('created_at', { ascending: false }), db.from('trip_expenses').select('*').order('created_at', { ascending: false })]); trips.value = t || []; expenses.value = e || []; };
    const authenticate = async (currentSession) => { session.value = currentSession; if (currentSession) { const { data: role } = await db.rpc('get_my_role'); isAdmin.value = role === 'admin'; if (isAdmin.value) await load(); } ready.value = true; };
    const login = async () => { errorMessage.value = ''; const { data, error } = await db.auth.signInWithPassword(loginForm.value); if (error) errorMessage.value = 'E-posta veya şifre hatalı.'; else await authenticate(data.session); };
    const logout = async () => { await db.auth.signOut({ scope: 'local' }); session.value = null; isAdmin.value = false; };
    const addTrip = async () => { const { error } = await db.from('trips').insert([{ ...tripForm.value, status: 'AKTIF' }]); if (error) return alert(error.message); tripForm.value = { name: '', country: '', allowance_amount: null, currency: 'USD', allowance_try: null }; await load(); };
    const addExpense = async () => { const { error } = await db.from('trip_expenses').insert([expenseForm.value]); if (error) return alert(error.message); expenseForm.value = { trip_id: '', name: '', amount_try: null, amount_currency: null, currency: 'USD' }; await load(); if (selectedTrip.value) selectedTrip.value = trips.value.find(t => t.id === selectedTrip.value.id); };
    const openDetails = (trip) => { selectedTrip.value = trip; };
    const toggleStatus = async () => { const nextStatus = selectedTrip.value.status === 'AKTIF' ? 'PASIF' : 'AKTIF'; const { error } = await db.from('trips').update({ status: nextStatus }).eq('id', selectedTrip.value.id); if (error) return alert(error.message); await load(); selectedTrip.value = trips.value.find(t => t.id === selectedTrip.value.id); };
    db.auth.getSession().then(({ data }) => authenticate(data.session));
    return { ready, session, isAdmin, errorMessage, loginForm, login, logout, trips, activeTrips, currencies, tripForm, addTrip, expenseForm, addExpense, selectedTrip, openDetails, selectedExpenses, detailTotals, toggleStatus, money };
  }
}).mount('#app');
