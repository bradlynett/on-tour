import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Paper,
    Divider
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

interface PersonalInfoData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

const PersonalInfo: React.FC = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<PersonalInfoData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Load current user data
    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
                streetAddress: user.streetAddress || '',
                city: user.city || '',
                state: user.state || '',
                zipCode: user.zipCode || '',
                country: user.country || ''
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            // Call the new personal info update endpoint
            const response = await api.put('/users/personal-info', formData);
            
            setMessage({
                type: 'success',
                text: 'Personal information updated successfully!'
            });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update personal information'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
                Personal Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, color: 'white' }}>
                Update your personal details, contact information, and address.
            </Typography>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <Paper sx={{ p: 3, backgroundColor: 'rgba(24, 24, 24, 0.85)', color: 'white', boxShadow: 6, borderRadius: 3, backdropFilter: 'blur(6px)' }}>
                <Box component="form" onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2, color: 'white' }}>
                        Basic Information
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            name="firstName"
                            label="First Name"
                            value={formData.firstName}
                            onChange={handleChange}
                            fullWidth
                            required
                            disabled={isSubmitting}
                            sx={{ '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                        />
                        <TextField
                            name="lastName"
                            label="Last Name"
                            value={formData.lastName}
                            onChange={handleChange}
                            fullWidth
                            required
                            disabled={isSubmitting}
                            sx={{ '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                        />
                    </Box>

                    <TextField
                        name="email"
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        required
                        disabled={isSubmitting}
                        sx={{ mb: 3, '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                    />

                    <TextField
                        name="phone"
                        label="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                        fullWidth
                        disabled={isSubmitting}
                        sx={{ mb: 3, '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                        helperText="Optional - for travel notifications"
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* Address Information */}
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'white' }}>
                        Address Information
                    </Typography>
                    
                    <TextField
                        name="streetAddress"
                        label="Street Address"
                        value={formData.streetAddress}
                        onChange={handleChange}
                        fullWidth
                        disabled={isSubmitting}
                        sx={{ mb: 3, '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                        placeholder="123 Main St, Apt 4B"
                    />

                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            name="city"
                            label="City"
                            value={formData.city}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting}
                            sx={{ '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                        />
                        <TextField
                            name="state"
                            label="State/Province"
                            value={formData.state}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting}
                            sx={{ '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            name="zipCode"
                            label="ZIP/Postal Code"
                            value={formData.zipCode}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting}
                            sx={{ '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                        />
                        <TextField
                            name="country"
                            label="Country"
                            value={formData.country}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting}
                            sx={{ '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
                            placeholder="United States"
                        />
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default PersonalInfo; 