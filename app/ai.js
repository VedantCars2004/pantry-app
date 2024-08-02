import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCRUrCHsh6HEZAtUl6s-pI3ODH7vLfqMUc";

const genAI = new GoogleGenerativeAI(API_KEY);

export async function getRecipeRecommendations(ingredients) {
  console.log('Ingredients received in getRecipeRecommendations:', ingredients);

  if (!API_KEY) {
    console.error('Gemini API key is missing. Unable to get recipe recommendations.');
    throw new Error('Gemini API key is missing');
  }

  if (!ingredients || ingredients.length === 0) {
    console.error('No ingredients provided to getRecipeRecommendations');
    throw new Error('No ingredients provided');
  }

  const prompt = `Given these ingredients in the pantry: ${ingredients.join(', ')}, suggest 5 recipes. For each recipe, provide:
  1. The recipe name
  2. A list of ingredients with their measurements
  3. Step-by-step cooking instructions

  Return a JSON array of objects, each with 'name', 'ingredients', and 'instructions' properties. The 'ingredients' should be an array of strings, each containing the ingredient name and its measurement. The 'instructions' should be an array of strings, each representing a step in the cooking process. Always return 5 recipes, even if some pantry ingredients are not used. Do not include any markdown formatting or language identifiers in your response, just the raw JSON.`;

  try {
    console.log('Sending request to Gemini API with prompt:', prompt);
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    console.log('Raw Gemini API response:', text);

    text = text.replace(/```json\n/, '').replace(/\n```$/, '').trim();

    try {
      const parsedContent = JSON.parse(text);
      console.log('Parsed content:', parsedContent);
      
      // Validate that each recipe has the required properties
      const validatedContent = parsedContent.map(recipe => ({
        name: recipe.name || "Unnamed Recipe",
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions : []
      }));

      return validatedContent;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response that failed to parse:', text);
      return [{ name: "Parsing Error", ingredients: [text], instructions: [] }];
    }
  } catch (error) {
    console.error('Error in Gemini API call:', error);
    throw error;
  }
}