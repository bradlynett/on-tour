// backend/services/notificationService.js
const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
    constructor() {
        this.emailTransporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }

    async sendTripNotification(userId, tripSuggestion) {
        try {
            // Get user preferences
            const user = await db.query(`
                SELECT u.*, up.notification_preferences
                FROM users u
                LEFT JOIN user_preferences up ON u.id = up.user_id
                WHERE u.id = $1
            `, [userId]);

            const preferences = user.rows[0].notification_preferences || {
                email: true,
                sms: false,
                push: true
            };

            // Send notifications based on preferences
            if (preferences.email) {
                await this.sendEmailNotification(user.rows[0], tripSuggestion);
            }

            if (preferences.sms) {
                await this.sendSMSNotification(user.rows[0], tripSuggestion);
            }

            if (preferences.push) {
                await this.sendPushNotification(user.rows[0], tripSuggestion);
            }

        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    async sendEmailNotification(user, tripSuggestion) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'New Trip Suggestion Available!',
            html: `
                <h2>We found a perfect trip for you!</h2>
                <p>Event: ${tripSuggestion.event_name}</p>
                <p>Date: ${tripSuggestion.event_date}</p>
                <p>Total Cost: $${tripSuggestion.total_cost}</p>
                <p>Service Fee: $${tripSuggestion.service_fee}</p>
                <a href="${process.env.FRONTEND_URL}/trips/${tripSuggestion.id}">
                    View Trip Details
                </a>
            `
        };

        await this.emailTransporter.sendMail(mailOptions);
    }

    async sendSMSNotification(user, tripSuggestion) {
        if (!user.phone) return;

        await this.twilioClient.messages.create({
            body: `New trip suggestion: ${tripSuggestion.event_name} on ${tripSuggestion.event_date}. Total: $${tripSuggestion.total_cost}. View at: ${process.env.FRONTEND_URL}/trips/${tripSuggestion.id}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone
        });
    }

    async sendPushNotification(user, tripSuggestion) {
        // Implement push notification logic
        // This would integrate with Firebase Cloud Messaging or similar
    }
}

module.exports = NotificationService;