const express = require('express');
const router = express.Router();
const ArtistMetadataService = require('../services/artistMetadataService');
const { authenticateToken } = require('../middleware/auth');

// GET /api/artist-metadata?artists=Artist1,Artist2,...
router.get('/', authenticateToken, async (req, res) => {
  try {
    const artists = (req.query.artists || '').split(',').map(a => a.trim()).filter(Boolean);
    if (!artists.length) {
      return res.status(400).json({ success: false, message: 'No artists provided' });
    }
    const results = await Promise.all(
      artists.map(async (artist) => {
        const metadata = await ArtistMetadataService.getArtistMetadata(artist);
        return metadata
          ? { artist_name: metadata.artist_name, image_urls: metadata.image_urls }
          : null;
      })
    );
    res.json({ success: true, data: results.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 