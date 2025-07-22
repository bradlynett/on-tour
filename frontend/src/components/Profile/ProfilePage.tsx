import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Tabs,
    Tab,
    AppBar,
    Toolbar,
    IconButton,
    Breadcrumbs,
    Link,
    Button
} from '@mui/material';
import { ArrowBack, Person, Flight, Favorite, Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PersonalInfo from './PersonalInfo';
import TravelPreferences from './TravelPreferences';
import UserInterests from './UserInterests';
import Enable2FA from './Enable2FA';
import api from '../../config/api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`profile-tabpanel-${index}`}
            aria-labelledby={`profile-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `profile-tab-${index}`,
        'aria-controls': `profile-tabpanel-${index}`,
    };
}

const ProfilePage: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleBack = () => {
        navigate('/dashboard');
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleBack}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Profile Management
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Breadcrumbs sx={{ mb: 3, color: 'white' }}>
                    <Link
                        color="inherit"
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/dashboard');
                        }}
                        sx={{ color: 'white' }}
                    >
                        Dashboard
                    </Link>
                    <Typography color="text.primary" sx={{ color: 'white' }}>Profile</Typography>
                </Breadcrumbs>

                <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
                    Welcome back, {user?.firstName}!
                </Typography>

                <Paper sx={{ width: '100%', mt: 3, backgroundColor: 'rgba(24, 24, 24, 0.85)', color: 'white', boxShadow: 6, borderRadius: 3, backdropFilter: 'blur(6px)' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange} 
                            aria-label="profile tabs"
                            variant="fullWidth"
                            sx={{
                                '& .MuiTab-root': {
                                    color: 'white',
                                    opacity: 0.7,
                                },
                                '& .Mui-selected': {
                                    color: 'white',
                                    opacity: 1,
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: 'white',
                                },
                            }}
                        >
                            <Tab 
                                label="Personal Info" 
                                icon={<Person />} 
                                iconPosition="start"
                                {...a11yProps(0)} 
                            />
                            <Tab 
                                label="Travel Preferences" 
                                icon={<Flight />} 
                                iconPosition="start"
                                {...a11yProps(1)} 
                            />
                            <Tab 
                                label="Interests" 
                                icon={<Favorite />} 
                                iconPosition="start"
                                {...a11yProps(2)} 
                            />
                            <Tab 
                                label="Security" 
                                icon={<Lock />} 
                                iconPosition="start"
                                {...a11yProps(3)} 
                            />
                        </Tabs>
                    </Box>

                    <TabPanel value={tabValue} index={0}>
                        <PersonalInfo />
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        <TravelPreferences />
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        <UserInterests />
                    </TabPanel>
                    <TabPanel value={tabValue} index={3}>
                        <Enable2FA />
                    </TabPanel>
                </Paper>
            </Container>
        </Box>
    );
};

export default ProfilePage; 