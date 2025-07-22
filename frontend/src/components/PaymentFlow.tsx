import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  Receipt as ReceiptIcon,
  Star as StarIcon
} from '@mui/icons-material';

import api from '../config/api';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  bank_name?: string;
  isDefault: boolean;
  expiryMonth?: number;
  expiryYear?: number;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

interface PaymentFlowProps {
  bookingId: number;
  amount: number;
  currency: string;
  onPaymentComplete: (paymentId: string) => void;
  onPaymentFailed: (error: string) => void;
  onClose: () => void;
}

const PaymentFlow: React.FC<PaymentFlowProps> = ({
  bookingId,
  amount,
  currency,
  onPaymentComplete,
  onPaymentFailed,
  onClose
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'|'info'}>({open: false, message: '', severity: 'success'});
  
  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showAddNewCard, setShowAddNewCard] = useState(false);
  
  // Payment intent
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  
  // New card form
  const [newCardData, setNewCardData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    name: ''
  });

  const steps = ['Payment Method', 'Review & Confirm', 'Payment Processing', 'Confirmation'];

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/payment/methods');
      
      if (response.data.success) {
        setPaymentMethods(response.data.data);
        // Select default payment method if available
        const defaultMethod = response.data.data.find((method: PaymentMethod) => method.isDefault);
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod.id);
        }
      } else {
        setError('Failed to load payment methods');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load payment methods');
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
  };

  const handleAddNewCard = async () => {
    if (!newCardData.cardNumber || !newCardData.expiryMonth || !newCardData.expiryYear || !newCardData.cvc || !newCardData.name) {
      setSnackbar({open: true, message: 'Please fill in all card details', severity: 'error'});
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/payment/methods', {
        type: 'card',
        card: {
          number: newCardData.cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(newCardData.expiryMonth),
          exp_year: parseInt(newCardData.expiryYear),
          cvc: newCardData.cvc
        },
        billing_details: {
          name: newCardData.name
        }
      });

      if (response.data.success) {
        setSnackbar({open: true, message: 'Payment method added successfully', severity: 'success'});
        await fetchPaymentMethods();
        setShowAddNewCard(false);
        setNewCardData({
          cardNumber: '',
          expiryMonth: '',
          expiryYear: '',
          cvc: '',
          name: ''
        });
      } else {
        throw new Error(response.data.message || 'Failed to add payment method');
      }
    } catch (err: any) {
      setSnackbar({open: true, message: err.response?.data?.message || 'Failed to add payment method', severity: 'error'});
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentIntent = async () => {
    if (!selectedPaymentMethod) {
      setSnackbar({open: true, message: 'Please select a payment method', severity: 'error'});
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/payment/create-intent', {
        bookingId,
        paymentMethodId: selectedPaymentMethod,
        amount,
        currency
      });

      if (response.data.success) {
        setPaymentIntent(response.data.data);
        setActiveStep(2);
        handleProcessPayment(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to create payment intent');
      }
    } catch (err: any) {
      setSnackbar({open: true, message: err.response?.data?.message || 'Failed to create payment intent', severity: 'error'});
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (intent: PaymentIntent) => {
    setPaymentStatus('processing');
    
    try {
      const response = await api.post('/payment/confirm', {
        paymentIntentId: intent.id,
        bookingId
      });

      if (response.data.success) {
        setPaymentStatus('completed');
        setActiveStep(3);
        onPaymentComplete(intent.id);
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    } catch (err: any) {
      setPaymentStatus('failed');
      setError(err.response?.data?.message || 'Payment failed');
      onPaymentFailed(err.response?.data?.message || 'Payment failed');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100); // Convert from cents
  };

  const formatCardNumber = (number: string) => {
    return number.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card': return <CreditCardIcon />;
      case 'bank_account': return <BankIcon />;
      default: return <PaymentIcon />;
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'processing': return <CircularProgress size={20} />;
      default: return <PaymentIcon />;
    }
  };

  const renderPaymentMethods = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Payment Method
      </Typography>
      
      {paymentMethods.length > 0 && (
        <RadioGroup
          value={selectedPaymentMethod}
          onChange={(e) => handlePaymentMethodSelect(e.target.value)}
        >
          {paymentMethods.map((method) => (
            <Card key={method.id} sx={{ mb: 2 }}>
              <CardContent>
                <FormControlLabel
                  value={method.id}
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center">
                      {getPaymentMethodIcon(method.type)}
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="body1">
                          {method.type === 'card' 
                            ? `${method.brand} •••• ${method.last4}`
                            : `${method.bank_name} •••• ${method.last4}`
                          }
                        </Typography>
                        {method.type === 'card' && method.expiryMonth && method.expiryYear && (
                          <Typography variant="body2" color="text.secondary">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </Typography>
                        )}
                        {method.isDefault && (
                          <Chip label="Default" size="small" color="primary" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                    </Box>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      )}

      <Button
        variant="outlined"
        startIcon={<CreditCardIcon />}
        onClick={() => setShowAddNewCard(true)}
        sx={{ mt: 2 }}
      >
        Add New Payment Method
      </Button>
    </Box>
  );

  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Payment
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Summary
          </Typography>
          
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography>Booking Amount:</Typography>
            <Typography>{formatCurrency(amount)}</Typography>
          </Box>
          
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography>Payment Method:</Typography>
            <Typography>
              {(() => {
                const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
                return method ? `${method.brand || method.bank_name} •••• ${method.last4}` : 'Not selected';
              })()}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box display="flex" justifyContent="space-between">
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" fontWeight="bold">
              {formatCurrency(amount)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box display="flex" alignItems="center" mb={2}>
        <SecurityIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Your payment is secured with bank-level encryption
        </Typography>
      </Box>
    </Box>
  );

  const renderProcessing = () => (
    <Box textAlign="center">
      <Box display="flex" justifyContent="center" mb={3}>
        {getPaymentStatusIcon(paymentStatus)}
      </Box>
      
      <Typography variant="h6" gutterBottom>
        {paymentStatus === 'processing' && 'Processing Payment...'}
        {paymentStatus === 'completed' && 'Payment Successful!'}
        {paymentStatus === 'failed' && 'Payment Failed'}
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        {paymentStatus === 'processing' && 'Please wait while we process your payment'}
        {paymentStatus === 'completed' && 'Your booking has been confirmed'}
        {paymentStatus === 'failed' && error || 'Something went wrong with your payment'}
      </Typography>
    </Box>
  );

  const renderConfirmation = () => (
    <Box textAlign="center">
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
      
      <Typography variant="h5" gutterBottom>
        Payment Successful!
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Your booking has been confirmed and payment processed.
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Booking ID: #{bookingId}
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        You will receive a confirmation email shortly.
      </Typography>
      
      <Box mt={3}>
        <Button
          variant="outlined"
          startIcon={<ReceiptIcon />}
          onClick={() => {
            // Handle download receipt
            setSnackbar({open: true, message: 'Receipt downloaded', severity: 'success'});
          }}
          sx={{ mr: 2 }}
        >
          Download Receipt
        </Button>
        
        <Button
          variant="contained"
          onClick={onClose}
        >
          Done
        </Button>
      </Box>
    </Box>
  );

  return (
    <Dialog open={true} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">
          Payment
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Complete your booking payment
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && renderPaymentMethods()}
        {activeStep === 1 && renderReview()}
        {activeStep === 2 && renderProcessing()}
        {activeStep === 3 && renderConfirmation()}
      </DialogContent>

      <DialogActions>
        {activeStep < 2 && (
          <Button onClick={onClose}>
            Cancel
          </Button>
        )}
        
        {activeStep === 0 && (
          <Button
            onClick={() => setActiveStep(1)}
            variant="contained"
            disabled={!selectedPaymentMethod}
          >
            Continue
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button
            onClick={handleCreatePaymentIntent}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Pay Now'}
          </Button>
        )}
      </DialogActions>

      {/* Add New Card Dialog */}
      <Dialog
        open={showAddNewCard}
        onClose={() => setShowAddNewCard(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Payment Method</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Card Number"
              value={newCardData.cardNumber}
              onChange={(e) => setNewCardData({...newCardData, cardNumber: formatCardNumber(e.target.value)})}
              placeholder="1234 5678 9012 3456"
              inputProps={{ maxLength: 19 }}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Expiry Month"
                value={newCardData.expiryMonth}
                onChange={(e) => setNewCardData({...newCardData, expiryMonth: e.target.value})}
                placeholder="MM"
                inputProps={{ maxLength: 2 }}
              />
              
              <TextField
                fullWidth
                label="Expiry Year"
                value={newCardData.expiryYear}
                onChange={(e) => setNewCardData({...newCardData, expiryYear: e.target.value})}
                placeholder="YYYY"
                inputProps={{ maxLength: 4 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="CVC"
                value={newCardData.cvc}
                onChange={(e) => setNewCardData({...newCardData, cvc: e.target.value})}
                placeholder="123"
                inputProps={{ maxLength: 4 }}
              />
              
              <TextField
                fullWidth
                label="Cardholder Name"
                value={newCardData.name}
                onChange={(e) => setNewCardData({...newCardData, name: e.target.value})}
                placeholder="John Doe"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddNewCard(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddNewCard}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Add Card'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({...snackbar, open: false})}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default PaymentFlow; 