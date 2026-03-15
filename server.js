const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── CORS: разрешаем запросы с любого фронтенда ───────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// ── Статические файлы (HTML сайт) ────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Healthcheck ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════
// PROXY 1: pump.fun — загрузка метаданных на IPFS
// POST /api/pumpfun/ipfs
// FormData: file, name, symbol, description, twitter, telegram, website
// ═══════════════════════════════════════════════════════════════
app.post('/api/pumpfun/ipfs', upload.single('file'), async (req, res) => {
  try {
    console.log('[IPFS] Uploading metadata to pump.fun...');

    const form = new FormData();

    // Прикрепляем картинку если есть
    if (req.file) {
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'token.png',
        contentType: req.file.mimetype || 'image/png',
      });
    }

    // Метаданные токена
    const fields = ['name', 'symbol', 'description', 'twitter', 'telegram', 'website', 'showName'];
    fields.forEach(f => { if (req.body[f]) form.append(f, req.body[f]); });
    if (!req.body.showName) form.append('showName', 'true');

    const response = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (compatible; uDev/1.0)',
        'Origin': 'https://pump.fun',
        'Referer': 'https://pump.fun/',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[IPFS] pump.fun error:', response.status, text);
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    console.log('[IPFS] Success:', data.metadataUri);
    res.json(data);

  } catch (err) {
    console.error('[IPFS] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROXY 2: pump.fun — получение транзакции для создания токена
// POST /api/pumpfun/trade-local
// Body: { publicKey, action, tokenMetadata, mint, denominatedInSol, amount, slippage, priorityFee, pool }
// ═══════════════════════════════════════════════════════════════
app.post('/api/pumpfun/trade-local', async (req, res) => {
  try {
    console.log('[TRADE] Requesting transaction from pump.fun...');
    console.log('[TRADE] Action:', req.body.action, '| Amount:', req.body.amount);

    const response = await fetch('https://pump.fun/api/trade-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; uDev/1.0)',
        'Origin': 'https://pump.fun',
        'Referer': 'https://pump.fun/',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[TRADE] pump.fun error:', response.status, text);
      return res.status(response.status).json({ error: text });
    }

    // Возвращаем бинарные данные транзакции как есть
    const buffer = await response.buffer();
    res.set('Content-Type', 'application/octet-stream');
    res.send(buffer);
    console.log('[TRADE] Transaction received, bytes:', buffer.length);

  } catch (err) {
    console.error('[TRADE] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROXY 3: DexScreener — токен по CA (без CORS проблем в браузере)
// GET /api/token/:ca
// ═══════════════════════════════════════════════════════════════
app.get('/api/token/:ca', async (req, res) => {
  try {
    const { ca } = req.params;
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROXY 4: DexScreener — поиск токенов
// GET /api/search?q=solana
// ═══════════════════════════════════════════════════════════════
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || 'trending';
    const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROXY 5: Solana RPC — баланс кошелька
// POST /api/balance
// Body: { address }
// ═══════════════════════════════════════════════════════════════
app.post('/api/balance', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });

    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });
    const data = await response.json();
    const sol = data.result?.value ? data.result.value / 1e9 : 0;
    res.json({ sol, lamports: data.result?.value || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROXY 6: SOL цена в USD
// GET /api/sol-price
// ═══════════════════════════════════════════════════════════════
app.get('/api/sol-price', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const data = await response.json();
    res.json({ usd: data.solana?.usd || 150 });
  } catch (err) {
    res.json({ usd: 150 }); // fallback
  }
});

// ── Fallback: все остальные маршруты → index.html ────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Запуск ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 uDev Server запущен на порту ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/health\n`);
});
