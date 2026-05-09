import React from 'react';
import './IntroOne.css'; // Reusing the same CSS

const Contact = () => {
  return (
    <div className="comment-form-container" style={{ marginTop: '30px' }}>
      <h2>Contact Information</h2>
      
      <div className="contact-info" style={{ color: 'white', lineHeight: '2' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '1.4rem' }}>Get in Touch</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>Email:</strong> contact@example.com
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>Phone:</strong> +1 (123) 456-7890
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>Address:</strong> 123 Tech Street, Digital City, 10001
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>Working Hours:</strong> Monday-Friday, 9AM-5PM
        </div>
        
        <div className="social-links" style={{ marginTop: '30px' }}>
          <h4 style={{ marginBottom: '15px' }}>Follow Us</h4>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="nav-btn" style={{ padding: '8px 15px' }}>Twitter</button>
            <button className="nav-btn" style={{ padding: '8px 15px' }}>Facebook</button>
            <button className="nav-btn" style={{ padding: '8px 15px' }}>LinkedIn</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;