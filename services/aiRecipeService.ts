
import { GoogleGenAI, Type } from "@google/genai";
import { Dish, Ingredient } from "../types";
import { PANTRY_ITEMS } from "../data/pantry";

const apiKey = process.env.GEMINI_API_KEY;

export const AiRecipeService = {
  enhanceRecipe: async (dish: Dish): Promise<Dish | null> => {
    if (!apiKey) {
      console.error("Gemini API key is missing");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const pantryList = PANTRY_ITEMS.flatMap(cat => cat.items).join(", ");

    const prompt = `
      You are a professional chef specializing in Persian and international cuisine. 
      Your task is to fix and complete a recipe for a dish named "${dish.name}".
      
      The current recipe is incomplete or has inconsistent units.
      
      Current Ingredients:
      ${dish.ingredients.map(ing => `- ${ing.item}: ${ing.amount} ${ing.unit}`).join("\n")}
      
      Current Steps:
      ${dish.recipeSteps.join("\n")}
      
      Please provide a complete and standardized version of this recipe for 4 servings.
      
      STRICT RULES:
      1. PRESERVE INGREDIENT NAMES: Do NOT change the names of the ingredients provided in the original list. 
         - If the original says "آب گوشت" or "عصاره مرغ" (Stock), keep it as stock. Do NOT change it to "گوشت" (Meat).
         - Maintain the original intent of every ingredient.
      2. WEIGHT-BASED ITEMS (Meat, Vegetables, Grains, Dried Herbs, Powders, Solids): Use ONLY "گرم" (grams) or "کیلوگرم" (kilograms).
         - NEVER use "میلی‌لیتر" or "لیتر" for solids like chicken meat, lamb meat, rice, or DRIED HERBS (e.g., نعناع خشک).
         - Dried herbs (نعناع خشک), flour, and other powders are SOLIDS. Use grams.
         - If using "پیمانه" (cup) or "قاشق" (spoon) for solids, convert to grams:
           * Rice: 1 cup ≈ 180g
           * Beans/Lentils/Split Peas: 1 cup ≈ 200g
           * Flour: 1 cup ≈ 125g
           * Chopped Vegetables: 1 cup ≈ 50-70g
           * Dried Herbs: 1 tablespoon ≈ 3-5g
      3. LIQUID-BASED ITEMS (Water, Milk, Oil, Juices, Stocks/Broths): Use ONLY "میلی‌لیتر" (ml) or "لیتر" (liters).
         - Stocks and broths (آب گوشت/مرغ) are liquids and MUST use ml/liters.
         - If using "پیمانه" (cup), convert to ml: 1 cup ≈ 240ml.
         - If using "قاشق" (spoon), convert to ml: 1 tablespoon ≈ 15ml.
      4. COUNT-BASED ITEMS (Eggs, Onions, Garlic cloves): Use "عدد" or "حبه".
      5. ADDITIVES & SPICES (Salt, Pepper, Turmeric, Cinnamon powder, etc.): Use ONLY "به میزان لازم".
      6. Ensure the amounts are realistic for 4 people.
      7. Keep the description and steps professional and clear in Persian.
      
      Return the result as a JSON object matching the Dish interface.
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                  },
                  required: ["item", "amount", "unit"]
                }
              },
              recipeSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              calories: { type: Type.NUMBER },
              cookTime: { type: Type.NUMBER },
              difficulty: { type: Type.STRING },
              servings: { type: Type.NUMBER }
            },
            required: ["name", "description", "ingredients", "recipeSteps"]
          }
        }
      });

      if (response.text) {
        const enhancedDish = JSON.parse(response.text);
        return {
          ...dish,
          ...enhancedDish,
          hasRealData: true
        };
      }
      return null;
    } catch (error) {
      console.error("Error enhancing recipe with AI:", error);
      return null;
    }
  }
};
