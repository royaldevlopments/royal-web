import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'billing.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly',
    features TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    product_id TEXT REFERENCES products(id),
    name TEXT,
    price REAL,
    billing_cycle TEXT,
    status TEXT DEFAULT 'pending',
    expires_at DATETIME,
    delivery TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    service_id TEXT REFERENCES services(id),
    invoice_no TEXT UNIQUE,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'unpaid',
    due_date DATETIME,
    paid_at DATETIME,
    payment_method TEXT,
    payment_order_id TEXT,
    items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    subject TEXT NOT NULL,
    department TEXT,
    priority TEXT DEFAULT 'low',
    status TEXT DEFAULT 'open',
    service_id TEXT REFERENCES services(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ticket_replies (
    id TEXT PRIMARY KEY,
    ticket_id TEXT REFERENCES tickets(id),
    user_id TEXT REFERENCES users(id),
    message TEXT,
    attachment TEXT,
    is_staff INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    title TEXT,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    details TEXT,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    product_id TEXT REFERENCES products(id),
    service_id TEXT REFERENCES services(id),
    amount REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    service_id TEXT REFERENCES services(id),
    filename TEXT,
    original_name TEXT,
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations
try { db.exec(`ALTER TABLE products ADD COLUMN custom_fields TEXT DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE products ADD COLUMN delivery_fields TEXT DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE services ADD COLUMN custom_data TEXT DEFAULT '{}'`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN whmcs_client_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN referred_by TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN referral_earnings REAL DEFAULT 0`); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    admin_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'percentage',
    value REAL NOT NULL,
    min_amount REAL DEFAULT 0,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    product_ids TEXT DEFAULT '[]',
    expires_at DATETIME,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cancellations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    service_id TEXT REFERENCES services(id),
    reason TEXT,
    type TEXT DEFAULT 'immediate',
    status TEXT DEFAULT 'pending',
    admin_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT REFERENCES users(id),
    referred_id TEXT REFERENCES users(id),
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;

// Seed default email templates
const existingTemplates = db.prepare('SELECT COUNT(*) as c FROM email_templates').get();
if (existingTemplates.c === 0) {
  const insert = db.prepare('INSERT INTO email_templates (id, key, subject, body) VALUES (?, ?, ?, ?)');
  const id = () => Math.random().toString(36).slice(2);
  insert.run(id(), 'welcome', 'Welcome to {{site_name}}', `<h2>Welcome {{name}}!</h2><p>Your account has been created successfully.</p><p>Email: {{email}}</p><p>Login at: <a href="{{site_url}}/devlopment">{{site_url}}/devlopment</a></p>`);
  insert.run(id(), 'order_confirmed', 'Order Confirmed - {{site_name}}', `<h2>Order Confirmed!</h2><p>Your order for <strong>{{product_name}}</strong> has been placed.</p><p>Invoice: {{invoice_no}}<br>Amount: {{amount}}<br>Due: {{due_date}}</p>`);
  insert.run(id(), 'payment_received', 'Payment Received - {{site_name}}', `<h2>Payment Received!</h2><p>Your payment of <strong>{{amount}}</strong> for {{invoice_no}} has been received successfully.</p>`);
}
