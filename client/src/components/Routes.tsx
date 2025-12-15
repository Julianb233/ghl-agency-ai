import { Route, Switch } from 'wouter';
import DashboardHome from '@/pages/DashboardHome';
import ScheduledTasksPage from '@/pages/ScheduledTasks';
import { Settings } from '@/pages/Settings';
import WorkflowBuilder from '@/pages/WorkflowBuilder';
import BrowserSessions from '@/pages/BrowserSessions';
import Quizzes from '@/pages/Quizzes';
import QuizBuilder from '@/pages/QuizBuilder';
import QuizTake from '@/pages/QuizTake';
import QuizResults from '@/pages/QuizResults';
import MyAttempts from '@/pages/MyAttempts';
import LeadLists from '@/pages/LeadLists';
import LeadUpload from '@/pages/LeadUpload';
import LeadDetails from '@/pages/LeadDetails';
import AICampaigns from '@/pages/AICampaigns';
import CampaignDetails from '@/pages/CampaignDetails';
import CreditPurchase from '@/pages/CreditPurchase';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UserManagement } from '@/pages/admin/UserManagement';
import { SystemHealth } from '@/pages/admin/SystemHealth';
import { AuditLog } from '@/pages/admin/AuditLog';
import { ConfigCenter } from '@/pages/admin/ConfigCenter';
import DashboardLayout from './DashboardLayout';

export function Routes() {
  return (
    <>
      <DashboardLayout>
        <Switch>
          <Route path="/app" component={DashboardHome} />
          <Route path="/app/scheduled-tasks" component={ScheduledTasksPage} />
          <Route path="/app/workflow-builder" component={WorkflowBuilder} />
          <Route path="/app/browser-sessions" component={BrowserSessions} />
          <Route path="/app/settings" component={Settings} />
          <Route path="/app/quizzes" component={Quizzes} />
          <Route path="/app/quizzes/create" component={QuizBuilder} />
          <Route path="/app/quizzes/:id/edit" component={QuizBuilder} />
          <Route path="/app/quizzes/:id/take" component={QuizTake} />
          <Route path="/app/quizzes/:id/results/:attemptId" component={QuizResults} />
          <Route path="/app/quizzes/my-attempts" component={MyAttempts} />
          <Route path="/app/lead-lists" component={LeadLists} />
          <Route path="/app/lead-lists/upload" component={LeadUpload} />
          <Route path="/app/lead-lists/:id" component={LeadDetails} />
          <Route path="/app/ai-campaigns" component={AICampaigns} />
          <Route path="/app/ai-campaigns/:id" component={CampaignDetails} />
          <Route path="/app/credits" component={CreditPurchase} />
          {/* Admin routes */}
          <Route path="/app/admin" component={AdminDashboard} />
          <Route path="/app/admin/users" component={UserManagement} />
          <Route path="/app/admin/system" component={SystemHealth} />
          <Route path="/app/admin/audit" component={AuditLog} />
          <Route path="/app/admin/config" component={ConfigCenter} />
{/* Team management route - redirects to settings for now */}
          <Route>
            {() => (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold">404</h1>
                <p className="text-muted-foreground">Page not found</p>
              </div>
            )}
          </Route>
        </Switch>
      </DashboardLayout>
    </>
  );
}
