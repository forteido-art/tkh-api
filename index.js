const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('TKH Finance Pro API is running');
});

// Initialize Paystack payment
app.post('/paystack/initialize', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      req.body,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response?.data || { message: err.message });
  }
});

// Verify Paystack payment
app.get('/paystack/verify/:reference', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response?.data || { message: err.message });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log('Server running');
});
