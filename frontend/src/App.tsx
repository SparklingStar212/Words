import React, { useState, useEffect } from 'react';

interface IWord {
  _id: string;
  word: string;
  level: string;
  partOfSpeech: string;
  phonetic: string;
  audioUrl: string | null;
  definitions: string[];
  exampleSentences: string[];
}

interface UserSession {
  id: string;
  email: string;
  streakCount: number;
  preferredLevel: 'Beginner' | 'Intermediate' | 'Advanced';
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('words_token'));
  const [user, setUser] = useState<UserSession | null>(
    localStorage.getItem('words_user') ? JSON.parse(localStorage.getItem('words_user')!) : null
  );

  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [registerLevel, setRegisterLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [error, setError] = useState<string>('');

  // Dashboard State
  const [words, setWords] = useState<IWord[]>([]);
  const [loadingWords, setLoadingWords] = useState<boolean>(false);
  const [dailyCompleted, setDailyCompleted] = useState<boolean>(false);

  // Sentence Input Form State per word (keyed by word ID)
  const [sentences, setSentences] = useState<{ [key: string]: string }>({});
  const [feedback, setFeedback] = useState<{ [key: string]: { success?: string; error?: string } }>({});

  useEffect(() => {
    if (user && user.id) {
      fetchDailyProgress(user.id);
    }
  }, [user]);

  const fetchDailyProgress = async (userId: string) => {
    setLoadingWords(true);
    try {
      const res = await fetch(`http://localhost:6530/api/progress/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch daily words');

      setWords(data.wordsAssigned);
      setDailyCompleted(data.completed);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingWords(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(`http://localhost:6530${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          preferredLevel: isRegistering ? registerLevel : undefined
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('words_token', data.token);
      localStorage.setItem('words_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('words_token');
    localStorage.removeItem('words_user');
    setToken(null);
    setUser(null);
    setWords([]);
  };

  // Native Audio Playback with Speech Synthesis fallback
  const playAudio = (word: string, audioUrl: string | null) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speakWord(word));
    } else {
      speakWord(word);
    }
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Step 9: Updated AI Sentence Submission Handler with Streak Sync
  const handleSentenceSubmit = async (e: React.FormEvent, item: IWord, wordId: string) => {
    e.preventDefault();
    const userSentence = sentences[wordId] || '';

    if (!userSentence.trim()) {
      setFeedback({
        ...feedback,
        [wordId]: { error: 'Please write a sentence before submitting.' }
      });
      return;
    }

    setFeedback({
      ...feedback,
      [wordId]: { success: 'Evaluating with AI...' }
    });

    try {
      const res = await fetch('http://localhost:6530/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: item.word,
          sentence: userSentence,
          userId: user?.id || '',
          wordId: item._id
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI validation failed');

      if (data.passed) {
        setFeedback({
          ...feedback,
          [wordId]: { success: `✨ ${data.feedback}` }
        });

        if (data.sessionCompleted && user) {
          const updatedUser = {
            ...user,
            streakCount: data.streakUpdated ? data.newStreakCount : user.streakCount
          };
          setUser(updatedUser);
          localStorage.setItem('words_user', JSON.stringify(updatedUser));
          setDailyCompleted(true);
        }
      } else {
        setFeedback({
          ...feedback,
          [wordId]: { error: `❌ ${data.feedback}` }
        });
      }
    } catch (err) {
      setFeedback({
        ...feedback,
        [wordId]: { error: (err as Error).message }
      });
    }
  };

  // --- DASHBOARD VIEW (Authenticated) ---
  if (token && user) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] text-[#1C1C1A] flex flex-col items-center p-4 sm:p-6">
        {/* Header */}
        <header className="w-full max-w-2xl flex justify-between items-center py-4 border-b border-[#E5E2DC] mb-6">
          <h1 className="text-2xl font-serif tracking-wide font-bold">words</h1>

          <div className="flex items-center gap-3">
            <select
              value={user.preferredLevel || 'Intermediate'}
              onChange={async (e) => {
                const newLevel = e.target.value as 'Beginner' | 'Intermediate' | 'Advanced';
                const updatedUser = { ...user, preferredLevel: newLevel };
                setUser(updatedUser);
                localStorage.setItem('words_user', JSON.stringify(updatedUser));
              }}
              className="text-xs bg-[#FFFFFF] border border-[#E5E2DC] rounded-lg px-2 py-1 text-[#1C1C1A] focus:outline-none focus:border-[#D97757]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <span className="text-xs font-medium bg-[#D97757]/10 text-[#D97757] px-3 py-1 rounded-full">
              🔥 Streak: {user.streakCount}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-[#787570] hover:text-[#1C1C1A] transition"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="w-full max-w-2xl flex flex-col gap-6 pb-12">
          <div className="text-center">
            <h2 className="text-2xl font-serif mb-1">Your Daily 5 Words</h2>
            <p className="text-sm text-[#787570]">
              {dailyCompleted ? '✨ You have completed today session!' : 'Absorb, listen, and write your custom sentences.'}
            </p>
          </div>

          {loadingWords ? (
            <div className="text-center py-12 text-[#787570]">Loading your daily vocabulary...</div>
          ) : (
            <div className="flex flex-col gap-6">
              {words.map((item, index) => {
                const wordFeedback = feedback[item._id] || {};
                const isSuccess = wordFeedback.success?.startsWith('✨');

                return (
                  <div
                    key={item._id}
                    className="bg-[#FFFFFF] border border-[#E5E2DC] rounded-xl p-6 shadow-sm flex flex-col gap-4 transition hover:border-[#D97757]/50"
                  >
                    {/* Card Top */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-xs uppercase tracking-widest text-[#787570] font-semibold">
                            0{index + 1} / 05
                          </span>
                          <span className="text-xs bg-[#F7F5F0] text-[#787570] px-2 py-0.5 rounded border border-[#E5E2DC]">
                            {item.level}
                          </span>
                        </div>
                        <h3 className="text-2xl font-serif font-bold mt-1">{item.word}</h3>
                        <p className="text-sm italic text-[#787570]">{item.partOfSpeech} • {item.phonetic}</p>
                      </div>

                      <button
                        onClick={() => playAudio(item.word, item.audioUrl)}
                        className="p-3 bg-[#F7F5F0] hover:bg-[#D97757]/10 text-[#1C1C1A] hover:text-[#D97757] rounded-full transition border border-[#E5E2DC]"
                        title="Listen to pronunciation"
                      >
                        🔊
                      </button>
                    </div>

                    {/* Definition & Reference Example */}
                    <div className="border-t border-[#E5E2DC] pt-3 text-sm">
                      <p className="font-medium text-[#1C1C1A] mb-1">Definition:</p>
                      <p className="text-[#4A4741] mb-3">{item.definitions[0]}</p>

                      <p className="font-medium text-[#1C1C1A] mb-1">Reference Example:</p>
                      <p className="text-[#787570] italic">"{item.exampleSentences[0]}"</p>
                    </div>

                    {/* Active Sentence Production Form */}
                    <form
                      onSubmit={(e) => handleSentenceSubmit(e, item, item._id)}
                      className="border-t border-[#E5E2DC] pt-4 mt-1 flex flex-col gap-3"
                    >
                      <label className="block text-xs uppercase tracking-wider text-[#787570] font-medium">
                        Write your own sentence using <span className="font-bold text-[#1C1C1A]">"{item.word}"</span>:
                      </label>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          disabled={isSuccess}
                          value={sentences[item._id] || ''}
                          onChange={(e) => setSentences({ ...sentences, [item._id]: e.target.value })}
                          placeholder={`Type a sentence containing "${item.word}"...`}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none bg-[#F7F5F0]/30 ${isSuccess
                              ? 'border-green-300 bg-green-50/30 text-green-800'
                              : 'border-[#E5E2DC] focus:border-[#D97757]'
                            }`}
                        />
                        <button
                          type="submit"
                          disabled={isSuccess}
                          className={`px-4 py-2 text-sm rounded-lg font-medium transition whitespace-nowrap ${isSuccess
                              ? 'bg-green-600 text-white cursor-default'
                              : 'bg-[#1C1C1A] text-white hover:bg-[#D97757]'
                            }`}
                        >
                          {isSuccess ? 'Mastered' : 'Submit'}
                        </button>
                      </div>

                      {/* Feedback Messages */}
                      {wordFeedback.error && (
                        <p className="text-xs text-red-600 mt-1">{wordFeedback.error}</p>
                      )}
                      {wordFeedback.success && (
                        <p className="text-xs text-green-700 font-medium mt-1">{wordFeedback.success}</p>
                      )}
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- AUTH SCREEN (Login / Register) ---
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1C1C1A] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E2DC] rounded-xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif tracking-wide mb-1">words</h1>
          <p className="text-sm text-[#787570]">
            {isRegistering ? 'Create an account to start your habit.' : 'Welcome back. Keep your streak alive.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#787570] mb-1">Preferred Level</label>
              <select
                value={registerLevel}
                onChange={(e) => setRegisterLevel(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                className="w-full px-3 py-2 border border-[#E5E2DC] rounded-lg focus:outline-none focus:border-[#D97757] bg-[#F7F5F0]/30 text-sm"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#787570] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E2DC] rounded-lg focus:outline-none focus:border-[#D97757] bg-[#F7F5F0]/30"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#787570] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E2DC] rounded-lg focus:outline-none focus:border-[#D97757] bg-[#F7F5F0]/30"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#D97757] text-white py-2.5 rounded-lg font-medium shadow-sm hover:opacity-90 transition cursor-pointer"
          >
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#787570]">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[#D97757] font-medium hover:underline focus:outline-none"
          >
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}