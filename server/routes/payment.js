const express = require('express');
const router = express.Router();
const chapaService = require('../chapaService');
const auth = require('../middleware/auth');

/**
 * Initialize Payment
 * POST /api/payment/initialize
 */
router.post('/initialize', auth, async (req, res) => {
  try {
    const { examType, amount } = req.body;
    const user = req.user;

    if (!examType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Exam type and amount are required'
      });
    }

    // Create payment data
    const paymentData = chapaService.createExamPaymentData(user, examType, amount);

    // Initialize payment with Chapa
    const chapaResponse = await chapaService.initializePayment(paymentData);

    res.json({
      success: true,
      data: {
        ...chapaResponse.data,
        tx_ref: paymentData.tx_ref
      }
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment'
    });
  }
});

/**
 * Verify Payment
 * GET /api/payment/verify/:tx_ref
 * IMPORTANT: This must be a GET request
 */
router.get('/verify/:tx_ref', auth, async (req, res) => {
  try {
    const { tx_ref } = req.params;

    if (!tx_ref) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    // Verify payment with Chapa
    const verification = await chapaService.verifyPayment(tx_ref);

    // Check if payment was successful
    if (verification.data?.status === 'success') {
      // Here you would typically:
      // 1. Update user's subscription/exam access in database
      // 2. Log the successful payment
      // 3. Send confirmation email
      
      res.json({
        success: true,
        data: {
          status: 'verified',
          transaction: verification.data
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Payment not successful',
        data: verification.data
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
});

/**
 * Payment Callback (Webhook)
 * POST /api/payment/callback
 * This endpoint receives notifications from Chapa
 */
router.post('/callback', async (req, res) => {
  try {
    const { tx_ref, status } = req.body;

    console.log('Payment callback received:', { tx_ref, status });

    // Verify the callback is legitimate
    if (tx_ref) {
      const verification = await chapaService.verifyPayment(tx_ref);
      
      if (verification.data?.status === 'success') {
        // Update user's exam access in database
        // This is where you would grant access to the paid exam
        console.log('Payment successful for tx_ref:', tx_ref);
      }
    }

    // Respond to Chapa to acknowledge receipt
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({ received: false, error: error.message });
  }
});

/**
 * Get Payment Status
 * GET /api/payment/status/:tx_ref
 */
router.get('/status/:tx_ref', auth, async (req, res) => {
  try {
    const { tx_ref } = req.params;
    
    const verification = await chapaService.verifyPayment(tx_ref);
    
    res.json({
      success: true,
      data: {
        status: verification.data?.status,
        transaction: verification.data
      }
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check payment status'
    });
  }
});

module.exports = router;
