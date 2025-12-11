const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  async initialize() {
    try {
      if (this.isConfigured && this.transporter) {
        return;
      }

      // Create transporter using environment variables
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify connection if credentials are provided
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        console.log('Email service initialized and verified');
      } else {
        console.log('Email service initialized (no SMTP credentials provided)');
      }

      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      // Don't throw error to prevent service startup failure
      this.isConfigured = false;
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      if (!this.isConfigured) {
        console.log('Email service not configured, skipping welcome email');
        return false;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: userEmail,
        subject: 'Welcome to Our E-Commerce Platform!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome ${userName}!</h2>
            <p>Thank you for registering with our e-commerce platform.</p>
            <p>You can now:</p>
            <ul>
              <li>Browse our products</li>
              <li>Add items to your cart</li>
              <li>Place orders</li>
              <li>Track your purchases</li>
            </ul>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Happy shopping!</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  async sendOrderConfirmationEmail(userEmail, orderData) {
    try {
      if (!this.isConfigured) {
        console.log('Email service not configured, skipping order confirmation email');
        return false;
      }

      const { orderNumber, items, orderSummary } = orderData;
      
      const itemsHtml = items.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.productPrice}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.subtotal}</td>
        </tr>
      `).join('');

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: userEmail,
        subject: `Order Confirmation - ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Order Confirmation</h2>
            <p>Thank you for your order! Here are the details:</p>
            
            <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin: 0 0 10px 0;">Order #${orderNumber}</h3>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="text-align: right; margin: 20px 0;">
              <p><strong>Subtotal: $${orderSummary.subtotal}</strong></p>
              <p><strong>Shipping: $${orderSummary.shippingCost}</strong></p>
              <p><strong>Tax: $${orderSummary.tax}</strong></p>
              <hr style="margin: 10px 0;">
              <p style="font-size: 18px;"><strong>Total: $${orderSummary.total}</strong></p>
            </div>

            <p>We'll send you another email when your order ships.</p>
            <p>Thank you for shopping with us!</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${userEmail} for order ${orderNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      return false;
    }
  }

  async sendOrderStatusUpdateEmail(userEmail, orderData) {
    try {
      if (!this.isConfigured) {
        console.log('Email service not configured, skipping order status update email');
        return false;
      }

      const { orderNumber, status, trackingNumber } = orderData;
      
      let statusMessage = '';
      switch (status) {
        case 'confirmed':
          statusMessage = 'Your order has been confirmed and is being prepared.';
          break;
        case 'shipped':
          statusMessage = `Your order has been shipped! ${trackingNumber ? `Tracking number: ${trackingNumber}` : ''}`;
          break;
        case 'delivered':
          statusMessage = 'Your order has been delivered! Thank you for shopping with us.';
          break;
        case 'cancelled':
          statusMessage = 'Your order has been cancelled. If you have any questions, please contact support.';
          break;
        default:
          statusMessage = `Your order status has been updated to: ${status}`;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: userEmail,
        subject: `Order Update - ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Order Status Update</h2>
            
            <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin: 0 0 10px 0;">Order #${orderNumber}</h3>
              <p style="margin: 0; font-size: 16px;">${statusMessage}</p>
            </div>

            ${trackingNumber ? `
              <div style="background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
              </div>
            ` : ''}

            <p>You can track your order status anytime by visiting our website.</p>
            <p>Thank you for shopping with us!</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Order status update email sent to ${userEmail} for order ${orderNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to send order status update email:', error);
      return false;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = emailService;
