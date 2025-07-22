import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AuthModal from './Auth/AuthModal';

const backgroundUrl = process.env.PUBLIC_URL + '/Rio Beach Concert.png';

const LandingPage: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const buttonSx = {
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.25)',
    fontWeight: 600,
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.18)',
      border: '1.5px solid rgba(255,255,255,0.4)',
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: `url('/Rio Beach Concert.png') center center / cover no-repeat`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        color: 'white',
        overflow: 'hidden',
      }}
    >
      {/* Branding Top Left */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, p: { xs: 2, md: 4 }, zIndex: 2, textAlign: 'left' }}>
        <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: 2, mb: 1, fontSize: { xs: '2.2rem', md: '3.5rem' } }}>
          On-Tour
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 400, fontSize: { xs: '1rem', md: '1.5rem' }, opacity: 0.85 }}>
          Explore and experience the world...
        </Typography>
      </Box>

      {/* Main Content Center-Right */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          right: { xs: '5%', md: '10%' },
          transform: 'translateY(-40%)', // bring content further down
          width: { xs: '90%', sm: '70%', md: '45%' },
          maxWidth: 700,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 3,
            textAlign: 'left',
            fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' },
            lineHeight: 1.3,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          Discover amazing concerts and plan and customize perfect trips to see your favorite artists.
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mb: 4,
            textAlign: 'left',
            fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
            lineHeight: 1.5,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          We use a deep understanding of how you like to travel and the artists you love to make sure you never miss a show and to discover events happening wherever your travels take you.
        </Typography>
        <Stack direction="row" spacing={3} sx={{ mt: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            sx={buttonSx}
            onClick={() => setOpen(true)}
          >
            Login or Sign Up
          </Button>
        </Stack>
      </Box>
      <AuthModal open={open} onClose={() => setOpen(false)} />

      {/* Optional: Overlay for mobile readability (not darkening for now) */}
    </Box>
  );
};

export default LandingPage; 