import React from 'react';
import { View, StyleSheet, SafeAreaView, ImageBackground, Dimensions } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { LANDING_BG_IMAGE, sharedTheme } from '../shared/theme';

const { width } = Dimensions.get('window');

type LandingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

const LandingScreen: React.FC = () => {
  const navigation = useNavigation<LandingNavigationProp>();
  const theme = useTheme();

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignUp = () => {
    navigation.navigate('Onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={LANDING_BG_IMAGE}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Branding Top Left */}
          <View style={styles.brandingContainer}>
            <Text variant="displaySmall" style={styles.brandingTitle}>
              On-Tour
            </Text>
            <Text variant="titleMedium" style={styles.brandingSubtitle}>
              Explore and experience the world...
            </Text>
          </View>

          {/* Main Content Center-Right */}
          <View style={styles.contentContainer}>
            <Card style={styles.heroCard}>
              <Card.Content style={styles.heroContent}>
                <Text variant="headlineMedium" style={styles.heroHeadline}>
                  Discover amazing concerts and plan and customize perfect trips to see your favorite artists.
                </Text>
                <Text variant="bodyLarge" style={styles.heroDescription}>
                  We use a deep understanding of how you like to travel and the artists you love to make sure you never miss a show and to discover events happening wherever your travels take you.
                </Text>
              </Card.Content>
            </Card>
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={handleSignUp}
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}
                labelStyle={[styles.buttonLabel, { color: 'white' }]}
              >
                Get Started
              </Button>
              <Button
                mode="outlined"
                onPress={handleLogin}
                style={styles.secondaryButton}
                contentStyle={styles.buttonContent}
                labelStyle={[styles.buttonLabel, { color: 'white' }]}
              >
                Sign In
              </Button>
            </View>
            <Text variant="bodySmall" style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingHorizontal: width > 600 ? 40 : 16,
    paddingTop: 24,
  },
  brandingContainer: {
    position: 'absolute',
    top: width > 600 ? 32 : 16,
    left: width > 600 ? 32 : 16,
    zIndex: 2,
    textAlign: 'left',
  },
  brandingTitle: {
    color: 'white',
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
    fontSize: width > 600 ? 48 : 32,
  },
  brandingSubtitle: {
    color: 'white',
    opacity: 0.85,
    fontWeight: '400',
    fontSize: width > 600 ? 20 : 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: width > 600 ? 80 : 40,
    paddingRight: width > 900 ? 80 : width > 600 ? 40 : 0,
    maxWidth: width > 900 ? 700 : width > 600 ? 500 : '100%',
    alignSelf: 'center',
  },
  heroCard: {
    marginBottom: 24,
    backgroundColor: 'transparent',
    elevation: 0,
    borderRadius: 16,
    width: width > 600 ? 480 : '100%',
    maxWidth: 700,
  },
  heroContent: {
    padding: 24,
    alignItems: 'flex-start',
  },
  heroHeadline: {
    color: 'white',
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'left',
    fontSize: width > 600 ? 28 : 20,
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroDescription: {
    color: 'white',
    opacity: 0.9,
    textAlign: 'left',
    fontSize: width > 600 ? 18 : 15,
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  primaryButton: {
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButton: {
    borderRadius: 8,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 8,
  },
  buttonContent: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'left',
    marginTop: 16,
    fontSize: 13,
  },
});

export default LandingScreen; 