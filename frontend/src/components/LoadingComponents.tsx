import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
  Fade,
  Backdrop,
  Paper,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  Refresh as RefreshIcon,
  HourglassEmpty as HourglassIcon
} from '@mui/icons-material';

interface LoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = 'primary',
  message,
  fullScreen = false
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3
      }}
    >
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}
        open={true}
      >
        {content}
      </Backdrop>
    );
  }

  return content;
};

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Loading...',
  children
}) => {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          <LoadingSpinner message={message} />
        </Box>
      </Fade>
    </Box>
  );
};

interface ProgressBarProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message,
  showPercentage = true,
  color = 'primary'
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {message}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, progress))}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        {showPercentage && (
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface LoadingCardProps {
  variant?: 'card' | 'list' | 'grid';
  count?: number;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  variant = 'card',
  count = 1
}) => {
  const renderCardSkeleton = () => (
    <Card sx={{ height: 200 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Box>
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="80%" height={20} />
        <Skeleton variant="text" width="60%" height={20} />
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={60} />
        </Box>
      </CardContent>
    </Card>
  );

  const renderListSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="text" width="40%" height={20} />
      </Box>
      <Skeleton variant="rectangular" width={80} height={32} />
    </Box>
  );

  const renderGridSkeleton = () => (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="80%" height={20} />
      <Skeleton variant="text" width="60%" height={16} />
    </Box>
  );

  const skeletons = Array.from({ length: count }, (_, index) => (
    <Box key={index}>
      {variant === 'card' && renderCardSkeleton()}
      {variant === 'list' && renderListSkeleton()}
      {variant === 'grid' && renderGridSkeleton()}
    </Box>
  ));

  if (variant === 'grid') {
    return (
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
        gap: 2 
      }}>
        {skeletons.map((skeleton, index) => (
          <Box key={index}>
            {skeleton}
          </Box>
        ))}
      </Box>
    );
  }

  return <Box>{skeletons}</Box>;
};

interface LoadingStateProps {
  state: 'loading' | 'error' | 'empty' | 'success';
  message?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  state,
  message,
  onRetry,
  children
}) => {
  if (state === 'success') {
    return <>{children}</>;
  }

  const getStateContent = () => {
    switch (state) {
      case 'loading':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LoadingSpinner message={message || 'Loading...'} />
          </Box>
        );
      case 'error':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="error" sx={{ mb: 2 }}>
              {message || 'Something went wrong'}
            </Typography>
            {onRetry && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                <RefreshIcon sx={{ color: 'text.secondary' }} />
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer' }}
                  onClick={onRetry}
                >
                  Try again
                </Typography>
              </Box>
            )}
          </Box>
        );
      case 'empty':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <HourglassIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {message || 'No data available'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check back later for updates
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3, textAlign: 'center' }}>
      {getStateContent()}
    </Paper>
  );
};

interface InfiniteScrollLoaderProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const InfiniteScrollLoader: React.FC<InfiniteScrollLoaderProps> = ({
  loading,
  hasMore,
  onLoadMore
}) => {
  React.useEffect(() => {
    if (loading || !hasMore) return;

    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        onLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, onLoadMore]);

  if (!hasMore) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No more items to load
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <LoadingSpinner size={24} message="Loading more..." />
      </Box>
    );
  }

  return null;
};

interface FileUploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  onCancel?: () => void;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  fileName,
  progress,
  status,
  onCancel
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      default:
        return <DownloadIcon />;
    }
  };

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon()}
          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
            {fileName}
          </Typography>
        </Box>
        {status === 'uploading' && onCancel && (
          <Typography
            variant="body2"
            color="error"
            sx={{ cursor: 'pointer' }}
            onClick={onCancel}
          >
            Cancel
          </Typography>
        )}
      </Box>
      <ProgressBar
        progress={progress}
        color={getStatusColor()}
        showPercentage={status === 'uploading'}
      />
    </Box>
  );
};

export default LoadingSpinner; 