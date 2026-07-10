require("dotenv").config();
const crypto = require("crypto");
const { pool, initDatabase } = require("./database");
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

initDatabase()
  .then(() => {
// Activate license
app.post("/activate", async (req, res) => {
  const { reference, email, deviceId } = req.body;

  if (!reference || !deviceId) {
    return res.status(400).json({
      success: false,
      message: "Missing reference or device ID"
    });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM licenses WHERE reference=$1",
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "License not found"
      });
    }

    const license = result.rows[0];

    // First activation
    if (!license.activated) {

      const token = crypto.randomUUID();

      await pool.query(
        `UPDATE licenses
         SET activated=true,
             device_id=$1,
             license_token=$2
         WHERE reference=$3`,
        [deviceId, token, reference]
      );

      return res.json({
        success: true,
        token
      });
    }

    // Same device
    if (license.device_id === deviceId) {

      return res.json({
        success: true,
        token: license.license_token
      });

    }

    // Different device

    return res.status(403).json({

      success:false,

      message:"License already activated on another device."

    });

  } catch(err){

    console.error(err);

    res.status(500).json({

      success:false,

      message:"Server error"

    });

  }

});

app.post("/validate", async (req, res) => {
  const { token, deviceId } = req.body;

  if (!token || !deviceId) {
    return res.status(400).json({
      success: false,
      message: "Missing token or device ID"
    });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM licenses WHERE license_token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid license"
      });
    }

    const license = result.rows[0];

    if (license.device_id !== deviceId) {
      return res.status(403).json({
        success: false,
        message: "License belongs to another device"
      });
    }

    res.json({
      success: true,
      email: license.email
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
    app.listen(process.env.PORT || 8080, () => {
      console.log("Server running");
    });
  })
  .catch(err => {
    console.error(err);
  });

// Verify payment and create license
app.get("/paystack/verify/:reference", async (req, res) => {
  try {
    const reference = req.params.reference;

    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
        }
      }
    );

    const payment = response.data.data;

    if (payment.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment not successful"
      });
    }

    // Check if license already exists
    const existing = await pool.query(
      "SELECT * FROM licenses WHERE reference=$1",
      [reference]
    );

    if (existing.rows.length === 0) {

      await pool.query(
        `INSERT INTO licenses
        (email, reference)
        VALUES ($1,$2)`,
        [
          payment.customer.email,
          reference
        ]
      );

    }

    res.json({
      success: true,
      email: payment.customer.email,
      reference
    });

  } catch (err) {

    console.error(err.response?.data || err);

    res.status(500).json({
      success: false,
      message: "Verification failed"
    });

  }
});
