require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const crypto  = require('crypto');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_BASE       = 'https://api.chapa.co/v1';

console.log('🔑 Secret key loaded:', CHAPA_SECRET_KEY ? CHAPA_SECRET_KEY.slice(0, 18) + '...' : 'MISSING');

// ─── POST /api/payment/initialize ────────────────────────────────────────────
app.post('/api/payment/initialize', async (req, res) => {
  try {
    const { amount, email, first_name, last_name, examType, examTitle } = req.body;

    const tx_ref = `sds-${examType || 'exam'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const payload = {
      amount:       String(amount || 100),
      currency:     'ETB',
      email:        email      || 'student@sdstech.com',
      first_name:   first_name || 'Student',
      last_name:    last_name  || 'User',
      tx_ref,
      return_url:   `http://localhost:3000/dashboard?payment=success&tx_ref=${tx_ref}`,
      callback_url: `http://localhost:5000/api/payment/callback`,
      customization: {
        title:       'SDS Tech Exam Portal',
        description: `Access fee for ${examTitle || examType || 'exam'}`
      }
    };

    console.log('→ Initializing payment:', tx_ref, '| Amount:', payload.amount);

    const response = await axios.post(
      `${CHAPA_BASE}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization:  `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Chapa response:', response.data?.status, '| checkout_url:', response.data?.data?.checkout_url?.slice(0, 60));

    res.json({
      success:      true,
      checkout_url: response.data?.data?.checkout_url,
      tx_ref
    });

  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('❌ Chapa error:', err.response?.status, msg);
    res.status(err.response?.status || 500).json({ success: false, message: msg });
  }
});

// ─── GET /api/payment/verify/:tx_ref ─────────────────────────────────────────
app.get('/api/payment/verify/:tx_ref', async (req, res) => {
  try {
    const response = await axios.get(
      `${CHAPA_BASE}/transaction/verify/${req.params.tx_ref}`,
      { headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` } }
    );
    const status = response.data?.data?.status;
    console.log('✅ Verify:', req.params.tx_ref, '→', status);
    res.json({ success: status === 'success', status, data: response.data?.data });
  } catch (err) {
    res.status(err.response?.status || 500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

// ─── POST /api/payment/callback (Chapa webhook) ───────────────────────────────
app.post('/api/payment/callback', async (req, res) => {
  const { tx_ref } = req.body;
  console.log('📩 Callback received:', tx_ref);
  res.status(200).json({ received: true });
});

const PORT = process.env.API_PORT || 5000;
app.listen(PORT, () => console.log(`✅ API server on http://localhost:${PORT}`));
