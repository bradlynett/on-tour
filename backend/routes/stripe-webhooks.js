const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const errorHandler = require('../services/errorHandler');
const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const startTime = Date.now();
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        // Verify webhook signature
        if (!endpointSecret) {
            logger.warn('STRIPE_WEBHOOK_SECRET not configured - skipping signature verification');
            event = JSON.parse(req.body);
        } else {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        }
        
        logger.info(`Processing Stripe webhook: ${event.type}`);
        
        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
                
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
                
            case 'charge.refunded':
                await handleRefundSucceeded(event.data.object);
                break;
                
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
                
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
                
            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('stripe_webhook_processed', { eventType: event.type, duration });
        
        res.json({ received: true });
        
    } catch (err) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('stripe_webhook_error', duration, { error: err.message });
        
        logger.error(`Webhook error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
    try {
        logger.info(`Payment succeeded: ${paymentIntent.id}`);
        
        const bookingId = parseInt(paymentIntent.metadata.bookingId);
        const userId = parseInt(paymentIntent.metadata.userId);
        
        if (!bookingId || !userId) {
            logger.error(`Missing metadata in payment intent ${paymentIntent.id}`);
            return;
        }
        
        // Confirm payment in our system
        await paymentService.confirmPayment(paymentIntent.id, userId);
        
        logger.info(`Payment confirmed for booking ${bookingId}`);
        
    } catch (error) {
        logger.error(`Error handling payment success: ${error.message}`);
        throw error;
    }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
    try {
        logger.info(`Payment failed: ${paymentIntent.id}`);
        
        const bookingId = parseInt(paymentIntent.metadata.bookingId);
        const userId = parseInt(paymentIntent.metadata.userId);
        
        if (!bookingId || !userId) {
            logger.error(`Missing metadata in payment intent ${paymentIntent.id}`);
            return;
        }
        
        // Update booking status to failed
        const { pool } = require('../config/database');
        await pool.query(`
            UPDATE trip_bookings 
            SET payment_status = 'failed', updated_at = NOW()
            WHERE payment_reference = $1
        `, [paymentIntent.id]);
        
        // Update trip plan status
        await pool.query(`
            UPDATE trip_plans 
            SET status = 'payment_failed', updated_at = NOW()
            WHERE id = $1
        `, [bookingId]);
        
        // Send failure notification
        await paymentService.sendPaymentFailureNotification(bookingId, userId, paymentIntent.last_payment_error?.message || 'Payment failed');
        
        logger.info(`Payment failure processed for booking ${bookingId}`);
        
    } catch (error) {
        logger.error(`Error handling payment failure: ${error.message}`);
        throw error;
    }
}

// Handle refund
async function handleRefundSucceeded(charge) {
    try {
        logger.info(`Refund succeeded: ${charge.id}`);
        
        // Find booking by charge ID
        const { pool } = require('../config/database');
        const result = await pool.query(`
            SELECT tb.*, tp.user_id, tp.id as trip_plan_id
            FROM trip_bookings tb
            JOIN trip_plans tp ON tb.trip_plan_id = tp.id
            WHERE tb.payment_reference = $1
        `, [charge.payment_intent]);
        
        if (result.rows.length === 0) {
            logger.error(`No booking found for charge ${charge.id}`);
            return;
        }
        
        const booking = result.rows[0];
        
        // Update booking status
        await pool.query(`
            UPDATE trip_bookings 
            SET payment_status = 'refunded', updated_at = NOW()
            WHERE payment_reference = $1
        `, [charge.payment_intent]);
        
        // Update trip plan status
        await pool.query(`
            UPDATE trip_plans 
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1
        `, [booking.trip_plan_id]);
        
        // Send refund confirmation
        await paymentService.sendRefundConfirmation(booking.trip_plan_id, booking.user_id, charge.amount_refunded / 100);
        
        logger.info(`Refund processed for booking ${booking.trip_plan_id}`);
        
    } catch (error) {
        logger.error(`Error handling refund: ${error.message}`);
        throw error;
    }
}

// Handle subscription events (for future subscription features)
async function handleSubscriptionCreated(subscription) {
    logger.info(`Subscription created: ${subscription.id}`);
    // Future implementation for subscription-based features
}

async function handleSubscriptionUpdated(subscription) {
    logger.info(`Subscription updated: ${subscription.id}`);
    // Future implementation for subscription-based features
}

async function handleSubscriptionDeleted(subscription) {
    logger.info(`Subscription deleted: ${subscription.id}`);
    // Future implementation for subscription-based features
}

module.exports = router; 