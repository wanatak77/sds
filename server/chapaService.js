const axios = require('axios');

class ChapaService {
  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY;
    this.baseUrl = 'https://api.chapa.co/v1';
    
    // Validate environment variables
    if (!this.secretKey) {
      console.error('CHAPA_SECRET_KEY environment variable is not set');
      throw new Error('Chapa secret key is required');
    }
    
    console.log('ChapaService initialized with base URL:', this.baseUrl);
  }

  /**
   * Initialize a payment transaction
   * POST: https://api.chapa.co/v1/transaction/initialize
   */
  async initializePayment(paymentData) {
    try {
      const initUrl = `${this.baseUrl}/transaction/initialize`;
      console.log("=== CHAPA INITIALIZATION ===");
      console.log("URL:", initUrl);
      console.log("Method: POST");
      console.log("Transaction reference:", paymentData.tx_ref);
      console.log("Amount:", paymentData.amount);
      console.log("Email:", paymentData.email);

      const response = await axios.post(
        initUrl,
        {
          amount: paymentData.amount,
          currency: paymentData.currency || 'ETB',
          email: paymentData.email,
          first_name: paymentData.firstName,
          last_name: paymentData.lastName,
          tx_ref: paymentData.tx_ref,
          callback_url: paymentData.callbackUrl,
          return_url: paymentData.returnUrl,
          customization: {
            title: paymentData.title || 'SDS Tech Exam Portal',
            description: paymentData.description || 'Payment for exam access'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log("Chapa initialization response status:", response.status);
      console.log("Chapa initialization response data:", response.data);

      return response.data;
    } catch (error) {
      console.error('=== CHAPA INITIALIZATION ERROR ===');
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Chapa initialization endpoint not found. Please check the URL structure.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Chapa secret key. Please check your CHAPA_SECRET_KEY environment variable.');
      }
      
      if (error.response?.status === 400) {
        throw new Error(`Invalid payment data: ${error.response?.data?.message || 'Please check all required fields'}`);
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Payment initialization failed');
    }
  }

  /**
   * Verify a payment transaction
   * GET: https://api.chapa.co/v1/transaction/verify/{tx_ref}
   * IMPORTANT: Must be GET request, not POST
   * IMPORTANT: URL structure must be exactly as shown
   */
  async verifyPayment(tx_ref) {
    try {
      // Validate input
      if (!tx_ref || tx_ref === 'undefined' || tx_ref === '') {
        throw new Error('Transaction reference (tx_ref) is required and cannot be empty');
      }

      // Log the full URL for debugging
      const fullUrl = `${this.baseUrl}/transaction/verify/${tx_ref}`;
      console.log("Full verification URL:", fullUrl);
      console.log("Transaction reference:", tx_ref);
      console.log("HTTP Method: GET");
      console.log("Authorization header present:", !!this.secretKey);

      // Make the request with detailed logging
      const response = await axios.get(
        fullUrl, // Method must be GET - no query parameters
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log("Chapa verification response status:", response.status);
      console.log("Chapa verification response data:", response.data);

      return response.data;
    } catch (error) {
      console.error('=== CHAPA VERIFICATION ERROR ===');
      console.error('Transaction reference:', tx_ref);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      if (error.response?.status === 404) {
        throw new Error(`Transaction not found. Reference: ${tx_ref}. Please check the transaction reference.`);
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Chapa secret key. Please check your CHAPA_SECRET_KEY environment variable.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Access forbidden. Check your Chapa account permissions.');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Chapa servers. Please check your internet connection.');
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Payment verification failed');
    }
  }

  /**
   * Generate unique transaction reference
   */
  generateTxRef() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `sds-${timestamp}-${random}`;
  }

  /**
   * Create payment data for exam access
   */
  createExamPaymentData(user, examType, amount = 100) {
    return {
      amount,
      currency: 'ETB',
      email: user.email,
      firstName: user.fullName?.split(' ')[0] || 'User',
      lastName: user.fullName?.split(' ')[1] || 'Name',
      tx_ref: this.generateTxRef(),
      callbackUrl: `${process.env.BASE_URL}/api/payment/callback`,
      returnUrl: `${process.env.CLIENT_URL}/dashboard?payment=success`,
      title: `Exam Access - ${examType}`,
      description: `Payment for ${examType} exam access`
    };
  }
}

module.exports = new ChapaService();
