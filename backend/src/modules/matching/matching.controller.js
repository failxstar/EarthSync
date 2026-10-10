const prisma = require('../../db');
const { z } = require('zod');
const { getNearbyMatches, getResourceMatches } = require('./matching.service');

const getMyRecommendations = async (req, res, next) => {
  try {
    const recommendations = await prisma.matchRecommendation.findMany({
      where: { recipientId: req.user.id },
      include: {
        resource: true
      },
      orderBy: { matchScore: 'desc' }
    });
    res.json({ data: recommendations });
  } catch (error) {
    next(error);
  }
};

const statusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'IGNORED'])
});

const updateRecommendationStatus = async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);

    const recommendation = await prisma.matchRecommendation.findUnique({
      where: { id: req.params.id }
    });

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    if (recommendation.recipientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.matchRecommendation.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

const getNearby = async (req, res, next) => {
  try {
    const { lat, lng, category } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude (lat) and longitude (lng) are required' });
    }

    const matches = await getNearbyMatches(parseFloat(lat), parseFloat(lng), category);
    res.json({ data: matches });
  } catch (error) {
    next(error);
  }
};

const getResourceRecipients = async (req, res, next) => {
  try {
    const matches = await getResourceMatches(req.params.id);
    res.json({ data: matches });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyRecommendations,
  updateRecommendationStatus,
  getNearby,
  getResourceRecipients
};
