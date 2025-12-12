import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { QuizForm } from '@/components/quiz/QuizForm';
import { QuestionEditor } from '@/components/quiz/QuestionEditor';
import { useQuiz } from '@/hooks/useQuiz';
import { ArrowLeft, Save, Eye, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Question = {
  id?: number;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer: any;
  points: number;
  order: number;
  hint?: string;
  explanation?: string;
};

export default function QuizBuilder() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/quizzes/:id/edit');
  const isEditing = !!params?.id;
  const quizId = params?.id ? parseInt(params.id) : undefined;

  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    category: 'general',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    timeLimit: null as number | null,
    passingScore: 70,
    attemptsAllowed: null as number | null,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { getQuiz, createQuiz, updateQuiz, addQuestion, updateQuestion, deleteQuestion } = useQuiz();

  // Load existing quiz if editing
  const { data: existingQuiz, isLoading } = isEditing && quizId
    ? getQuiz({ id: quizId })
    : { data: null, isLoading: false };

  useEffect(() => {
    if (existingQuiz) {
      setQuizData({
        title: existingQuiz.title,
        description: existingQuiz.description || '',
        category: existingQuiz.category || 'general',
        difficulty: (existingQuiz.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
        timeLimit: existingQuiz.timeLimit,
        passingScore: existingQuiz.passingScore || 70,
        attemptsAllowed: existingQuiz.attemptsAllowed,
      });

      if (existingQuiz.questions) {
        const loadedQuestions = existingQuiz.questions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          correctAnswer: typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer,
          points: q.points,
          order: q.order,
          hint: q.hint,
          explanation: q.explanation,
        }));
        setQuestions(loadedQuestions);
      }
    }
  }, [existingQuiz]);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      questionText: '',
      questionType: 'multiple_choice',
      options: ['', ''],
      correctAnswer: '',
      points: 1,
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleQuestionChange = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...updatedQuestion, order: index };
    setQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Update order for remaining questions
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, order: i }));
    setQuestions(reorderedQuestions);
  };

  const validateQuiz = () => {
    if (!quizData.title || quizData.title.length < 3) {
      toast.error('Quiz title must be at least 3 characters');
      return false;
    }

    if (questions.length === 0) {
      toast.error('Add at least one question to save the quiz');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || q.questionText.length < 10) {
        toast.error(`Question ${i + 1}: Question text must be at least 10 characters`);
        return false;
      }

      if (q.questionType === 'multiple_choice') {
        if (!q.options || q.options.length < 2) {
          toast.error(`Question ${i + 1}: Add at least 2 options`);
          return false;
        }
        if (q.options.some(opt => !opt.trim())) {
          toast.error(`Question ${i + 1}: All options must have text`);
          return false;
        }
        if (!q.correctAnswer) {
          toast.error(`Question ${i + 1}: Select the correct answer`);
          return false;
        }
      }

      if (q.questionType === 'short_answer' && !q.correctAnswer) {
        toast.error(`Question ${i + 1}: Provide the correct answer`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async (publish: boolean) => {
    if (!validateQuiz()) return;

    setIsSaving(true);
    try {
      let savedQuizId = quizId;

      // Create or update quiz
      if (isEditing && quizId) {
        await updateQuiz.mutateAsync({
          id: quizId,
          ...quizData,
          isPublished: publish,
        });
        toast.success('Quiz updated successfully');
      } else {
        const result = await createQuiz.mutateAsync({
          ...quizData,
          isPublished: publish,
        });
        savedQuizId = result.quiz.id;
        toast.success('Quiz created successfully');
      }

      // Save questions
      if (savedQuizId) {
        for (const question of questions) {
          if (question.id) {
            // Update existing question
            await updateQuestion.mutateAsync({
              id: question.id,
              questionText: question.questionText,
              questionType: question.questionType,
              options: question.options,
              correctAnswer: question.correctAnswer,
              points: question.points,
              order: question.order,
              hint: question.hint,
              explanation: question.explanation,
            });
          } else {
            // Add new question
            await addQuestion.mutateAsync({
              quizId: savedQuizId,
              questionText: question.questionText,
              questionType: question.questionType,
              options: question.options,
              correctAnswer: question.correctAnswer,
              points: question.points,
              order: question.order,
              hint: question.hint,
              explanation: question.explanation,
            });
          }
        }
      }

      setTimeout(() => {
        setLocation('/quizzes');
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    setLocation('/quizzes');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-4 px-4 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {isEditing ? 'Edit Quiz' : 'Create Quiz'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditing ? 'Update quiz details and questions' : 'Build a new knowledge assessment'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
          </div>
        </div>
      </header>

      {!isPreviewMode && (
        <>
          <div data-tour="quiz-form">
            <QuizForm quiz={quizData} onChange={setQuizData} />
          </div>

          <div className="space-y-4" data-tour="quiz-questions">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Questions</h2>
              <Button onClick={handleAddQuestion} variant="outline">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first question to get started
                </p>
                <Button onClick={handleAddQuestion}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Question
                </Button>
              </div>
            )}

            {questions.map((question, index) => (
              <QuestionEditor
                key={index}
                question={question}
                onChange={(updated) => handleQuestionChange(index, updated)}
                onDelete={() => handleDeleteQuestion(index)}
                index={index}
              />
            ))}
          </div>

          <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t -mx-4 px-4 py-4 mt-auto" data-tour="quiz-publish-actions">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Draft
                </Button>
                <Button onClick={() => handleSave(true)} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  Publish Quiz
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {isPreviewMode && (
        <div className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-2">{quizData.title || 'Untitled Quiz'}</h2>
            <p className="text-muted-foreground">{quizData.description || 'No description'}</p>
            <div className="flex gap-2 mt-4">
              <span className="text-sm px-2 py-1 bg-background rounded">
                {quizData.category}
              </span>
              <span className="text-sm px-2 py-1 bg-background rounded">
                {quizData.difficulty}
              </span>
              {quizData.timeLimit && (
                <span className="text-sm px-2 py-1 bg-background rounded">
                  {quizData.timeLimit} min
                </span>
              )}
            </div>
          </div>

          {questions.map((question, index) => (
            <div key={index} className="bg-card rounded-lg border p-6">
              <h3 className="font-semibold mb-3">
                Question {index + 1} ({question.points} {question.points === 1 ? 'point' : 'points'})
              </h3>
              <p className="mb-4">{question.questionText}</p>
              {question.questionType === 'multiple_choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}
              {question.hint && (
                <p className="text-sm text-muted-foreground italic mt-3">
                  Hint: {question.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes will be lost. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
