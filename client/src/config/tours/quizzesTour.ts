import { Tour } from '@/stores/tourStore';

export const quizzesTour: Tour = {
  id: 'quizzes',
  name: 'Quiz Builder',
  description: 'Learn how to create engaging quizzes and assessments',
  icon: '📝',
  estimatedTime: '3 min',
  steps: [
    {
      target: '[data-tour="quiz-header"]',
      title: 'Welcome to Quiz Builder',
      content: 'Create interactive quizzes and knowledge assessments for your team or customers. Track results, set passing scores, and analyze performance.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="quiz-create-button"]',
      title: 'Create Your First Quiz',
      content: 'Click here to start building a new quiz. You can configure settings like difficulty, time limits, passing scores, and more.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="quiz-filters"]',
      title: 'Filter and Search',
      content: 'Use these filters to find quizzes by category, difficulty level, or publication status. The search bar helps you quickly locate specific quizzes.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="quiz-list"]',
      title: 'Your Quiz Library',
      content: 'All your quizzes are displayed here. Each card shows the title, description, category, difficulty level, and publish status. You can edit, delete, or take any quiz from here.',
      placement: 'top'
    },
    {
      target: '[data-tour="quiz-form"]',
      title: 'Quiz Configuration',
      content: 'Set up your quiz with a title, description, category, and difficulty level. Configure time limits, passing scores, and maximum attempts to control the quiz experience.',
      placement: 'right'
    },
    {
      target: '[data-tour="quiz-questions"]',
      title: 'Add Questions',
      content: 'Build your quiz by adding questions. Support for multiple choice, true/false, short answer, and essay questions. Each question can have points, hints, and explanations.',
      placement: 'top'
    },
    {
      target: '[data-tour="quiz-publish-actions"]',
      title: 'Save and Publish',
      content: 'Save your quiz as a draft to continue editing later, or publish it to make it available for users to take. You can always edit published quizzes.',
      placement: 'top'
    },
    {
      target: '[data-tour="quiz-results"]',
      title: 'View Results',
      content: 'After taking a quiz, see detailed results including your score, percentage, time spent, and a breakdown of correct and incorrect answers. Review explanations to learn from mistakes.'
    }
  ]
};
