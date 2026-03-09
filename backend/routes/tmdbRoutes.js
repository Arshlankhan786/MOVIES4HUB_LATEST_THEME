const express = require('express');
const router = express.Router();

const tmdbController = require('../controllers/tmdbController');

router.get('/trending', tmdbController.trending);

router.get('/popular', tmdbController.popular);

router.get('/top-rated', tmdbController.topRated);

router.get('/search', tmdbController.search);

router.get('/details/:type/:id', tmdbController.details);

router.get('/tv/:id/season/:season', tmdbController.seasonEpisodes);

router.get('/images/:type/:id', tmdbController.images);

module.exports = router;