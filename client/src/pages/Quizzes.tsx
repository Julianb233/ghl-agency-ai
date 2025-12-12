import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuizCard } from '@/components/quiz/QuizCard';
import { useQuiz } from '@/hooks/useQuiz';
import { Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Quizzes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');

  const { listQuizzes, deleteQuiz } = useQuiz();

  // Build filter params
  const filterParams: any = {};
  if (categoryFilter !== 'all') filterParams.category = categoryFilter;
  if (difficultyFilter !== 'all') filterParams.difficulty = difficultyFilter;
  if (publishedFilter !== 'all') filterParams.isPublished = publishedFilter === 'published';

  const { data, isLoading, error } = listQuizzes(filterParams);

  const handleDelete = async (id: number) => {
    try {
      await deleteQuiz.mutateAsync({ id });
      toast.success('Quiz deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete quiz');
    }
  };

  const handleCreateQuiz = () => {
    setLocation('/quizzes/create');
  };

  // Filter quizzes by search query
  const filteredQuizzes = data?.quizzes.filter(quiz => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      quiz.title.toLowerCase().includes(query) ||
      quiz.description?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-tour="quiz-header">
        <div>
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage knowledge assessments
          </p>
        </div>
        <Button onClick={handleCreateQuiz} data-tour="quiz-create-button">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Quiz
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3" data-tour="quiz-filters">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes..."
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="customer-service">Customer Service</SelectItem>
            <SelectItem value="product">Product</SelectItem>
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        <Select value={publishedFilter} onValueChange={setPublishedFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load quizzes</p>
        </div>
      )}

      {!isLoading && !error && filteredQuizzes.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No quizzes found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== 'all' || difficultyFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first quiz'}
          </p>
          {!searchQuery && categoryFilter === 'all' && difficultyFilter === 'all' && (
            <Button onClick={handleCreateQuiz}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Your First Quiz
            </Button>
          )}
        </div>
      )}

      {!isLoading && !error && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="quiz-list">
          {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onDelete={handleDelete}
              showActions
            />
          ))}
        </div>
      )}

      {!isLoading && data && data.total > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredQuizzes.length} of {data.total} quizzes
        </div>
      )}
    </div>
  );
}
