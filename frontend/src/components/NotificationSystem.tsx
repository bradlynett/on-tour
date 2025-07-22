import React, { useEffect, useState } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertTitle, 
  IconButton, 
  Box, 
  Typography,
  Button,
  Slide,
  SlideProps
} from '@mui/material';
import { 
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNotifications, NotificationType, Notification } from '../hooks/useNotifications';

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
  autoHideDuration?: number;
}

const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="left" />;
};

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <SuccessIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'info':
      return <InfoIcon />;
    default:
      return <InfoIcon />;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'info';
  }
};

const getPositionStyles = (position: string) => {
  switch (position) {
    case 'top-right':
      return { top: 16, right: 16 };
    case 'top-left':
      return { top: 16, left: 16 };
    case 'bottom-right':
      return { bottom: 16, right: 16 };
    case 'bottom-left':
      return { bottom: 16, left: 16 };
    case 'top-center':
      return { top: 16, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-center':
      return { bottom: 16, left: '50%', transform: 'translateX(-50%)' };
    default:
      return { top: 16, right: 16 };
  }
};

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  position = 'top-right',
  maxNotifications = 5,
  autoHideDuration = 5000
}) => {
  const { notifications, removeNotification, clearAll } = useNotifications({
    maxNotifications,
    defaultDuration: autoHideDuration,
    position
  });

  const [openNotifications, setOpenNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Open new notifications
    notifications.forEach(notification => {
      if (!openNotifications.has(notification.id)) {
        setOpenNotifications(prev => new Set(prev).add(notification.id));
      }
    });

    // Close removed notifications
    setOpenNotifications(prev => {
      const newSet = new Set(prev);
      notifications.forEach(notification => {
        if (!newSet.has(notification.id)) {
          newSet.delete(notification.id);
        }
      });
      return newSet;
    });
  }, [notifications, openNotifications]);

  const handleClose = (notificationId: string) => {
    removeNotification(notificationId);
    setOpenNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(notificationId);
      return newSet;
    });
  };

  const handleActionClick = (notification: Notification) => {
    if (notification.action) {
      notification.action.onClick();
      handleClose(notification.id);
    }
  };

  const positionStyles = getPositionStyles(position);

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: 9999,
        ...positionStyles,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 400,
        pointerEvents: 'none'
      }}
    >
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={openNotifications.has(notification.id)}
          autoHideDuration={notification.persistent ? null : notification.duration}
          onClose={() => handleClose(notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{
            vertical: position.includes('top') ? 'top' : 'bottom',
            horizontal: position.includes('right') ? 'right' : position.includes('left') ? 'left' : 'center'
          }}
          sx={{
            pointerEvents: 'auto',
            '& .MuiSnackbar-root': {
              pointerEvents: 'auto'
            }
          }}
        >
          <Alert
            severity={getNotificationColor(notification.type)}
            icon={getNotificationIcon(notification.type)}
            onClose={() => handleClose(notification.id)}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {notification.action && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => handleActionClick(notification)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    {notification.action.label}
                  </Button>
                )}
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => handleClose(notification.id)}
                  sx={{ p: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{
              width: '100%',
              maxWidth: 400,
              boxShadow: 3,
              borderRadius: 2,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Box>
              <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
                {notification.title}
              </AlertTitle>
              <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                {notification.message}
              </Typography>
              {notification.timestamp && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mt: 0.5, 
                    opacity: 0.7,
                    fontSize: '0.7rem'
                  }}
                >
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </Typography>
              )}
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

// Banner notification component for important messages
export const BannerNotification: React.FC<{
  type: NotificationType;
  title: string;
  message: string;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ type, title, message, onClose, action }) => {
  return (
    <Alert
      severity={getNotificationColor(type)}
      icon={getNotificationIcon(type)}
      onClose={onClose}
      action={
        action && (
          <Button
            size="small"
            color="inherit"
            onClick={action.onClick}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            {action.label}
          </Button>
        )
      }
      sx={{
        width: '100%',
        borderRadius: 0,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <Box>
        <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </AlertTitle>
        <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
          {message}
        </Typography>
      </Box>
    </Alert>
  );
};

// Inline notification component for forms
export const InlineNotification: React.FC<{
  type: NotificationType;
  message: string;
  onClose?: () => void;
}> = ({ type, message, onClose }) => {
  return (
    <Alert
      severity={getNotificationColor(type)}
      icon={getNotificationIcon(type)}
      onClose={onClose}
      sx={{
        mb: 2,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      {message}
    </Alert>
  );
};

// Progress notification component
export const ProgressNotification: React.FC<{
  title: string;
  message: string;
  progress: number;
  onClose: () => void;
}> = ({ title, message, progress, onClose }) => {
  return (
    <Alert
      severity="info"
      icon={<InfoIcon />}
      onClose={onClose}
      sx={{
        width: '100%',
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <Box>
        <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {message}
        </Typography>
        <Box
          sx={{
            width: '100%',
            height: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'primary.main',
              transition: 'width 0.3s ease'
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
          {Math.round(progress)}% complete
        </Typography>
      </Box>
    </Alert>
  );
};

export default NotificationSystem; 