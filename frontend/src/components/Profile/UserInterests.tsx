import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Checkbox,
    FormControlLabel,
    Stack,
    Divider,
    Tabs,
    Tab
} from '@mui/material';
import { Add, Delete, SelectAll, Clear, DragIndicator } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import InterestsDragAndDrop, { Interest } from '../Interests/InterestsDragAndDrop';

const UserInterests: React.FC = () => {
    const [interests, setInterests] = useState<Interest[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Set<number>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [newInterest, setNewInterest] = useState({
        interestType: 'artist',
        interestValue: '',
        priority: 1
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    // Load current interests
    useEffect(() => {
        loadInterests();
    }, []);

    const loadInterests = async () => {
        try {
            const response = await api.get('/users/interests');
            // Convert snake_case database fields to camelCase for frontend
            const interestsData = response.data.data.interests || [];
            const convertedInterests = interestsData.map((interest: any) => ({
                id: interest.id,
                interestType: interest.interest_type,
                interestValue: interest.interest_value,
                priority: interest.priority,
                createdAt: interest.created_at
            }));
            setInterests(convertedInterests);
        } catch (error) {
            console.error('Failed to load interests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddInterest = async () => {
        if (!newInterest.interestValue.trim()) return;

        setIsSubmitting(true);
        setMessage(null);

        try {
            await api.post('/users/interests', newInterest);
            
            setMessage({
                type: 'success',
                text: 'Interest added successfully!'
            });
            
            setNewInterest({
                interestType: 'artist',
                interestValue: '',
                priority: 1
            });
            
            // Reload interests
            await loadInterests();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to add interest';
            setMessage({
                type: 'error',
                text: errorMessage
            });
            
            // Clear the form if it's a duplicate error
            if (error.response?.status === 409) {
                setNewInterest({
                    interestType: 'artist',
                    interestValue: '',
                    priority: 1
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteInterest = async (interestId: number) => {
        try {
            await api.delete(`/users/interests/${interestId}`);
            await loadInterests();
            
            setMessage({
                type: 'success',
                text: 'Interest removed successfully!'
            });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to remove interest'
            });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedInterests.size === 0) return;

        setIsDeleting(true);
        setMessage(null);

        try {
            // Delete all selected interests
            const deletePromises = Array.from(selectedInterests).map(interestId =>
                api.delete(`/users/interests/${interestId}`)
            );
            
            await Promise.all(deletePromises);
            
            setMessage({
                type: 'success',
                text: `Successfully deleted ${selectedInterests.size} interest${selectedInterests.size > 1 ? 's' : ''}!`
            });
            
            // Clear selection and reload
            setSelectedInterests(new Set());
            setIsSelectionMode(false);
            await loadInterests();
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to delete some interests'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleInterestToggle = (interestId: number) => {
        const newSelected = new Set(selectedInterests);
        if (newSelected.has(interestId)) {
            newSelected.delete(interestId);
        } else {
            newSelected.add(interestId);
        }
        setSelectedInterests(newSelected);
    };

    const handleSelectAll = () => {
        const allIds = interests.filter(interest => interest.id).map(interest => interest.id!);
        setSelectedInterests(new Set(allIds));
    };

    const handleDeselectAll = () => {
        setSelectedInterests(new Set());
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        if (isSelectionMode) {
            setSelectedInterests(new Set());
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleInterestsUpdated = (updatedInterests: Interest[]) => {
        setInterests(updatedInterests);
    };

    const getInterestTypeLabel = (type: string) => {
        const labels: { [key: string]: string } = {
            artist: 'Artist',
            genre: 'Genre',
            venue: 'Venue',
            city: 'City'
        };
        return labels[type] || type;
    };

    const getInterestTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            artist: '#1976d2',
            genre: '#388e3c',
            venue: '#f57c00',
            city: '#7b1fa2'
        };
        return colors[type] || '#757575';
    };

    const getPriorityLabel = (priority: number) => {
        switch (priority) {
            case 1: return 'High';
            case 2: return 'Medium';
            case 3: return 'Low';
            default: return `Level ${priority}`;
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <InterestsDragAndDrop
                initialInterests={interests}
                onInterestsUpdated={(updated: Interest[]) => {
                    // Reassign unique, sequential priorities
                    const rePrioritized = updated.map((item, idx) => ({ ...item, priority: idx + 1 }));
                    setInterests(rePrioritized);
                    api.put('/users/interests/bulk-priority', { updates: rePrioritized.map(i => ({ id: i.id, priority: i.priority })) });
                }}
                onAddInterest={async (interestType: string, interestValue: string) => {
                    await api.post('/users/interests', { interestType, interestValue, priority: interests.length + 1 });
                    const response = await api.get('/users/interests');
                    setInterests(response.data.data.interests.map((i: any) => ({
                        id: i.id,
                        interestType: i.interest_type,
                        interestValue: i.interest_value,
                        priority: i.priority,
                        createdAt: i.created_at
                    })));
                }}
                droppableId="profile-interests"
                title="Your Interests"
            />
        </Box>
    );
};

export default UserInterests; 