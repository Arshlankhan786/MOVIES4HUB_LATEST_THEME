const tmdbService = require('../services/tmdbService');
const ApiResponse = require('../utils/ApiResponse');

exports.trending = async (req, res, next) => {
  try {
    const { type = 'movie', time = 'week', page = 1 } = req.query;
    const data = await tmdbService.getTrending(type, time, page);
    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.popular = async (req, res, next) => {
  try {
    const { type = 'movie', page = 1 } = req.query;
    const data = await tmdbService.getPopular(type, page);
    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.topRated = async (req, res, next) => {
  try {
    const { type = 'movie', page = 1 } = req.query;
    const data = await tmdbService.getTopRated(type, page);
    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.search = async (req, res, next) => {
  try {
    const { q, page = 1 } = req.query;
    const data = await tmdbService.search(q, page);
    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.details = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const data = await tmdbService.getDetails(type, id);
    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.seasonEpisodes = async (req, res, next) => {
  try {
    const { id, season } = req.params;
    const data = await tmdbService.getSeasonEpisodes(id, season);
    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.images = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const data = await tmdbService.getImages(type, id);
    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
};