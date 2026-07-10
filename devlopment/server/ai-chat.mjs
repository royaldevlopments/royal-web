const knowledge = [
  {
    id: 'mc-intro',
    keywords: ['minecraft', 'mc', 'server hosting', 'game server', 'minecraft server'],
    context: ['minecraft'],
    priority: 5,
    response: `We offer premium Minecraft server hosting with instant setup. Plans start at ₹249/month for 4GB RAM. All plans include DDoS protection, 24/7 uptime, full FTP access, and a custom control panel. We support Paper, Spigot, Fabric, Forge, and Vanilla. Need any specific plugin or mod support?`
  },
  {
    id: 'mc-plugins',
    keywords: ['plugin', 'mod', 'mods', 'plugins', 'custom', 'paper', 'spigot', 'forge', 'fabric'],
    context: ['minecraft'],
    priority: 8,
    response: `We support all major Minecraft server types: Vanilla, Paper, Spigot, Purpur, Fabric, Forge, and more. You can install plugins/mods easily through our control panel with one-click installs for popular modpacks. Our file manager gives you full FTP and SFTP access for custom uploads.`
  },
  {
    id: 'palworld',
    keywords: ['palworld', 'pal', 'pal world', 'pals'],
    context: ['palworld'],
    priority: 8,
    response: `Palworld server hosting starts at ₹499/month for 6GB RAM. Features include: one-click mod installation, automatic backups, DDoS protection, and a dedicated IP. Our servers use high-performance Ryzen processors with NVMe SSD storage for lag-free gameplay with up to 32 players.`
  },
  {
    id: 'vps-hosting',
    keywords: ['vps', 'virtual private server', 'dedicated', 'vps hosting', 'root access', 'vps plan'],
    context: ['vps'],
    priority: 7,
    response: `Our VPS plans start at ₹599/month with: dedicated Ryzen CPUs, NVMe SSD storage (50GB+), 2GB+ RAM, full root access, choice of Linux distros (Ubuntu, Debian, CentOS), and unmetered bandwidth. All plans include DDoS protection and a free A record. Scale up anytime!`
  },
  {
    id: 'pricing',
    keywords: ['price', 'pricing', 'cost', 'how much', 'cheap', 'expensive', 'affordable', 'plans', 'prices', 'budget', 'premium', 'starting at', '₹', 'rs'],
    context: ['pricing'],
    priority: 6,
    response: `Our hosting plans are designed to fit every budget:
• Minecraft: from ₹249/month
• Palworld: from ₹499/month
• VPS: from ₹599/month
• Discord Bot: from ₹149/month
• Web Hosting: from ₹99/month
All prices include DDoS protection, 24/7 support, and a 7-day money-back guarantee. Longer billing cycles (quarterly/yearly) get up to 20% discount!`
  },
  {
    id: 'discord-bot',
    keywords: ['discord', 'bot', 'discord bot', 'discord hosting'],
    context: ['discord'],
    priority: 7,
    response: `Discord bot hosting starts at just ₹149/month! Includes: 24/7 uptime, 512MB RAM, DDoS protection, Node.js/Python support, and easy git deployment. Perfect for music bots, moderation bots, or custom Discord applications.`
  },
  {
    id: 'web-hosting',
    keywords: ['web', 'website', 'hosting', 'web hosting', 'site', 'domain', 'cpanel', 'shared hosting'],
    context: ['web'],
    priority: 6,
    response: `Web hosting starts at ₹99/month. Features: cPanel control panel, free SSL certificate, 10GB NVMe storage, unmetered bandwidth, one-click WordPress install, and 24/7 support. Perfect for personal websites, blogs, and small businesses.`
  },
  {
    id: 'payment',
    keywords: ['payment', 'pay', 'payments', 'billing', 'invoice', 'invoice', 'paid', 'due', 'overdue', 'method', 'paytm', 'gpay', 'upi', 'card', 'credit card', 'debit'],
    context: ['billing'],
    priority: 8,
    response: `We accept the following payment methods:
• UPI (Google Pay, PhonePe, Paytm)
• Credit/Debit Cards
• Net Banking
• Wallet Balance

Invoices are generated on order and due immediately. You can pay from your client area dashboard. Automatic billing is available for recurring payments.`
  },
  {
    id: 'refund',
    keywords: ['refund', 'money back', 'cancel', 'cancellation', 'return', 'guarantee', '7 day', '7-day'],
    context: ['support'],
    priority: 9,
    response: `We offer a 7-day money-back guarantee on all hosting plans. If you're not satisfied within the first 7 days of service, we'll issue a full refund — no questions asked. To request a refund, open a ticket from your client area or email support@royaldevlopments.com.`
  },
  {
    id: 'support',
    keywords: ['support', 'help', 'contact', 'ticket', 'email', 'reach', 'call', 'phone', 'whatsapp', 'customer service', 'agent'],
    context: ['support'],
    priority: 7,
    response: `We're here to help! You can reach us through:
• Support Ticket: Client area (fastest response)
• Email: support@royaldevlopments.com
• Live Chat: Right here (AI-powered, 24/7)
• Response time: Usually within 1-2 hours during business hours (IST).`
  },
  {
    id: 'performance',
    keywords: ['performance', 'slow', 'lag', 'fast', 'speed', 'ddos', 'protection', 'uptime', 'reliable', 'ssd', 'nvme', 'processor', 'cpu', 'ram'],
    context: ['tech'],
    priority: 6,
    response: `All our servers use enterprise-grade hardware:
• AMD Ryzen 9 processors (up to 7950X)
• NVMe SSD storage (gen 4)
• 32GB+ ECC RAM per node
• 10Gbps network uplink
• Enterprise DDoS protection (2Tbps+)
• 99.9% uptime SLA

We monitor all servers 24/7 and automatically migrate VMs if hardware issues are detected.`
  },
  {
    id: 'game-list',
    keywords: ['games', 'game', 'hosting', 'what games', 'supported games', 'game list'],
    context: ['games'],
    priority: 5,
    response: `Currently we support:
• Minecraft (Java & Bedrock)
• Palworld
• Valheim
• ARK: Survival Evolved
• Project Zomboid
• Enshrouded
• Hytale (coming soon)
• Terraria
• ARMA 3

More games added regularly! If you don't see your game, contact us and we'll consider adding it.`
  },
  {
    id: 'getting-started',
    keywords: ['start', 'begin', 'getting started', 'setup', 'how to', 'guide', 'tutorial', 'new', 'beginner', 'first time', 'order'],
    context: ['general'],
    priority: 5,
    response: `Getting started is easy:
1. Browse our game list and choose your plan
2. Create an account (30 seconds)
3. Complete your order
4. Your server will be provisioned within 2-5 minutes
5. Check your email or client area for server credentials
6. Use our control panel to manage everything

Need help at any step? Just ask!`
  },
  {
    id: 'backup',
    keywords: ['backup', 'backups', 'back up', 'restore', 'save', 'data loss', 'automatic backup'],
    context: ['tech'],
    priority: 7,
    response: `We provide automatic daily backups on all hosting plans — stored for 7 days. You can also create manual backups anytime from the control panel. One-click restore is supported. Premium plans include off-site backups for extra redundancy.`
  },
  {
    id: 'account',
    keywords: ['account', 'login', 'signup', 'register', 'sign in', 'password', 'forgot', 'profile', 'dashboard', 'client area'],
    context: ['account'],
    priority: 6,
    response: `You can manage everything from your client area dashboard: view invoices, manage services, open tickets, update profile, and more. If you forgot your password, use the "Forgot Password" link on the login page to reset it.`
  },
  {
    id: 'referral',
    keywords: ['refer', 'referral', 'referral code', 'invite', 'friend', 'earn', 'commission', 'bonus'],
    context: ['account'],
    priority: 8,
    response: `Our referral program lets you earn wallet credit! Share your unique referral code with friends. When they sign up and make their first payment, you earn 10% of their first invoice amount as wallet credit. There's no limit — refer as many people as you want!`
  },
  {
    id: 'customization',
    keywords: ['custom', 'configure', 'configuration', 'config', 'settings', 'change', 'modify', 'option', 'control panel', 'panel'],
    context: ['tech'],
    priority: 6,
    response: `Our custom control panel lets you:
• Start/Stop/Restart your server
• Change server settings (difficulty, gamemode, etc.)
• Install plugins and mods
• Access file manager and FTP
• View resource usage graphs
• Manage backups
• Access console in real-time

It's designed to be intuitive — you don't need technical expertise!`
  },
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'howdy', 'greetings', 'good morning', 'good evening', 'sup', 'yo', 'namaste', 'hii', 'helo'],
    context: ['general'],
    priority: 1,
    response: `Hello! 👋 Welcome to Royal Devlopments! I'm your AI assistant. I can help you with:
• Hosting plans and pricing
• Server setup and configuration
• Account and billing questions
• Game-specific questions
• Technical support

What can I help you with today?`
  },
  {
    id: 'thanks',
    keywords: ['thanks', 'thank you', 'thank u', 'thx', 'ty', 'appreciate', 'grateful', 'awesome', 'great'],
    context: ['general'],
    priority: 1,
    response: `You're welcome! 😊 Is there anything else I can help you with? Feel free to ask about any of our hosting services, pricing, or technical questions.`
  },
  {
    id: 'goodbye',
    keywords: ['bye', 'goodbye', 'see you', 'later', 'cya', 'tata', 'good night', 'gn'],
    context: ['general'],
    priority: 1,
    response: `Goodbye! 👋 Thanks for chatting with Royal Devlopments. If you ever need help, our AI assistant is available 24/7. Have a great day!`
  },
  {
    id: 'scalability',
    keywords: ['upgrade', 'downgrade', 'scale', 'upgrade plan', 'more ram', 'more storage', 'more resources', 'expand'],
    context: ['billing'],
    priority: 8,
    response: `You can upgrade or downgrade your plan anytime from the client area. Simply go to your service details and click "Change Plan." The new pricing will be prorated for the remainder of your billing cycle. Upgrades take effect immediately; downgrades apply at the next renewal.`
  },
  {
    id: 'security',
    keywords: ['security', 'secure', 'safe', 'protected', 'firewall', 'hack', 'attack', 'malware', 'antivirus', 'encryption'],
    context: ['tech'],
    priority: 7,
    response: `Security is our top priority. We provide:
• Enterprise DDoS protection (2Tbps+ capacity)
• Automatic firewall rules
• SSL encryption on all connections
• Isolated VM environments
• Regular security audits
• 2FA available on client accounts

Your data and servers are safe with us.`
  },
  {
    id: 'server-location',
    keywords: ['location', 'server location', 'datacenter', 'data center', 'region', 'india', 'mumbai', 'delhi', 'bangalore', 'chennai', 'usa', 'europe', 'asia'],
    context: ['tech'],
    priority: 7,
    response: `We currently have data centers located in:
• 🇮🇳 India (Mumbai, Delhi NCR)
• 🇺🇸 USA (Ashburn, Dallas)
• 🇪🇺 Europe (Amsterdam, Frankfurt)
• 🇸🇬 Asia (Singapore)

You can choose your preferred location during checkout. Indian customers typically get the best latency from Mumbai or Delhi locations.`
  },
  {
    id: 'features',
    keywords: ['features', 'included', 'what do i get', 'whats included', 'benefits', 'perks', 'advantages'],
    context: ['general'],
    priority: 5,
    response: `Every hosting plan includes:
• DDoS Protection
• 24/7 Monitoring
• Custom Control Panel
• FTP/SFTP Access
• Automatic Backups
• 99.9% Uptime Guarantee
• 7-Day Money-Back Guarantee
• 24/7 AI Chat Support
• Free SSL Certificates
• One-Click Install Options

Higher-tier plans include additional RAM, storage, and priority support.`
  },
  {
    id: 'affiliate',
    keywords: ['affiliate', 'partner', 'promote', 'earn money', 'income', 'commission', 'affiliate program'],
    context: ['account'],
    priority: 8,
    response: `Our affiliate program lets you earn 10% recurring commission on every sale you refer! Simply share your affiliate link, and when someone signs up and purchases through it, you earn commission. Payouts are processed monthly to your wallet balance.`
  },
  {
    id: 'minecraft-bedrock',
    keywords: ['bedrock', 'minecraft bedrock', 'mcpe', 'pocket edition', 'windows 10', 'crossplay', 'cross-play'],
    context: ['minecraft'],
    priority: 9,
    response: `Yes! We support Minecraft Bedrock Edition hosting, including cross-play support between Bedrock and Java editions using GeyserMC. Your friends on phone, console, and PC can all play together on the same server. This is included free with all Minecraft plans.`
  },
  {
    id: 'technical-issue',
    keywords: ['error', 'issue', 'problem', 'bug', 'crash', 'down', 'offline', 'not working', 'broken', 'connection refused', 'timeout', 'cannot connect', 'lag', 'lagging', 'slow', 'stuck', 'frozen', 'freeze', 'disconnect'],
    context: ['support'],
    priority: 9,
    response: `I'm sorry you're experiencing issues! Let me help:
1. Make sure your server is started (check control panel)
2. Verify your IP and port are correct
3. Check if the game version matches
4. Try restarting the server from the control panel

    If the issue persists, please open a support ticket with your server ID and a description of the problem, and our team will investigate immediately.`
  },
  {
    id: 'founder',
    keywords: ['owner', 'founder', 'ceo', 'creator', 'who created', 'who owns', 'who made', 'who started', 'who founded', 'behind', 'shaurya', 'vashishtha', 'shourya', 'surya'],
    context: ['company'],
    priority: 10,
    response: `Royal Devlopments was founded by **Shaurya Vashishtha**. 🚀 He built this company to provide premium, affordable game server and VPS hosting solutions. Shaurya is passionate about gaming and technology, and personally ensures that every customer gets the best possible experience.`
  },
  {
    id: 'company-intro',
    keywords: ['royal devlopments', 'royal', 'devlopments', 'company', 'about', 'tell me about', 'what is', 'who are you', 'about us', 'your company', 'yourself'],
    context: ['company'],
    priority: 8,
    response: `**Royal Devlopments** is a premium hosting company founded by **Shaurya Vashishtha**. We specialize in:

• 🎮 Game Server Hosting (Minecraft, Palworld, Valheim, ARK, and more)
• 🖥️ High-Performance VPS
• 🌐 Web Hosting
• 🤖 Discord Bot Hosting

We're known for our powerful Ryzen servers, DDoS protection, 99.9% uptime, and 24/7 AI support. Our mission is to make high-quality hosting accessible and affordable for everyone in India and beyond.`
  },
  {
    id: 'company-location',
    keywords: ['where', 'located', 'based', 'office', 'headquarters', 'head quarter', 'address', 'city', 'country', 'india'],
    context: ['company'],
    priority: 6,
    response: `Royal Devlopments is based in **India** 🇮🇳. We have data centers in Mumbai and Delhi NCR for Indian customers, with additional locations in the US, Europe, and Singapore for global coverage.`
  },
  {
    id: 'company-mission',
    keywords: ['mission', 'vision', 'goal', 'purpose', 'values', 'why', 'aim'],
    context: ['company'],
    priority: 7,
    response: `Our mission at Royal Devlopments is simple: **provide premium hosting that everyone can afford**. Founded by Shaurya Vashishtha, we believe gamers and developers deserve fast, reliable servers without breaking the bank. We're building India's best hosting platform — one server at a time.`
  },
  {
    id: 'team',
    keywords: ['team', 'employees', 'staff', 'people', 'workers', 'who works'],
    context: ['company'],
    priority: 6,
    response: `Royal Devlopments is a growing team passionate about gaming and technology. Founded by **Shaurya Vashishtha**, our team includes server engineers, support specialists, and gaming enthusiasts — all working to give you the best hosting experience. We're always looking for talented people to join us!`
  }
];

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[,.!?;:()[\]{}"'\/\\@#$%^&*+=<>~`|–—]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function scoreMessage(input, history) {
  const words = tokenize(input);
  const inputLower = input.toLowerCase();
  const historyLower = history.map(m => m.text.toLowerCase()).join(' ');

  const scored = knowledge.map(entry => {
    let score = 0;
    const matchedKeywords = [];

    for (const kw of entry.keywords) {
      if (inputLower.includes(kw)) {
        const weight = kw.split(' ').length > 1 ? 3 : 1;
        score += weight * entry.priority;
        matchedKeywords.push(kw);
      }
    }

    for (const word of words) {
      for (const kw of entry.keywords) {
        if (kw.includes(word) && word.length > 2) {
          score += 0.5 * entry.priority;
        }
      }
    }

    const matchedContext = entry.context.some(ctx =>
      inputLower.includes(ctx) || historyLower.includes(ctx)
    );
    if (matchedContext) {
      score += entry.priority * 2;
    }

    if (score === 0 && entry.id === 'greeting') {
      score = 1;
    }

    return { ...entry, score, matchedKeywords };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3);
}

function queryComplexity(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const len = words.length;
  if (len <= 3) return 'short';
  if (len <= 8) return 'medium';
  return 'long';
}

function trimResponse(text, complexity) {
  if (complexity === 'long') return text;
  const paragraphs = text.split('\n\n').filter(Boolean);
  if (complexity === 'short') {
    const firstLine = paragraphs[0].split('\n')[0];
    const sentences = firstLine.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 2).join(' ');
  }
  return paragraphs[0] || text;
}

export function getAIResponse(message, history = []) {
  const results = scoreMessage(message, history);
  const top = results[0];
  const second = results[1];
  const complexity = queryComplexity(message);

  if (!top || top.score === 0) {
    if (complexity === 'short') {
      return 'I can help with hosting plans, pricing, account issues, server setup, and technical support. What do you need?';
    }
    return `I'm not sure I understand your question. I can help you with:
• Hosting plans and pricing (Minecraft, Palworld, VPS, etc.)
• Account and billing support
• Server setup and configuration
• Technical troubleshooting

Could you please rephrase your question? For example: "How much is Minecraft hosting?" or "I need help with my server."`;
  }

  let reply = top.response;
  if (second && second.score > 0 && second.score >= top.score * 0.7 && complexity === 'long') {
    reply = top.response + '\n\n' + second.response;
  }

  return trimResponse(reply, complexity);
}
