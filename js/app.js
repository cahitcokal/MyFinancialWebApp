    const { createApp, ref, computed, reactive, onMounted } = Vue;

    // Supabase bağlantısı config.js tarafından merkezi olarak sağlanır.
    const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG;
    const db = window.APP_AUTH?.client || window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    const signOut = () => window.APP_AUTH?.signOut();
    const isAdmin = ref(false);

    createApp({
      setup() {
        const mainModule = ref('mercan');
        const mercanTab = ref('ozetler');

        const deferredPrompt = ref(null);
        const dumpInProgress = ref(false);
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          deferredPrompt.value = e;
        });

        const installPwa = async () => {
          if (deferredPrompt.value) {
            deferredPrompt.value.prompt();
            const { outcome } = await deferredPrompt.value.userChoice;
            if (outcome === 'accepted') deferredPrompt.value = null;
          }
        };

        // Sıralama ve Kolon Filtreleri
        const sorts = reactive({
          asset: { key: '', order: 'asc' },
          cash: { key: '', order: 'asc' },
          home: { key: '', order: 'asc' },
          income: { key: '', order: 'asc' },
          payment: { key: '', order: 'asc' },
          debtAfter: { key: '', order: 'asc' },
          debtBefore: { key: '', order: 'asc' },
          cCash: { key: '', order: 'asc' },
          cGold: { key: '', order: 'asc' }
        });

        const colFilters = reactive({
          asset: { transaction_date: '', asset_type: '', trade_type: '', amount: '', total_try: '', target_person: '' },
          cash: { transaction_date: '', type: '', title: '', amount: '', category: '' },
          home: { owner_name: '', asset_type: '', unit: '', amount: '' },
          income: { transaction_date: '', source: '', amount: '' },
          payment: { payment_date: '', target_person: '', amount: '', amount_try: '' },
          debtAfter: { creditor: '', debt_try: '', paid_amount: '', remaining_amount: '', paid_try: '', status: '' },
          debtBefore: { creditor: '', debt_try: '', paid_try: '' },
          cCash: { transaction_date: '', child_name: '', title: '', type: '', amount: '' },
          cGold: { transaction_date: '', child_name: '', amount: '', total_try: '' }
        });

        const setSort = (table, key) => {
          if (sorts[table].key === key) {
            sorts[table].order = sorts[table].order === 'asc' ? 'desc' : 'asc';
          } else {
            sorts[table].key = key;
            sorts[table].order = 'asc';
          }
        };

        const getSortIcon = (table, key) => {
          if (sorts[table].key !== key) return '↕';
          return sorts[table].order === 'asc' ? '↑' : '↓';
        };

        const resetFilters = (table) => {
          if (colFilters[table]) Object.keys(colFilters[table]).forEach(k => colFilters[table][k] = '');
          if (sorts[table]) { sorts[table].key = ''; sorts[table].order = 'asc'; }
        };

        const editModal = ref({ isOpen: false, table: '', row: {} });

        // Veri Listeleri
        const assetList = ref([]);
        const cashList = ref([]);
        const homeAssets = ref([]);
        const prices = ref({ ALTIN: 6536, USD: 49.6, KTV: 4.7868 });

        const muhammedDebts = ref([]);
        const muhammedIncomes = ref([]);
        const muhammedPayments = ref([]);

        // Çocuklar Veri Listeleri
        const childrenCashList = ref([]);
        const childrenGoldList = ref([]);

        // Form Modelleri
        const newAsset = ref({ transaction_date: new Date().toISOString().substring(0, 10), asset_type: 'ALTIN', trade_type: 'ALIS', amount: null, total_try: null, target_person: '' });
        const newCash = ref({ transaction_date: new Date().toISOString().substring(0, 10), type: 'GIDER', title: '', amount: null, category: '' });
        const newHomeAsset = ref({ owner_name: '', asset_type: '', unit: 'Adet', amount: null });

        const newMIncome = ref({ transaction_date: new Date().toISOString().substring(0, 10), source: 'Mami', amount: null, gold_rate: null });
        const newMPayment = ref({ payment_date: new Date().toISOString().substring(0, 10), target_person: '', currency: 'TL', amount: null, amount_try: null });
        const newPaymentAmountTry = computed({
          get: () => newMPayment.value.currency === 'TL' ? newMPayment.value.amount : newMPayment.value.amount_try,
          set: value => { newMPayment.value.amount_try = value; }
        });

        const newChildCash = ref({ transaction_date: new Date().toISOString().substring(0, 10), child_name: 'Damla', title: 'Harçlık', type: 'GELIR', amount: null });
        const newChildGold = ref({ transaction_date: new Date().toISOString().substring(0, 10), child_name: 'Damla', trade_type: 'ALIS', amount: null, total_try: null });

        const fetchData = async () => {
          try {
            const { data: assets } = await db.from('asset_transactions').select('*').order('transaction_date', { ascending: false }).limit(5000);
            if (assets) assetList.value = assets;

            const { data: cash } = await db.from('cash_transactions').select('*').order('transaction_date', { ascending: false }).limit(5000);
            if (cash) cashList.value = cash;

            const { data: hAssets } = await db.from('home_assets').select('*').order('id', { ascending: true });
            if (hAssets) homeAssets.value = hAssets;

            const { data: priceData } = await db.from('market_prices').select('*');
            if (priceData && priceData.length > 0) {
              priceData.forEach(p => prices.value[p.asset_type] = Number(p.current_price));
            }

            const { data: debts } = await db.from('muhammed_debts').select('*');
            if (debts) muhammedDebts.value = debts;

            const { data: mIncomes } = await db.from('muhammed_incomes').select('*').order('transaction_date', { ascending: false });
            if (mIncomes) muhammedIncomes.value = mIncomes;

            const { data: mPayments } = await db.from('muhammed_payments').select('*').order('payment_date', { ascending: false });
            if (mPayments) muhammedPayments.value = mPayments;

            // Çocuklar Tabloları
            const { data: cCash } = await db.from('children_cash').select('*').order('transaction_date', { ascending: false });
            if (cCash) childrenCashList.value = cCash;

            const { data: cGold } = await db.from('children_gold').select('*').order('transaction_date', { ascending: false });
            if (cGold) childrenGoldList.value = cGold;

          } catch (err) {
            console.error('Veri çekme hatası:', err);
          }
        };

        const deleteRow = async (tableName, id) => {
          if (!isAdmin.value) return;
          if (!confirm("Bu kaydı kalıcı olarak silmek istediğinizden emin misiniz?")) return;
          const { error } = await db.from(tableName).delete().eq('id', id);
          if (!error) await fetchData();
          else alert("Silme işlemi başarısız: " + error.message);
        };

        const openEditModal = (tableName, rowData) => {
          editModal.value.table = tableName;
          const currentRow = tableName === 'muhammed_debts'
            ? (debtsAfterWithPaidQty.value.find(row => row.id === rowData.id) || rowData)
            : rowData;
          editModal.value.row = JSON.parse(JSON.stringify(currentRow));
          editModal.value.isOpen = true;
        };

        // Birim fiyatı veritabanındaki alandan değil, ödeme tutarı / miktar oranından türet.
        const paymentUnitPrice = (payment) => {
          const amount = Number(payment?.amount);
          const amountTry = Number(payment?.amount_try);
          if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(amountTry)) return null;
          return amountTry / amount;
        };

        const saveEditRow = async () => {
          if (!isAdmin.value) return;
          const row = editModal.value.row;
          const table = editModal.value.table;

          if (table === 'muhammed_incomes' && row.source === 'Tren' && row.gold_rate > 0) {
            row.gold_debt_to_ercan = Number((row.amount / row.gold_rate).toFixed(2));
          } else if (table === 'muhammed_payments') {
            row.amount_try = row.currency === 'TL' ? Number(row.amount) : Number(row.amount_try);
            row.unit_price = paymentUnitPrice(row);
          } else if (table === 'muhammed_debts') {
            const paymentTotals = debtPaymentTotals(row);
            row.paid_amount = paymentTotals.paidAmount;
            row.paid_try = paymentTotals.paidTry;
            row.remaining_amount = Math.max(0, (Number(row.debt_amount) || 0) - row.paid_amount);
            if (row.status !== 'Ödenmeyecek') row.status = debtStatus(row.paid_amount, row.remaining_amount);
          }

          const updateRow = table === 'muhammed_debts'
            ? Object.fromEntries(Object.entries(row).filter(([key]) => !['paid_amount', 'paid_try', 'remaining_amount'].includes(key)))
            : row;
          const { error } = await db.from(table).update(updateRow).eq('id', row.id);
          if (!error) {
            editModal.value.isOpen = false;
            await fetchData();
          } else {
            alert("Güncelleme başarısız: " + error.message);
          }
        };

        const filterAndSort = (list, filterObj, sortObj) => {
          let res = list.filter(item => {
            return Object.keys(filterObj).every(key => {
              const filterVal = filterObj[key];
              if (!filterVal) return true;
              const itemVal = item[key];
              if (itemVal === null || itemVal === undefined) return false;
              return String(itemVal).toLowerCase().includes(filterVal.toLowerCase().trim());
            });
          });

          if (sortObj.key) {
            res.sort((a, b) => {
              let valA = a[sortObj.key];
              let valB = b[sortObj.key];
              const numA = Number(valA);
              const numB = Number(valB);
              if (!isNaN(numA) && !isNaN(numB)) {
                valA = numA; valB = numB;
              } else {
                valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase();
              }
              if (valA < valB) return sortObj.order === 'asc' ? -1 : 1;
              if (valA > valB) return sortObj.order === 'asc' ? 1 : -1;
              return 0;
            });
          }
          return res;
        };

        const filteredAssets = computed(() => filterAndSort(assetList.value, colFilters.asset, sorts.asset));
        const filteredCash = computed(() => filterAndSort(cashList.value, colFilters.cash, sorts.cash));
        const filteredHomeAssets = computed(() => filterAndSort(homeAssets.value, colFilters.home, sorts.home));
        const filteredIncomes = computed(() => filterAndSort(muhammedIncomes.value, colFilters.income, sorts.income));
        const filteredPayments = computed(() => filterAndSort(muhammedPayments.value, colFilters.payment, sorts.payment));

        const debtPaymentTotals = (debt) => {
          const creditor = String(debt?.creditor || '').toLowerCase().trim();
          return muhammedPayments.value
            .filter(payment => payment.currency === debt.currency
              && String(payment.target_person || '').toLowerCase().includes(creditor))
            .reduce((totals, payment) => ({
              paidAmount: totals.paidAmount + (Number(payment.amount) || 0),
              paidTry: totals.paidTry + (Number(payment.amount_try) || 0)
            }), { paidAmount: 0, paidTry: 0 });
        };

        const debtStatus = (paidAmount, remainingAmount) => {
          if (remainingAmount <= 0) return 'Ödeme Bitti';
          if (paidAmount <= 0) return 'Ödeme Başlamadı';
          return 'Ödeme Devam Ediyor';
        };

        // Kriz Sonrası Borç Tablosuna Yapılan Ödemelerden türetilen alanları ekle.
        const debtsAfterWithPaidQty = computed(() => {
          return muhammedDebts.value.filter(x => x.period_type === 'KRIZ_SONRASI').map(d => {
            const paymentTotals = debtPaymentTotals(d);
            const paidQty = paymentTotals.paidAmount;
            const debtQty = Number(d.debt_amount || 0);
            const remainingQty = Math.max(0, debtQty - paidQty);

            return {
              ...d,
              paid_amount: paidQty,
              remaining_amount: remainingQty,
              paid_try: paymentTotals.paidTry,
              status: d.status === 'Ödenmeyecek' ? 'Ödenmeyecek' : debtStatus(paidQty, remainingQty)
            };
          });
        });

        const filteredDebtsAfter = computed(() => filterAndSort(debtsAfterWithPaidQty.value, colFilters.debtAfter, sorts.debtAfter));
        const filteredDebtsBefore = computed(() => filterAndSort(muhammedDebts.value.filter(x => x.period_type === 'KRIZ_ONCESI'), colFilters.debtBefore, sorts.debtBefore));

        const filteredChildrenCash = computed(() => filterAndSort(childrenCashList.value, colFilters.cCash, sorts.cCash));
        const filteredChildrenGold = computed(() => filterAndSort(childrenGoldList.value, colFilters.cGold, sorts.cGold));

        // Çocuklar Ekleme İşlemleri
        const addChildCash = async () => {
          if (!isAdmin.value) return;
          const { error } = await db.from('children_cash').insert([newChildCash.value]);
          if (!error) {
            await fetchData();
            newChildCash.value.amount = null;
          }
        };

        const addChildGold = async () => {
          if (!isAdmin.value) return;
          const { error } = await db.from('children_gold').insert([newChildGold.value]);
          if (!error) {
            await fetchData();
            newChildGold.value.amount = null;
            newChildGold.value.total_try = null;
          }
        };

        // Çocuklar Bilanço ve Kart Hesaplamaları
        const childrenTotals = computed(() => {
          const calcChild = (name) => {
            const income = childrenCashList.value
              .filter(c => c.child_name === name && c.type === 'GELIR')
              .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

            const expense = childrenCashList.value
              .filter(c => c.child_name === name && c.type === 'GIDER')
              .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

            const goldInvestment = childrenGoldList.value
              .filter(g => g.child_name === name && g.trade_type === 'ALIS')
              .reduce((acc, g) => acc + (Number(g.total_try) || 0), 0);

            const goldAmount = childrenGoldList.value
              .filter(g => g.child_name === name)
              .reduce((acc, g) => acc + (g.trade_type === 'ALIS' ? Number(g.amount) : -Number(g.amount)), 0);

            const net = income - (expense + goldInvestment);

            const currentGoldVal = goldAmount * (prices.value.ALTIN || 0);
            const goldPnl = currentGoldVal - goldInvestment;

            return {
              income,
              expense,
              investment: goldInvestment,
              gold: goldAmount,
              net,
              currentGoldVal,
              goldPnl
            };
          };

          return {
            emir: calcChild('Emir'),
            damla: calcChild('Damla'),
            yusuf: calcChild('Yusuf')
          };
        });

        const childrenSummary = computed(() => {
          const totalIncome = childrenCashList.value.filter(c => c.type === 'GELIR').reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
          const totalExpense = childrenCashList.value.filter(c => c.type === 'GIDER').reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
          const totalGoldInvestment = childrenGoldList.value.filter(g => g.trade_type === 'ALIS').reduce((acc, g) => acc + (Number(g.total_try) || 0), 0);
          return {
            totalIncome,
            totalExpense,
            totalGoldInvestment,
            netCash: totalIncome - (totalExpense + totalGoldInvestment)
          };
        });

        // Mercan Ekleme İşlemleri
        const addAssetTransaction = async () => {
          if (!isAdmin.value) return;
          const { error } = await db.from('asset_transactions').insert([newAsset.value]);
          if (!error) { await fetchData(); newAsset.value.amount = null; newAsset.value.total_try = null; }
        };

        const addCashTransaction = async () => {
          if (!isAdmin.value) return;
          const { error } = await db.from('cash_transactions').insert([newCash.value]);
          if (!error) { await fetchData(); newCash.value.title = ''; newCash.value.amount = null; }
        };

        const addHomeAsset = async () => {
          if (!isAdmin.value) return;
          const { error } = await db.from('home_assets').insert([newHomeAsset.value]);
          if (!error) { await fetchData(); newHomeAsset.value.owner_name = ''; newHomeAsset.value.asset_type = ''; newHomeAsset.value.amount = null; }
        };

        const savePrice = async (asset) => {
          if (!isAdmin.value) return;
          await db.from('market_prices').upsert({ asset_type: asset, current_price: prices.value[asset] });
        };

        const downloadDatabaseDump = async () => {
          if (!isAdmin.value || dumpInProgress.value) return;
          dumpInProgress.value = true;
          try {
            const sql = await window.DatabaseDump.createSqlDump(db);
            const blob = new Blob([sql], { type: 'application/sql;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date();
            const pad = value => String(value).padStart(2, '0');
            const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            link.href = url;
            link.download = `DatabaseDump_${timestamp}.sql`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('SQL dump oluşturulamadı:', error);
            alert(`SQL dump oluşturulamadı: ${error.message}`);
          } finally {
            dumpInProgress.value = false;
          }
        };

        const addMuhammedIncome = async () => {
          if (!isAdmin.value) return;
          let goldToErcan = 0;
          if (newMIncome.value.source === 'Tren' && newMIncome.value.gold_rate > 0) {
            goldToErcan = Number((newMIncome.value.amount / newMIncome.value.gold_rate).toFixed(2));
          }
          const payload = {
            transaction_date: newMIncome.value.transaction_date,
            source: newMIncome.value.source,
            amount: newMIncome.value.amount,
            gold_rate: newMIncome.value.gold_rate,
            gold_debt_to_ercan: goldToErcan
          };
          const { error } = await db.from('muhammed_incomes').insert([payload]);
          if (!error) { await fetchData(); newMIncome.value.amount = null; newMIncome.value.gold_rate = null; }
        };

        const addMuhammedPayment = async () => {
          if (!isAdmin.value) return;
          const totalTry = newMPayment.value.currency === 'TL'
            ? Number(newMPayment.value.amount)
            : Number(newMPayment.value.amount_try);
          const payload = {
            payment_date: newMPayment.value.payment_date,
            target_person: newMPayment.value.target_person,
            currency: newMPayment.value.currency,
            amount: newMPayment.value.amount,
            unit_price: null,
            amount_try: totalTry
          };
          payload.unit_price = paymentUnitPrice(payload);
          const { error } = await db.from('muhammed_payments').insert([payload]);
          if (!error) { await fetchData(); newMPayment.value.target_person = ''; newMPayment.value.amount = null; newMPayment.value.amount_try = null; }
        };

        const muhammedTotalIncome = computed(() => muhammedIncomes.value.reduce((acc, item) => acc + (Number(item.amount) || 0), 0));
        const muhammedTotalPayment = computed(() => muhammedPayments.value.reduce((acc, item) => acc + (Number(item.amount_try) || 0), 0));
        const krizOncesiTotal = computed(() => muhammedDebts.value.filter(x => x.period_type === 'KRIZ_ONCESI').reduce((acc, item) => acc + (Number(item.debt_try) || 0), 0));

        const muhammedAccountSummary = computed(() => {
          const krizSonrasiBorcTL = debtsAfterWithPaidQty.value
            .reduce((acc, item) => acc + (Number(item.debt_try) || 0), 0);
          const krizSonrasindanKalanTL = krizSonrasiBorcTL - krizOncesiTotal.value;
          const krizSonrasiOdemelerdenKalanTL = muhammedTotalIncome.value - muhammedTotalPayment.value;

          return {
            odenenTL: muhammedTotalIncome.value,
            krizSonrasindanKalanTL,
            krizSonrasiOdemelerdenKalanTL,
            hesaptaKalanTL: krizSonrasindanKalanTL + krizSonrasiOdemelerdenKalanTL
          };
        });

        // Muhammed Dinamik Özet Kartları
        const muhammedSummary = computed(() => {
          const krizOncesiBorc = muhammedDebts.value
            .filter(x => x.period_type === 'KRIZ_ONCESI')
            .reduce((acc, item) => acc + (Number(item.debt_try) || 0), 0);

          const getCategorySummary = (currency) => {
            const debts = debtsAfterWithPaidQty.value.filter(x => x.currency === currency && x.status !== 'Ödenmeyecek');
            const toplam = debts.reduce((acc, item) => acc + (Number(item.debt_amount) || 0), 0);
            const odenen = debts.reduce((acc, item) => acc + (Number(item.paid_amount) || 0), 0);

            return {
              toplam,
              odenen,
              kalan: Math.max(0, toplam - odenen)
            };
          };

          return {
            krizOncesiBorc,
            krizSonrasiTL: getCategorySummary('TL'),
            altinBorcu: getCategorySummary('ALTIN_GR'),
            dolarBorcu: getCategorySummary('USD')
          };
        });

        // Mercan 6 Kişi Bilanço Hesaplamaları (DİNAMİK MANTIK)
        const personTotals = computed(() => {
          const sumCash = (type, catFilter) => {
            return cashList.value
              .filter(c => c.type === type && c.category && c.category.toLowerCase().trim() === catFilter.toLowerCase().trim())
              .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
          };

          const sumAsset = (assetType, personFilter) => {
            return assetList.value
              .filter(a => a.asset_type === assetType && a.target_person && a.target_person.toLowerCase().trim() === personFilter.toLowerCase().trim())
              .reduce((acc, a) => acc + (a.trade_type === 'ALIS' ? Number(a.amount) : -Number(a.amount)), 0);
          };

          const sumAssetTry = (personFilter, tradeType) => {
            return assetList.value
              .filter(a => a.target_person && a.target_person.toLowerCase().trim() === personFilter.toLowerCase().trim() && a.trade_type === tradeType)
              .reduce((acc, a) => acc + (Number(a.total_try) || 0), 0);
          };

          const getRemainingDebt = (personName, currencyType) => {
            const debtObj = muhammedDebts.value.find(d =>
              d.period_type === 'KRIZ_SONRASI' &&
              d.currency === currencyType &&
              d.creditor.toLowerCase().includes(personName.toLowerCase())
            );
            const initialDebt = debtObj ? Number(debtObj.debt_amount) : 0;
            const totalPaid = muhammedPayments.value
              .filter(p => p.currency === currencyType && p.target_person.toLowerCase().includes(personName.toLowerCase()))
              .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            return Math.max(0, initialDebt - totalPaid);
          };

          // 1. KÖY HESAPLAMASI (Eski Gelir - Eski Gider)
          const isEski = (c) => {
            const text = `${c.category || ''} ${c.title || ''}`.toLowerCase();
            return text.includes('eski');
          };
          const eskiGelir = cashList.value.filter(c => c.type === 'GELIR' && isEski(c)).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
          const eskiGider = cashList.value.filter(c => c.type === 'GIDER' && isEski(c)).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
          const koyDugunOncesiKalan = eskiGelir - eskiGider;

          const koyEmekli = sumCash('GELIR', 'emekli');
          const koyDiger = sumCash('GELIR', 'diger');
          const koyGider = sumCash('GIDER', 'köy gider');
          const koyYatirimGider = sumAssetTry('ortak', 'ALIS');
          const koyYatirimGelir = sumAssetTry('ortak', 'SATIS');
          const koyNet = (koyDugunOncesiKalan + koyEmekli + koyDiger + koyYatirimGelir) - (koyGider + koyYatirimGider);
          const koyAltinBirikim = sumAsset('ALTIN', 'ortak');
          const koyMamiyeVerilen = getRemainingDebt('Köy', 'ALTIN_GR');

          // 2. HİLAL HESAPLAMASI
          const hilalGelir = sumCash('GELIR', 'hilal');
          const hilalHarcanan = sumCash('GIDER', 'hilal giden');
          const hilalYatirimGider = sumAssetTry('hilal', 'ALIS');
          const hilalYatirimGelir = sumAssetTry('hilal', 'SATIS');
          const hilalNet = (hilalGelir + hilalYatirimGelir) - (hilalYatirimGider + hilalHarcanan);
          const hilalAltinBirikim = sumAsset('ALTIN', 'hilal');
          const hilalMamiyeVerilenAltin = getRemainingDebt('Hilal', 'ALTIN_GR');
          const hilalDolarBirikim = sumAsset('USD', 'hilal');
          const hilalMamiyeVerilenDolar = getRemainingDebt('Hilal', 'USD');

          // 3. AZAD HESAPLAMASI
          const azadGelir = sumCash('GELIR', 'azad');
          const azadHarcanan = sumCash('GIDER', 'azad giden');
          const azadYatirimGider = sumAssetTry('azad', 'ALIS');
          const azadYatirimGelir = sumAssetTry('azad', 'SATIS');
          const azadNet = (azadGelir + azadYatirimGelir) - (azadYatirimGider + azadHarcanan);
          const azadAltinBirikim = sumAsset('ALTIN', 'azad');
          const azadMamiyeVerilenAltin = getRemainingDebt('Azad', 'ALTIN_GR');
          const azadDolarBirikim = sumAsset('USD', 'azad');
          const azadMamiyeVerilenDolar = getRemainingDebt('Azad', 'USD');

          // 4. ERHAN HESAPLAMASI
          const erhanGelir = sumCash('GELIR', 'erhan');
          const erhanHarcanan = sumCash('GIDER', 'erhan giden');
          const erhanYatirimGider = sumAssetTry('erhan', 'ALIS');
          const erhanYatirimGelir = sumAssetTry('erhan', 'SATIS');
          const erhanNet = (erhanGelir + erhanYatirimGelir) - (erhanYatirimGider + erhanHarcanan);

          // 5. HÜLYA HESAPLAMASI
          const hulyaGelir = sumCash('GELIR', 'hülya');
          const hulyaHarcanan = sumCash('GIDER', 'hülya giden');
          const hulyaYatirimGider = sumAssetTry('hülya', 'ALIS');
          const hulyaYatirimGelir = sumAssetTry('hülya', 'SATIS');
          const hulyaNet = (hulyaGelir + hulyaYatirimGelir) - (hulyaYatirimGider + hulyaHarcanan);

          // 6. MAMİ HESAPLAMASI
          const mamiGelir = sumCash('GELIR', 'mami');
          const mamiHarcanan = sumCash('GIDER', 'mami giden');
          const mamiYatirimGider = sumAssetTry('mami', 'ALIS');
          const mamiYatirimGelir = sumAssetTry('mami', 'SATIS');
          const mamiNet = (mamiGelir + mamiYatirimGelir) - (mamiYatirimGider + mamiHarcanan);

          return {
            koy: {
              dugunOncesiKalan: koyDugunOncesiKalan,
              emekliGelir: koyEmekli,
              digerGelir: koyDiger,
              gider: koyGider,
              yatirimGider: koyYatirimGider,
              yatirimGelir: koyYatirimGelir,
              netKalan: koyNet,
              altinBirikim: koyAltinBirikim,
              mamiyeVerilen: koyMamiyeVerilen,
              hesaptaKalan: koyAltinBirikim - koyMamiyeVerilen
            },
            hilal: {
              gelir: hilalGelir,
              harcanan: hilalHarcanan,
              yatirimGider: hilalYatirimGider,
              yatirimGelir: hilalYatirimGelir,
              netKalan: hilalNet,
              altinBirikim: hilalAltinBirikim,
              mamiyeVerilenAltin: hilalMamiyeVerilenAltin,
              hesaptaKalanAltin: hilalAltinBirikim - hilalMamiyeVerilenAltin,
              dolarBirikim: hilalDolarBirikim,
              mamiyeVerilenDolar: hilalMamiyeVerilenDolar,
              hesaptaKalanDolar: hilalDolarBirikim - hilalMamiyeVerilenDolar
            },
            azad: {
              gelir: azadGelir,
              harcanan: azadHarcanan,
              yatirimGider: azadYatirimGider,
              yatirimGelir: azadYatirimGelir,
              netKalan: azadNet,
              altinBirikim: azadAltinBirikim,
              mamiyeVerilenAltin: azadMamiyeVerilenAltin,
              hesaptaKalanAltin: azadAltinBirikim - azadMamiyeVerilenAltin,
              dolarBirikim: azadDolarBirikim,
              mamiyeVerilenDolar: azadMamiyeVerilenDolar,
              hesaptaKalanDolar: azadDolarBirikim - azadMamiyeVerilenDolar
            },
            erhan: {
              gelir: erhanGelir,
              harcanan: erhanHarcanan,
              yatirimGider: erhanYatirimGider,
              yatirimGelir: erhanYatirimGelir,
              netKalan: erhanNet,
              altinBirikim: sumAsset('ALTIN', 'erhan')
            },
            hulya: {
              gelir: hulyaGelir,
              harcanan: hulyaHarcanan,
              yatirimGider: hulyaYatirimGider,
              yatirimGelir: hulyaYatirimGelir,
              netKalan: hulyaNet,
              altinBirikim: sumAsset('ALTIN', 'hülya')
            },
            mami: {
              gelir: mamiGelir,
              harcanan: mamiHarcanan,
              yatirimGider: mamiYatirimGider,
              yatirimGelir: mamiYatirimGelir,
              netKalan: mamiNet,
              altinBirikim: sumAsset('ALTIN', 'mami')
            }
          };
        });

        // Mercan Portföy ve Nakit Hesaplamaları
        const summary = computed(() => {
          let totalIncome = 0;
          let totalExpense = 0;

          cashList.value.forEach(c => {
            const amt = Number(c.amount) || 0;
            if (c.type === 'GELIR') totalIncome += amt;
            else totalExpense += amt;
          });

          let totalAssetBuyTry = 0;
          let totalAssetSellTry = 0;

          assetList.value.forEach(a => {
            const tryVal = Number(a.total_try) || 0;
            if (a.trade_type === 'ALIS') totalAssetBuyTry += tryVal;
            else if (a.trade_type === 'SATIS') totalAssetSellTry += tryVal;
          });

          const netAssetInvested = totalAssetBuyTry - totalAssetSellTry;
          const netCash = totalIncome - totalExpense - netAssetInvested;

          const getRemainingDebt = (personName, currencyType) => {
            const debtObj = muhammedDebts.value.find(d =>
              d.period_type === 'KRIZ_SONRASI' &&
              d.currency === currencyType &&
              d.creditor.toLowerCase().includes(personName.toLowerCase())
            );
            const initialDebt = debtObj ? Number(debtObj.debt_amount) : 0;
            const totalPaid = muhammedPayments.value
              .filter(p => p.currency === currencyType && p.target_person.toLowerCase().includes(personName.toLowerCase()))
              .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            return Math.max(0, initialDebt - totalPaid);
          };

          const mamiGoldDebt = getRemainingDebt('Köy', 'ALTIN_GR') + getRemainingDebt('Hilal', 'ALTIN_GR') + getRemainingDebt('Azad', 'ALTIN_GR');
          const mamiUsdDebt = getRemainingDebt('Hilal', 'USD') + getRemainingDebt('Azad', 'USD');

          const calcAsset = (type, mamiDebtAmount = 0) => {
            let buyQty = 0, buyTotal = 0, sellQty = 0, sellTotal = 0;
            assetList.value.filter(a => a.asset_type === type).forEach(a => {
              const qty = Number(a.amount) || 0;
              const tot = Number(a.total_try) || 0;
              if (a.trade_type === 'ALIS') { buyQty += qty; buyTotal += tot; }
              else { sellQty += qty; sellTotal += tot; }
            });

            const shouldBe = buyQty - sellQty;
            const inAccount = Math.max(0, shouldBe - mamiDebtAmount);
            const avgCost = buyQty > 0 ? (buyTotal / buyQty) : 0;
            const currentVal = shouldBe * (prices.value[type] || 0);
            const inAccountVal = inAccount * (prices.value[type] || 0);
            const pnl = currentVal + sellTotal - buyTotal;

            return { buyQty, sellQty, shouldBe, mamiDebt: mamiDebtAmount, inAccount, avgCost, currentVal, inAccountVal, pnl };
          };

          return {
            totalIncome,
            totalExpense,
            totalAssetInvested: netAssetInvested,
            netCash,
            gold: calcAsset('ALTIN', mamiGoldDebt),
            usd: calcAsset('USD', mamiUsdDebt),
            ktv: calcAsset('KTV', 0)
          };
        });

        const formatMoney = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
        const formatPlain = (val) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(val || 0);

        onMounted(() => {
          window.APP_AUTH_READY?.then(({ session, role }) => {
            isAdmin.value = role === 'admin';
            if (session) fetchData();
          });
          window.addEventListener('app-authenticated', (event) => {
            isAdmin.value = event.detail?.role === 'admin';
            fetchData();
          });
        });

        return {
          mainModule,
          mercanTab,
          deferredPrompt,
          dumpInProgress,
          installPwa,
          downloadDatabaseDump,
          signOut,
          isAdmin,
          sorts,
          colFilters,
          setSort,
          getSortIcon,
          resetFilters,
          filteredAssets,
          filteredCash,
          filteredHomeAssets,
          filteredIncomes,
          filteredPayments,
          debtsAfterWithPaidQty,
          filteredDebtsAfter,
          filteredDebtsBefore,
          filteredChildrenCash,
          filteredChildrenGold,
          editModal,
          openEditModal,
          saveEditRow,
          deleteRow,
          assetList,
          cashList,
          homeAssets,
          prices,
          muhammedDebts,
          muhammedIncomes,
          muhammedPayments,
          childrenCashList,
          childrenGoldList,
          newAsset,
          newCash,
          newHomeAsset,
          newMIncome,
          newMPayment,
          newPaymentAmountTry,
          newChildCash,
          newChildGold,
          addChildCash,
          addChildGold,
          summary,
          personTotals,
          childrenTotals,
          childrenSummary,
          muhammedTotalIncome,
          muhammedTotalPayment,
          muhammedAccountSummary,
          muhammedSummary,
          krizOncesiTotal,
          addAssetTransaction,
          addCashTransaction,
          addHomeAsset,
          addMuhammedIncome,
          addMuhammedPayment,
          savePrice,
          paymentUnitPrice,
          formatMoney,
          formatPlain
        };
      }
    }).mount('#app');
