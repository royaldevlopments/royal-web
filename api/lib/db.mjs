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

    const adminExists = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminExists.rows.length === 0) {
      const bcrypt = (await import('bcryptjs')).default;
      const { v4: uuidv4 } = await import('uuid');
      const hashed = bcrypt.hashSync('admin123', 10);
      await client.query(
        `INSERT INTO users (id, email, password, name, role, balance) VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), 'admin@royaldev.com', hashed, 'Admin', 'admin', 99999]
      );
      console.log('Admin user seeded');
    }

    const catCount = await client.query(`SELECT COUNT(*) as count FROM categories`);
    if (parseInt(catCount.rows[0].count) === 0) {
      const { v4: uuidv4 } = await import('uuid');
      const cat1 = uuidv4(), cat2 = uuidv4(), cat3 = uuidv4(), cat4 = uuidv4();
      await client.query(`INSERT INTO categories (id, name, description, icon, sort_order) VALUES ($1, $2, $3, $4, $5)`, [cat1, 'Game Servers', 'Premium game server hosting with DDoS protection', 'Gamepad2', 1]);
      await client.query(`INSERT INTO categories (id, name, description, icon, sort_order) VALUES ($1, $2, $3, $4, $5)`, [cat2, 'VPS', 'High-performance virtual private servers', 'Server', 2]);
      await client.query(`INSERT INTO categories (id, name, description, icon, sort_order) VALUES ($1, $2, $3, $4, $5)`, [cat3, 'Web Hosting', 'Reliable website hosting solutions', 'Globe', 3]);
      await client.query(`INSERT INTO categories (id, name, description, icon, sort_order) VALUES ($1, $2, $3, $4, $5)`, [cat4, 'Discord Bot', '24/7 Discord bot hosting', 'Headphones', 4]);

      const prods = [
        [cat1, 'Lammu Plan', 'Entry-level game server with 4GB RAM', 49, 'monthly', '["4GB DDR4 RAM","2 vCPU Cores","50GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain"]'],
        [cat1, 'Standard Plan', 'Balanced game server with 8GB RAM', 99, 'monthly', '["8GB DDR4 RAM","4 vCPU Cores","100GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain","Daily Backups"]'],
        [cat1, 'Premium Plan', 'High-performance game server with 16GB RAM', 199, 'monthly', '["16GB DDR4 RAM","6 vCPU Cores","200GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain","Daily Backups","Priority Support"]'],
        [cat1, 'Ultra Plan', 'Ultimate game server with 32GB RAM', 399, 'monthly', '["32GB DDR4 RAM","8 vCPU Cores","400GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain","Daily Backups","Priority Support","Dedicated IP"]'],
        [cat2, 'Intel Platinum VPS', 'Intel Platinum VPS with 2GB RAM', 149, 'monthly', '["2GB DDR4 RAM","1 vCPU","40GB NVMe","1 IPv4","Root Access","DDoS Protection","KVM Virtualization"]'],
        [cat2, 'AMD Ryzen VPS', 'High-performance AMD Ryzen VPS with 4GB', 299, 'monthly', '["4GB DDR4 RAM","2 vCPU","80GB NVMe","1 IPv4","Root Access","DDoS Protection","KVM Virtualization"]'],
        [cat2, 'AMD EPYC VPS', 'Enterprise EPYC VPS with 8GB', 599, 'monthly', '["8GB DDR4 RAM","4 vCPU","160GB NVMe","1 IPv4","Root Access","DDoS Protection","KVM Virtualization"]'],
        [cat3, 'Web Hosting Basic', 'cPanel hosting for 1 website', 79, 'monthly', '["1 Website","10GB Storage","100GB Bandwidth","Free SSL","cPanel","1 Email Account"]'],
        [cat3, 'Web Hosting Pro', 'cPanel hosting for 5 websites', 199, 'monthly', '["5 Websites","50GB Storage","Unlimited Bandwidth","Free SSL","cPanel","5 Email Accounts","Daily Backups"]'],
        [cat4, 'Discord Bot Basic', 'Basic Discord bot hosting', 49, 'monthly', '["512MB RAM","1 vCPU","5GB Storage","24/7 Uptime","Auto Restart","Free .xyz Domain"]'],
        [cat4, 'Discord Bot Pro', 'Advanced Discord bot hosting', 99, 'monthly', '["2GB RAM","2 vCPU","10GB Storage","24/7 Uptime","Auto Restart","Free .xyz Domain","Database Included"]'],
      ];
      for (const [cid, name, desc, price, cycle, features] of prods) {
        await client.query(`INSERT INTO products (id, category_id, name, description, price, billing_cycle, features) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [uuidv4(), cid, name, desc, price, cycle, features]);
      }
      console.log('Categories and products seeded');
    }

    const siteFeaturesExist = await client.query(`SELECT value FROM settings WHERE key = 'site_features'`);
    if (siteFeaturesExist.rows.length === 0) {
      const defaultFeatures = JSON.stringify({
        sla_banner: { enabled: true, percentage: "99.9", title: "Uptime SLA", description: "Our uptime guarantee" },
        discord: { enabled: true, server_id: "", invite_url: "https://discord.gg/R8U3wKxwkd" },
        speed_benchmark: {
          enabled: true, processors: [
            { name: "Intel Platinum", score: 8246, color: "#3b82f6" },
            { name: "Intel Xeon", score: 7210, color: "#6366f1" },
            { name: "AMD Ryzen 9", score: 9572, color: "#a855f7" },
            { name: "AMD EPYC", score: 11248, color: "#ec4899" }
          ]
        },
        os_showcase: { enabled: true, os_list: ["Ubuntu", "Debian", "CentOS", "Windows Server", "AlmaLinux", "Rocky Linux"] },
        partners: { enabled: true, partners: [] },
        tech_stack: { enabled: true, technologies: ["AMD EPYC", "Intel Xeon", "NVMe SSD", "DDR4 ECC", "1Gbps Port", "DDoS Protection"] },
        beyond_gaming: { enabled: true, items: [{ title: "VPS Hosting", description: "High-performance virtual servers", icon: "Server", link: "/vps/intel-platinum" }, { title: "Web Hosting", description: "cPanel hosting solutions", icon: "Globe", link: "/services/web-hosting" }, { title: "Discord Bot", description: "24/7 bot hosting", icon: "Headphones", link: "/services/discord-bot" }] },
        chat: { enabled: true, widget: "whatsapp", number: "+919999999999", message: "Hello! I need help with hosting." },
        support_status: { enabled: true, status: "online", response_time: "< 15 minutes" }
      });
      await client.query(`INSERT INTO settings (key, value) VALUES ($1, $2)`, ['site_features', defaultFeatures]);
      console.log('Default site features seeded');
    }

    const announcementCount = await client.query(`SELECT COUNT(*) as count FROM announcements`);
    if (parseInt(announcementCount.rows[0].count) === 0) {
      const { v4: uuidv4 } = await import('uuid');
      await client.query(`INSERT INTO announcements (id, title, content, status) VALUES ($1, $2, $3, $4)`, [uuidv4(), 'Welcome to Royal Devlopments', 'Experience premium hosting solutions with 99.9% uptime, 24/7 support, and blazing-fast NVMe SSD storage.', 'published']);
      console.log('Default announcement seeded');
    }

    const templateCount = await client.query(`SELECT COUNT(*) as count FROM email_templates`);
    if (parseInt(templateCount.rows[0].count) === 0) {
      const { v4: uuidv4 } = await import('uuid');
      const templates = [
        [uuidv4(), 'welcome', 'Welcome to {{site_name}}', '<h2>Welcome {{name}}!</h2><p>Your account has been created successfully.</p><p>Email: {{email}}</p><p>Login at: <a href="{{site_url}}/devlopment">{{site_url}}/devlopment</a></p>'],
        [uuidv4(), 'order_confirmed', 'Order Confirmed - {{site_name}}', '<h2>Order Confirmed!</h2><p>Your order for <strong>{{product_name}}</strong> has been placed.</p><p>Invoice: {{invoice_no}}<br>Amount: {{amount}}<br>Due: {{due_date}}</p>'],
        [uuidv4(), 'payment_received', 'Payment Received - {{site_name}}', '<h2>Payment Received!</h2><p>Your payment of <strong>{{amount}}</strong> for {{invoice_no}} has been received successfully.</p>'],
      ];
      for (const [id, key, subject, body] of templates) {
        await client.query(`INSERT INTO email_templates (id, key, subject, body) VALUES ($1, $2, $3, $4)`, [id, key, subject, body]);
      }
      console.log('Default email templates seeded');
    }
  } finally {
    client.release();
  }
}

export { db as default, ensureSchema };
export const sql = vercelSql;
