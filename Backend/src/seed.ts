import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { Word } from "./models/Word.js";

dotenv.config();

const initialWords = [
  // Beginner Level
  {
    word: "resilient",
    level: "Beginner",
    partOfSpeech: "adjective",
    phonetic: "/rɪˈzɪliənt/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/resilient-us.mp3",
    definitions: [
      "Able to withstand or recover quickly from difficult conditions.",
    ],
    exampleSentences: [
      "Small businesses have proven remarkably resilient this year.",
    ],
  },
  {
    word: "curious",
    level: "Beginner",
    partOfSpeech: "adjective",
    phonetic: "/ˈkjʊəriəs/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/curious-us.mp3",
    definitions: ["Eager to know or learn something."],
    exampleSentences: ["She was curious about how the software worked."],
  },
  {
    word: "abundant",
    level: "Beginner",
    partOfSpeech: "adjective",
    phonetic: "/əˈbʌndənt/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/abundant-us.mp3",
    definitions: ["Existing or available in large quantities; overflowing."],
    exampleSentences: ["The region has an abundant supply of fresh water."],
  },
  {
    word: "courage",
    level: "Beginner",
    partOfSpeech: "noun",
    phonetic: "/ˈkɜːrɪdʒ/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/courage-us.mp3",
    definitions: ["The ability to do something that frightens one; bravery."],
    exampleSentences: [
      "It takes courage to speak up in front of a large group.",
    ],
  },
  {
    word: "genuine",
    level: "Beginner",
    partOfSpeech: "adjective",
    phonetic: "/ˈdʒɛnjuɪn/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/genuine-us.mp3",
    definitions: ["Truly what something is said to be; authentic."],
    exampleSentences: ["His apology felt completely genuine and sincere."],
  },

  // Intermediate Level
  {
    word: "ephemeral",
    level: "Intermediate",
    partOfSpeech: "adjective",
    phonetic: "/əˈfɛm(ə)rəl/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3",
    definitions: ["Lasting for a very short time."],
    exampleSentences: [
      "The ephemeral beauty of the sunset faded within minutes.",
    ],
  },
  {
    word: "serendipity",
    level: "Intermediate",
    partOfSpeech: "noun",
    phonetic: "/ˌsɛr(ə)nˈdɪpɪti/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3",
    definitions: [
      "The occurrence of events by chance in a happy or beneficial way.",
    ],
    exampleSentences: [
      "Finding my old sketchbook in the thrift store was pure serendipity.",
    ],
  },
  {
    word: "eloquent",
    level: "Intermediate",
    partOfSpeech: "adjective",
    phonetic: "/ˈɛləkwənt/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/eloquent-us.mp3",
    definitions: ["Fluent or persuasive in speaking or writing."],
    exampleSentences: [
      "She delivered an eloquent speech about community support.",
    ],
  },
  {
    word: "nostalgia",
    level: "Intermediate",
    partOfSpeech: "noun",
    phonetic: "/nɒˈstældʒə/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/nostalgia-us.mp3",
    definitions: ["A sentimental longing or affection for the past."],
    exampleSentences: [
      "Looking through old photo albums always fills me with nostalgia.",
    ],
  },
  {
    word: "altruistic",
    level: "Intermediate",
    partOfSpeech: "adjective",
    phonetic: "/ˌæltruˈɪstɪk/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/altruistic-us.mp3",
    definitions: [
      "Showing a disinterested and selfless concern for the well-being of others.",
    ],
    exampleSentences: [
      "Her altruistic actions earned her the respect of the entire town.",
    ],
  },

  // Advanced Level
  {
    word: "pragmatic",
    level: "Advanced",
    partOfSpeech: "adjective",
    phonetic: "/præɡˈmætɪk/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/pragmatic-us.mp3",
    definitions: [
      "Dealing with things sensibly and realistically based on practical rather than theoretical considerations.",
    ],
    exampleSentences: [
      "We need a pragmatic approach to solve this budget shortfall.",
    ],
  },
  {
    word: "ubiquitous",
    level: "Advanced",
    partOfSpeech: "adjective",
    phonetic: "/juːˈbɪkwɪtəs/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/ubiquitous-us.mp3",
    definitions: ["Present, appearing, or found everywhere."],
    exampleSentences: [
      "Smartphones have become ubiquitous in modern daily life.",
    ],
  },
  {
    word: "gregarious",
    level: "Advanced",
    partOfSpeech: "adjective",
    phonetic: "/ɡrɪˈɡɛəriəs/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/gregarious-us.mp3",
    definitions: ["Fond of company; sociable."],
    exampleSentences: [
      "He was a popular and gregarious man who loved hosting dinners.",
    ],
  },
  {
    word: "mitigate",
    level: "Advanced",
    partOfSpeech: "verb",
    phonetic: "/ˈmɪtɪɡeɪt/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/mitigate-us.mp3",
    definitions: ["Make less severe, serious, or painful."],
    exampleSentences: [
      "Extra safety measures were implemented to mitigate potential risks.",
    ],
  },
  {
    word: "fastidious",
    level: "Advanced",
    partOfSpeech: "adjective",
    phonetic: "/fæˈstɪdiəs/",
    audioUrl:
      "https://api.dictionaryapi.dev/media/pronunciations/en/fastidious-us.mp3",
    definitions: ["Very attentive to and concerned about accuracy and detail."],
    exampleSentences: [
      "The editor was fastidious about checking every single source reference.",
    ],
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing words to prevent duplicate key errors on 'word'
    await Word.deleteMany({});
    console.log("🧹 Cleared existing master word collection...");

    // Insert the structured batch into MongoDB
    await Word.insertMany(initialWords);
    console.log(
      `✨ Successfully seeded ${initialWords.length} words into MongoDB!`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
