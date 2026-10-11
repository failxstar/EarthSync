const { GoogleGenAI, Type } = require('@google/genai');

const getClient = () => {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Call Gemini with automatic retry and model fallback on transient 503/429
const generateWithRetry = async (ai, options, maxRetries = 2) => {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const modelToUse = models[attempt % models.length];
    try {
      return await ai.models.generateContent({
        ...options,
        model: modelToUse
      });
    } catch (err) {
      const isRetryable = 
        err.message?.includes('503') || 
        err.message?.includes('429') || 
        err.status === 503 || 
        err.status === 429 ||
        err.message?.includes('high demand');
      
      if (isRetryable && attempt < maxRetries) {
        console.warn(`[AI Engine] Gemini busy (attempt ${attempt + 1}), retrying with fallback in ${(attempt + 1) * 1000}ms...`);
        await sleep((attempt + 1) * 1000);
        continue;
      }
      throw err;
    }
  }
};

// Helper: Convert URL or data URI to Gemini inlineData part
const fetchImageInlineData = async (imageUrl) => {
  try {
    if (!imageUrl) return null;
    
    // Handle data URL (e.g. data:image/png;base64,...)
    if (imageUrl.startsWith('data:image/')) {
      const parts = imageUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      return {
        inlineData: {
          data: parts[1],
          mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg'
        }
      };
    }

    // Handle HTTP / HTTPS URL (Cloudinary, Unsplash, etc.)
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.warn(`Failed to fetch image for AI analysis: HTTP ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const rawMime = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = rawMime.split(';')[0].trim();

    return {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString('base64'),
        mimeType: mimeType || 'image/jpeg'
      }
    };
  } catch (err) {
    console.warn('Could not fetch image for multimodal vision analysis:', err.message);
    return null;
  }
};

// Rule-based fallback classifier
const ruleBasedClassifier = (description = '') => {
  const descLower = (description || '').toLowerCase();
  
  let category = 'OTHER';
  if (descLower.includes('water') || descLower.includes('leak') || descLower.includes('pipe')) {
    category = 'WATER_LEAKAGE';
  } else if (descLower.includes('waste') || descLower.includes('trash') || descLower.includes('garbage')) {
    category = 'WASTE';
  } else if (descLower.includes('dump') || descLower.includes('illegal')) {
    category = 'ILLEGAL_DUMPING';
  } else if (descLower.includes('pollut') || descLower.includes('smog') || descLower.includes('smoke')) {
    category = 'POLLUTION';
  } else if (descLower.includes('energy') || descLower.includes('electricity') || descLower.includes('power')) {
    category = 'ENERGY';
  }

  let priority = 'MEDIUM';
  if (descLower.includes('urgent') || descLower.includes('emergency') || descLower.includes('hazard') || descLower.includes('toxic')) {
    priority = 'HIGH';
  }

  return {
    category,
    priority,
    summary: description ? description.substring(0, 60) + '...' : 'Environmental hazard report',
    suggestedProviderType: 'General Environmental Maintenance',
    confidenceScore: 0.5,
    explanation: 'Classified using fallback rule-based system.'
  };
};

/**
 * Multimodal Computer Vision Analysis for Environmental Hazard Photos
 */
const analyzeReportPhoto = async (imageUrl, userContext = {}) => {
  const ai = getClient();
  if (!ai) {
    return {
      ...ruleBasedClassifier(userContext.description || userContext.title || ''),
      visualEvidence: 'AI vision unavailable; rule-based defaults applied.',
      riskFactors: ['Unverified visual evidence']
    };
  }

  const imagePart = await fetchImageInlineData(imageUrl);
  if (!imagePart) {
    // Fall back to text classification if image fetch fails
    return classifyReport(userContext.description || userContext.title || 'Unspecified incident');
  }

  try {
    const promptText = `You are EarthSync's Advanced Environmental & Hazard Response Vision AI.
Thoroughly examine this photograph for environmental hazards, pollution, illegal dumping, water leaks, infrastructure damage, and community risk.
${userContext.title ? 'User provided title: ' + userContext.title : ''}
${userContext.description ? 'User provided description: ' + userContext.description : ''}

Inspect the visible materials, colors, environment, hazards, and severity. Formulate an actionable report.`;

    const response = await generateWithRetry(ai, {
      contents: [imagePart, promptText],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedIssue: {
              type: Type.STRING,
              description: 'Clear, concise description of the issue visible in the photo.'
            },
            category: {
              type: Type.STRING,
              enum: ['WASTE', 'WATER_LEAKAGE', 'POLLUTION', 'ILLEGAL_DUMPING', 'ENERGY', 'OTHER'],
              description: 'The environmental issue category.'
            },
            priority: {
              type: Type.STRING,
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'Urgency level based on visible environmental and human hazard.'
            },
            suggestedTitle: {
              type: Type.STRING,
              description: 'A crisp, professional report title describing the hazard.'
            },
            suggestedDescription: {
              type: Type.STRING,
              description: 'A comprehensive, detailed description synthesized directly from the visual evidence.'
            },
            visualEvidence: {
              type: Type.STRING,
              description: 'Specific visual observations: objects, colors, container types, signs of degradation or leakage.'
            },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 specific environmental or safety risks observed.'
            },
            suggestedProviderType: {
              type: Type.STRING,
              description: 'Recommended response agency or provider type.'
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0.'
            },
            explanation: {
              type: Type.STRING,
              description: 'Detailed visual reasoning justifying the classification.'
            }
          },
          required: [
            'detectedIssue',
            'category',
            'priority',
            'suggestedTitle',
            'suggestedDescription',
            'visualEvidence',
            'riskFactors',
            'suggestedProviderType',
            'confidenceScore',
            'explanation'
          ]
        }
      }
    });

    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    const result = JSON.parse(rawText);

    if (result.confidenceScore < 0 || result.confidenceScore > 1) {
      result.confidenceScore = Math.max(0, Math.min(1, result.confidenceScore));
    }

    return result;
  } catch (error) {
    console.error('AI Photo Analysis error:', error.message);
    return ruleBasedClassifier(userContext.description || userContext.title || '');
  }
};

/**
 * Multimodal Computer Vision Analysis for Resource Donation Photos
 */
const analyzeResourcePhoto = async (imageUrl) => {
  const ai = getClient();
  if (!ai) {
    return {
      category: 'OTHER',
      suggestedTitle: 'Donated Resource',
      suggestedDescription: 'Resource items available for donation.',
      estimatedQuantity: 1,
      suggestedUnit: 'units',
      condition: 'GOOD',
      detectedItems: ['General item'],
      confidenceScore: 0.5
    };
  }

  const imagePart = await fetchImageInlineData(imageUrl);
  if (!imagePart) {
    return {
      category: 'OTHER',
      suggestedTitle: 'Donated Resource',
      suggestedDescription: 'Resource items available for donation.',
      estimatedQuantity: 1,
      suggestedUnit: 'units',
      condition: 'GOOD',
      detectedItems: ['General item'],
      confidenceScore: 0.5
    };
  }

  try {
    const promptText = `You are EarthSync's Circular Economy & Resource Donation AI.
Examine this photograph of surplus or donated physical goods.
Identify what items are shown, categorize them, and suggest a listing title, description, condition, and estimated quantity.`;

    const response = await generateWithRetry(ai, {
      contents: [imagePart, promptText],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ['FOOD', 'CLOTHING', 'ELECTRONICS', 'FURNITURE', 'MEDICAL', 'BUILDING_MATERIALS', 'OTHER']
            },
            suggestedTitle: {
              type: Type.STRING,
              description: 'Descriptive title for the marketplace listing.'
            },
            suggestedDescription: {
              type: Type.STRING,
              description: 'Clear description of the items and their apparent quality.'
            },
            estimatedQuantity: {
              type: Type.NUMBER,
              description: 'Estimated count or quantity of items pictured.'
            },
            suggestedUnit: {
              type: Type.STRING,
              description: 'Appropriate measurement unit (units, boxes, kg, sets, pairs).'
            },
            condition: {
              type: Type.STRING,
              description: 'Apparent physical condition (e.g. New in box, Like new, Good, Fair).'
            },
            detectedItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of specific items identified in the image.'
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0.'
            }
          },
          required: [
            'category',
            'suggestedTitle',
            'suggestedDescription',
            'estimatedQuantity',
            'suggestedUnit',
            'condition',
            'detectedItems',
            'confidenceScore'
          ]
        }
      }
    });

    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    const result = JSON.parse(rawText);

    if (result.confidenceScore < 0 || result.confidenceScore > 1) {
      result.confidenceScore = Math.max(0, Math.min(1, result.confidenceScore));
    }

    return result;
  } catch (error) {
    console.error('AI Resource Photo Analysis error:', error.message);
    return {
      category: 'OTHER',
      suggestedTitle: 'Donated Resource',
      suggestedDescription: 'Resource items available for donation.',
      estimatedQuantity: 1,
      suggestedUnit: 'units',
      condition: 'GOOD',
      detectedItems: ['General item'],
      confidenceScore: 0.5
    };
  }
};

/**
 * General Incident Classifier (Text or Multimodal)
 */
const classifyReport = async (description, imageUrl = null) => {
  // If an image URL is supplied, use multimodal vision analysis
  if (imageUrl) {
    return analyzeReportPhoto(imageUrl, { description });
  }

  const ai = getClient();
  if (!ai) {
    return ruleBasedClassifier(description);
  }

  try {
    const prompt = `Classify this environmental report. Description: "${description}".`;

    const response = await generateWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ['WASTE', 'WATER_LEAKAGE', 'POLLUTION', 'ILLEGAL_DUMPING', 'ENERGY', 'OTHER'],
              description: 'The category of the environmental issue.'
            },
            priority: {
              type: Type.STRING,
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'The priority level based on urgency and potential impact.'
            },
            summary: {
              type: Type.STRING,
              description: 'A short summary of the report.'
            },
            suggestedProviderType: {
              type: Type.STRING,
              description: 'Suggested service-provider type (e.g., Plumber, Waste Management, Electrician).'
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0.'
            },
            explanation: {
              type: Type.STRING,
              description: 'Explanation of why this classification was chosen.'
            }
          },
          required: ['category', 'priority', 'summary', 'suggestedProviderType', 'confidenceScore', 'explanation']
        }
      }
    });

    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    const result = JSON.parse(rawText);
    
    if (result.confidenceScore < 0 || result.confidenceScore > 1) {
      result.confidenceScore = Math.max(0, Math.min(1, result.confidenceScore));
    }
    
    return result;
  } catch (error) {
    console.error('AI Classification error:', error.message);
    return ruleBasedClassifier(description);
  }
};

module.exports = {
  classifyReport,
  analyzeReportPhoto,
  analyzeResourcePhoto,
  ruleBasedClassifier
};
