# Stripe Integration Guide

This guide covers the complete Stripe integration for the Concert Travel App, including setup, testing, and deployment.

## 🚀 Quick Start

### 1. Stripe Account Setup

1. **Create a Stripe Account**
   - Go to [stripe.com](https://stripe.com) and sign up
   - Complete account verification
   - Switch to test mode for development

2. **Get API Keys**
   - Navigate to Developers → API keys
   - Copy your **Publishable Key** and **Secret Key**
   - Keep these secure and never commit them to version control

### 2. Environment Variables

Add the following to your `.env` file in the backend directory:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Add to your frontend `.env` file:

```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### 3. Install Dependencies

**Backend** (already installed):
```bash
npm install stripe
```

**Frontend**:
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

## 🔧 Configuration

### Backend Configuration

The backend is already configured with:

- ✅ Payment intent creation
- ✅ Payment confirmation
- ✅ Refund processing
- ✅ Webhook handling
- ✅ Customer management
- ✅ Payment method storage

### Frontend Configuration

The frontend includes:

- ✅ Payment form component
- ✅ Stripe Elements integration
- ✅ Error handling
- ✅ Loading states

## 🧪 Testing

### 1. Run the Stripe Integration Test

```bash
cd backend
.\scripts\test-stripe-integration.ps1
```

This test will:
- ✅ Login to the system
- ✅ Create a booking
- ✅ Create a payment intent
- ✅ Test payment methods endpoint
- ✅ Test payment history
- ✅ Test refund endpoint

### 2. Test with Stripe Test Cards

Use these test card numbers:

| Card Type | Number | CVC | Expiry |
|-----------|--------|-----|--------|
| Visa | 4242424242424242 | Any 3 digits | Any future date |
| Visa (debit) | 4000056655665556 | Any 3 digits | Any future date |
| Mastercard | 5555555555554444 | Any 3 digits | Any future date |
| American Express | 378282246310005 | Any 4 digits | Any future date |

**Declined Cards:**
- 4000000000000002 (Generic decline)
- 4000000000009995 (Insufficient funds)
- 4000000000009987 (Lost card)
- 4000000000009979 (Stolen card)

### 3. Test Webhooks Locally

1. **Install Stripe CLI**
   ```bash
   # Download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**
   ```bash
   stripe listen --forward-to localhost:5001/api/webhooks/stripe
   ```

4. **Copy the webhook secret** and add it to your `.env` file

## 📋 API Endpoints

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create-intent` | Create payment intent |
| POST | `/api/payment/confirm` | Confirm payment |
| POST | `/api/payment/refund` | Process refund |
| GET | `/api/payment/payment-methods` | Get user payment methods |
| GET | `/api/payment/history` | Get payment history |

### Webhook Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/webhooks/stripe` | Stripe webhook handler |

## 🔄 Payment Flow

### 1. Create Booking
```javascript
// User creates a trip booking
POST /api/booking
{
  "eventId": 1,
  "tripComponents": { ... },
  "totalCost": 475.00
}
```

### 2. Create Payment Intent
```javascript
// Create payment intent for the booking
POST /api/payment/create-intent
{
  "bookingId": 1,
  "amount": 475.00,
  "currency": "usd"
}
```

### 3. Process Payment
```javascript
// Frontend processes payment with Stripe Elements
const { error } = await stripe.confirmPayment({
  elements,
  clientSecret: paymentIntent.clientSecret,
  confirmParams: {
    return_url: `${window.location.origin}/payment/success`,
  },
});
```

### 4. Webhook Confirmation
```javascript
// Stripe sends webhook to confirm payment
POST /api/webhooks/stripe
{
  "type": "payment_intent.succeeded",
  "data": { ... }
}
```

## 🛡️ Security Best Practices

### 1. Environment Variables
- ✅ Never commit API keys to version control
- ✅ Use different keys for test and production
- ✅ Rotate keys regularly

### 2. Webhook Security
- ✅ Verify webhook signatures
- ✅ Use HTTPS in production
- ✅ Handle webhook failures gracefully

### 3. Error Handling
- ✅ Log all payment errors
- ✅ Provide user-friendly error messages
- ✅ Implement retry logic for failed payments

## 🚀 Production Deployment

### 1. Update Environment Variables
```bash
# Production Stripe keys
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_production_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
```

### 2. Configure Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

### 3. SSL Certificate
- ✅ Ensure HTTPS is enabled
- ✅ Use valid SSL certificate
- ✅ Redirect HTTP to HTTPS

## 📊 Monitoring

### 1. Stripe Dashboard
- Monitor payments in real-time
- View failed payments
- Track revenue and refunds

### 2. Application Logs
- Payment success/failure logs
- Webhook processing logs
- Error tracking

### 3. Metrics to Track
- Payment success rate
- Average transaction value
- Refund rate
- Webhook delivery success rate

## 🔧 Troubleshooting

### Common Issues

1. **Payment Intent Creation Fails**
   - Check Stripe secret key
   - Verify booking exists
   - Check amount format (cents vs dollars)

2. **Webhook Not Received**
   - Verify webhook endpoint URL
   - Check webhook secret
   - Ensure HTTPS in production

3. **Payment Confirmation Fails**
   - Check client secret
   - Verify payment intent status
   - Check for network errors

### Debug Commands

```bash
# Test Stripe connection
curl -u sk_test_your_key: https://api.stripe.com/v1/account

# List webhooks
stripe webhooks list

# Test webhook
stripe trigger payment_intent.succeeded
```

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

## 🎯 Next Steps

1. **Test the integration** with the provided test script
2. **Set up webhooks** for production
3. **Implement frontend payment form** in your booking flow
4. **Add payment confirmation pages**
5. **Set up monitoring and alerts**
6. **Implement subscription features** (optional)

---

**Need Help?** Check the troubleshooting section or refer to the Stripe documentation for detailed guidance. 