// Abstract interface for event providers
class EventProviderInterface {
    constructor() {
        if (this.constructor === EventProviderInterface) {
            throw new Error('EventProviderInterface is abstract and cannot be instantiated');
        }
    }

    // Search for events
    async searchEvents(options = {}) {
        throw new Error('searchEvents must be implemented by subclass');
    }

    // Get event by ID
    async getEventById(eventId) {
        throw new Error('getEventById must be implemented by subclass');
    }

    // Health check
    async healthCheck() {
        throw new Error('healthCheck must be implemented by subclass');
    }

    // Get provider name
    getProviderName() {
        throw new Error('getProviderName must be implemented by subclass');
    }

    // Check if provider is available
    async isAvailable() {
        throw new Error('isAvailable must be implemented by subclass');
    }

    // (Optional) Save event to database
    async saveEvent(eventData) {
        throw new Error('saveEvent must be implemented by subclass');
    }
}

module.exports = EventProviderInterface; 