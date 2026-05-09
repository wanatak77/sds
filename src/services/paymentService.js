import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class PaymentService {
  /**
   * Initialize payment for exam access
   */
  async initializePayment(examType, amount = 100) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payment/initialize`,
        { examType, amount },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payment initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(tx_ref) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payment/verify/${tx_ref}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payment verification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(tx_ref) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payment/status/${tx_ref}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payment status check error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to check payment status');
    }
  }

  /**
   * Redirect to Chapa payment page
   */
  redirectToPayment(checkoutUrl) {
    // Open Chapa payment page in new window
    window.open(checkoutUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  }

  /**
   * Handle payment callback
   */
  async handlePaymentCallback(tx_ref) {
    try {
      const verification = await this.verifyPayment(tx_ref);
      
      if (verification.success && verification.data.status === 'verified') {
        return {
          success: true,
          message: 'Payment successful! Exam access granted.',
          transaction: verification.data.transaction
        };
      } else {
        return {
          success: false,
          message: 'Payment not completed. Please try again.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Payment verification failed'
      };
    }
  }
}

export default new PaymentService();
