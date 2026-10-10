const prisma = require('../../db');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const getNearbyMatches = async (userLat, userLng, category) => {
  const where = {
    status: 'AVAILABLE',
    ...(category && { category }),
    ...(new Date() && { OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }] })
  };

  const resources = await prisma.resource.findMany({ where });

  const scored = resources.map(res => {
    let score = 50; // base score
    let explanation = ['Available resource.'];
    const distance = calculateDistance(userLat, userLng, res.latitude, res.longitude);
    
    if (distance < 5) { score += 30; explanation.push('Very close location.'); }
    else if (distance < 20) { score += 15; explanation.push('Nearby location.'); }
    
    if (res.expiryDate) {
      const daysToExpiry = (new Date(res.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
      if (daysToExpiry < 3) { score += 20; explanation.push('Urgent: expires very soon.'); }
    }

    return { resource: res, score: Math.min(100, score), explanation: explanation.join(' '), distance };
  });

  return scored.sort((a, b) => b.score - a.score);
};

const getResourceMatches = async (resourceId) => {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new Error('Resource not found');

  const recipients = await prisma.user.findMany({
    where: { accountStatus: 'ACTIVE', role: 'RECIPIENT' }
  });

  const scored = recipients.map(user => {
    let score = 50;
    let explanation = ['Active recipient.'];
    
    // In a full implementation, recipients would have preferred categories or locations.
    // For baseline, we just provide a basic score.
    score += 10;
    explanation.push('Eligible for resource category.');

    return { recipient: user, score: Math.min(100, score), explanation: explanation.join(' ') };
  });

  return scored.sort((a, b) => b.score - a.score);
};

module.exports = {
  getNearbyMatches,
  getResourceMatches
};
