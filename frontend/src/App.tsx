import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import type { IWord, UserSession } from './types';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('words_token'));
  const [user, setUser] = useState<UserSession | null>(
    localStorage.getItem('words_user') ? JSON.parse(localStorage.getItem('words_user')!) : null
  );

  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  // Helper utility to convert VAPID public key for browser subscription
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push messaging is not supported by your browser.');
      return;
    }

    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!publicVapidKey) {
      alert('Error: VITE_VAPID_PUBLIC_KEY is missing.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Permission for notifications was denied.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:6530';
      const res = await fetch(`${BACKEND_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, subscription }),
      });

      if (!res.ok) throw new Error('Failed to save subscription on server');
      alert('🔔 Successfully subscribed to daily push reminders!');
    } catch (err) {
      console.error('Push subscription error:', err);
      alert(`Failed to subscribe: ${(err as Error).message}`);
    }
  };

  const fetchDailyProgress = async (userId: string) => {
    setLoadingWords(true);
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:6530';
      const res = await fetch(`${BACKEND_URL}/api/progress/${userId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch progress');

      setWords(data.wordsAssigned || []);
      setDailyCompleted(data.completed || false);
    } catch (err) {
      console.error('Failed to load words:', err);
      setWords([]);
    } finally {
      setLoadingWords(false);
    }
  };

  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (!navigator.onLine || !user) return;

      const queueStr = localStorage.getItem('words_offline_queue');
      if (!queueStr) return;

      const queue: Array<{ item: IWord; wordId: string; sentence: string }> = JSON.parse(queueStr);
      if (queue.length === 0) return;

      const remainingQueue = [];

      for (const q of queue) {
        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/api/ai/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              word: q.item.word,
              sentence: q.sentence,
              userId: user.id,
              wordId: q.wordId,
            }),
          });

          const data = await res.json();
          if (res.ok && data.passed) {
            setprevFeedback(q.wordId, { success: `✨ ${data.feedback} (Synced offline)` });
            if (data.sessionCompleted) {
              setDailyCompleted(true);
            }
          } else {
            remainingQueue.push(q);
          }
        } catch {
          remainingQueue.push(q);
        }
      }

      localStorage.setItem('words_offline_queue', JSON.stringify(remainingQueue));
    };

    const setprevFeedback = (wordId: string, val: { success?: string; error?: string }) => {
      setFeedback((prev) => ({ ...prev, [wordId]: val }));
    };

    window.addEventListener('online', syncOfflineQueue);

    if (navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', syncOfflineQueue);
    };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true); // Turn on loading spinner
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          preferredLevel: isRegistering ? registerLevel : undefined,
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
    } finally {
      setIsLoading(false); // Turn off loading spinner whether it succeeded or failed
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('words_token');
    localStorage.removeItem('words_user');
    setToken(null);
    setUser(null);
    setWords([]);
  };

  const playAudio = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis is not supported in this browser.');
    }
  };

  const handleSentenceSubmit = async (e: React.FormEvent, item: IWord, wordId: string) => {
    e.preventDefault();
    const userSentence = sentences[wordId] || '';

    if (!userSentence.trim()) {
      setFeedback({
        ...feedback,
        [wordId]: { error: 'Please write a sentence before submitting.' },
      });
      return;
    }

    if (!navigator.onLine) {
      const existingQueue = JSON.parse(localStorage.getItem('words_offline_queue') || '[]');
      existingQueue.push({ item, wordId, sentence: userSentence });
      localStorage.setItem('words_offline_queue', JSON.stringify(existingQueue));

      setFeedback({
        ...feedback,
        [wordId]: { success: '📶 Offline: Sentence queued. Will sync automatically when reconnected.' },
      });
      return;
    }

    setFeedback({
      ...feedback,
      [wordId]: { success: 'Evaluating with AI...' },
    });

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/api/ai/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: item.word,
          sentence: userSentence,
          userId: user?.id || '',
          wordId: item._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI validation failed');

      if (data.passed) {
        setFeedback((prev) => ({
          ...prev,
          [wordId]: { success: `✨ ${data.feedback}` },
        }));

        if (data.sessionCompleted && user) {
          const updatedUser = {
            ...user,
            streakCount: data.streakUpdated ? data.newStreakCount : user.streakCount,
          };
          setUser(updatedUser);
          localStorage.setItem('words_user', JSON.stringify(updatedUser));
          setDailyCompleted(true);
        }
      } else {
        setFeedback((prev) => ({
          ...prev,
          [wordId]: { error: `❌ ${data.feedback}` },
        }));
      }
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [wordId]: { error: (err as Error).message },
      }));
    }
  };


  
  if (token && user && loadingWords && words.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] text-[#1C1C1A] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-serif tracking-wide font-bold">words</h1>
          <div className="w-6 h-6 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[#787570] animate-pulse">Preparing your custom daily vocabulary...</p>
        </div>
        <Analytics /> {/* 👈 Track loading screen */}
      </div>
    );
  }

  // 2. Render Dashboard once authenticated and loaded
  if (token && user) {
    return (
      <>
        <Dashboard
          user={user}
          setUser={setUser}
          words={words}
          loadingWords={loadingWords}
          dailyCompleted={dailyCompleted}
          sentences={sentences}
          setSentences={setSentences}
          feedback={feedback}
          handleLogout={handleLogout}
          subscribeToPush={subscribeToPush}
          playAudio={playAudio}
          handleSentenceSubmit={handleSentenceSubmit}
        />
        <Analytics /> {/* 👈 Track dashboard views */}
      </>
    );
  }

  return (
    <>
      <AuthScreen
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        registerLevel={registerLevel}
        setRegisterLevel={setRegisterLevel}
        error={error}
        isLoading={isLoading}
        handleAuth={handleAuth}
      />
      <Analytics />
    </>
  );
}