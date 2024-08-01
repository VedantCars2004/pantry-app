import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCRUrCHsh6HEZAtUl6s-pI3ODH7vLfqMUc";
const genAI = new GoogleGenerativeAI(API_KEY);

// Hypothetical image generation function (replace with actual API call)
async function generateImageForRecipe(recipeName) {
  // This is a placeholder. Replace with actual image generation API call
  return `https://example.com/generated-image-for-${encodeURIComponent(recipeName)}.jpg`;
}

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

  const prompt = `Given these ingredients: ${ingredients.join(', ')}, suggest 5 recipes. Return a JSON array of objects, each with 'name' and 'ingredients' properties. Always return 5 recipes, even if some ingredients are missing. Do not include any markdown formatting or language identifiers in your response, just the raw JSON.`;

  try {
    console.log('Sending request to Gemini API with prompt:', prompt);

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    console.log('Raw Gemini API response:', text);

    // Clean up the response
    text = text.replace(/```json\n/, '').replace(/\n```$/, '').trim();

    try {
      const parsedContent = JSON.parse(text);
      console.log('Parsed content:', parsedContent);

      // Generate images and check if recipe can be made with current ingredients
      const recipesWithImages = await Promise.all(parsedContent.map(async (recipe) => {
        const imageUrl = await generateImageForRecipe(recipe.name);
        const canBeMade = recipe.ingredients.every(ingredient => 
          ingredients.some(pantryItem => pantryItem.toLowerCase().includes(ingredient.toLowerCase()))
        );
        return { ...recipe, imageUrl, canBeMade };
      }));

      return recipesWithImages;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response that failed to parse:', text);
      return [{ name: "Parsing Error", ingredients: [text], imageUrl: null, canBeMade: false }];
    }
  } catch (error) {
    console.error('Error in Gemini API call:', error);
    throw error;
  }
}