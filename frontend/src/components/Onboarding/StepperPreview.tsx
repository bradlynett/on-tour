import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

const steps = [
  'Your Information',
  'Interests',
  'Travel Preferences',
  'Communication Preferences',
  "Let's Go!"
];

const StepperPreview: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Box sx={{ width: '100%', bgcolor: 'transparent', py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
        {steps.map((label, idx) => {
          let style = {
            color: 'white',
            fontWeight: 400,
            opacity: 0.7,
            borderBottom: '2px solid transparent',
            transition: 'all 0.2s',
            cursor: 'pointer',
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: 'transparent',
          } as React.CSSProperties;
          if (idx < activeStep) {
            style = {
              ...style,
              color: '#90caf9',
              fontWeight: 600,
              opacity: 1,
              borderBottom: '2px solid #90caf9',
              background: 'rgba(144,202,249,0.08)',
            };
          } else if (idx === activeStep) {
            style = {
              ...style,
              color: '#fff',
              fontWeight: 700,
              opacity: 1,
              borderBottom: '3px solid #fff',
              background: 'rgba(255,255,255,0.12)',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            };
          }
          return (
            <Typography key={label} sx={style as any}>
              {label}
            </Typography>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          color="inherit"
          disabled={activeStep === 0}
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          sx={{ color: 'white', borderColor: 'white' }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={activeStep === steps.length - 1}
          onClick={() => setActiveStep((s) => Math.min(steps.length - 1, s + 1))}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default StepperPreview; 