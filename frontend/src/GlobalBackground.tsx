import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import api from './config/api';

const fallbackImages = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&h=1080&fit=crop'
];

const GlobalBackground: React.FC = () => {
  const { user } = useAuth();
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [artistImages, setArtistImages] = useState<string[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  // Fetch user interests
  useEffect(() => {
    if (!user) return;
    api.get('/users/interests').then(res => {
      if (res.data && res.data.data && res.data.data.interests) {
        setUserInterests(res.data.data.interests);
      }
    });
  }, [user]);

  // Fetch artist images
  useEffect(() => {
    const artistInterests = userInterests.filter(i => i.interest_type === 'artist');
    if (artistInterests.length === 0) {
      setArtistImages([]);
      return;
    }
    const artistNames = artistInterests.map(i => i.interest_value).join(',');
    api.get(`/artist-metadata?artists=${encodeURIComponent(artistNames)}`).then(res => {
      if (res.data && res.data.success) {
        const urls = res.data.data.flatMap((meta: any) => {
          if (!meta.image_urls) return [];
          if (typeof meta.image_urls === 'object') {
            return Object.values(meta.image_urls)
              .flat()
              .map((img: any) => img.url)
              .filter(Boolean);
          }
          return [];
        });
        setArtistImages(urls);
      } else {
        setArtistImages([]);
      }
    }).catch(() => setArtistImages([]));
  }, [userInterests]);

  // Rotate background image every 5 minutes
  useEffect(() => {
    const pickImage = () => {
      let images = artistImages.length > 0 ? artistImages : fallbackImages;
      setBackgroundImage(images[Math.floor(Math.random() * images.length)]);
    };
    pickImage();
    const interval = setInterval(pickImage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [artistImages]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: backgroundImage
          ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${backgroundImage})`
          : 'rgba(24,24,24,0.95)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 0.8s cubic-bezier(0.4,0,0.2,1)'
      }}
    />
  );
};

export default GlobalBackground; 