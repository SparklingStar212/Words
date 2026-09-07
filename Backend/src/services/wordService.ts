import Word from "../models/Word.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const MODEL_CANDIDATES = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

/**
 * Ensures a healthy global pool of words exists for a given level and field,
 * then picks a requested number of unique words the user hasn't seen yet.
 */
export async function getUniqueWordsForUser(
  level: "Beginner" | "Intermediate" | "Advanced",
  preferredField = "General",
  seenWords: string[],
  count = 3,
) {
  try {
    // 1. Check how many unseen words currently exist in the global database for this level & field
    let availableWords = await Word.find({
      level,
      field: preferredField,
      word: { $nin: seenWords },
    } as any);

    // 2. If the pool is running low, bulk-generate more via AI tailored to this field!
    if (availableWords.length < 15) {
      console.log(
        `⚡ Vocabulary pool low for ${level} (${preferredField}). Bulk generating fresh words via AI...`,
      );
      await bulkGenerateAndEnrichWords(level, preferredField, 25);

      // Re-fetch after generation
      availableWords = await Word.find({
        level,
        field: preferredField,
        word: { $nin: seenWords },
      } as any);
    }

    // 3. Randomly shuffle and pick the requested count from the available pool
    const shuffled = availableWords.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (err) {
    console.error("Error fetching unique words from pool:", err);
    throw err;
  }
}

/**
 * Helper function to ask Gemini for a bulk batch of niche words and enrich them
 */
async function bulkGenerateAndEnrichWords(
  level: "Beginner" | "Intermediate" | "Advanced",
  preferredField = "General",
  count = 15,
) {
  try {
    const fieldInstruction =
      preferredField && preferredField !== "General"
        ? `The words must specifically relate to the academic or professional field of: "${preferredField}".`
        : `The words should be general, high-value vocabulary suitable for everyday professional and conversational use.`;

    const prompt = `Generate a JSON array of ${count} distinct, sophisticated English words suitable for a ${level} English learner. 
    ${fieldInstruction}
    Return ONLY a raw JSON array of strings, e.g., ["word1", "word2", "word3"].`;

    let response: any = null;
    let lastError: any = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response && response.text) break;
      } catch (modelErr) {
        lastError = modelErr;
      }
    }

    if (!response || !response.text) {
      throw (
        lastError ||
        new Error("All Gemini model candidates failed bulk generation.")
      );
    }

    const textResponse = response.text || "[]";
    const cleanedJson = textResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const rawWords: string[] = JSON.parse(cleanedJson);

    // Enrich and save each word to MongoDB globally with its field tag
    for (const w of rawWords) {
      const lowerWord = w.toLowerCase();
      const existing = await Word.findOne({
        word: lowerWord,
        field: preferredField,
      } as any);
      if (existing) continue;

      try {
        const dictRes = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${lowerWord}`,
        );

        let definition = "A valuable term for specialized communication.";
        let partOfSpeech = "noun";
        let audioUrl = "";
        let phoneticText = `/${lowerWord}/`;
        let example = `Practice using "${lowerWord}" in your field.`;

        if (dictRes.ok) {
          const dictData = (await dictRes.json()) as any[];
          const entry = dictData[0];
          definition =
            entry.meanings[0]?.definitions[0]?.definition || definition;
          partOfSpeech = entry.meanings[0]?.partOfSpeech || partOfSpeech;
          example = entry.meanings[0]?.definitions[0]?.example || example;

          for (const phonetic of entry.phonetics || []) {
            if (phonetic.audio && !audioUrl) audioUrl = phonetic.audio;
            if (phonetic.text && !phoneticText) phoneticText = phonetic.text;
          }
        }

        await Word.create({
          word: lowerWord,
          level,
          field: preferredField, // 👈 Save the field tag
          definition,
          partOfSpeech,
          audioUrl,
          phonetic: phoneticText,
          example,
        });
      } catch {
        // Fallback entry if dictionary lookup fails
        await Word.create({
          word: lowerWord,
          level,
          field: preferredField,
          definition: "A valuable term for professional contexts.",
          partOfSpeech: "noun",
          audioUrl: "",
          phonetic: `/${lowerWord}/`,
          example: `Apply "${lowerWord}" within your profession.`,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Bulk generation error:", err);
  }
}
