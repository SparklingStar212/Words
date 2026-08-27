import React from 'react';
import type { IWord, UserSession } from '../types';

interface DashboardProps {
  user: UserSession;
  setUser: React.Dispatch<React.SetStateAction<UserSession | null>>;
  words: IWord[];
  loadingWords: boolean;
  dailyCompleted: boolean;
  sentences: { [key: string]: string };
  setSentences: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  feedback: { [key: string]: { success?: string; error?: string } };
  handleLogout: () => void;
  subscribeToPush: () => void;
  playAudio: (word: string) => void;
  handleSentenceSubmit: (e: React.FormEvent, item: IWord, wordId: string) => void;
}

export default function Dashboard({
  user,
  setUser,
  words,
  loadingWords,
  dailyCompleted,
  sentences,
  setSentences,
  feedback,
  handleLogout,
  subscribeToPush,
  playAudio,
  handleSentenceSubmit,
}: DashboardProps) {
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1C1C1A] flex flex-col items-center p-4 sm:p-6">
      {/* Header */}
      <header className="w-full max-w-2xl flex justify-between items-center py-4 border-b border-[#E5E2DC] mb-6 px-2 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-serif tracking-wide font-bold flex items-center gap-2">
          <img src="./android-chrome-192x192.png" alt="" className='w-11' />
          <p className='hidden md:flex'>words</p>
        </h1>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Level Selector */}
          <select
            value={user.preferredLevel || 'Intermediate'}
            onChange={async (e) => {
              const newLevel = e.target.value as 'Beginner' | 'Intermediate' | 'Advanced';
              const updatedUser = { ...user, preferredLevel: newLevel };
              setUser(updatedUser);
              localStorage.setItem('words_user', JSON.stringify(updatedUser));

              try {
                const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:6530';

                // 1. Update preferred level on the backend
                await fetch(`${BACKEND_URL}/api/users/level`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id, preferredLevel: newLevel }),
                });

                // 2. Refresh daily progress so new words matching this level load instantly
                window.location.reload();
              } catch (err) {
                console.error('Failed to update preferred level:', err);
              }
            }}
            className="text-xs bg-[#FFFFFF] border border-[#E5E2DC] rounded-lg px-1.5 sm:px-2 py-1 text-[#1C1C1A] focus:outline-none focus:border-[#D97757]"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          {/* Push Notification Button */}
          <button
            onClick={subscribeToPush}
            className="text-xs font-medium bg-[#D97757]/10 hover:bg-[#D97757]/20 text-[#D97757] px-2.5 py-1 rounded-full transition flex items-center gap-1 cursor-pointer"
            title="Enable Push Reminders"
          >
            <span>🔔</span>
            <span className="hidden sm:inline">Reminders</span>
          </button>

          {/* Streak Counter */}
          <span className="text-xs font-medium bg-[#D97757]/10 text-[#D97757] px-2.5 py-1 rounded-full whitespace-nowrap">
            🔥 {user.streakCount}
          </span>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="text-xs sm:text-sm text-[#787570] hover:text-[#1C1C1A] transition cursor-pointer"
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
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-[#787570] animate-pulse">Curating your 5 unique words for today...</p>
          </div>
        ) : words.length === 0 ? (
          <div className="bg-white border border-[#E5E2DC] rounded-xl p-8 text-center flex flex-col items-center gap-3">
            <p className="text-lg font-serif">No words available right now.</p>
            <p className="text-sm text-[#787570]">Check your connection or try refreshing your session.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-[#D97757] text-white text-sm rounded-lg font-medium hover:opacity-95 transition cursor-pointer"
            >
              Refresh App
            </button>
          </div>
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
                          0{index + 1} / 0{words.length}
                        </span>
                        <span className="text-xs bg-[#F7F5F0] text-[#787570] px-2 py-0.5 rounded border border-[#E5E2DC]">
                          {item.level}
                        </span>
                      </div>
                      <h3 className="text-2xl font-serif font-bold mt-1">{item.word}</h3>

                      <p className="text-sm italic text-[#787570]">
                        {item.partOfSpeech} {item.phonetic ? `• ${item.phonetic}` : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => playAudio(item.word)}
                      className="p-3 bg-[#F7F5F0] hover:bg-[#D97757]/10 text-[#1C1C1A] hover:text-[#D97757] rounded-full transition border border-[#E5E2DC] cursor-pointer"
                      title="Listen to pronunciation"
                    >
                      🔊
                    </button>
                  </div>

                  <div className="border-t border-[#E5E2DC] pt-3 text-sm">
                    <p className="font-medium text-[#1C1C1A] mb-1">Definition:</p>
                    <p className="text-[#4A4741] mb-3">{item.definition}</p>

                    <p className="font-medium text-[#1C1C1A] mb-1">Reference Example:</p>
                    <p className="text-[#787570] italic">"{item.example}"</p>
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
                        className={`px-4 py-2 text-sm rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${isSuccess ? 'bg-green-600 text-white cursor-default' : 'bg-[#1C1C1A] text-white hover:bg-[#D97757]'
                          }`}
                      >
                        {isSuccess ? 'Mastered' : 'Submit'}
                      </button>
                    </div>

                    {wordFeedback.error && <p className="text-xs text-red-600 mt-1">{wordFeedback.error}</p>}
                    {wordFeedback.success && <p className="text-xs text-green-700 font-medium mt-1">{wordFeedback.success}</p>}
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