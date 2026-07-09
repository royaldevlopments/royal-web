import { createPool } from '@vercel/postgres';
import { sql as vercelSql } from '@vercel/postgres';

let pool;

function getPool() {
  if (!pool) {
    pool = createPool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL });
  }
  return pool;
}

function convertSql(sql) {
  let i = 0;
  let result = sql
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/CURRENT_TIMESTAMP/g, 'NOW()')
    .replace(/\?/g, () => `$${++i}`);
  return result;
}

const db = {
  prepare(sql) {
    const convertedSql = convertSql(sql);
    return {
      async get(...params) {
        const client = await getPool().connect();
        try {
          const { rows } = await client.query(convertedSql, params);
          return rows[0] || null;
        } finally {
          client.release();
        }
      },
      async all(...params) {
        const client = await getPool().connect();
        try {
          const { rows } = await client.query(convertedSql, params);
          return rows;
        } finally {
          client.release();
        }
      },
      async run(...params) {
        const client = await getPool().connect();
        try {
          await client.query(convertedSql, params);
          return { changes: 1 };
        } finally {
          client.release();
        }
      },
    };
  },
  async exec(sql) {
    const client = await getPool().connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  }
};

async function ensureSchema() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT DEFAULT 'India',
        google_id TEXT UNIQUE,
        discord_id TEXT UNIQUE,
        avatar TEXT,
        balance REAL DEFAULT 0,
        role TEXT DEFAULT 'client',
        whmcs_client_id TEXT,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        referral_earnings REAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        category_id TEXT REFERENCES categories(id),
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        billing_cycle TEXT DEFAULT 'monthly',
        features TEXT,
        status TEXT DEFAULT 'active',
        custom_fields TEXT DEFAULT '[]',
        delivery_fields TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        product_id TEXT REFERENCES products(id),
        name TEXT,
        price REAL,
        billing_cycle TEXT,
        status TEXT DEFAULT 'pending',
        expires_at TIMESTAMPTZ,
        delivery TEXT,
        custom_data TEXT DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        service_id TEXT REFERENCES services(id),
        invoice_no TEXT UNIQUE,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'unpaid',
        due_date TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        payment_method TEXT,
        payment_order_id TEXT,
        items TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        subject TEXT NOT NULL,
        department TEXT,
        priority TEXT DEFAULT 'low',
        status TEXT DEFAULT 'open',
        service_id TEXT REFERENCES services(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_replies (
        id TEXT PRIMARY KEY,
        ticket_id TEXT REFERENCES tickets(id),
        user_id TEXT REFERENCES users(id),
        message TEXT,
        attachment TEXT,
        is_staff INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        title TEXT,
        message TEXT,
        type TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        type TEXT NOT NULL,
        details TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        product_id TEXT REFERENCES products(id),
        service_id TEXT REFERENCES services(id),
        amount REAL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        reference TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        service_id TEXT REFERENCES services(id),
        filename TEXT,
        original_name TEXT,
        mime_type TEXT,
        size INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        admin_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL DEFAULT 'percentage',
        value REAL NOT NULL,
        min_amount REAL DEFAULT 0,
        max_uses INTEGER DEFAULT 0,
        used_count INTEGER DEFAULT 0,
        product_ids TEXT DEFAULT '[]',
        expires_at TIMESTAMPTZ,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        status TEXT DEFAULT 'published',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS cancellations (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        service_id TEXT REFERENCES services(id),
        reason TEXT,
        type TEXT DEFAULT 'immediate',
        status TEXT DEFAULT 'pending',
        admin_response TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT REFERENCES users(id),
        referred_id TEXT REFERENCES users(id),
        amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        last_used TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

export { db as default, ensureSchema };
export const sql = vercelSql;
