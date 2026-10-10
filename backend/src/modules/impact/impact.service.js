const prisma = require('../../db');

// Basic conversion factors (example assumptions for demonstration)
// In a real application, these should come from EPA or similar authoritative sources.
const FACTORS = {
  FOOD_RESCUED: { factor: 2.5, unit: 'kg_CO2e', description: 'Emissions avoided per kg of food rescued (EPA estimate)' },
  PLASTIC_RECYCLED: { factor: 1.5, unit: 'kg_CO2e', description: 'Emissions avoided per kg of plastic recycled' },
};

const calculateImpact = async (userId, type, originalMeasurement, originalUnit, resourceId = null, reportId = null) => {
  // Prevent duplicate impact records
  const existing = await prisma.impactRecord.findFirst({
    where: {
      userId,
      impactType: type,
      ...(resourceId && { resourceId }),
      ...(reportId && { reportId })
    }
  });

  if (existing) return existing;

  let quantity = originalMeasurement;
  let unit = originalUnit;
  let isEstimated = false;
  let conversionFactor = null;
  let factorSource = null;
  let calculationMethod = 'Direct measurement';

  // Apply conversion if we are calculating carbon emissions
  if (type === 'CARBON_AVOIDED') {
    // Example: converting food rescue to carbon
    if (originalUnit === 'kg' && resourceId) {
      // Assuming it's food. In a real app, we'd check the resource category.
      conversionFactor = FACTORS.FOOD_RESCUED.factor;
      factorSource = FACTORS.FOOD_RESCUED.description;
      quantity = originalMeasurement * conversionFactor;
      unit = FACTORS.FOOD_RESCUED.unit;
      isEstimated = true;
      calculationMethod = 'Estimated using conversion factor';
    } else {
      // If no defensible factor exists, we just record the raw type instead of inventing one.
      // But since we are forced to record CARBON_AVOIDED, if we can't, we might throw or mark as unavailable.
      throw new Error('No reliable conversion factor available for this measurement.');
    }
  }

  const record = await prisma.impactRecord.create({
    data: {
      userId,
      resourceId,
      reportId,
      impactType: type,
      quantity,
      unit,
      calculationMethod,
      originalMeasurement,
      originalUnit,
      conversionFactor,
      isEstimated,
      factorSource,
      verificationStatus: 'VERIFIED' // Assume verified if system-generated
    }
  });

  return record;
};

module.exports = {
  calculateImpact
};
