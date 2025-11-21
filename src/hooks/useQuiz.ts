import { useState, useCallback } from 'react';
import type { QuizQuestion, QuizResult, QuizCategory } from '@/types';
import { generateQuiz } from '@/utils/quizGenerator';

export function useQuiz() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: string; answer: number; isCorrect: boolean }>>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const startQuiz = useCallback((category: QuizCategory, questionCount: number = 5) => {
    const newQuestions = generateQuiz(category, questionCount);
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setIsFinished(false);
    setShowResult(false);
  }, []);

  const selectAnswer = useCallback((answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  }, []);

  const submitAnswer = useCallback(() => {
    if (selectedAnswer === null) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    setAnswers(prev => [
      ...prev,
      {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        isCorrect,
      },
    ]);

    setShowResult(true);
  }, [selectedAnswer, currentQuestionIndex, questions]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsFinished(true);
    }
  }, [currentQuestionIndex, questions.length]);

  const getResult = useCallback((): QuizResult | null => {
    if (!isFinished) return null;

    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const incorrectAnswers = answers.length - correctAnswers;
    const percentage = Math.round((correctAnswers / answers.length) * 100);

    return {
      score: correctAnswers,
      totalQuestions: questions.length,
      correctAnswers,
      incorrectAnswers,
      percentage,
    };
  }, [isFinished, answers, questions.length]);

  const reset = useCallback(() => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setIsFinished(false);
    setShowResult(false);
  }, []);

  return {
    questions,
    currentQuestion: questions[currentQuestionIndex],
    currentQuestionIndex,
    totalQuestions: questions.length,
    selectedAnswer,
    answers,
    isFinished,
    showResult,
    startQuiz,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    getResult,
    reset,
  };
}

