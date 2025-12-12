import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResultsCard } from '@/components/quiz/ResultsCard';
import { Badge } from '@/components/ui/badge';
import { useQuiz } from '@/hooks/useQuiz';
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function QuizResults() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/quizzes/:id/results/:attemptId');
  const quizId = params?.id ? parseInt(params.id) : undefined;
  const attemptId = params?.attemptId ? parseInt(params.attemptId) : undefined;

  const { getQuiz, getUserAttempts } = useQuiz();

  const { data: quiz } = quizId ? getQuiz({ id: quizId }) : { data: null };
  const { data: attemptsData } = getUserAttempts({ quizId });

  const attempt = attemptsData?.attempts.find(a => a.attempt.id === attemptId)?.attempt;
  const questions = quiz?.questions || [];

  if (!quiz || !attempt) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userAnswers = typeof attempt.answers === 'string'
    ? JSON.parse(attempt.answers)
    : attempt.answers || [];

  const canRetake = quiz.attemptsAllowed
    ? (attemptsData?.attempts.filter(a => a.quiz.id === quizId).length || 0) < quiz.attemptsAllowed
    : true;

  const handleRetake = () => {
    setLocation(`/quizzes/${quizId}/take`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/quizzes')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="text-muted-foreground mt-1">Quiz Results</p>
        </div>
        {canRetake && (
          <Button onClick={handleRetake}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Retake Quiz
          </Button>
        )}
      </div>

      <div data-tour="quiz-results">
        <ResultsCard
          score={attempt.score || 0}
          totalPoints={questions.reduce((sum, q) => sum + (q.points || 1), 0)}
          percentage={attempt.percentage || 0}
          passed={attempt.passed || false}
          passingScore={quiz.passingScore || 70}
          timeSpent={attempt.timeSpent}
        />
      </div>

      {attempt.feedback && (
        <Card>
          <CardHeader>
            <CardTitle>Instructor Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{attempt.feedback}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Your Answer</TableHead>
                <TableHead>Correct Answer</TableHead>
                <TableHead className="w-24">Points</TableHead>
                <TableHead className="w-16">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question, index) => {
                const userAnswer = userAnswers.find((a: any) => a.questionId === question.id);
                const correctAnswer = typeof question.correctAnswer === 'string'
                  ? JSON.parse(question.correctAnswer)
                  : question.correctAnswer;

                let isCorrect = false;
                let userAnswerDisplay = userAnswer?.answer || 'Not answered';
                let correctAnswerDisplay = correctAnswer;

                // Determine correctness based on question type
                if (userAnswer) {
                  switch (question.questionType) {
                    case 'multiple_choice':
                      isCorrect = userAnswer.answer === correctAnswer;
                      break;
                    case 'true_false':
                      isCorrect = Boolean(userAnswer.answer) === Boolean(correctAnswer);
                      userAnswerDisplay = userAnswer.answer ? 'True' : 'False';
                      correctAnswerDisplay = correctAnswer ? 'True' : 'False';
                      break;
                    case 'short_answer':
                      const userAns = String(userAnswer.answer || '').trim().toLowerCase();
                      const correctAns = String(correctAnswer || '').trim().toLowerCase();
                      isCorrect = userAns === correctAns;
                      break;
                    case 'essay':
                      userAnswerDisplay = userAnswer.answer ? 'Submitted' : 'Not answered';
                      correctAnswerDisplay = 'Manual grading required';
                      break;
                  }
                }

                return (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="line-clamp-2">{question.questionText}</p>
                        {question.explanation && isCorrect === false && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={!userAnswer ? 'text-muted-foreground italic' : ''}>
                        {userAnswerDisplay}
                      </span>
                    </TableCell>
                    <TableCell>
                      {question.questionType !== 'essay' ? correctAnswerDisplay : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                        {isCorrect ? question.points : 0} / {question.points}
                      </span>
                    </TableCell>
                    <TableCell>
                      {question.questionType === 'essay' ? (
                        <Badge variant="outline">Manual</Badge>
                      ) : isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3 pb-6">
        <Button variant="outline" onClick={() => setLocation('/quizzes')}>
          Back to Quizzes
        </Button>
        <Button variant="outline" onClick={() => setLocation('/quizzes/my-attempts')}>
          View All Attempts
        </Button>
        {canRetake && (
          <Button onClick={handleRetake}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Retake Quiz
          </Button>
        )}
      </div>

      {!canRetake && quiz.attemptsAllowed && (
        <div className="text-center text-sm text-muted-foreground pb-6">
          Maximum attempts ({quiz.attemptsAllowed}) reached for this quiz
        </div>
      )}
    </div>
  );
}
