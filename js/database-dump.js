(function createDatabaseDumpModule() {
  const TABLE_DEFINITIONS = [
    {
      name: 'allowed_users',
      columns: [
        ['email', 'TEXT', false],
        ['role', 'TEXT', false],
        ['enabled', 'BOOLEAN', false],
        ['created_at', 'TIMESTAMPTZ', true]
      ],
      primaryKey: ['email']
    },
    {
      name: 'asset_transactions',
      columns: [['id', 'BIGINT', false], ['transaction_date', 'DATE', true], ['asset_type', 'TEXT', true], ['trade_type', 'TEXT', true], ['amount', 'NUMERIC', true], ['total_try', 'NUMERIC', true], ['target_person', 'TEXT', true]],
      primaryKey: ['id']
    },
    {
      name: 'cash_transactions',
      columns: [['id', 'BIGINT', false], ['transaction_date', 'DATE', true], ['type', 'TEXT', true], ['title', 'TEXT', true], ['amount', 'NUMERIC', true], ['category', 'TEXT', true]],
      primaryKey: ['id']
    },
    {
      name: 'home_assets',
      columns: [['id', 'BIGINT', false], ['owner_name', 'TEXT', true], ['asset_type', 'TEXT', true], ['unit', 'TEXT', true], ['amount', 'NUMERIC', true]],
      primaryKey: ['id']
    },
    {
      name: 'market_prices',
      columns: [['asset_type', 'TEXT', false], ['current_price', 'NUMERIC', true]],
      primaryKey: ['asset_type']
    },
    {
      name: 'muhammed_debts',
      columns: [['id', 'BIGINT', false], ['period_type', 'TEXT', true], ['creditor', 'TEXT', true], ['currency', 'TEXT', true], ['debt_amount', 'NUMERIC', true], ['debt_try', 'NUMERIC', true], ['status', 'TEXT', true], ['note', 'TEXT', true]],
      primaryKey: ['id']
    },
    {
      name: 'muhammed_incomes',
      columns: [['id', 'BIGINT', false], ['transaction_date', 'DATE', true], ['source', 'TEXT', true], ['amount', 'NUMERIC', true], ['gold_rate', 'NUMERIC', true], ['gold_debt_to_ercan', 'NUMERIC', true]],
      primaryKey: ['id']
    },
    {
      name: 'muhammed_payments',
      columns: [['id', 'BIGINT', false], ['payment_date', 'DATE', true], ['target_person', 'TEXT', true], ['currency', 'TEXT', true], ['amount', 'NUMERIC', true], ['unit_price', 'NUMERIC', true], ['amount_try', 'NUMERIC', true]],
      primaryKey: ['id']
    },
    {
      name: 'children_cash',
      columns: [['id', 'BIGINT', false], ['transaction_date', 'DATE', true], ['child_name', 'TEXT', true], ['title', 'TEXT', true], ['type', 'TEXT', true], ['amount', 'NUMERIC', true]],
      primaryKey: ['id']
    },
    {
      name: 'children_gold',
      columns: [['id', 'BIGINT', false], ['transaction_date', 'DATE', true], ['child_name', 'TEXT', true], ['trade_type', 'TEXT', true], ['amount', 'NUMERIC', true], ['total_try', 'NUMERIC', true]],
      primaryKey: ['id']
    }
  ];

  const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const quoteValue = (value) => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `'${text.replace(/'/g, "''")}'`;
  };

  const inferType = (value) => {
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'number') return 'NUMERIC';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return 'DATE';
    if (typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.includes('T')) return 'TIMESTAMPTZ';
    return 'TEXT';
  };

  const fetchAllRows = async (db, tableName) => {
    const rows = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await db.from(tableName).select('*').range(offset, offset + pageSize - 1);
      if (error) throw new Error(`${tableName}: ${error.message}`);
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return rows;
    }
  };

  const createTableSql = (definition, rows) => {
    const knownNames = new Set(definition.columns.map(([name]) => name));
    const extraColumns = [];
    rows.forEach(row => Object.entries(row).forEach(([name, value]) => {
      if (!knownNames.has(name)) {
        knownNames.add(name);
        extraColumns.push([name, inferType(value), true]);
      }
    }));
    const columns = [...definition.columns, ...extraColumns];
    const columnSql = columns.map(([name, type, nullable]) =>
      `  ${quoteIdentifier(name)} ${type}${nullable ? '' : ' NOT NULL'}`
    );
    if (definition.primaryKey?.length) {
      columnSql.push(`  PRIMARY KEY (${definition.primaryKey.map(quoteIdentifier).join(', ')})`);
    }
    return `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(definition.name)} (\n${columnSql.join(',\n')}\n);`;
  };

  const createInsertSql = (definition, rows) => {
    if (!rows.length) return '-- Kayıt yok.\n';
    const columns = Object.keys(rows[0]);
    const columnSql = columns.map(quoteIdentifier).join(', ');
    const valuesSql = rows.map(row => `(${columns.map(column => quoteValue(row[column])).join(', ')})`).join(',\n');
    const conflictSql = definition.primaryKey?.length ? ' ON CONFLICT DO NOTHING' : '';
    return `INSERT INTO ${quoteIdentifier(definition.name)} (${columnSql})\nVALUES\n${valuesSql}${conflictSql};`;
  };

  const createSqlDump = async (db) => {
    const sections = [
      '-- HesapKitap veritabani dump\n-- PostgreSQL / Supabase uyumludur.\n-- Olusturma zamani: ' + new Date().toISOString(),
      'BEGIN;'
    ];
    for (const definition of TABLE_DEFINITIONS) {
      const rows = await fetchAllRows(db, definition.name);
      sections.push(`-- TABLE: ${definition.name}`);
      sections.push(createTableSql(definition, rows));
      sections.push(createInsertSql(definition, rows));
    }
    sections.push('COMMIT;');
    return sections.join('\n\n') + '\n';
  };

  window.DatabaseDump = Object.freeze({ createSqlDump });
})();
