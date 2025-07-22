// Initialize Stripe only if secret key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
    console.log('⚠️  Stripe not configured - payment features will be limited');
}

const { pool } = require('../config/database');
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

class PaymentService {
    constructor() {
        this.serviceFeePercentage = 0.05; // 5% service fee
        this.minServiceFee = 10.00; // Minimum $10 service fee
        this.maxServiceFee = 500.00; // Maximum $500 service fee
    }

    // Calculate service fee based on total booking amount
    calculateServiceFee(totalAmount) {
        const calculatedFee = totalAmount * this.serviceFeePercentage;
        return Math.max(this.minServiceFee, Math.min(calculatedFee, this.maxServiceFee));
    }

    // Create a payment intent for a booking
    async createPaymentIntent(bookingId, userId, amount, currency = 'usd') {
        try {
            logger.info(`Creating payment intent for booking ${bookingId}, user ${userId}, amount ${amount}`);

            if (!stripe) {
                throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
            }

            // Verify booking exists and belongs to user
            const bookingResult = await pool.query(`
                SELECT b.*, e.name as event_name, e.artist, e.venue_city
                FROM bookings b
                LEFT JOIN events e ON b.event_id = e.id
                WHERE b.id = $1 AND b.user_id = $2
            `, [bookingId, userId]);

            if (bookingResult.rows.length === 0) {
                throw new Error('Booking not found or access denied');
            }

            const booking = bookingResult.rows[0];

            // Calculate service fee
            const serviceFee = this.calculateServiceFee(amount);
            const totalAmount = amount + serviceFee;

            // Create payment intent with metadata
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(totalAmount * 100), // Convert to cents
                currency: currency,
                metadata: {
                    bookingId: bookingId.toString(),
                    userId: userId.toString(),
                    eventName: booking.event_name || 'Unknown Event',
                    artist: booking.artist || 'Unknown Artist',
                    venueCity: booking.venue_city || 'Unknown City',
                    serviceFee: serviceFee.toString(),
                    baseAmount: amount.toString()
                },
                description: `Trip booking for ${booking.event_name || 'Event'} in ${booking.venue_city || 'Unknown City'}`,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            // Update booking with payment intent information
            await pool.query(`
                UPDATE bookings 
                SET status = 'pending', 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [bookingId]);

            logger.info(`Created payment intent ${paymentIntent.id} for booking ${bookingId}`);

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: totalAmount,
                serviceFee: serviceFee,
                currency: currency
            };

        } catch (error) {
            logger.error(`Failed to create payment intent: ${error.message}`);
            throw new Error(`Failed to create payment intent: ${error.message}`);
        }
    }

    // Confirm payment and update booking status
    async confirmPayment(paymentIntentId, userId) {
        try {
            logger.info(`Confirming payment ${paymentIntentId} for user ${userId}`);

            if (!stripe) {
                throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
            }

            // Retrieve payment intent from Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`Payment not succeeded. Status: ${paymentIntent.status}`);
            }

            const bookingId = parseInt(paymentIntent.metadata.bookingId);

            // Verify booking belongs to user
            const bookingResult = await pool.query(`
                SELECT b.*
                FROM bookings b
                WHERE b.id = $1 AND b.user_id = $2
            `, [bookingId, userId]);

            if (bookingResult.rows.length === 0) {
                throw new Error('Booking not found or access denied');
            }

            const booking = bookingResult.rows[0];

            // Update booking status
            await pool.query(`
                UPDATE bookings 
                SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [bookingId]);

            // Update booking components status
            await pool.query(`
                UPDATE booking_components 
                SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
                WHERE booking_id = $1
            `, [bookingId]);

            // Send confirmation notification
            await this.sendBookingConfirmation(bookingId, userId);

            logger.info(`Payment confirmed for booking ${bookingId}`);

            return {
                success: true,
                bookingId: bookingId,
                paymentIntentId: paymentIntentId,
                amount: paymentIntent.amount / 100,
                status: 'confirmed'
            };

        } catch (error) {
            logger.error(`Failed to confirm payment: ${error.message}`);
            throw new Error(`Failed to confirm payment: ${error.message}`);
        }
    }

    // Process refund for a booking
    async processRefund(bookingId, userId, refundAmount = null, reason = 'Customer request') {
        try {
            logger.info(`Processing refund for booking ${bookingId}, user ${userId}`);

            if (!stripe) {
                throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
            }

            // Get booking and payment details
            const bookingResult = await pool.query(`
                SELECT tp.*, tb.payment_reference, tb.total_amount, tb.service_fee
                FROM trip_plans tp
                JOIN trip_bookings tb ON tp.id = tb.trip_plan_id
                WHERE tp.id = $1 AND tp.user_id = $2
            `, [bookingId, userId]);

            if (bookingResult.rows.length === 0) {
                throw new Error('Booking not found or access denied');
            }

            const booking = bookingResult.rows[0];

            if (booking.payment_status !== 'paid') {
                throw new Error('Payment not found or not paid');
            }

            // Calculate refund amount (full amount if not specified)
            const refundAmountCents = refundAmount 
                ? Math.round(refundAmount * 100)
                : Math.round(booking.total_amount * 100);

            // Create refund in Stripe
            const refund = await stripe.refunds.create({
                payment_intent: booking.payment_reference,
                amount: refundAmountCents,
                reason: 'requested_by_customer',
                metadata: {
                    bookingId: bookingId.toString(),
                    userId: userId.toString(),
                    reason: reason
                }
            });

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
            await this.sendRefundConfirmation(bookingId, userId, refundAmountCents / 100);

            logger.info(`Refund processed for booking ${bookingId}: ${refundAmountCents / 100}`);

            return {
                success: true,
                refundId: refund.id,
                amount: refundAmountCents / 100,
                status: 'refunded'
            };

        } catch (error) {
            logger.error(`Failed to process refund: ${error.message}`);
            throw new Error(`Failed to process refund: ${error.message}`);
        }
    }

    // Get payment methods for a user
    async getPaymentMethods(userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
            }

            // Get user's Stripe customer ID
            const userResult = await pool.query(`
                SELECT stripe_customer_id FROM users WHERE id = $1
            `, [userId]);

            if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
                return [];
            }

            const customerId = userResult.rows[0].stripe_customer_id;

            // Get payment methods from Stripe
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            return paymentMethods.data.map(pm => ({
                id: pm.id,
                type: pm.type,
                card: {
                    brand: pm.card.brand,
                    last4: pm.card.last4,
                    expMonth: pm.card.exp_month,
                    expYear: pm.card.exp_year
                }
            }));

        } catch (error) {
            logger.error(`Failed to get payment methods: ${error.message}`);
            return [];
        }
    }

    // Save payment method for a user
    async savePaymentMethod(userId, paymentMethodId) {
        try {
            if (!stripe) {
                throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
            }

            // Get or create Stripe customer
            let customerId = await this.getOrCreateStripeCustomer(userId);

            // Attach payment method to customer
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });

            // Set as default payment method
            await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            logger.info(`Saved payment method ${paymentMethodId} for user ${userId}`);

            return { success: true, customerId };

        } catch (error) {
            logger.error(`Failed to save payment method: ${error.message}`);
            throw new Error(`Failed to save payment method: ${error.message}`);
        }
    }

    // Get or create Stripe customer for a user
    async getOrCreateStripeCustomer(userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
            }

            // Check if user already has a Stripe customer ID
            const userResult = await pool.query(`
                SELECT stripe_customer_id, email, first_name, last_name 
                FROM users WHERE id = $1
            `, [userId]);

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];

            if (user.stripe_customer_id) {
                return user.stripe_customer_id;
            }

            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                metadata: {
                    userId: userId.toString()
                }
            });

            // Save customer ID to database
            await pool.query(`
                UPDATE users 
                SET stripe_customer_id = $1, updated_at = NOW()
                WHERE id = $2
            `, [customer.id, userId]);

            logger.info(`Created Stripe customer ${customer.id} for user ${userId}`);

            return customer.id;

        } catch (error) {
            logger.error(`Failed to get or create Stripe customer: ${error.message}`);
            throw new Error(`Failed to get or create Stripe customer: ${error.message}`);
        }
    }

    // Send booking confirmation notification
    async sendBookingConfirmation(bookingId, userId) {
        try {
            // Get booking details
            const bookingResult = await pool.query(`
                SELECT tp.*, e.name as event_name, e.artist, e.venue_city, e.event_date,
                       u.email, u.first_name, u.last_name
                FROM trip_plans tp
                LEFT JOIN events e ON tp.event_id = e.id
                JOIN users u ON tp.user_id = u.id
                WHERE tp.id = $1 AND tp.user_id = $2
            `, [bookingId, userId]);

            if (bookingResult.rows.length === 0) {
                logger.warn(`Booking ${bookingId} not found for confirmation notification`);
                return;
            }

            const booking = bookingResult.rows[0];

            // Create notification record
            await pool.query(`
                INSERT INTO trip_notifications (
                    trip_plan_id, user_id, type, title, message
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                bookingId,
                userId,
                'booking_confirmation',
                'Booking Confirmed!',
                `Your trip to ${booking.event_name} in ${booking.venue_city} has been confirmed. Total: $${booking.total_cost + booking.service_fee}`
            ]);

            logger.info(`Sent booking confirmation for booking ${bookingId}`);

        } catch (error) {
            logger.error(`Failed to send booking confirmation: ${error.message}`);
        }
    }

    // Send refund confirmation notification
    async sendRefundConfirmation(bookingId, userId, refundAmount) {
        try {
            // Create notification record
            await pool.query(`
                INSERT INTO trip_notifications (
                    trip_plan_id, user_id, type, title, message
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                bookingId,
                userId,
                'refund_confirmation',
                'Refund Processed',
                `Your refund of $${refundAmount} has been processed and will appear in your account within 5-10 business days.`
            ]);

            logger.info(`Sent refund confirmation for booking ${bookingId}`);

        } catch (error) {
            logger.error(`Failed to send refund confirmation: ${error.message}`);
        }
    }

    // Send payment failure notification
    async sendPaymentFailureNotification(bookingId, userId, errorMessage) {
        try {
            // Create notification record
            await pool.query(`
                INSERT INTO trip_notifications (
                    trip_plan_id, user_id, type, title, message
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                bookingId,
                userId,
                'payment_failed',
                'Payment Failed',
                `Your payment failed: ${errorMessage}. Please try again or contact support.`
            ]);

            logger.info(`Sent payment failure notification for booking ${bookingId}`);

        } catch (error) {
            logger.error(`Failed to send payment failure notification: ${error.message}`);
        }
    }

    // Get payment history for a user
    async getPaymentHistory(userId, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;

            const result = await pool.query(`
                SELECT tb.*, tp.name as trip_name, e.name as event_name, e.artist, e.venue_city
                FROM trip_bookings tb
                JOIN trip_plans tp ON tb.trip_plan_id = tp.id
                LEFT JOIN events e ON tp.event_id = e.id
                WHERE tb.user_id = $1
                ORDER BY tb.created_at DESC
                LIMIT $2 OFFSET $3
            `, [userId, limit, offset]);

            // Get total count
            const countResult = await pool.query(`
                SELECT COUNT(*) as total
                FROM trip_bookings tb
                JOIN trip_plans tp ON tb.trip_plan_id = tp.id
                WHERE tb.user_id = $1
            `, [userId]);

            return {
                payments: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].total),
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            };

        } catch (error) {
            logger.error(`Failed to get payment history: ${error.message}`);
            throw new Error(`Failed to get payment history: ${error.message}`);
        }
    }
}

module.exports = new PaymentService(); 