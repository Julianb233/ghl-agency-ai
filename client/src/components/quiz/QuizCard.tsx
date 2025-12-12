import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlayCircle } from 'lucide-react';
import { useLocation } from 'wouter';

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  isPublished: boolean;
  attemptsAllowed: number | null;
  passingScore: number | null;
};

type QuizCardProps = {
  quiz: Quiz;
  onDelete?: (id: number) => void;
  showActions?: boolean;
  attemptCount?: number;
  averageScore?: number;
};

const difficultyColors = {
  easy: 'bg-green-500/10 text-green-700 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-700 border-red-500/20',
};

export function QuizCard({ quiz, onDelete, showActions = true, attemptCount, averageScore }: QuizCardProps) {
  const [, setLocation] = useLocation();

  const handleTakeQuiz = () => {
    setLocation(`/quizzes/${quiz.id}/take`);
  };

  const handleEdit = () => {
    setLocation(`/quizzes/${quiz.id}/edit`);
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to delete "${quiz.title}"? This will delete all questions and attempts.`)) {
      onDelete(quiz.id);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1.5">
              {quiz.description || 'No description provided'}
            </CardDescription>
          </div>
          {!quiz.isPublished && (
            <Badge variant="outline" className="shrink-0">Draft</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {quiz.category && (
            <Badge variant="secondary" className="capitalize">
              {quiz.category}
            </Badge>
          )}
          {quiz.difficulty && (
            <Badge
              variant="outline"
              className={`capitalize ${difficultyColors[quiz.difficulty as keyof typeof difficultyColors] || ''}`}
            >
              {quiz.difficulty}
            </Badge>
          )}
        </div>

        {(attemptCount !== undefined || averageScore !== undefined) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            {attemptCount !== undefined && (
              <div>
                <span className="font-medium">{attemptCount}</span> attempts
              </div>
            )}
            {averageScore !== undefined && (
              <div>
                <span className="font-medium">{averageScore.toFixed(0)}%</span> avg score
              </div>
            )}
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="flex gap-2">
          {quiz.isPublished && (
            <Button onClick={handleTakeQuiz} size="sm" className="flex-1">
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Take Quiz
            </Button>
          )}
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button onClick={handleDelete} variant="outline" size="sm">
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
