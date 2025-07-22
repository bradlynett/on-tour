import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Stack,
    Divider,
    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import {
    DragIndicator,
    Delete,
    Add,
    Star,
    MusicNote,
    LocationOn,
    TrendingUp,
    Save,
    Cancel
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

interface Interest {
    id?: number;
    interestType: string;
    interestValue: string;
    priority: number;
    createdAt?: string;
}

interface InterestPrioritizationProps {
    onInterestsUpdated?: (interests: Interest[]) => void;
}

const InterestPrioritization: React.FC<InterestPrioritizationProps> = ({ onInterestsUpdated }) => {
    const { user } = useAuth();
    const [interests, setInterests] = useState<Interest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newInterest, setNewInterest] = useState({
        interestType: 'artist',
        interestValue: '',
        priority: 1
    });

    useEffect(() => {
        loadInterests();
    }, []);

    const loadInterests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/interests');
            const interestsData = response.data.data.interests || [];
            const convertedInterests = interestsData.map((interest: any) => ({
                id: interest.id,
                interestType: interest.interest_type,
                interestValue: interest.interest_value,
                priority: interest.priority,
                createdAt: interest.created_at
            }));
            
            // Sort by priority
            const sortedInterests = convertedInterests.sort((a: Interest, b: Interest) => a.priority - b.priority);
            setInterests(sortedInterests);
        } catch (error) {
            console.error('Failed to load interests:', error);
            setMessage({
                type: 'error',
                text: 'Failed to load interests'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(interests);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update priorities based on new order
        const updatedItems = items.map((item, index) => ({
            ...item,
            priority: index + 1
        }));

        setInterests(updatedItems);
    };

    const handleSavePriorities = async () => {
        setSaving(true);
        setMessage(null);

        try {
            // Update priorities for all interests
            const updatePromises = interests.map((interest, index) => {
                if (interest.id) {
                    return api.put(`/users/interests/${interest.id}`, {
                        priority: index + 1
                    });
                }
                return Promise.resolve();
            });

            await Promise.all(updatePromises);

            setMessage({
                type: 'success',
                text: 'Interest priorities updated successfully!'
            });

            if (onInterestsUpdated) {
                onInterestsUpdated(interests);
            }
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update priorities'
            });
        } finally {
            setSaving(false);
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

    const handleAddInterest = async () => {
        if (!newInterest.interestValue.trim()) return;

        try {
            await api.post('/users/interests', {
                ...newInterest,
                priority: interests.length + 1
            });
            
            setMessage({
                type: 'success',
                text: 'Interest added successfully!'
            });
            
            setNewInterest({
                interestType: 'artist',
                interestValue: '',
                priority: 1
            });
            
            setAddDialogOpen(false);
            await loadInterests();
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to add interest'
            });
        }
    };

    const getInterestTypeIcon = (type: string) => {
        switch (type) {
            case 'artist': return <MusicNote />;
            case 'venue': return <LocationOn />;
            case 'genre': return <Star />;
            default: return <TrendingUp />;
        }
    };

    const getInterestTypeColor = (type: string) => {
        switch (type) {
            case 'artist': return '#1976d2';
            case 'venue': return '#388e3c';
            case 'genre': return '#f57c00';
            default: return '#7b1fa2';
        }
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

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={600}>
                    🎯 Interest Prioritization
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddDialogOpen(true)}
                >
                    Add Interest
                </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Drag and drop to reorder your interests. Higher priority interests will be used first when generating trip suggestions.
            </Typography>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            {interests.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No interests yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Add some interests to get started with personalized trip suggestions!
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setAddDialogOpen(true)}
                    >
                        Add Your First Interest
                    </Button>
                </Paper>
            ) : (
                <Card>
                    <CardContent>
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="interests">
                                {(provided) => (
                                    <List
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        sx={{ p: 0 }}
                                    >
                                        {interests.map((interest, index) => (
                                            <Draggable
                                                key={interest.id || index}
                                                draggableId={interest.id?.toString() || index.toString()}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <ListItem
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        sx={{
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            borderRadius: 1,
                                                            mb: 1,
                                                            backgroundColor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                                                            '&:hover': {
                                                                backgroundColor: 'action.hover'
                                                            }
                                                        }}
                                                    >
                                                        <Box
                                                            {...provided.dragHandleProps}
                                                            sx={{ mr: 2, cursor: 'grab' }}
                                                        >
                                                            <DragIndicator color="action" />
                                                        </Box>
                                                        
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                                            <Chip
                                                                label={`#${index + 1}`}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                        </Box>

                                                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                                            <Chip
                                                                icon={getInterestTypeIcon(interest.interestType)}
                                                                label={getInterestTypeLabel(interest.interestType)}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: getInterestTypeColor(interest.interestType),
                                                                    color: 'white'
                                                                }}
                                                            />
                                                        </Box>

                                                        <ListItemText
                                                            primary={interest.interestValue}
                                                            secondary={`Priority: ${interest.priority}`}
                                                        />

                                                        <ListItemSecondaryAction>
                                                            <IconButton
                                                                edge="end"
                                                                onClick={() => interest.id && handleDeleteInterest(interest.id)}
                                                                color="error"
                                                            >
                                                                <Delete />
                                                            </IconButton>
                                                        </ListItemSecondaryAction>
                                                    </ListItem>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </List>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </CardContent>
                    
                    <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={loadInterests}
                            startIcon={<Cancel />}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSavePriorities}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                        >
                            {saving ? 'Saving...' : 'Save Priorities'}
                        </Button>
                    </CardActions>
                </Card>
            )}

            {/* Add Interest Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Interest</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Interest Type</InputLabel>
                            <Select
                                value={newInterest.interestType}
                                onChange={(e) => setNewInterest(prev => ({
                                    ...prev,
                                    interestType: e.target.value
                                }))}
                                label="Interest Type"
                            >
                                <MenuItem value="artist">Artist</MenuItem>
                                <MenuItem value="genre">Genre</MenuItem>
                                <MenuItem value="venue">Venue</MenuItem>
                                <MenuItem value="city">City</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Interest Value"
                            value={newInterest.interestValue}
                            onChange={(e) => setNewInterest(prev => ({
                                ...prev,
                                interestValue: e.target.value
                            }))}
                            placeholder={`Enter ${getInterestTypeLabel(newInterest.interestType).toLowerCase()} name...`}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAddInterest}
                        disabled={!newInterest.interestValue.trim()}
                    >
                        Add Interest
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default InterestPrioritization; 