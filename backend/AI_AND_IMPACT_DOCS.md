# AI Provider Setup & Impact Calculations

## AI Provider Configuration
The application uses the Google Gen AI API (`@google/genai`) to power the Environmental Report Classification feature.
- **Provider**: Google Gemini
- **Model**: `gemini-2.5-pro`
- **Environment Variable**: To enable AI features, set `GEMINI_API_KEY` in your `.env` file.
- **Fallback Mechanism**: The backend is designed with a resilient fallback mechanism. If the `GEMINI_API_KEY` is omitted, invalid, or if the API times out/fails, the system safely defaults to a rule-based deterministic classifier. This ensures users can always classify their reports even during outages.
- **Safety**: AI classifications are strictly treated as suggestions (`aiClassificationResult` field) and are never used to autonomously reject a report or punish a user.

## Sustainability Impact Calculations
The impact calculation engine estimates the environmental benefits of completed activities.

### Assumptions and Conversion Factors
1. **Carbon Avoided - Food Rescue**: 
   - **Assumption**: Saving food prevents it from decomposing in landfills, which avoids methane emissions.
   - **Factor**: 2.5 kg CO2e avoided per 1 kg of food rescued (based on standard EPA estimates).
2. **Carbon Avoided - Plastic Recycling**:
   - **Assumption**: Recycling offsets the carbon-intensive production of virgin plastic.
   - **Factor**: 1.5 kg CO2e avoided per 1 kg of plastic recycled.
3. **Data Integrity**: 
   - If a measurement does not align with a defensible conversion factor, the backend does *not* invent a factor. Instead, it securely stores the raw measurement and prevents marking it as estimated carbon savings.
   - Duplicate impact records are prevented by querying the database for existing records linking the same user to the specific `resourceId` or `reportId`.
   - The original measurements, estimation flags, and calculation methods are explicitly stored for auditability.
