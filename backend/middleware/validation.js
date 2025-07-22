const Joi = require('joi');
const { logger } = require('../utils/logger');

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
    }),
    firstName: Joi.string().min(2).max(50).optional().messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().min(2).max(50).optional().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().messages({
        'string.pattern.base': 'Please provide a valid phone number'
    }),
    streetAddress: Joi.string().max(255).optional().messages({
        'string.max': 'Street address cannot exceed 255 characters'
    }),
    city: Joi.string().max(100).optional().messages({
        'string.max': 'City name cannot exceed 100 characters'
    }),
    state: Joi.string().max(50).optional().messages({
        'string.max': 'State name cannot exceed 50 characters'
    }),
    zipCode: Joi.string().max(20).optional().messages({
        'string.max': 'ZIP code cannot exceed 20 characters'
    }),
    country: Joi.string().max(100).optional().messages({
        'string.max': 'Country name cannot exceed 100 characters'
    })
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    })
});

const updateProfileSchema = Joi.object({
    email: Joi.string().email().optional().messages({
        'string.email': 'Please provide a valid email address'
    }),
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    streetAddress: Joi.string().max(255).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(50).optional(),
    zipCode: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
    primaryAirport: Joi.string().max(10).optional(),
    preferredAirlines: Joi.array().items(Joi.string()).optional(),
    flightClass: Joi.string().valid('economy', 'premium_economy', 'business', 'first').optional(),
    preferredHotelBrands: Joi.array().items(Joi.string()).optional(),
    rentalCarPreference: Joi.string().max(100).optional(),

    rewardPrograms: Joi.array().items(Joi.string()).optional(),
    preferredDestinations: Joi.array().items(Joi.string()).optional(),
    rewardProgramMemberships: Joi.array().items(Joi.object({
        program: Joi.string().required(),
        membershipNumber: Joi.string().required()
    })).optional()
});

// Booking request validation schema
const bookingRequestSchema = Joi.object({
  tripId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Trip ID must be a number',
      'number.integer': 'Trip ID must be an integer',
      'number.positive': 'Trip ID must be positive',
      'any.required': 'Trip ID is required'
    }),
  selections: Joi.array().items(
    Joi.object({
      componentType: Joi.string().valid('flight', 'hotel', 'ticket', 'car', 'transportation').required()
        .messages({
          'string.base': 'Component type must be a string',
          'any.only': 'Component type must be one of: flight, hotel, ticket, car, transportation',
          'any.required': 'Component type is required'
        }),
      selectedOption: Joi.object({
        id: Joi.string().required()
          .messages({
            'string.base': 'Option ID must be a string',
            'any.required': 'Option ID is required'
          }),
        provider: Joi.string().required()
          .messages({
            'string.base': 'Provider must be a string',
            'any.required': 'Provider is required'
          }),
        price: Joi.number().positive().required()
          .messages({
            'number.base': 'Price must be a number',
            'number.positive': 'Price must be positive',
            'any.required': 'Price is required'
          }),
        features: Joi.array().items(Joi.string()).optional(),
        availability: Joi.string().valid('available', 'limited', 'low').optional(),
        details: Joi.object().optional()
      }).required()
        .messages({
          'object.base': 'Selected option must be an object',
          'any.required': 'Selected option is required'
        }),
      customizations: Joi.object().optional()
    })
  ).min(1).required()
    .messages({
      'array.base': 'Selections must be an array',
      'array.min': 'At least one selection is required',
      'any.required': 'Selections are required'
    })
});

// Refund request validation schema
const refundRequestSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required()
    .messages({
      'string.base': 'Reason must be a string',
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason must not exceed 500 characters',
      'any.required': 'Reason is required'
    }),
  components: Joi.array().items(Joi.string()).optional()
    .messages({
      'array.base': 'Components must be an array'
    })
});

// Multi-event trip validation schema
const multiEventTripSchema = Joi.object({
  events: Joi.array().items(Joi.string()).min(2).max(10).required()
    .messages({
      'array.base': 'Events must be an array',
      'array.min': 'At least 2 events are required for a multi-event trip',
      'array.max': 'Maximum 10 events allowed per trip',
      'any.required': 'Events are required'
    }),
  preferences: Joi.object({
    prioritize: Joi.string().valid('cost', 'time', 'comfort', 'distance').optional()
      .messages({
        'string.base': 'Priority must be a string',
        'any.only': 'Priority must be one of: cost, time, comfort, distance'
      }),
    maxBudget: Joi.number().positive().optional()
      .messages({
        'number.base': 'Max budget must be a number',
        'number.positive': 'Max budget must be positive'
      }),
    maxTime: Joi.number().positive().optional()
      .messages({
        'number.base': 'Max time must be a number',
        'number.positive': 'Max time must be positive'
      }),
    groupSize: Joi.number().integer().min(1).max(20).optional()
      .messages({
        'number.base': 'Group size must be a number',
        'number.integer': 'Group size must be an integer',
        'number.min': 'Group size must be at least 1',
        'number.max': 'Group size cannot exceed 20'
      }),
    accommodationType: Joi.string().valid('hotel', 'airbnb', 'hostel', 'luxury').optional()
      .messages({
        'string.base': 'Accommodation type must be a string',
        'any.only': 'Accommodation type must be one of: hotel, airbnb, hostel, luxury'
      }),
    transportationType: Joi.string().valid('flight', 'train', 'bus', 'car', 'mixed').optional()
      .messages({
        'string.base': 'Transportation type must be a string',
        'any.only': 'Transportation type must be one of: flight, train, bus, car, mixed'
      })
  }).optional()
    .messages({
      'object.base': 'Preferences must be an object'
    })
});

// Validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        console.log('Validating request body:', req.body);
        
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            console.log('Validation errors:', error.details);
            const errors = error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
            }));
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }
        
        console.log('Validation passed, validated data:', value);
        // Replace req.body with validated data
        req.body = value;
        next();
    };
};

// Validation middleware for booking requests
const validateBookingRequest = (req, res, next) => {
  const { error, value } = bookingRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    logger.warn('Booking request validation failed', {
      userId: req.user?.id,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid booking request data',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Replace request body with validated data
  req.body = value;
  next();
};

// Validation middleware for refund requests
const validateRefundRequest = (req, res, next) => {
  const { error, value } = refundRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    logger.warn('Refund request validation failed', {
      userId: req.user?.id,
      bookingId: req.params.bookingId,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid refund request data',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.body = value;
  next();
};

// Validation middleware for multi-event trips
const validateMultiEventTrip = (req, res, next) => {
  const { error, value } = multiEventTripSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    logger.warn('Multi-event trip validation failed', {
      userId: req.user?.id,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid multi-event trip data',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.body = value;
  next();
};

module.exports = {
    validateRegister: validateRequest(registerSchema),
    validateLogin: validateRequest(loginSchema),
    validateUpdateProfile: validateRequest(updateProfileSchema),
    validateBookingRequest,
    validateRefundRequest,
    validateMultiEventTrip
}; 