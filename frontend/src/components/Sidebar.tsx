import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Box } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import FlightIcon from '@mui/icons-material/Flight';
import PersonIcon from '@mui/icons-material/Person';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navLinks = [
  { text: 'Dashboard', icon: <DashboardIcon />, to: '/dashboard' },
  { text: 'Trips', icon: <FlightIcon />, to: '/trips' },
  { text: 'Events', icon: <EventIcon />, to: '/events' },
  { text: 'Profile', icon: <PersonIcon />, to: '/profile' },
  { text: 'Bookings', icon: <ConfirmationNumberIcon />, to: '/booking/1' }, // Example booking page
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    onClose();
  };

  // Don't render sidebar if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Drawer 
      anchor="left" 
      open={open} 
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 250,
          marginTop: '64px', // Account for header height
          height: 'calc(100% - 64px)',
          backgroundColor: '#1e1e1e',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }}
    >
      <Box sx={{ width: 250 }} role="presentation" onClick={onClose}>
        <List>
          {navLinks.map((link) => (
            <ListItem button key={link.text} component={RouterLink} to={link.to}>
              <ListItemIcon sx={{ color: 'white' }}>{link.icon}</ListItemIcon>
              <ListItemText primary={link.text} sx={{ color: 'white' }} />
            </ListItem>
          ))}
        </List>
        <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
        <List>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon sx={{ color: 'white' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: 'white' }} />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 