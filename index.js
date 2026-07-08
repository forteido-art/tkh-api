const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req,res) => res.send('TKH Finance Pro API is running'));
app.post('/paystack/initialize', async (req,res) => {
  const response = await axios.post('https://api.paystack.co/transaction/initialize', req.body, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
  });
  res.json(response.data);
});
app.listen(process.env.PORT || 8080);
