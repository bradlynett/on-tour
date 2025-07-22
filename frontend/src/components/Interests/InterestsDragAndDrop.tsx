import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Alert, CircularProgress, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Chip, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, RadioGroup, FormControlLabel, Radio, Checkbox
} from '@mui/material';
import { DragIndicator, Delete, Add, Star, MusicNote, LocationOn, TrendingUp, Save, Edit } from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../../config/api';

export interface Interest {
  id?: number;
  interestType: string;
  interestValue: string;
  priority: number;
  createdAt?: string;
  localOnly?: boolean;
}

interface InterestsDragAndDropProps {
  onInterestsUpdated?: (interests: Interest[]) => void;
  initialInterests?: Interest[];
  title?: string;
  onAddInterest?: (interestType: string, interestValue: string) => void;
  onEdit?: () => void;
  droppableId: string;
}

const InterestsDragAndDrop: React.FC<InterestsDragAndDropProps> = ({ onInterestsUpdated, initialInterests = [], title = 'Interest Prioritization', onAddInterest, onEdit, droppableId }) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newInterest, setNewInterest] = useState({ interestType: 'artist', interestValue: '', priority: 1 });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Controlled interests state
  const interests = initialInterests;

  // Log IDs for debugging
  console.log(`[InterestsDragAndDrop] Rendering Draggables for droppableId=${droppableId}:`, interests.map(i => i.id));

  const handleDragEnd = (result: any) => {
    console.log('Drag end event:', result);
    if (!result.destination) return;
    const items = Array.from(interests);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const updatedItems = items.map((item, index) => ({ ...item, priority: index + 1 }));
    if (onInterestsUpdated) onInterestsUpdated(updatedItems);
  };

  const handleDeleteInterest = (interestId: number | undefined) => {
    if (!interestId) return;
    if (onInterestsUpdated) onInterestsUpdated(interests.filter(i => i.id !== interestId));
    setMessage({ type: 'success', text: 'Interest removed successfully!' });
  };

  const handleAddInterest = () => {
    if (!newInterest.interestValue.trim() || !onAddInterest) return;
    onAddInterest(newInterest.interestType, newInterest.interestValue);
    setMessage({ type: 'success', text: 'Interest added successfully!' });
    setNewInterest({ interestType: 'artist', interestValue: '', priority: 1 });
    setAddDialogOpen(false);
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

  if (initialInterests.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography variant="body2" sx={{ color: 'white', opacity: 0.7 }}>
          No interests found. Add some interests to get started!
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Card sx={{
        backgroundColor: 'rgba(20,20,20,0.55)',
        color: 'white',
        border: '1.5px solid rgba(255,255,255,0.3)',
        borderRadius: 3,
        boxShadow: 'none',
        mb: 3,
        position: 'relative'
      }}>
        <CardContent>
          {/* Edit button in top right, no title */}
          {onEdit && (
            <IconButton size="small" onClick={onEdit} sx={{ color: 'white', position: 'absolute', top: 12, right: 12 }}>
              <Edit />
            </IconButton>
          )}
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
            sx={{
              mt: 1,
              mb: 2,
              backgroundColor: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.3)',
              color: 'white',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1.5px solid white',
              },
              alignSelf: 'flex-start',
              boxShadow: 'none',
            }}
          >
            Add Interest
          </Button>
          {/* Remove the subheader text here */}
          {message && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={droppableId}>
              {(provided) => (
                <List {...provided.droppableProps} ref={provided.innerRef} sx={{ p: 0 }}>
                  {interests.map((interest, index) => (
                    typeof interest.id === 'number' ? (
                      <Draggable key={interest.id} draggableId={interest.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              border: '1.5px solid rgba(255,255,255,0.3)', // Add border for distinction
                              borderRadius: 1,
                              mb: 1,
                              backgroundColor: 'transparent',
                              minHeight: 56,
                              position: 'relative',
                              '&:hover .localOnlyBox': { opacity: 1 }
                            }}
                          >
                            <Box {...provided.dragHandleProps} sx={{ mr: 2, cursor: 'grab' }}>
                              <DragIndicator sx={{ color: 'white' }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                              <Chip label={`#${index + 1}`} size="small" color="primary" variant="outlined" sx={{ border: '1px solid rgba(255,255,255,0.3)', color: 'white', backgroundColor: 'transparent' }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                              <Chip label={getInterestTypeLabel(interest.interestType)} size="small" sx={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} />
                            </Box>
                            <ListItemText primary={interest.interestValue} secondary={`Priority: ${interest.priority}`} sx={{ color: 'white' }} />
                            <Box className="localOnlyBox" sx={{ position: 'absolute', left: 8, top: 8, opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.7)', borderRadius: 1, px: 1, zIndex: 2 }}>
                              <Checkbox
                                checked={!!interest.localOnly}
                                onChange={async (e) => {
                                  // Update backend with full interest object
                                  const updatedInterest = { ...interest, localOnly: e.target.checked };
                                  await api.put(`/users/interests/${interest.id}`, updatedInterest);
                                  // Update local state
                                  if (onInterestsUpdated) {
                                    const updated = interests.map(i => i.id === interest.id ? updatedInterest : i);
                                    onInterestsUpdated(updated);
                                  }
                                }}
                                sx={{ color: 'white', p: 0, mr: 1 }}
                              />
                              <Typography variant="body2" sx={{ color: 'white', fontSize: 13 }}>Local Only</Typography>
                            </Box>
                            <ListItemSecondaryAction>
                              <IconButton edge="end" onClick={() => handleDeleteInterest(interest.id)} color="error">
                                <Delete />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        )}
                      </Draggable>
                    ) : null
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>
      {/* Add Interest Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: 'black', color: 'white' }}>Add New Interest</DialogTitle>
        <DialogContent sx={{ backgroundColor: 'black' }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={newInterest.interestType}
                onChange={(e) => setNewInterest(prev => ({ ...prev, interestType: e.target.value }))}
              >
                <FormControlLabel value="artist" control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />} label={<span style={{ color: 'white' }}>Artist</span>} />
                <FormControlLabel value="genre" control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />} label={<span style={{ color: 'white' }}>Genre</span>} />
                <FormControlLabel value="venue" control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />} label={<span style={{ color: 'white' }}>Venue</span>} />
                <FormControlLabel value="city" control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />} label={<span style={{ color: 'white' }}>City</span>} />
              </RadioGroup>
            </FormControl>
            <TextField
              fullWidth
              value={newInterest.interestValue}
              onChange={(e) => setNewInterest(prev => ({ ...prev, interestValue: e.target.value }))}
              placeholder={`Enter ${getInterestTypeLabel(newInterest.interestType).toLowerCase()} name...`}
              sx={{
                input: { color: 'white' },
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
              }}
              InputLabelProps={{ style: { color: 'white' } }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newInterest.interestValue.trim()) {
                  handleAddInterest();
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: 'black' }}>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ color: 'white', borderColor: 'white' }} variant="outlined">Cancel</Button>
          <Button variant="contained" onClick={handleAddInterest} disabled={!newInterest.interestValue.trim()} sx={{ backgroundColor: 'white', color: 'black' }}>Add Interest</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InterestsDragAndDrop; 