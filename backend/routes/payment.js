const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');
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

// Create payment intent for a booking
router.post('/create-intent', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'create_payment_intent'
    };
    
    try {
        const { bookingId, amount, currency = 'usd' } = req.body;
        
        if (!bookingId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID and amount are required'
            });
        }
        
        logger.info(`Create payment intent request from user ${req.user.id} for booking ${bookingId}`);
        
        const paymentIntent = await paymentService.createPaymentIntent(
            bookingId,
            req.user.id,
            parseFloat(amount),
            currency
        );
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('create_payment_intent_api', { ...context, bookingId, amount });
        errorHandler.logPerformance('create_payment_intent_api', duration, context);
        
        res.json({
            success: true,
            data: paymentIntent,
            message: 'Payment intent created successfully',
            meta: {
                bookingId,
                amount: paymentIntent.amount,
                serviceFee: paymentIntent.serviceFee,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('create_payment_intent_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Confirm payment
router.post('/confirm', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'confirm_payment'
    };
    
    try {
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment intent ID is required'
            });
        }
        
        logger.info(`Confirm payment request from user ${req.user.id} for payment ${paymentIntentId}`);
        
        const confirmation = await paymentService.confirmPayment(paymentIntentId, req.user.id);
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('confirm_payment_api', { ...context, paymentIntentId, bookingId: confirmation.bookingId });
        errorHandler.logPerformance('confirm_payment_api', duration, context);
        
        res.json({
            success: true,
            data: confirmation,
            message: 'Payment confirmed successfully',
            meta: {
                paymentIntentId,
                bookingId: confirmation.bookingId,
                amount: confirmation.amount,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('confirm_payment_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Process refund
router.post('/refund', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'process_refund'
    };
    
    try {
        const { bookingId, refundAmount, reason } = req.body;
        
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }
        
        logger.info(`Process refund request from user ${req.user.id} for booking ${bookingId}`);
        
        const refund = await paymentService.processRefund(
            bookingId,
            req.user.id,
            refundAmount ? parseFloat(refundAmount) : null,
            reason || 'Customer request'
        );
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('process_refund_api', { ...context, bookingId, refundAmount: refund.amount });
        errorHandler.logPerformance('process_refund_api', duration, context);
        
        res.json({
            success: true,
            data: refund,
            message: 'Refund processed successfully',
            meta: {
                bookingId,
                refundAmount: refund.amount,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('process_refund_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Get payment methods
router.get('/payment-methods', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'get_payment_methods'
    };
    
    try {
        logger.info(`Get payment methods request from user ${req.user.id}`);
        
        const paymentMethods = await paymentService.getPaymentMethods(req.user.id);
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('get_payment_methods_api', { ...context, count: paymentMethods.length });
        errorHandler.logPerformance('get_payment_methods_api', duration, context);
        
        res.json({
            success: true,
            data: paymentMethods,
            meta: {
                count: paymentMethods.length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('get_payment_methods_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        res.status(500).json(errorResponse);
    }
});

// Save payment method
router.post('/payment-methods', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'save_payment_method'
    };
    
    try {
        const { paymentMethodId } = req.body;
        
        if (!paymentMethodId) {
            return res.status(400).json({
                success: false,
                message: 'Payment method ID is required'
            });
        }
        
        logger.info(`Save payment method request from user ${req.user.id}`);
        
        const result = await paymentService.savePaymentMethod(req.user.id, paymentMethodId);
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('save_payment_method_api', { ...context, paymentMethodId });
        errorHandler.logPerformance('save_payment_method_api', duration, context);
        
        res.json({
            success: true,
            data: result,
            message: 'Payment method saved successfully',
            meta: {
                paymentMethodId,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('save_payment_method_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'get_payment_history'
    };
    
    try {
        const { page = 1, limit = 10 } = req.query;
        
        logger.info(`Get payment history request from user ${req.user.id}`);
        
        const history = await paymentService.getPaymentHistory(
            req.user.id,
            parseInt(page),
            parseInt(limit)
        );
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('get_payment_history_api', { ...context, count: history.payments.length });
        errorHandler.logPerformance('get_payment_history_api', duration, context);
        
        res.json({
            success: true,
            data: history.payments,
            pagination: history.pagination,
            meta: {
                count: history.payments.length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('get_payment_history_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        res.status(500).json(errorResponse);
    }
});

// Webhook for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        logger.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
        // Handle the event
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
            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true });
    } catch (error) {
        logger.error(`Webhook handler error: ${error.message}`);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
    try {
        const bookingId = parseInt(paymentIntent.metadata.bookingId);
        const userId = parseInt(paymentIntent.metadata.userId);
        
        logger.info(`Payment succeeded for booking ${bookingId}, user ${userId}`);
        
        // Update booking status
        await pool.query(`
            UPDATE trip_bookings 
            SET payment_status = 'paid', updated_at = NOW()
            WHERE payment_reference = $1
        `, [paymentIntent.id]);
        
        await pool.query(`
            UPDATE trip_plans 
            SET status = 'booked', updated_at = NOW()
            WHERE id = $1
        `, [bookingId]);
        
        // Send confirmation notification
        await paymentService.sendBookingConfirmation(bookingId, userId);
        
    } catch (error) {
        logger.error(`Failed to handle payment succeeded: ${error.message}`);
    }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
    try {
        const bookingId = parseInt(paymentIntent.metadata.bookingId);
        const userId = parseInt(paymentIntent.metadata.userId);
        
        logger.info(`Payment failed for booking ${bookingId}, user ${userId}`);
        
        // Update booking status
        await pool.query(`
            UPDATE trip_bookings 
            SET payment_status = 'failed', updated_at = NOW()
            WHERE payment_reference = $1
        `, [paymentIntent.id]);
        
        // Send failure notification
        await pool.query(`
            INSERT INTO trip_notifications (
                trip_plan_id, user_id, type, title, message
            ) VALUES ($1, $2, $3, $4, $5)
        `, [
            bookingId,
            userId,
            'payment_failed',
            'Payment Failed',
            'Your payment was not successful. Please try again or contact support.'
        ]);
        
    } catch (error) {
        logger.error(`Failed to handle payment failed: ${error.message}`);
    }
}

// Handle successful refund
async function handleRefundSucceeded(charge) {
    try {
        const bookingId = parseInt(charge.metadata.bookingId);
        const userId = parseInt(charge.metadata.userId);
        
        logger.info(`Refund succeeded for booking ${bookingId}, user ${userId}`);
        
        // Update booking status
        await pool.query(`
            UPDATE trip_bookings 
            SET payment_status = 'refunded', updated_at = NOW()
            WHERE trip_plan_id = $1
        `, [bookingId]);
        
        await pool.query(`
            UPDATE trip_plans 
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1
        `, [bookingId]);
        
        // Send refund notification
        await paymentService.sendRefundConfirmation(bookingId, userId, charge.amount_refunded / 100);
        
    } catch (error) {
        logger.error(`Failed to handle refund succeeded: ${error.message}`);
    }
}

module.exports = router; 