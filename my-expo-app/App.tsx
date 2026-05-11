import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
}from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Polyline } from 'react-native-svg';
import axios from 'axios';
import { cssInterop } from 'nativewind';
import './global.css';

cssInterop(LinearGradient, { className: 'style' });
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

// ─── TYPES ────────────────────────────────────────────────────────────────────
type FlashCard = { question: string; answer: string };
type CardResult = {
  card: FlashCard;
  userAnswer: string;
  feedback: string | null;
  isLoading: boolean;
};

// ─── BASE URL ─────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:8081';

// ─── API HELPERS ──────────────────────────────────────────────────────────────


const fetchQuestions = async (subject: string): Promise<FlashCard[]> => {
  const response = await axios.get(`${BASE_URL}/mini-games/subject`, {
    params: { subject },
  });

  return response.data.questions ?? response.data;
};

const gradeAnswer = async (question: string, answer: string, subject: string): Promise<string> => {
  const response = await axios.post(`${BASE_URL}/mini-games/grade`, {
    subject,
    question,
    answer,
  });
  return response.data.feedback ?? response.data;
};

const sendTutorMessage = async (message: string): Promise<string> => {
  const response = await axios.post(`${BASE_URL}/tutor/chat`, { message });
  return response.data.reply ?? response.data;
};

// ─── SUBJECT COLOR THEMES ─────────────────────────────────────────────────────
const SUBJECT_COLORS: Record<
  string,
  { accent: string; light: [string, string]; dark: [string, string] }
> = {
  English: { accent: '#ec4899', light: ['#fdf2f8', '#fbcfe8'], dark: ['#1e1b4b', '#312e81'] },
  Math: { accent: '#6366f1', light: ['#eef2ff', '#c7d2fe'], dark: ['#1e1b4b', '#0f172a'] },
  Science: { accent: '#22c55e', light: ['#f0fdf4', '#bbf7d0'], dark: ['#052e16', '#14532d'] },
};

// ─── FLASHCARD GAME ───────────────────────────────────────────────────────────
function FlashcardGame({
  subject,
  isLight,
  textColor,
  subText,
  onBack,
  onSessionComplete,
}: {
  subject: string;
  isLight: boolean;
  textColor: string;
  subText: string;
  onBack: () => void;
  onSessionComplete: (results: CardResult[]) => void;
}) {
  const [deck, setDeck] = React.useState<FlashCard[]>([]);
  const [isDeckLoading, setIsDeckLoading] = React.useState(true);
  const [cardIndex, setCardIndex] = React.useState(0);
  const [userAnswer, setUserAnswer] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = React.useState(false);
  const [results, setResults] = React.useState<CardResult[]>([]);
  const [done, setDone] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // ── Fetch questions from backend on mount ──
  React.useEffect(() => {
    setIsDeckLoading(true);
    setFetchError(null);
    fetchQuestions(subject)
      .then((questions) => setDeck(questions))
      .catch((err) => {
        console.error('Failed to fetch questions:', err);
        setFetchError('Could not load questions. Check your connection.');
      })
      .finally(() => setIsDeckLoading(false));
  }, [subject]);

  const colors = SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.English;
  const gradColors = isLight ? colors.light : colors.dark;
  const card = deck[cardIndex];
  const total = deck.length;

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !card) return;

    setSubmitted(true);
    setIsFeedbackLoading(true);
    setFeedback(null);

    try {
      // Send answer to backend
      const response = await axios.post(`${BASE_URL}/mini-games/submit-answer`, {
        subject,
        question: card.question,
        answer: userAnswer,
      });

      // Optional AI feedback returned from backend
      const backendFeedback = response.data.feedback || 'Answer submitted successfully!';

      setFeedback(backendFeedback);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setFeedback('Could not connect to backend.');
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const handleNext = () => {
    const result: CardResult = { card, userAnswer, feedback, isLoading: false };
    const newResults = [...results, result];
    setResults(newResults);
    if (cardIndex + 1 >= total) {
      onSessionComplete(newResults);
      setDone(true);
    } else {
      setCardIndex((i) => i + 1);
      setUserAnswer('');
      setSubmitted(false);
      setFeedback(null);
      setIsFeedbackLoading(false);
      setShowHint(false);
    }
  };

  // ── Loading state ──
  if (isDeckLoading) {
    return (
      <View className="px-1 pb-10" style={{ alignItems: 'center', paddingTop: 48 }}>
        <Pressable
          onPress={onBack}
          style={{ alignSelf: 'flex-start', marginBottom: 32 }}
          className="active:opacity-60">
          <Text className={`${subText} text-base font-bold`}>← Back</Text>
        </Pressable>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text className={`${textColor} mt-5 text-lg font-black`}>Generating Questions...</Text>
        <Text className={`${subText} mt-2 text-center text-sm`}>
          AI is crafting your personalised{'\n'}
          {subject} questions.
        </Text>
      </View>
    );
  }

  // ── Error state ──
  if (fetchError) {
    return (
      <View className="px-1 pb-10">
        <Pressable onPress={onBack} style={{ marginBottom: 24 }} className="active:opacity-60">
          <Text className={`${subText} text-base font-bold`}>← Back</Text>
        </Pressable>
        <LinearGradient
          colors={gradColors}
          style={{ borderRadius: 36, padding: 36, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>⚠️</Text>
          <Text className={`${textColor} text-center text-xl font-black`}>
            Something went wrong
          </Text>
          <Text className={`${subText} mt-3 text-center text-sm leading-relaxed`}>
            {fetchError}
          </Text>
        </LinearGradient>
        <Pressable
          onPress={() => {
            setFetchError(null);
            setIsDeckLoading(true);
            fetchQuestions(subject)
              .then(setDeck)
              .catch(() => setFetchError('Could not load questions. Check your connection.'))
              .finally(() => setIsDeckLoading(false));
          }}
          style={{
            borderRadius: 999,
            paddingVertical: 18,
            alignItems: 'center',
            backgroundColor: colors.accent,
            marginBottom: 12,
          }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Try Again</Text>
        </Pressable>
        <Pressable
          onPress={onBack}
          style={{
            borderRadius: 999,
            paddingVertical: 18,
            alignItems: 'center',
            backgroundColor: isLight ? '#f4f4f5' : '#27272a',
          }}>
          <Text className={`${textColor} text-sm font-black`}>← Choose Another Subject</Text>
        </Pressable>
      </View>
    );
  }

  // ── Empty deck ──
  if (total === 0) {
    return (
      <View className="px-1 pb-10">
        <Pressable onPress={onBack} style={{ marginBottom: 24 }} className="active:opacity-60">
          <Text className={`${subText} text-base font-bold`}>← Back</Text>
        </Pressable>
        <LinearGradient
          colors={gradColors}
          style={{ borderRadius: 36, padding: 36, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🤖</Text>
          <Text className={`${textColor} text-center text-xl font-black`}>
            Questions Coming Soon
          </Text>
          <Text className={`${subText} mt-3 text-center text-sm leading-relaxed`}>
            AI-generated {subject} questions will{'\n'}appear here once the backend is connected.
          </Text>
          <View
            style={{
              marginTop: 20,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: 'rgba(0,0,0,0.08)',
            }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: colors.accent,
                textAlign: 'center',
              }}>
              Backend: POST /mini-games/subject
            </Text>
          </View>
        </LinearGradient>
        <Pressable
          onPress={onBack}
          style={{
            borderRadius: 999,
            paddingVertical: 18,
            alignItems: 'center',
            backgroundColor: colors.accent,
          }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
            ← Choose Another Subject
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Done screen ──
  if (done) {
    return (
      <View className="px-1 pb-10">
        <LinearGradient
          colors={gradColors}
          style={{ borderRadius: 36, padding: 32, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text className={`${textColor} mt-3 text-2xl font-black`}>Session Complete!</Text>
          <Text className={`${subText} mt-1 text-center text-sm`}>
            Your answers have been submitted.{'\n'}Check the Analysis tab for your reflection.
          </Text>
        </LinearGradient>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => {
              setCardIndex(0);
              setResults([]);
              setDone(false);
              setUserAnswer('');
              setSubmitted(false);
              setFeedback(null);
              setShowHint(false);
            }}
            style={{
              flex: 1,
              borderRadius: 999,
              paddingVertical: 18,
              alignItems: 'center',
              backgroundColor: colors.accent,
            }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Play Again</Text>
          </Pressable>
          <Pressable
            onPress={onBack}
            className={`flex-1 items-center rounded-full py-[18px] ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
            <Text className={`${textColor} text-sm font-black`}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Active game ──
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}>
      <View className="px-1 pb-6" style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
          <Pressable onPress={onBack} className="active:opacity-60">
            <Text className={`${subText} text-base font-bold`}>← Back</Text>
          </Pressable>
          <Text className={`${subText} text-sm font-bold`}>
            {cardIndex + 1} / {total}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            backgroundColor: isLight ? '#e4e4e7' : '#27272a',
            borderRadius: 999,
            marginBottom: 20,
            overflow: 'hidden',
          }}>
          <View
            style={{
              height: '100%',
              width: `${(cardIndex / total) * 100}%`,
              backgroundColor: colors.accent,
              borderRadius: 999,
            }}
          />
        </View>

        {/* Question card */}
        <LinearGradient
          colors={gradColors}
          style={{ borderRadius: 32, padding: 28, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: 'rgba(0,0,0,0.08)',
              }}>
              <Text
                style={{
                  color: colors.accent,
                  fontWeight: '800',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                Question {cardIndex + 1}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowHint(!showHint)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: 'rgba(0,0,0,0.06)',
              }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>
                {showHint ? 'Hide Hint' : '💡 Hint'}
              </Text>
            </Pressable>
          </View>
          {/* Question text — comes from backend */}
          <Text
            className={`${textColor}`}
            style={{ fontSize: 18, fontWeight: '800', lineHeight: 26 }}>
            {card.question}
          </Text>
          {showHint && card.answer ? (
            <Text
              style={{
                marginTop: 12,
                fontSize: 13,
                color: colors.accent,
                fontStyle: 'italic',
                opacity: 0.8,
              }}>
              {card.answer}
            </Text>
          ) : showHint ? (
            <Text
              style={{
                marginTop: 12,
                fontSize: 13,
                color: colors.accent,
                fontStyle: 'italic',
                opacity: 0.5,
              }}>
              No hint available for this question.
            </Text>
          ) : null}
        </LinearGradient>

        {/* Answer input */}
        {!submitted ? (
          <>
            <View className={`mb-4 rounded-[28px] p-4 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
              <TextInput
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="Type your answer here..."
                placeholderTextColor={isLight ? '#a1a1aa' : '#52525b'}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className={`${textColor} text-base font-medium`}
                style={{ minHeight: 100 }}
              />
            </View>
            <Pressable
              onPress={handleSubmit}
              style={{
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: 'center',
                backgroundColor: userAnswer.trim()
                  ? colors.accent
                  : isLight
                    ? '#e4e4e7'
                    : '#27272a',
              }}>
              <Text
                style={{
                  color: userAnswer.trim() ? '#fff' : isLight ? '#a1a1aa' : '#52525b',
                  fontWeight: '900',
                  fontSize: 15,
                }}>
                {isFeedbackLoading ? 'Submitting...' : 'Submit Answer'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Submitted answer display */}
            <View className={`mb-3 rounded-[28px] p-4 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
              <Text className={`${subText} mb-2 text-[10px] font-bold uppercase tracking-widest`}>
                Your Answer
              </Text>
              <Text className={`${textColor} text-sm font-medium leading-relaxed`}>
                {userAnswer}
              </Text>
            </View>

            {/* AI Feedback — from backend */}
            <View
              style={{
                borderRadius: 28,
                padding: 16,
                marginBottom: 16,
                backgroundColor: isLight ? '#f0fdf4' : '#052e16',
                borderWidth: 1,
                borderColor: isLight ? '#bbf7d0' : '#14532d',
              }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#22c55e',
                  marginBottom: 8,
                }}>
                AI Reflection
              </Text>
              {isFeedbackLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#22c55e" />
                  <Text style={{ color: '#22c55e', fontSize: 13, fontStyle: 'italic' }}>
                    Analyzing your answer...
                  </Text>
                </View>
              ) : feedback ? (
                <Text
                  style={{ color: isLight ? '#14532d' : '#bbf7d0', fontSize: 14, lineHeight: 22 }}>
                  {feedback}
                </Text>
              ) : (
                <Text
                  style={{
                    color: isLight ? '#166534' : '#86efac',
                    fontSize: 13,
                    fontStyle: 'italic',
                    opacity: 0.6,
                  }}>
                  Feedback will appear here once the backend is connected.
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleNext}
              style={{
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: 'center',
                backgroundColor: colors.accent,
              }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
                {cardIndex + 1 >= total ? 'Finish Session →' : 'Next Card →'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showMasteryDetails, setShowMasteryDetails] = React.useState(false);
  const [graphType, setGraphType] = React.useState<'bar' | 'line'>('bar');
  const [theme, setTheme] = React.useState('light');
  const [activeTab, setActiveTab] = React.useState('Dashboard');
  const [isLoading, setIsLoading] = React.useState(false);

  // AI Tutor state
  const [tutorInput, setTutorInput] = React.useState('');
  const [tutorMessages, setTutorMessages] = React.useState<{ role: 'user' | 'ai'; text: string }[]>(
    [{ role: 'ai', text: "Hey! I'm your AI Tutor 🎓 Ask me anything about your subjects." }]
  );
  const [isTutorLoading, setIsTutorLoading] = React.useState(false);

  // Skill Games state
  const [activeGame, setActiveGame] = React.useState<string | null>(null);

  // Session history for Analysis reflections — backend will populate feedback
  const [sessionHistory, setSessionHistory] = React.useState<
    { subject: string; results: CardResult[]; date: string }[]
  >([]);

  const isLight = theme === 'light';
  const textColor = isLight ? 'text-black' : 'text-white';
  const subText = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const currentGradient = isLight ? ['#ffffff', '#fce7f3'] : ['#17153b', '#000000'];

  // Empty data for backend
  const [graphData] = React.useState([]);
  const [stats] = React.useState({ failures: 0, hints: 0 });
  const [masteryPercent] = React.useState(0);

  const handlePageSwitch = (tab: string) => {
    setIsOpen(false);
    setShowMasteryDetails(false);
    setActiveGame(null);
    setIsLoading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsLoading(false);
    }, 1000);
  };

  const handleSendTutor = async () => {
    if (!tutorInput.trim() || isTutorLoading) return;
    const userMsg = tutorInput.trim();
    setTutorMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setTutorInput('');
    setIsTutorLoading(true);

    try {
      const reply = await sendTutorMessage(userMsg);
      setTutorMessages((prev) => [...prev, { role: 'ai', text: reply }]);
    } catch (err) {
      console.error('Tutor API error:', err);
      setTutorMessages((prev) => [
        ...prev,
        { role: 'ai', text: "Sorry, I couldn't reach the backend right now. Please try again! 🔄" },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleSessionComplete = (subject: string, results: CardResult[]) => {
    const entry = { subject, results, date: new Date().toLocaleDateString() };
    setSessionHistory((prev) => [entry, ...prev]);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView className={`flex-1 ${isLight ? 'bg-white' : 'bg-zinc-950'}`}>
        <LinearGradient
          colors={currentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-1 p-4">
          {/* HEADER */}
          <View className="flex flex-row items-center justify-between px-3">
            <Text className={`text-3xl font-extrabold tracking-tighter ${textColor}`}>Logo</Text>
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => setTheme(isLight ? 'dark' : 'light')}
                className="transition-all duration-300 active:rotate-12 active:scale-125">
                <Text className="text-3xl">{isLight ? '🌙' : '☀️'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsOpen(!isOpen)}
                className="transition-all duration-200 active:scale-90">
                <Text className={`text-4xl ${textColor}`}>{isOpen ? '✕' : '='}</Text>
              </Pressable>
            </View>
          </View>

          {/* MENU */}
          {isOpen && (
            <View
              className={`mt-4 w-full rounded-3xl p-2 ${isLight ? 'bg-black/5' : 'bg-white/10'}`}>
              {['Dashboard', 'Analysis', 'AI Tutor', 'Skill Games', 'Progress'].map((item) => (
                <Pressable
                  key={item}
                  onPress={() => handlePageSwitch(item)}
                  className={`w-full rounded-2xl py-4 transition-colors active:bg-pink-500/20 ${activeTab === item ? 'bg-pink-500/10' : ''}`}>
                  <Text className={`text-center text-xl font-bold ${textColor}`}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={isLight ? '#ec4899' : '#6366f1'} />
            </View>
          ) : (
            <ScrollView
              className="mt-8 flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <View className="mb-8 px-3">
                <Text className={`${textColor} text-5xl font-black tracking-tighter`}>
                  {activeTab}
                </Text>
                <Text className={`${subText} text-lg`}>
                  {activeTab === 'Skill Games'
                    ? activeGame
                      ? `${activeGame} · Open Answer`
                      : 'Subject Mastery Challenges'
                    : activeTab === 'Analysis'
                      ? 'Performance Breakdown'
                      : activeTab === 'AI Tutor'
                        ? 'Your Personal Study Assistant'
                        : activeTab === 'Progress'
                          ? 'Your Learning Journey'
                          : 'System Analytics'}
                </Text>
              </View>

              {/* SKILL GAMES PAGE */}
              {activeTab === 'Skill Games' ? (
                activeGame ? (
                  <FlashcardGame
                    subject={activeGame}
                    isLight={isLight}
                    textColor={textColor}
                    subText={subText}
                    onBack={() => setActiveGame(null)}
                    onSessionComplete={(results) => handleSessionComplete(activeGame, results)}
                  />
                ) : (
                  <View className="gap-4 px-1">
                    {/* Game mode label */}
                    <View
                      className={`mb-2 rounded-[28px] p-5 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                      <Text style={{ fontSize: 28 }}>✍️</Text>
                      <Text className={`${textColor} mt-2 text-lg font-black`}>
                        Open Answer Cards
                      </Text>
                      <Text className={`${subText} mt-1 text-sm font-medium`}>
                        Answer AI-generated questions in your own words. Get personalised feedback
                        saved to your Analysis tab.
                      </Text>
                    </View>
                    {[
                      { title: 'English', icon: '✍️', desc: 'Grammar & Vocab', color: '#ec4899' },
                      { title: 'Math', icon: '🔢', desc: 'Logic & Equations', color: '#6366f1' },
                      {
                        title: 'Science',
                        icon: '🧪',
                        desc: 'Experiments & Facts',
                        color: '#22c55e',
                      },
                    ].map((subject) => (
                      <Pressable
                        key={subject.title}
                        onPress={() => setActiveGame(subject.title)}
                        className={`flex-row items-center rounded-[35px] p-6 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900 shadow-xl'}`}>
                        <Text className="mr-4 text-4xl">{subject.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text className={`${textColor} text-2xl font-black`}>
                            {subject.title}
                          </Text>
                          <Text className={`${subText} text-sm font-medium`}>{subject.desc}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View
                            style={{
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              backgroundColor: subject.color + '22',
                            }}>
                            <Text style={{ color: subject.color, fontWeight: '800', fontSize: 11 }}>
                              AI Generated
                            </Text>
                          </View>
                          <Text style={{ color: subject.color, fontSize: 18 }}>→</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )
              ) : activeTab === 'Analysis' ? (
                /* ANALYSIS PAGE */
                <View className="gap-5 px-1 pb-10">
                  {/* Top Summary Row */}
                  <View className="flex-row gap-4">
                    {[
                      { label: 'Accuracy', val: '—', icon: '🎯', color: 'text-pink-500' },
                      { label: 'Streak', val: '—', icon: '🔥', color: 'text-indigo-500' },
                    ].map((item, i) => (
                      <View
                        key={i}
                        className={`flex-1 rounded-[32px] p-6 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                        <Text className="text-3xl">{item.icon}</Text>
                        <Text
                          className={`${item.color} mt-2 text-[10px] font-bold uppercase tracking-widest`}>
                          {item.label}
                        </Text>
                        <Text className={`${textColor} text-4xl font-black`}>{item.val}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Subject Breakdown */}
                  <View className={`rounded-[35px] p-7 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <Text className={`${textColor} mb-5 text-lg font-black`}>
                      Subject Breakdown
                    </Text>
                    {[
                      { label: 'English', pct: 0, color: 'bg-pink-500' },
                      { label: 'Math', pct: 0, color: 'bg-indigo-500' },
                      { label: 'Science', pct: 0, color: 'bg-violet-500' },
                    ].map((s) => (
                      <View key={s.label} className="mb-4">
                        <View className="mb-1.5 flex-row justify-between">
                          <Text className={`${textColor} text-sm font-bold`}>{s.label}</Text>
                          <Text className={`${subText} text-sm font-bold`}>{s.pct}%</Text>
                        </View>
                        <View
                          className={`h-3 w-full overflow-hidden rounded-full ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`}>
                          <View
                            style={{ width: `${s.pct}%` }}
                            className={`h-full rounded-full ${s.color}`}
                          />
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Weekly Activity */}
                  <View className={`rounded-[35px] p-7 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <Text className={`${textColor} mb-5 text-lg font-black`}>Weekly Activity</Text>
                    <View className="flex-row justify-between gap-2">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                        <View key={i} className="flex-1 items-center gap-2">
                          <View
                            className={`w-full rounded-xl ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`}
                            style={{ height: 60 }}
                          />
                          <Text className={`${subText} text-[10px] font-bold`}>{day}</Text>
                        </View>
                      ))}
                    </View>
                    <Text className={`${subText} mt-4 text-center text-xs italic opacity-50`}>
                      Syncing activity data...
                    </Text>
                  </View>

                  {/* Session Reflections */}
                  <View className={`rounded-[35px] p-7 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <Text className={`${textColor} mb-1 text-lg font-black`}>
                      Session Reflections
                    </Text>
                    <Text className={`${subText} mb-5 text-xs`}>
                      AI feedback from your Skill Games answers
                    </Text>

                    {sessionHistory.length === 0 ? (
                      <View
                        className={`items-center justify-center rounded-2xl border-2 border-dashed p-10 ${isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                        <Text className="mb-2 text-3xl opacity-30">🪞</Text>
                        <Text className={`${subText} text-center text-sm opacity-50`}>
                          Complete a Skill Game session{'\n'}to see your reflections here.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 16 }}>
                        {sessionHistory.map((session, si) => (
                          <View
                            key={si}
                            style={{
                              borderRadius: 24,
                              overflow: 'hidden',
                              borderWidth: 1,
                              borderColor: isLight ? '#e4e4e7' : '#27272a',
                            }}>
                            <View
                              style={{
                                padding: 16,
                                backgroundColor: isLight ? '#fafafa' : '#18181b',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}>
                              <Text className={`${textColor} text-base font-black`}>
                                {session.subject}
                              </Text>
                              <Text className={`${subText} text-xs`}>
                                {session.date} · {session.results.length} questions
                              </Text>
                            </View>
                            {session.results.map((r, ri) => (
                              <View
                                key={ri}
                                style={{
                                  padding: 16,
                                  borderTopWidth: 1,
                                  borderTopColor: isLight ? '#e4e4e7' : '#27272a',
                                }}>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    color: '#6366f1',
                                    marginBottom: 4,
                                  }}>
                                  Q{ri + 1}
                                </Text>
                                <Text className={`${textColor} mb-2 text-sm font-bold`}>
                                  {r.card.question}
                                </Text>
                                <View
                                  style={{
                                    borderRadius: 12,
                                    padding: 10,
                                    backgroundColor: isLight ? '#f4f4f5' : '#27272a',
                                    marginBottom: 8,
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '700',
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                      color: isLight ? '#a1a1aa' : '#52525b',
                                      marginBottom: 4,
                                    }}>
                                    Your Answer
                                  </Text>
                                  <Text className={`${textColor} text-xs leading-relaxed`}>
                                    {r.userAnswer || '—'}
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    borderRadius: 12,
                                    padding: 10,
                                    backgroundColor: isLight ? '#f0fdf4' : '#052e16',
                                    borderWidth: 1,
                                    borderColor: isLight ? '#bbf7d0' : '#14532d',
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '700',
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                      color: '#22c55e',
                                      marginBottom: 4,
                                    }}>
                                    AI Reflection
                                  </Text>
                                  {r.feedback ? (
                                    <Text
                                      style={{
                                        color: isLight ? '#14532d' : '#bbf7d0',
                                        fontSize: 12,
                                        lineHeight: 18,
                                      }}>
                                      {r.feedback}
                                    </Text>
                                  ) : (
                                    <Text
                                      style={{
                                        color: isLight ? '#166534' : '#86efac',
                                        fontSize: 12,
                                        fontStyle: 'italic',
                                        opacity: 0.5,
                                      }}>
                                      Pending backend connection...
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Recent Mistakes */}
                  <View className={`rounded-[35px] p-7 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <Text className={`${textColor} mb-5 text-lg font-black`}>Recent Mistakes</Text>
                    <View
                      className={`items-center justify-center rounded-2xl border-2 border-dashed p-10 ${isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                      <Text className="mb-2 text-3xl opacity-30">🕳️</Text>
                      <Text className={`${subText} text-center text-sm opacity-50`}>
                        No mistakes logged yet.{'\n'}Keep practicing!
                      </Text>
                    </View>
                  </View>
                </View>
              ) : activeTab === 'AI Tutor' ? (
                /* AI TUTOR PAGE */
                <View className="px-1 pb-10">
                  <View className="mb-5">
                    <Text className={`${textColor} mb-3 text-base font-black`}>Quick Topics</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-3 pr-4">
                        {['Fractions', 'Photosynthesis', 'Grammar', 'Algebra', 'Atoms'].map((t) => (
                          <Pressable
                            key={t}
                            onPress={() => setTutorInput(t)}
                            className={`rounded-full px-5 py-2.5 active:opacity-60 ${isLight ? 'bg-pink-100' : 'bg-pink-500/20'}`}>
                            <Text className="text-sm font-bold text-pink-500">{t}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                  <View className="mb-4 gap-3">
                    {tutorMessages.map((msg, i) => (
                      <View
                        key={i}
                        className={`max-w-[85%] rounded-[28px] px-5 py-4 ${msg.role === 'ai' ? (isLight ? 'self-start bg-zinc-100' : 'self-start bg-zinc-900') : 'self-end bg-pink-500'}`}>
                        <Text
                          className={`text-sm font-medium leading-relaxed ${msg.role === 'ai' ? textColor : 'text-white'}`}>
                          {msg.text}
                        </Text>
                      </View>
                    ))}
                    {isTutorLoading && (
                      <View
                        className={`max-w-[85%] self-start rounded-[28px] px-5 py-4 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                        <ActivityIndicator size="small" color={isLight ? '#ec4899' : '#6366f1'} />
                      </View>
                    )}
                  </View>
                  <View
                    className={`flex-row items-center gap-3 rounded-[35px] p-3 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <TextInput
                      value={tutorInput}
                      onChangeText={setTutorInput}
                      placeholder="Ask your tutor..."
                      placeholderTextColor={isLight ? '#a1a1aa' : '#52525b'}
                      className={`flex-1 px-3 text-base font-medium ${textColor}`}
                      onSubmitEditing={handleSendTutor}
                      returnKeyType="send"
                    />
                    <Pressable
                      onPress={handleSendTutor}
                      className="h-12 w-12 items-center justify-center rounded-full bg-pink-500 active:scale-90">
                      <Text className="text-xl text-white">↑</Text>
                    </Pressable>
                  </View>
                  <Text className={`${subText} mt-3 text-center text-[10px] opacity-40`}>
                    AI responses are powered by the backend tutor engine.
                  </Text>
                </View>
              ) : activeTab === 'Progress' ? (
                /* PROGRESS PAGE */
                <View className="gap-5 px-1 pb-10">
                  <LinearGradient
                    colors={isLight ? ['#fdf2f8', '#fbcfe8'] : ['#1e1b4b', '#312e81']}
                    className="rounded-[40px] p-8 shadow-xl">
                    <Text className={`${textColor} text-base font-bold opacity-70`}>
                      Total XP Earned
                    </Text>
                    <Text className={`${textColor} mt-1 text-7xl font-black`}>0</Text>
                    <View className="mt-5 h-4 w-full overflow-hidden rounded-full bg-black/10">
                      <View style={{ width: '0%' }} className="h-full rounded-full bg-pink-500" />
                    </View>
                    <Text className={`${textColor} mt-2 text-xs opacity-50`}>
                      0 / 500 XP to next level
                    </Text>
                  </LinearGradient>
                  <View className="flex-row gap-4">
                    {[
                      { label: 'Level', val: '1', icon: '⚡' },
                      { label: 'Rank', val: '—', icon: '🏅' },
                    ].map((item, i) => (
                      <View
                        key={i}
                        className={`flex-1 rounded-[32px] p-6 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                        <Text className="text-3xl">{item.icon}</Text>
                        <Text
                          className={`${subText} mt-2 text-[10px] font-bold uppercase tracking-widest`}>
                          {item.label}
                        </Text>
                        <Text className={`${textColor} text-4xl font-black`}>{item.val}</Text>
                      </View>
                    ))}
                  </View>
                  <View className={`rounded-[35px] p-7 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <Text className={`${textColor} mb-5 text-lg font-black`}>Badges</Text>
                    <View className="flex-row flex-wrap gap-3">
                      {[
                        { icon: '🌱', name: 'Beginner', locked: false },
                        { icon: '🔥', name: 'On Fire', locked: true },
                        { icon: '🧠', name: 'Brainiac', locked: true },
                        { icon: '💎', name: 'Diamond', locked: true },
                        { icon: '🚀', name: 'Rockstar', locked: true },
                        { icon: '🏆', name: 'Champion', locked: true },
                      ].map((b) => (
                        <View
                          key={b.name}
                          className={`items-center rounded-[24px] px-4 py-4 ${b.locked ? (isLight ? 'bg-zinc-200 opacity-40' : 'bg-zinc-800 opacity-30') : isLight ? 'bg-pink-100' : 'bg-pink-500/20'}`}
                          style={{ minWidth: 80 }}>
                          <Text className="text-3xl">{b.locked ? '🔒' : b.icon}</Text>
                          <Text className={`${textColor} mt-1 text-[10px] font-bold`}>
                            {b.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View className={`rounded-[35px] p-7 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <Text className={`${textColor} mb-5 text-lg font-black`}>Milestones</Text>
                    {[
                      { label: 'Complete first lesson', done: false },
                      { label: 'Answer 10 questions', done: false },
                      { label: 'Reach 50% mastery', done: false },
                      { label: 'Use AI Tutor 5 times', done: false },
                      { label: 'Hit a 3-day streak', done: false },
                    ].map((m, i) => (
                      <View key={i} className="mb-4 flex-row items-center gap-4">
                        <View
                          className={`h-7 w-7 items-center justify-center rounded-full border-2 ${m.done ? 'border-pink-500 bg-pink-500' : isLight ? 'border-zinc-300' : 'border-zinc-700'}`}>
                          {m.done && <Text className="text-xs text-white">✓</Text>}
                        </View>
                        <Text
                          className={`flex-1 text-sm font-semibold ${m.done ? 'text-pink-500' : textColor} ${m.done ? '' : 'opacity-50'}`}>
                          {m.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View className={`rounded-[35px] p-7 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <Text className={`${textColor} mb-5 text-lg font-black`}>Session History</Text>
                    <View
                      className={`items-center justify-center rounded-2xl border-2 border-dashed p-10 ${isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                      <Text className="mb-2 text-3xl opacity-30">📅</Text>
                      <Text className={`${subText} text-center text-sm opacity-50`}>
                        No sessions recorded yet.{'\n'}Start learning to build history!
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* DASHBOARD (ORIGINAL) */
                <>
                  <View className="overflow-hidden">
                    <LinearGradient
                      colors={isLight ? ['#fdf2f8', '#fbcfe8'] : ['#1e1b4b', '#312e81']}
                      className="mb-4 rounded-[40px] p-8 shadow-xl">
                      <View className="mb-4 flex-row items-center justify-between">
                        <Text className={`${textColor} text-xl font-bold opacity-80`}>
                          Growth Mastery
                        </Text>
                        <View className="flex-row items-center gap-2">
                          {showMasteryDetails && (
                            <Pressable
                              onPress={() => setGraphType(graphType === 'bar' ? 'line' : 'bar')}
                              className="rounded-full border border-white/30 bg-white/20 px-3 py-1 transition-opacity active:opacity-50">
                              <Text className={`${textColor} text-[10px] font-bold uppercase`}>
                                {graphType}
                              </Text>
                            </Pressable>
                          )}
                          <Pressable
                            onPress={() => setShowMasteryDetails(!showMasteryDetails)}
                            className="rounded-full bg-black/5 px-4 py-1.5 transition-colors active:bg-black/20">
                            <Text className={`${textColor} text-xs font-bold`}>
                              {showMasteryDetails ? 'Close' : 'View Logs'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text className={`${textColor} text-7xl font-black`}>{masteryPercent}%</Text>
                      {showMasteryDetails ? (
                        <View className="mt-6 h-40 w-full items-center justify-center rounded-2xl border border-black/5 bg-black/5">
                          <View className="items-center opacity-30">
                            <Text className={`${textColor} mb-1 text-3xl`}>📊</Text>
                            <Text
                              className={`${textColor} text-[10px] uppercase italic tracking-widest`}>
                              Syncing Backend...
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View className="mt-6 h-4 w-full overflow-hidden rounded-full bg-black/5">
                          <View
                            style={{ width: `${masteryPercent}%` }}
                            className="h-full rounded-full bg-pink-500"
                          />
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                  <View className="mb-6 flex-row gap-4">
                    {[
                      { label: 'Failures', val: stats.failures, color: 'text-pink-500' },
                      { label: 'AI Hints', val: stats.hints, color: 'text-indigo-500' },
                    ].map((stat, i) => (
                      <Pressable
                        key={i}
                        className={`flex-1 rounded-[32px] p-7 transition-all active:scale-95 ${isLight ? 'bg-zinc-100' : 'bg-zinc-900 shadow-lg'}`}>
                        <Text
                          className={`text-[10px] font-bold uppercase tracking-widest ${stat.color}`}>
                          {stat.label}
                        </Text>
                        <Text className={`${textColor} mt-1 text-4xl font-black`}>{stat.val}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View className="mb-10 px-1">
                    <Text className={`${textColor} mb-4 text-xl font-bold`}>
                      Live Analytics Stream
                    </Text>
                    <View
                      className={`items-center justify-center rounded-[35px] border-2 border-dashed p-14 ${isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-800 bg-zinc-900/30'}`}>
                      <ActivityIndicator
                        color={isLight ? '#000' : '#fff'}
                        size="small"
                        className="mb-3 opacity-20"
                      />
                      <Text className={`${subText} text-center font-medium opacity-50`}>
                        Establishing Secure Connection...
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </LinearGradient>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

