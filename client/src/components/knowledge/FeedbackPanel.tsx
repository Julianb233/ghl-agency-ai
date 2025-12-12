/**
 * Feedback Panel Component
 *
 * Displays agent feedback collected from users and provides
 * analytics on agent performance and satisfaction.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import {
  Star,
  StarHalf,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

export function FeedbackPanel() {
  const { data: feedbackData, isLoading } = trpc.knowledge.getFeedback.useQuery({ limit: 50 });
  const { data: statsData } = trpc.knowledge.getFeedbackStats.useQuery();

  const feedback = feedbackData?.feedback || [];
  const stats = statsData?.stats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Stats Column */}
      <div className="space-y-4">
        {/* Average Rating Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold">
                {(stats?.averageRating || 0).toFixed(1)}
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => {
                  const rating = stats?.averageRating || 0;
                  if (star <= Math.floor(rating)) {
                    return <Star key={star} className="h-5 w-5 fill-yellow-500 text-yellow-500" />;
                  } else if (star - 0.5 <= rating) {
                    return <StarHalf key={star} className="h-5 w-5 fill-yellow-500 text-yellow-500" />;
                  }
                  return <Star key={star} className="h-5 w-5 text-muted-foreground" />;
                })}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on {stats?.total || 0} reviews
            </p>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats?.byRating?.[rating] || 0;
                const total = stats?.total || 1;
                const percentage = (count / total) * 100;

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="w-4 text-sm">{rating}</span>
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Feedback by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feedback Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.byType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {type === 'failure' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {type === 'partial' && <Clock className="h-4 w-4 text-yellow-500" />}
                    {type === 'suggestion' && <MessageSquare className="h-4 w-4 text-blue-500" />}
                    <span className="text-sm capitalize">{type}</span>
                  </span>
                  <Badge variant="outline">{count as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>User feedback on agent task executions</CardDescription>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No feedback submitted yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {feedback.map((item, index) => (
                  <FeedbackItem key={item.id || index} feedback={item} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Feedback Item
function FeedbackItem({ feedback }: { feedback: any }) {
  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge className={getFeedbackTypeColor(feedback.feedbackType)}>
            {feedback.feedbackType}
          </Badge>
          <Badge variant="outline">{feedback.taskType}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= feedback.rating
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>
      </div>

      {feedback.comment && (
        <p className="text-sm text-muted-foreground">{feedback.comment}</p>
      )}

      {feedback.corrections && (
        <div className="bg-muted/50 p-2 rounded text-sm">
          <span className="font-medium">Corrections: </span>
          {feedback.corrections}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>User #{feedback.userId}</span>
        <span>Execution #{feedback.executionId}</span>
        {feedback.createdAt && (
          <span>{new Date(feedback.createdAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
