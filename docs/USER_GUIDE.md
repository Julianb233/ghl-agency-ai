# Bottleneck Bots - User Guide

**Version**: 1.0
**Last Updated**: December 2025
**Audience**: End Users, Agency Owners, Team Managers

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Agent Dashboard](#2-agent-dashboard)
3. [Swarm Coordination](#3-swarm-coordination)
4. [Browser Automation](#4-browser-automation)
5. [Knowledge & Training](#5-knowledge--training)
6. [Subscription & Billing](#6-subscription--billing)
7. [Settings & Configuration](#7-settings--configuration)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Getting Started

### 1.1 Account Creation and Login

#### Creating Your Account

1. **Navigate to the Platform**
   - Visit your Bottleneck Bots instance URL
   - Click "Sign Up" or "Get Started"

2. **Authentication**
   - The platform uses secure OAuth authentication through Manus
   - You'll be redirected to a secure login portal
   - Enter your credentials or use social login (Google, GitHub)
   - Complete any two-factor authentication if enabled

3. **First-Time Setup**
   - After successful login, you'll be redirected to the onboarding flow
   - The system will guide you through initial configuration

#### Logging In

- **Standard Login**: Navigate to `/auth/login` and enter your credentials
- **OAuth Callback**: After authentication, you'll be redirected to `/auth/callback`
- **Session Persistence**: Your session remains active for 30 days unless you explicitly log out

### 1.2 Dashboard Overview

Upon login, you'll land on the **Global Operations Dashboard** which provides:

#### Main Dashboard Components

**Header Section**
- **Platform Logo**: Top-left corner, click to return to main dashboard
- **Navigation Menu**: Access all major sections (Agents, Swarms, Browser Sessions, Settings)
- **User Profile**: Top-right corner with avatar and dropdown menu
- **Notification Bell**: Real-time alerts for agent activities and system events

**Quick Stats Cards** (Top Row)
- **Active Tasks**: Currently running agent executions
- **Completion Rate**: Percentage of successful task completions
- **Average Response Time**: Mean execution duration across all agents
- **Swarm Agents**: Number of connected multi-agent coordinators

**Main Content Area**
- **Task Input**: Create new agent tasks with natural language descriptions
- **Current Execution**: Real-time view of active agent operations
- **Recent Executions**: Historical view of completed, failed, and ongoing tasks
- **Execution Logs**: Live terminal output from agent operations
- **Subscription Usage**: Monthly execution limits and plan details

### 1.3 Onboarding Walkthrough

The onboarding process consists of four key steps:

#### Step 1: Welcome & Platform Introduction
- Overview of AI agent capabilities
- Tour of main dashboard features
- Interactive tooltips highlighting key interface elements

#### Step 2: Integration Setup
- Configure third-party API keys (OpenAI, Browserbase, GoHighLevel)
- Connect OAuth integrations (Google, Gmail, social media)
- Set up webhook endpoints for event notifications

#### Step 3: First Client Configuration
- Create your first client profile
- Upload brand assets and documentation
- Configure brand voice and preferences

#### Step 4: Agent Activation
- Launch your first AI agent task
- Watch real-time execution with step-by-step breakdown
- Review results and execution logs

**Interactive Feature Tips**
Throughout the platform, you'll see 💡 tooltip icons. Hover over these for contextual help about specific features.

---

## 2. Agent Dashboard

### 2.1 Understanding the Agent Interface

The Agent Dashboard is your command center for AI automation. It displays real-time agent status, execution history, and control mechanisms.

#### Agent Status Indicators

Each agent can be in one of six states:

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| **Idle** | ⚪ Circle | Gray | Agent waiting for tasks |
| **Planning** | 🧠 Brain (animated) | Blue | AI generating execution plan |
| **Executing** | ⚙️ Loader (spinning) | Amber | Actively performing task |
| **Completed** | ✓ CheckCircle | Green | Task finished successfully |
| **Error** | ✗ XCircle | Red | Task failed with error |
| **Paused** | ⏸️ Pause | Purple | User-paused execution |

#### Dashboard Layout

**Left Column** (Main Work Area)
1. **New Task Input**
   - Large text field for task descriptions
   - Minimum 10 characters required
   - Natural language supported (e.g., "Create a landing page for a SaaS product")
   - "Execute" button to start task
   - Keyboard shortcut: `Enter` to submit

2. **Current Execution Card** (visible during active tasks)
   - Task description
   - Current status badge
   - Progress bar with percentage
   - Control buttons:
     - **Pause/Resume**: Temporarily halt execution
     - **Terminate**: Stop and cancel task
   - Real-time step-by-step updates

3. **Recent Executions List**
   - Last 10 executions displayed
   - Sortable by date, duration, status
   - Click any execution to view detailed logs
   - Filter by status (All, Completed, Failed, Running)

**Right Column** (Monitoring & Controls)
1. **Subscription Usage Widget**
   - Current plan tier (Starter, Growth, Professional, Enterprise)
   - Monthly execution count: X / Y used
   - Visual progress bar with color coding:
     - Green: < 80% used
     - Amber: 80-99% used
     - Red: 100% used (limit reached)
   - Days remaining in billing cycle
   - Quick action buttons: "Buy Pack" or "Upgrade"

2. **Execution Log Terminal**
   - Real-time log stream with timestamps
   - Log levels indicated by icons:
     - 🔵 Info: General status updates
     - ✅ Success: Successful operations
     - ⚠️ Warning: Non-critical issues
     - ❌ Error: Critical failures
     - 💻 System: Internal operations
   - Auto-scroll to latest entry
   - Refresh button to reload logs

3. **Quick Actions Menu**
   - "View All Executions" → Full execution history
   - "Swarm Configuration" → Multi-agent setup
   - "Tool Library" → Available agent capabilities
   - "Agent Settings" → Configuration panel

### 2.2 Creating and Managing Agents

#### Creating a New Task

1. **Navigate to Agent Dashboard**
   - Click "Agent Dashboard" in main navigation
   - Or use keyboard shortcut: `Cmd/Ctrl + D`

2. **Enter Task Description**
   - Click into the "New Task" input field
   - Type a clear, specific task description
   - Examples:
     ```
     "Analyze competitor website and generate SEO recommendations"
     "Create a welcome email sequence for new subscribers"
     "Update all product images on the website"
     "Generate social media posts for next week's campaign"
     ```

3. **Execute the Task**
   - Click the "Execute" button
   - Or press `Enter` in the input field
   - The system will:
     - Validate your subscription has available executions
     - Create a new agent instance
     - Begin the planning phase

4. **Monitor Execution**
   - Watch the "Current Execution" card appear
   - Progress updates appear in real-time
   - View detailed logs in the right sidebar
   - Estimated completion time displayed

#### Managing Active Executions

**Pausing Execution**
- Click "Pause" button in Current Execution card
- Agent state saves current progress
- Click "Resume" to continue from pause point
- Useful for reviewing intermediate results

**Terminating Execution**
- Click "Terminate" button
- Confirmation dialog appears: "Are you sure?"
- Click "Terminate" to confirm
- Agent stops immediately
- Partial results may be available in logs

**Viewing Execution Details**
- Click any execution in "Recent Executions"
- Opens detailed modal with:
  - Full task description
  - Complete execution timeline
  - All log entries
  - Screenshots (if browser automation used)
  - Error details (if failed)
  - Duration and timestamps

### 2.3 Viewing Execution History

#### Execution History Panel

Access full execution history:
1. Click "View All Executions" in Quick Actions
2. Or navigate to `/dashboard/terminal`

#### Filter and Search Options

**Status Filters**
- All Executions
- Completed Only
- Failed Only
- Currently Running
- Paused

**Time Range Filters**
- Last 24 Hours
- Last 7 Days
- Last 30 Days
- Custom Date Range

**Search Functionality**
- Search by task description keywords
- Filter by execution ID
- Search by date

**Sort Options**
- Newest First (default)
- Oldest First
- Longest Duration
- Shortest Duration
- Status (alphabetical)

#### Execution Details View

Click any execution to see:

**Header Information**
- Execution ID (unique identifier)
- Start and end timestamps
- Total duration (HH:MM:SS)
- Final status badge

**Execution Steps**
Each step shows:
- Step number and description
- Timestamp
- Status (success/failure)
- Duration
- Output or error message

**Browser Screenshots** (if applicable)
- Thumbnail gallery of captured screens
- Click to enlarge
- Download individual screenshots
- View full session recording

**Error Reports** (if failed)
- Error message and stack trace
- Failing step highlighted
- Suggested remediation actions
- Option to retry with modifications

### 2.4 Real-Time Monitoring with Server-Sent Events (SSE)

The Agent Dashboard uses SSE for live updates without page refreshes.

#### Connection Status

**Top-right corner indicator:**
- 🟢 **Connected** (green pulsing dot): Receiving real-time updates
- 🔴 **Disconnected** (red dot): Connection lost, updates paused

**Automatic Reconnection**
- If connection drops, system retries every 5 seconds
- Up to 10 retry attempts
- Manual reconnect via "Refresh" button

#### What Updates in Real-Time

1. **Agent Status Changes**
   - Idle → Planning → Executing → Completed/Error
   - Status badge updates instantly

2. **Log Entries**
   - New log lines appear as they're generated
   - Auto-scroll keeps latest visible
   - Timestamp precision to milliseconds

3. **Progress Indicators**
   - Progress bar updates with each completed step
   - Percentage shown (e.g., "Step 3/7 - 42% complete")

4. **Metrics Updates**
   - Active task count
   - Completion rate recalculated
   - Average response time adjusted

5. **Subscription Usage**
   - Execution count increments immediately
   - Remaining executions decremented
   - Visual progress bar updates

#### Manual Refresh

If you suspect stale data:
- Click the "Refresh" icon (🔄) in top-right
- Or use keyboard shortcut: `Cmd/Ctrl + R`
- Forces full data reload from server

---

## 3. Swarm Coordination

### 3.1 What is Swarm Mode?

**Swarm Mode** enables multiple specialized AI agents to collaborate on complex, multi-faceted objectives. Instead of a single agent attempting all tasks, swarms distribute work among specialist agents optimized for specific functions.

#### Use Cases for Swarms

**Research & Analysis**
- Market research across multiple sources
- Competitive analysis with data aggregation
- Multi-platform social media monitoring

**Development Projects**
- Full-stack application development
- Code review and testing coordination
- Database migration with zero downtime

**Content Creation**
- Multi-channel marketing campaign development
- Blog series with SEO optimization
- Video script writing with storyboarding

**Deployment & Operations**
- Multi-environment deployment workflows
- Infrastructure provisioning and monitoring
- Security scanning across applications

### 3.2 Setting Up Multi-Agent Tasks

#### Accessing Swarm Dashboard

1. Navigate to "Swarm Coordination" in main menu
2. Or visit `/dashboard/swarms`
3. View current system health and active swarms

#### Creating a New Swarm

**Step 1: Define Objective**
1. Click "Create Swarm" tab
2. Enter comprehensive objective (minimum 10 characters)
3. Be specific about desired outcomes
4. Example:
   ```
   "Research top 10 project management SaaS tools, analyze their
   pricing models, feature sets, and user reviews. Generate a
   comparison matrix and identify market gaps."
   ```

**Step 2: Configure Swarm Parameters**

**Swarm Name** (Optional)
- Descriptive identifier for this swarm
- Example: "PM Tools Market Research Q4 2025"
- Auto-generated if not provided

**Strategy Selection**
- **Auto (Recommended)**: System determines optimal strategy
- **Research**: Optimized for data gathering and analysis
- **Development**: Code-focused with testing emphasis
- **Analysis**: Data processing and insight generation
- **Deployment**: Infrastructure and release coordination

**Max Agents**
- Slider: 1-50 agents
- Default: 10 agents
- More agents = faster completion but higher cost
- System may use fewer if task doesn't require all

**Auto Scaling**
- Toggle ON/OFF
- When enabled: System adjusts agent count dynamically
- Scales up for parallel tasks
- Scales down when fewer agents needed
- Saves execution credits

**Step 3: Launch Swarm**
1. Review all parameters
2. Click "Create & Start Swarm"
3. System begins:
   - Breaking down objective into tasks
   - Spawning specialized agents
   - Distributing work assignments

### 3.3 Monitoring Swarm Progress

#### Swarm Dashboard Overview

**Quick Stats** (Top Row)

| Metric | Description |
|--------|-------------|
| **Active Swarms** | Currently running coordinations |
| **Total Agents** | All spawned agents across swarms |
| **Tasks Completed** | Successfully finished tasks |
| **Queue Depth** | Pending tasks waiting for agents |
| **Success Rate** | Percentage of successful task completions |

**System Health Panel**

Displays overall coordinator status:
- **Status Badge**: Healthy (green) or Unhealthy (red)
- **Active Agents**: Healthy and unhealthy agent counts
- **Pending Tasks**: Current task queue length
- **Last Error**: Most recent error message (if any)

#### Active Swarms Tab

View all running swarms:

**Swarm Card Layout**
- **Header**: Swarm name and strategy type
- **Progress Bar**: Visual completion percentage
- **Agent Count**: Number of active agents
- **Task Count**: Completed / Total tasks
- **Status Badge**: Running, Completed, Failed, Cancelled
- **Actions**:
  - "View Details" → Detailed execution view
  - "Pause" → Temporarily halt all agents
  - "Terminate" → Stop swarm execution

**Swarm Detail View**

Click "View Details" to see:

1. **Task Distribution**
   - Visual graph showing task assignments
   - Which agents are working on which tasks
   - Task dependencies and relationships

2. **Agent Status**
   - Table of all swarm agents
   - Individual agent status (Idle, Busy, Error)
   - Current task for each agent
   - Agent specialization (Researcher, Coder, Tester, etc.)

3. **Timeline View**
   - Chronological task completion
   - Milestones and checkpoints
   - Estimated completion time

4. **Consolidated Logs**
   - Merged log stream from all agents
   - Color-coded by agent
   - Filter by agent or log level

#### Agent Types Browser

Explore 64+ specialized agent types:

**Categories:**
- **Research Agents**: Data gathering, web scraping, API integration
- **Developer Agents**: Code generation, testing, debugging
- **Analyst Agents**: Data processing, pattern recognition
- **Deployment Agents**: Infrastructure, CI/CD, monitoring
- **Content Agents**: Writing, editing, SEO optimization
- **Designer Agents**: UI/UX, graphics, prototyping

**Agent Capabilities**
Each agent type shows:
- Primary function
- Required tools and integrations
- Average task completion time
- Best use cases

### 3.4 Swarm Metrics and Performance

#### Metrics Dashboard

Access detailed performance analytics:
1. Click "Metrics" tab in Swarm Dashboard
2. View real-time and historical data

**Key Metrics Tracked**

**Execution Metrics**
- Total swarms created (lifetime)
- Average swarm completion time
- Median agent count per swarm
- Peak concurrent agents

**Quality Metrics**
- Overall success rate (percentage)
- Most common failure causes
- Retry rate (tasks needing re-execution)
- Quality score (0-100 based on success/failures)

**Efficiency Metrics**
- Average task distribution time
- Agent idle time percentage
- Resource utilization rate
- Cost per completed task

**Trend Analysis**
- Success rate over time (line graph)
- Agent usage patterns (bar chart)
- Task complexity distribution (histogram)
- Estimated vs actual completion times (scatter plot)

#### Performance Optimization Tips

**Choosing the Right Strategy**
- Use "Auto" unless you have specific needs
- "Research" strategy spawns more data-focused agents
- "Development" emphasizes code quality and testing
- "Analysis" optimizes for data processing speed

**Agent Count Optimization**
- Start with default (10 agents)
- Monitor queue depth - if consistently high, increase agents
- If many agents idle, reduce count
- Enable auto-scaling for variable workloads

**Task Complexity Management**
- Break very large objectives into smaller swarms
- Overly broad objectives may overwhelm coordination
- Specific, focused swarms complete faster

---

## 4. Browser Automation

### 4.1 How Browser Automation Works

GHL Agency AI uses **Browserbase** cloud infrastructure with **Stagehand** AI-powered automation to control real browsers programmatically.

#### Browser Automation Capabilities

**What Agents Can Do:**
- Navigate websites and click elements
- Fill out forms with data
- Extract information from pages
- Take screenshots at each step
- Handle dynamic content (JavaScript-heavy sites)
- Manage cookies and sessions
- Bypass common anti-bot measures
- Record full session video

**Common Automation Tasks:**
- Lead scraping from directories
- Form submissions at scale
- Website testing and monitoring
- Competitive analysis
- Content extraction
- Price monitoring
- Automated reporting

#### How It Works Behind the Scenes

1. **Session Request**
   - Agent requests browser session from Browserbase
   - Cloud browser instance spins up (typically < 5 seconds)
   - Session ID returned to agent

2. **Automation Execution**
   - Agent sends instructions to browser
   - Stagehand interprets natural language commands
   - Browser performs actions (click, type, navigate)
   - Screenshots captured automatically

3. **Data Extraction**
   - Agent analyzes page content
   - Extracts relevant information
   - Structures data in requested format

4. **Session Cleanup**
   - Browser session closes on completion
   - Video recording saved
   - Screenshots archived
   - Logs persisted

### 4.2 Viewing Browser Sessions

#### Browser Sessions Page

Navigate to "Browser Sessions" in main menu or `/dashboard/browser-sessions`

#### Session Manager Interface

**Statistics Cards** (Top Row)

| Card | Displays |
|------|----------|
| **Total Sessions** | Lifetime session count |
| **Running** | Currently active browsers (blue, animated) |
| **Completed** | Successfully finished sessions (green) |
| **Failed** | Sessions that encountered errors (red) |

**Toolbar Controls**

**Search Bar**
- Search by Session ID
- Search by URL visited
- Keyboard shortcut: `Cmd/Ctrl + K` to focus

**Filters**
- **Status**: All, Running, Completed, Failed, Expired
- **Sort By**: Created, Completed, Duration, Status
- **Sort Order**: Ascending ↑ or Descending ↓

**Actions**
- **Refresh**: Update session list (`Cmd/Ctrl + R`)
- **New Session**: Create manual browser session (`Cmd/Ctrl + N`)

#### Session Cards

Each session displays:

**Header**
- Session ID (unique identifier)
- Status badge with color coding
- Creation timestamp

**Details**
- **URL**: Website being automated
- **Duration**: Total session length or elapsed time
- **Browser**: Chromium, Firefox, or WebKit
- **Region**: Geographic location of browser instance

**Quick Actions** (appear on hover)
- **Live View**: Watch session in real-time (running sessions only)
- **View Recording**: Replay full session video (completed sessions)
- **View Logs**: See browser console and automation logs
- **Terminate**: Stop running session immediately
- **Delete**: Remove session and all associated data

### 4.3 Session Recordings and Screenshots

#### Viewing Session Recordings

**Accessing Recordings:**
1. Find completed session in Browser Sessions list
2. Click "View Recording" button
3. Video player opens with controls

**Recording Player Features:**
- **Playback Controls**: Play, Pause, Skip forward/back
- **Speed Control**: 0.5x, 1x, 1.5x, 2x playback speed
- **Timeline**: Scrub to specific moments
- **Milestones**: Jump to key actions (click, form submit, navigation)
- **Download**: Save recording for offline viewing

**Screenshot Gallery**

**Accessing Screenshots:**
1. Click session to open detail view
2. Navigate to "Screenshots" tab
3. Thumbnail gallery displays all captures

**Gallery Features:**
- **Grid View**: See all screenshots at once
- **Lightbox**: Click thumbnail to enlarge
- **Download**: Save individual or all screenshots
- **Annotations**: View automatic action annotations (what was clicked/typed)
- **Timeline**: Screenshots ordered chronologically

**Screenshot Metadata:**
Each screenshot shows:
- Capture timestamp
- Page URL at time of capture
- Action performed (if any)
- Resolution (width x height)
- File size

### 4.4 Managing Concurrent Sessions

#### Session Limits by Plan

| Plan | Max Concurrent Sessions |
|------|------------------------|
| Starter | 2 sessions |
| Growth | 5 sessions |
| Professional | 15 sessions |
| Enterprise | 50 sessions |

#### Concurrency Management

**Viewing Active Sessions**
- "Running" stat card shows current count
- Color changes when approaching limit:
  - Green: < 80% of limit
  - Amber: 80-99% of limit
  - Red: At limit

**What Happens at Limit**
- New session requests are queued
- Queue notification appears: "Waiting for available slot..."
- Sessions start automatically when slots free up
- Maximum queue depth: 10 pending sessions

**Manual Session Control**

**Terminating Sessions**
To free up slots immediately:
1. Select running sessions (checkbox on each card)
2. Click "Terminate" in bulk actions toolbar
3. Confirm termination in dialog
4. Sessions stop within 5 seconds

**Bulk Actions**
- Select multiple sessions via checkboxes
- Keyboard shortcut: `Cmd/Ctrl + A` selects all
- `Esc` clears selection
- Bulk terminate or bulk delete available

#### Session Lifecycle

**Active Session Timeline:**
1. **Created**: Session requested, browser launching (0-5 sec)
2. **Running**: Browser active, automation executing
3. **Completed**: Task finished, recording saved
4. **Cleanup**: Browser destroyed, resources freed (automatic)

**Session Expiration:**
- Maximum session duration: 60 minutes
- After 60 minutes, session auto-terminates
- Partial results saved
- Recording available even if expired

**Session Persistence:**
- Completed session data retained for 30 days
- Recordings stored in S3-compatible storage
- After 30 days, automatically purged
- Enterprise plans: configurable retention (up to 1 year)

---

## 5. Knowledge & Training

### 5.1 How Agents Learn from Patterns

The GHL Agency AI platform employs machine learning to continuously improve agent performance based on historical execution patterns.

#### Pattern Recognition System

**What Patterns Are Tracked:**

1. **Task Success Patterns**
   - Which types of tasks succeed most often
   - Common characteristics of successful executions
   - Optimal parameters for different task categories

2. **Error Patterns**
   - Frequent failure points
   - Common error messages and their resolutions
   - Tasks that typically require human intervention

3. **Execution Strategies**
   - Most efficient approaches for specific tasks
   - Browser automation sequences that work reliably
   - API call patterns that minimize rate limiting

4. **User Preferences**
   - Your preferred language style in outputs
   - Formatting conventions you typically use
   - Level of detail you request in reports

#### How Learning Works

**Continuous Improvement Cycle:**

1. **Execution**: Agent performs task
2. **Outcome Recording**: Success or failure logged
3. **Pattern Analysis**: AI analyzes what worked/didn't work
4. **Model Update**: Agent behavior adjusts for future tasks
5. **Validation**: Next execution tests improvement

**User Feedback Loop:**
- After each execution, optional feedback prompt
- Rate quality: 👍 Good or 👎 Needs Improvement
- Provide specific feedback text
- Feedback directly influences future behavior

### 5.2 Brand Voice Configuration

Configure how agents communicate on behalf of your clients.

#### Accessing Brand Voice Settings

1. Navigate to "Client Management" → Select Client
2. Click "Brand Voice" tab
3. Or go to `/dashboard/clients/[id]/brand-voice`

#### Configuration Options

**Voice Attributes**

**Tone Selection** (Choose multiple)
- ☑️ Professional
- ☑️ Friendly
- ☐ Casual
- ☐ Formal
- ☐ Playful
- ☐ Authoritative
- ☐ Empathetic
- ☐ Technical

**Communication Style**
- **Sentence Length**: Short / Medium / Long / Varied
- **Vocabulary Level**: Simple / Intermediate / Advanced / Mixed
- **Formality**: Very Casual → Very Formal (slider)
- **Directness**: Indirect → Very Direct (slider)

**Industry-Specific Terms**
- Upload industry glossary (CSV or JSON)
- Define preferred terminology
- Specify words to avoid

**Example Inputs**

**Good Example Text:**
Provide 3-5 examples of on-brand communication:
```
"Welcome to [Client Name]! We're thrilled to have you join our
community of innovative leaders. Let's get started on your journey
to success."
```

**Bad Example Text:**
Provide 3-5 examples of off-brand communication:
```
"Hey! What's up? Sign up now!!!"
```

**Reference Documents**
Upload existing brand guidelines:
- PDF brand style guides
- Marketing copy samples
- Email templates
- Social media posts

#### AI Training from Documents

**Document Upload Process:**
1. Click "Upload Brand Documents"
2. Drag-and-drop or browse files
3. Supported formats: PDF, DOCX, TXT, MD
4. Maximum: 10 files, 25MB total

**AI Extraction:**
- System analyzes uploaded documents
- Extracts tone indicators
- Identifies common phrases and patterns
- Generates brand voice profile automatically
- Review and approve profile (click "Approve" or "Edit")

**Profile Activation:**
- Once approved, profile applies to all agent communications
- Agents reference profile before generating client-facing content
- Consistency maintained across emails, messages, reports

### 5.3 Feedback and Improvement

#### Providing Execution Feedback

**After Task Completion:**
1. Feedback modal appears automatically
2. Or access via execution history → "Provide Feedback"

**Feedback Form:**

**Quality Rating**
- ⭐⭐⭐⭐⭐ (1-5 stars)
- Quick rating affects agent confidence score

**Detailed Feedback (Optional)**
- **What Went Well**: Describe successful aspects
- **What Needs Improvement**: Specific issues encountered
- **Suggestions**: How agent could do better next time

**Specific Criteria** (Rate each)
- ☑️ Task completed as requested
- ☑️ Output quality met expectations
- ☑️ Execution speed was acceptable
- ☑️ Communication was clear
- ☑️ No unnecessary steps taken

**Submit Feedback**
- Click "Submit Feedback"
- Feedback immediately integrated into learning model
- Similar future tasks benefit from your input

#### Viewing Improvement Metrics

**Agent Performance Dashboard:**
Access via "Settings" → "Agent Performance"

**Metrics Displayed:**

**Success Rate Trend**
- Line graph showing success percentage over time
- Color-coded: Green (improving), Red (declining), Gray (stable)
- Hover for exact percentages by week/month

**Top Performing Task Types**
- Bar chart of success rates by task category
- Identify what your agents do best
- Use this insight to assign tasks strategically

**Learning Velocity**
- How quickly agents improve after feedback
- Displayed as "Feedback Impact Score" (0-100)
- Higher scores = feedback making bigger difference

**Error Reduction**
- Comparison of error rates: This Month vs. Last Month
- Specific error categories improving/worsening
- Recommended training focus areas

#### Retraining Agents

**When to Retrain:**
- Success rate drops below 80%
- New task types consistently failing
- Client brand voice changed
- Major platform updates (e.g., GoHighLevel UI changes)

**Retraining Process:**
1. Navigate to "Settings" → "Agent Training"
2. Click "Retrain Agents"
3. Select training focus:
   - General improvement (all task types)
   - Specific task category (e.g., "Email campaigns")
   - Brand voice recalibration
   - Error pattern correction
4. Click "Start Retraining"
5. Process takes 15-30 minutes
6. Notification when complete

**Post-Retraining:**
- Test agents with sample tasks
- Monitor success rates for 24-48 hours
- Provide additional feedback if needed

---

## 6. Subscription & Billing

### 6.1 Subscription Tiers

GHL Agency AI offers four subscription tiers designed for different agency sizes and needs.

#### Plan Comparison

| Feature | Starter | Growth | Professional | Enterprise |
|---------|---------|--------|--------------|------------|
| **Monthly Price** | $99 | $249 | $499 | Custom |
| **Monthly Executions** | 500 | 2,000 | 10,000 | Unlimited |
| **Max Concurrent Agents** | 5 | 15 | 50 | Unlimited |
| **Concurrent Browser Sessions** | 2 | 5 | 15 | 50 |
| **Team Members** | 3 | 10 | 25 | Unlimited |
| **Client Accounts** | 10 | 50 | 200 | Unlimited |
| **Storage (GB)** | 50 | 200 | 1,000 | Custom |
| **Webhook Endpoints** | 5 | 15 | 50 | Unlimited |
| **Priority Support** | Email | Email + Chat | 24/7 Phone | Dedicated Manager |
| **Onboarding** | Self-service | Video call | White-glove | Custom training |
| **SLA Uptime** | 99.0% | 99.5% | 99.9% | 99.99% |

#### Feature Descriptions

**Monthly Executions**
- One execution = one agent task from start to completion
- Example: "Create email campaign" = 1 execution
- Complex tasks may spawn sub-tasks (each counts separately)
- Resets on your billing anniversary date

**Concurrent Agents**
- Maximum agents running simultaneously
- Includes both single agents and swarm agents
- Queued tasks wait for available slots

**Team Members**
- Number of user accounts permitted
- Role-based access (Owner, Manager, VA)
- Additional members available as add-on

**Client Accounts**
- Number of distinct client profiles
- Each client can have multiple sub-accounts (GoHighLevel)

**Storage**
- Includes browser recordings, screenshots, logs
- Overages charged at $0.10/GB/month
- Auto-cleanup of old data (30 days default)

### 6.2 Usage Limits and Monitoring

#### Viewing Current Usage

**Subscription Widget** (Always visible in dashboard)
- Current plan name and price
- Executions used / Total allowed
- Visual progress bar with color coding
- Days remaining in billing cycle

**Detailed Usage Page**
Access via "Settings" → "Subscription" → "Usage Details"

**Usage Breakdown:**

**Executions**
- Total executions this period
- By task type (manual, scheduled, webhook-triggered)
- By status (completed, failed, cancelled)
- Historical comparison (this month vs. last month)

**Storage**
- Current usage in GB
- Breakdown by data type:
  - Browser recordings: XX GB
  - Screenshots: XX GB
  - Logs: XX GB
  - Documents: XX GB
- Projected end-of-month usage

**Team Activity**
- Executions by team member
- Most active users
- Task distribution across team

**API Usage**
- API calls by integration (OpenAI, Browserbase, etc.)
- Costs associated with each service
- Projected monthly cost

#### Limit Warnings and Notifications

**Warning Thresholds:**

**80% Usage Warning**
- In-app notification appears
- Email sent to account owner
- Amber highlight in usage widget
- Message: "Approaching monthly limit - X executions remaining"

**95% Usage Critical Warning**
- Second email notification
- Red highlight in usage widget
- Pop-up dialog on login
- Suggested actions:
  - Purchase execution pack (+500, +1000, +2500)
  - Upgrade to higher tier

**100% Limit Reached**
- All new executions blocked
- Error message: "Monthly limit reached"
- Upgrade modal appears automatically
- Options:
  - Buy execution pack (one-time boost)
  - Upgrade subscription (permanent increase)
  - Wait for next billing cycle

**Soft Limit Override** (Professional and Enterprise)
- Can exceed limit by 10%
- Overages charged at $0.20/execution
- Prevents service interruption
- Billed on next invoice

### 6.3 Managing Your Subscription

#### Upgrading Your Plan

**Upgrade Process:**
1. Navigate to "Settings" → "Subscription"
2. Click "Upgrade Plan"
3. Compare plan features side-by-side
4. Select desired tier
5. Review prorated credit for remaining days
6. Enter payment method (if new)
7. Click "Confirm Upgrade"

**Immediate Effects:**
- New limits active instantly
- Prorated charge to card on file
- Next billing date unchanged
- Confirmation email sent

**Prorated Billing Example:**
- Current plan: Growth ($249/month)
- Upgrade to: Professional ($499/month)
- Days remaining: 15 days
- Unused Growth credit: $249 × (15/30) = $124.50
- Professional prorated charge: $499 × (15/30) = $249.50
- **Amount charged today**: $249.50 - $124.50 = $125.00

#### Downgrading Your Plan

**Downgrade Process:**
1. Settings → Subscription → "Change Plan"
2. Select lower tier
3. Review feature limitations
4. Confirmation required (dialog explains what you'll lose)
5. Click "Confirm Downgrade"

**Important Notes:**
- Downgrade takes effect at **next billing cycle**, not immediately
- You retain current features until then
- If current usage exceeds new plan limits:
  - Warning: "Your current usage is above the new plan limits"
  - Must reduce usage before downgrade completes
  - Or choose higher plan

**Downgrade Restrictions:**
- Cannot downgrade if you have more team members than new limit
- Must delete excess client accounts first
- Active executions must complete before downgrade processes

#### Canceling Your Subscription

**Cancellation Process:**
1. Settings → Subscription → "Cancel Subscription"
2. Reason for cancellation (optional survey)
3. Cancellation options:
   - **End of Billing Period**: Keep access until paid period expires
   - **Immediate**: Cancel now, no refund for unused time
4. Confirmation required (type "CANCEL" to confirm)
5. Confirmation email with final invoice

**Data Retention After Cancellation:**
- **30 Days**: Full data accessible (read-only mode)
- **60 Days**: Data archived, available on request
- **90+ Days**: Data permanently deleted

**Reactivating Cancelled Subscription:**
- Within 30 days: Instant reactivation, no data loss
- After 30 days: New subscription required, data restored from archive
- After 90 days: Cannot restore data, fresh start only

### 6.4 Execution Packs (One-Time Boosts)

#### What Are Execution Packs?

One-time purchases that add extra executions to your current billing period without upgrading your plan.

#### Available Packs

| Pack Size | Price | Cost Per Execution |
|-----------|-------|-------------------|
| Starter Pack | $49 | $0.098/execution (500 executions) |
| Growth Pack | $89 | $0.089/execution (1,000 executions) |
| Professional Pack | $199 | $0.080/execution (2,500 executions) |
| Enterprise Pack | $749 | $0.075/execution (10,000 executions) |

#### Purchasing Execution Packs

**Purchase Flow:**
1. Click "Buy Execution Pack" in subscription widget
2. Or when limit reached, modal appears automatically
3. Select pack size
4. Review:
   - Current executions: XXX / YYY
   - Pack addition: +ZZZ executions
   - New total: XXX / (YYY + ZZZ)
5. Enter payment method
6. Click "Purchase"

**Instant Activation:**
- Credits added immediately
- Can resume blocked tasks
- Email receipt sent
- Visible in usage breakdown

#### Pack Expiration

**Validity Period:**
- Execution packs expire at **end of current billing period**
- Example:
  - Purchase pack on Dec 10
  - Billing cycle ends Dec 31
  - Unused pack executions forfeit on Jan 1

**Usage Priority:**
- Base subscription executions used first
- Pack executions used only when base is exhausted
- Maximizes value of purchased packs

**No Refunds:**
- Execution packs are non-refundable
- Cannot transfer between accounts
- Cannot roll over to next billing period

---

## 7. Settings & Configuration

### 7.1 API Keys and Integrations

API keys enable your agents to communicate with external services like OpenAI (for AI capabilities), Browserbase (for browser automation), and GoHighLevel (for CRM operations).

#### Managing API Keys

**Accessing API Keys:**
1. Navigate to "Settings" → "API Keys" tab
2. View all configured services

**API Keys Table:**

| Column | Description |
|--------|-------------|
| **Service** | Third-party provider name |
| **Name** | Your label for this key |
| **Key** | Masked key (e.g., `sk-proj-...abc123`) |
| **Status** | Valid ✓ / Invalid ✗ / Untested ⚠️ |
| **Created** | Date key was added |
| **Last Tested** | Last validation attempt |
| **Actions** | Test, Edit, Delete buttons |

**Adding New API Key:**
1. Click "+ Add API Key"
2. Select service from dropdown:
   - OpenAI (required for AI agent intelligence)
   - Browserbase (required for browser automation)
   - GoHighLevel (required for CRM integration)
   - Custom (for webhook authentication)
3. Enter descriptive name (e.g., "Production OpenAI Key")
4. Paste API key (obtain from provider's website)
5. Click "Test" to validate key
6. If valid ✓: Click "Add" to save
7. If invalid ✗: Check key and try again

**Testing API Keys:**
- Click "Test" button next to any key
- System makes test API call
- Results:
  - ✓ **Valid**: Key works, authenticated successfully
  - ✗ **Invalid**: Key rejected, check for typos or expiration
  - ⚠️ **Rate Limited**: Key valid but quota exceeded
  - ⚠️ **Network Error**: Cannot reach API, try again

**Security Best Practices:**
- Use separate keys for production and testing
- Rotate keys every 90 days
- Never share keys publicly
- Use environment-specific keys
- Monitor usage for anomalies

#### OAuth Integrations

Connect third-party accounts for seamless automation and data sync.

**Available Integrations:**

**Google** 🔍
- Enables: Google Calendar sync, Gmail automation
- Scopes: Read/write calendar, read email
- Setup: OAuth popup → Approve permissions

**Gmail** 📧
- Enables: Email sending, inbox monitoring
- Scopes: Send email, read messages
- Use case: Automated email campaigns, support ticket creation

**Outlook** 📨
- Enables: Outlook calendar, email integration
- Scopes: Read/write calendar and mail
- Use case: Cross-platform scheduling

**Facebook** 📘
- Enables: Page posting, ad management
- Scopes: Manage pages, read insights
- Use case: Social media automation

**Instagram** 📷
- Enables: Post scheduling, DM responses
- Scopes: Manage posts, read messages
- Use case: Influencer account management

**LinkedIn** 💼
- Enables: Professional profile posting
- Scopes: Write posts, read analytics
- Use case: B2B content distribution

**Connecting OAuth Integration:**
1. Navigate to Settings → "OAuth Integrations" tab
2. Find desired service card
3. Click "Connect" button
4. OAuth popup window opens
5. Log in to third-party service
6. Approve requested permissions
7. Popup closes automatically
8. Integration card shows "Connected ✓" status
9. Email address displayed (if applicable)

**Disconnecting Integration:**
1. Click integration card
2. Click "Disconnect" button
3. Confirmation dialog: "Are you sure?"
4. Click "Disconnect" to confirm
5. Integration revoked on both sides

**Troubleshooting OAuth:**
- **Popup Blocked**: Enable popups for this site
- **Connection Failed**: Try incognito mode (clears cookies)
- **Permissions Denied**: Must approve all scopes to connect
- **Session Expired**: Reconnect to refresh token

### 7.2 Webhooks and Event Notifications

Webhooks enable real-time notifications when specific events occur in the platform.

#### Understanding Webhooks

**What is a Webhook?**
A webhook is an HTTP callback: when an event happens, the platform sends a POST request to your specified URL with event details.

**Common Use Cases:**
- Notify your own system when agent completes task
- Trigger downstream workflows in Zapier or n8n
- Update external databases with execution results
- Send custom notifications via Slack/Discord
- Log events to monitoring systems

#### Creating Webhooks

**Access Webhooks:**
1. Settings → "Webhooks" tab
2. Current webhooks displayed in table

**Webhook Limit Badge:**
- Shows: "X of Y webhooks used"
- Limit based on plan (Starter: 5, Growth: 15, Professional: 50)

**Add New Webhook:**
1. Click "+ Add Webhook"
2. **Webhook Form:**

**Name** (Required)
- Descriptive identifier
- Example: "Zapier Task Completion Hook"

**Webhook URL** (Required)
- Must start with `https://`
- Example: `https://hooks.zapier.com/hooks/catch/123456/abcdef`
- Validated for HTTPS only (security requirement)

**Event Types** (Select at least one)
- ☑️ `agent.task.started` - New task begins execution
- ☑️ `agent.task.completed` - Task finishes successfully
- ☑️ `agent.task.failed` - Task encounters error
- ☐ `browser.session.started` - Browser session created
- ☐ `browser.session.completed` - Browser session finished
- ☐ `swarm.created` - New swarm initialized
- ☐ `swarm.completed` - Swarm finished all tasks

**Description** (Optional)
- Notes about this webhook's purpose
- Only visible to your team

3. Click "Create Webhook"
4. **Signing Secret** generated automatically
5. Copy signing secret (needed to verify webhook authenticity)

#### Webhook Payload Structure

**Example Payload** (`agent.task.completed`):
```json
{
  "event": "agent.task.completed",
  "timestamp": "2025-12-15T14:30:00Z",
  "data": {
    "executionId": "exec_abc123def456",
    "taskDescription": "Generate SEO report for homepage",
    "status": "completed",
    "duration": 45320,
    "result": {
      "summary": "SEO report generated successfully",
      "fileUrl": "https://storage.ghl-agency-ai.com/reports/seo_report_123.pdf"
    }
  },
  "signature": "sha256=a3b2c1..."
}
```

**Payload Fields:**
- `event`: Event type that triggered webhook
- `timestamp`: ISO 8601 UTC timestamp
- `data`: Event-specific details (varies by event)
- `signature`: HMAC SHA-256 signature for verification

#### Verifying Webhook Signatures

**Why Verify?**
Ensures webhook requests actually came from GHL Agency AI (not a malicious actor)

**Verification Process** (Pseudo-code):
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Usage:
const isValid = verifyWebhook(
  req.body,                    // Raw request body
  req.headers['x-signature'],  // Signature header
  'your_signing_secret'        // From webhook settings
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}

// Process webhook...
```

**Important:**
- Always verify signatures in production
- Use constant-time comparison (prevents timing attacks)
- Reject requests with invalid signatures

#### Managing Webhooks

**Webhook Table Columns:**
- **Name**: Webhook identifier
- **URL**: Destination endpoint (truncated if long)
- **Event Types**: Badges for subscribed events
- **Status**: Active (toggle switch) or Inactive
- **Deliveries**: Success/failure counts
- **Actions**: Test, Edit, Delete buttons

**Testing Webhooks:**
1. Click "Test" button
2. System sends sample payload to your URL
3. Results display:
   - ✓ **Success (200-299)**: Endpoint working
   - ✗ **Failed (400-599)**: Error response from endpoint
   - ⚠️ **Timeout**: No response within 10 seconds
4. View full request/response in logs

**Webhook Delivery Logs:**
1. Click "View Logs" button in webhooks header
2. Table shows recent delivery attempts:
   - Timestamp
   - Webhook name
   - Event type
   - Status (success/failure)
   - HTTP status code
   - Error message (if failed)

**Retry Logic:**
- Failed webhooks retry automatically
- Retry schedule: 1 min, 5 min, 30 min, 2 hours, 6 hours
- After 5 failures, webhook marked as unhealthy
- Email notification sent to account owner
- Webhook auto-disabled after 10 consecutive failures

**Disabling/Enabling Webhooks:**
- Toggle switch in Status column
- Disabled webhooks don't receive events (no deliveries attempted)
- Useful for temporary maintenance
- Re-enable anytime with same toggle

### 7.3 User Preferences

Customize your personal experience with the platform.

#### Accessing Preferences

Settings → "Preferences" tab

#### General Settings

**Default Browser**
- Select: Chromium, Firefox, or WebKit
- Determines which browser engine agents use
- Recommendation: Chromium (best compatibility)

**Timezone**
- Select your local timezone
- Affects timestamp display throughout platform
- Options: All IANA timezones (America/New_York, Europe/London, etc.)
- Used for scheduled tasks

**Language** (Future)
- Currently: English only
- Planned: Spanish, French, German, Portuguese

#### Display Preferences

**Theme**
- **Light**: Traditional light mode
- **Dark**: Modern dark mode (default, recommended)
- **System**: Matches OS theme preference
- Changes apply immediately

**Density**
- **Comfortable**: More padding, larger elements (default)
- **Compact**: Tighter spacing, more content visible
- **Cozy**: Balance between comfortable and compact

**Animations**
- Toggle ON/OFF
- Disabling improves performance on slower devices
- Affects: loading spinners, transitions, progress animations

#### Notification Settings

**Email Notifications**
Toggle individual notification types:

- ☑️ Task Completed - Agent finishes execution
- ☑️ Task Failed - Agent encounters error
- ☑️ Swarm Completed - Multi-agent coordination finishes
- ☑️ Limit Warnings - Approaching subscription limits
- ☑️ Weekly Summary - Stats digest every Monday
- ☐ Marketing Updates - Product news and tips
- ☐ Billing Reminders - Upcoming charges

**In-App Notifications**
- Toggle ON/OFF globally
- Appears as bell icon in header
- Desktop notifications (requires browser permission)

**Notification Frequency**
- Instant (real-time, as events occur)
- Hourly Digest (batched every hour)
- Daily Digest (summary at 9 AM your timezone)

**Do Not Disturb**
- Set quiet hours (e.g., 10 PM - 7 AM)
- No notifications during this period (except critical alerts)

#### Saving Preferences

**Auto-Save:**
- Most preferences save automatically on change
- Look for checkmark ✓ next to setting

**Manual Save:**
- Some settings require explicit save
- Click "Save Preferences" button at bottom
- Confirmation toast: "Preferences updated successfully"

**Reset to Defaults:**
- Click "Reset to Defaults" button
- Confirmation dialog: "This will reset all preferences"
- Cannot be undone
- Useful if settings become misconfigured

---

## 8. Troubleshooting

### 8.1 Common Issues and Solutions

#### "Monthly Limit Reached" Error

**Symptom:**
- Cannot start new agent tasks
- Error message: "Monthly execution limit reached"
- Red banner in dashboard

**Cause:**
You've used all monthly executions for your subscription tier.

**Solution:**
1. **Immediate Fix**: Purchase an execution pack
   - Settings → Subscription → "Buy Execution Pack"
   - Credits added instantly, tasks can resume
2. **Long-Term Fix**: Upgrade subscription tier
   - Settings → Subscription → "Upgrade Plan"
   - Higher tiers have more monthly executions

**Prevention:**
- Enable email notifications for limit warnings
- Monitor usage weekly in Subscription dashboard
- Plan execution-heavy tasks earlier in billing cycle

---

#### Agent Task Stuck in "Planning" State

**Symptom:**
- Task shows "Planning" status for > 2 minutes
- Progress bar not moving
- No log entries appearing

**Cause:**
- OpenAI API rate limit exceeded
- Invalid or expired OpenAI API key
- Network connectivity issue

**Solution:**
1. **Check OpenAI Key:**
   - Settings → API Keys → OpenAI → "Test"
   - If invalid, update key
2. **Wait for Rate Limit Reset:**
   - If rate limited, wait 60 seconds
   - Or upgrade OpenAI account for higher limits
3. **Terminate and Retry:**
   - Click "Terminate" on stuck task
   - Wait 30 seconds
   - Retry task with same description

**Prevention:**
- Monitor OpenAI usage in provider dashboard
- Upgrade OpenAI tier if frequently rate limited
- Spread execution-heavy tasks throughout day

---

#### Browser Session Fails Immediately

**Symptom:**
- Browser session status changes to "Failed" within seconds
- Error log: "Failed to initialize browser"

**Cause:**
- Invalid Browserbase API key
- Browserbase quota exceeded
- Website blocks automation

**Solution:**
1. **Verify Browserbase Key:**
   - Settings → API Keys → Browserbase → "Test"
   - Update if invalid
2. **Check Browserbase Quota:**
   - Log in to Browserbase dashboard
   - View current usage vs. limits
   - Upgrade Browserbase plan if needed
3. **Review Target Website:**
   - Some sites aggressively block bots
   - Try different user agent in browser config
   - Consider residential proxies (Enterprise plan)

**Prevention:**
- Monitor Browserbase usage weekly
- Test new automation targets with single session first
- Review Browserbase logs for blocking patterns

---

#### Webhooks Not Receiving Events

**Symptom:**
- Webhook shows "Active" but deliveries are 0
- External system not receiving notifications

**Cause:**
- Incorrect webhook URL
- Endpoint requires authentication
- Endpoint timeout (> 10 seconds)
- Firewall blocking webhook IP

**Solution:**
1. **Test Webhook:**
   - Settings → Webhooks → "Test" button
   - Review error message if test fails
2. **Verify URL:**
   - Check for typos
   - Ensure `https://` (not `http://`)
   - Test URL with `curl` or Postman
3. **Check Endpoint Response Time:**
   - Webhooks timeout after 10 seconds
   - Optimize endpoint to respond < 5 seconds
   - Use async processing for long tasks
4. **Review Firewall Rules:**
   - Allowlist webhook IP range (provided in webhook logs)
   - Check endpoint CORS settings

**Prevention:**
- Always test webhooks after creation
- Monitor "View Logs" for delivery failures
- Set up email alerts for webhook failures

---

#### OAuth Integration Disconnects Unexpectedly

**Symptom:**
- Previously connected integration shows "Disconnected"
- Automations using integration fail

**Cause:**
- User revoked permissions in third-party service
- Refresh token expired
- Third-party API changed permissions

**Solution:**
1. **Reconnect Integration:**
   - Settings → OAuth Integrations
   - Click "Connect" on disconnected service
   - Re-approve permissions
2. **Check Third-Party Account:**
   - Log in to third-party service
   - Verify account active and not suspended
   - Check for permission changes

**Prevention:**
- Don't manually revoke app access in third-party services
- Refresh tokens automatically every 30 days
- Subscribe to third-party API change notifications

---

#### Swarm Never Completes

**Symptom:**
- Swarm runs for hours without finishing
- Some tasks show "Pending" indefinitely
- Agent count doesn't decrease

**Cause:**
- Circular task dependencies
- Agent deadlock (waiting on each other)
- Overly broad objective

**Solution:**
1. **Review Swarm Details:**
   - Click swarm → "View Details"
   - Check "Task Distribution" graph
   - Identify stuck tasks
2. **Terminate Problem Tasks:**
   - Select stuck tasks
   - Click "Terminate"
   - Swarm re-assigns to different agents
3. **Simplify Objective:**
   - Terminate entire swarm
   - Break objective into smaller, focused swarms
   - Run sequentially instead of single large swarm

**Prevention:**
- Keep swarm objectives specific and focused
- Avoid objectives with > 20 sub-tasks
- Monitor swarm progress first 5 minutes
- Use "Auto" strategy unless you have specific needs

---

### 8.2 Getting Help

#### In-Platform Support

**Help Center**
- Click "?" icon in top-right corner
- Searchable knowledge base
- Video tutorials
- Step-by-step guides

**Live Chat** (Growth, Professional, Enterprise plans)
- Click "Chat" icon in bottom-right
- Connect with support agent
- Average response: < 5 minutes
- Available: 9 AM - 6 PM ET, Monday-Friday

**Support Tickets**
- Settings → Support → "Create Ticket"
- Include:
  - Detailed problem description
  - Steps to reproduce
  - Screenshots or screen recordings
  - Execution IDs (if applicable)
- Response SLA:
  - Starter: 48 hours
  - Growth: 24 hours
  - Professional: 12 hours
  - Enterprise: 4 hours

#### Community Resources

**Documentation**
- Full docs at `/docs`
- Architecture guides
- API references
- Integration tutorials

**Video Library**
- YouTube channel: GHL Agency AI
- Onboarding series
- Feature deep-dives
- Weekly tips

**Community Forum** (Coming Soon)
- Share use cases
- Request features
- Connect with other users

#### Emergency Support (Enterprise Only)

**24/7 Phone Support**
- Call dedicated support line (provided in Enterprise dashboard)
- Direct escalation to engineering team
- Critical issue SLA: 1 hour response

**Dedicated Success Manager**
- Scheduled check-ins (weekly or bi-weekly)
- Proactive optimization suggestions
- Direct Slack channel
- Custom training sessions

#### Feature Requests

**Submitting Requests:**
1. Settings → Support → "Feature Request"
2. Describe desired functionality
3. Explain use case and business value
4. Provide examples or mockups (optional)

**Roadmap Visibility:**
- Public roadmap at `/roadmap`
- Upvote features you want
- Track development status
- Estimated release quarters

---

## Appendix A: Keyboard Shortcuts

Global shortcuts work throughout the platform:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus search |
| `Cmd/Ctrl + N` | New agent task |
| `Cmd/Ctrl + R` | Refresh current view |
| `Cmd/Ctrl + A` | Select all items |
| `Cmd/Ctrl + D` | Navigate to dashboard |
| `Cmd/Ctrl + S` | Save current form |
| `Esc` | Close modal / Clear selection |
| `?` | Show keyboard shortcuts help |

---

## Appendix B: Subscription Renewal and Billing

**Billing Cycle:**
- Subscriptions bill monthly on your signup anniversary
- Example: Signed up Dec 15 → Bills 15th of each month
- Auto-renewal 3 days before due date

**Payment Methods:**
- Credit/debit cards (Visa, Mastercard, Amex, Discover)
- ACH bank transfer (Enterprise only)
- Invoicing (Enterprise with NET 30 terms)

**Failed Payment:**
- Email notification immediately
- 3-day grace period
- After 3 days: Account suspended (read-only)
- After 7 days: Account deactivated
- After 30 days: Data deleted

**Updating Payment Method:**
1. Settings → Billing → "Payment Methods"
2. Click "Add Payment Method"
3. Enter new card details
4. Click "Set as Default"
5. Old card can be removed

**Invoices and Receipts:**
- Settings → Billing → "Invoices"
- All past invoices downloadable as PDF
- Includes itemized charges
- Tax information included

---

## Appendix C: Data Security and Privacy

**Data Encryption:**
- In transit: TLS 1.3
- At rest: AES-256
- Database: PostgreSQL with row-level encryption

**Data Location:**
- Primary: US East (Neon / AWS)
- EU option: Available on Enterprise plan
- SOC 2 Type II certified

**Data Retention:**
- Active accounts: Indefinite
- Cancelled accounts: 30 days full, 60 days archive, 90 days deletion
- Backups: 30-day rolling window

**GDPR Compliance:**
- Right to access: Export all data via Settings → Privacy
- Right to erasure: Delete account → permanent deletion in 90 days
- Data portability: JSON export of all account data

**Who Can Access Your Data:**
- Your team members (based on roles)
- GHL Agency AI support (only with your permission for troubleshooting)
- Third-party services (only for integrations you've explicitly enabled)

---

## Appendix D: Terms and Definitions

**Agent**: An AI-powered automation instance that performs a specific task

**Swarm**: Multiple agents coordinating to accomplish a complex objective

**Execution**: One complete agent task from start to finish

**Session**: A browser automation instance (Browserbase)

**Webhook**: HTTP callback triggered by platform events

**OAuth**: Secure authorization protocol for connecting third-party services

**SSE (Server-Sent Events)**: Real-time updates from server to browser

**tRPC**: Type-safe API communication framework

**Browserbase**: Cloud browser infrastructure provider

**Stagehand**: AI-powered browser automation framework

**Brand Voice**: Configuration defining how agents communicate on behalf of clients

**Execution Pack**: One-time purchase of additional monthly executions

**Tenant**: Your organization's isolated account within the platform

---

**End of User Guide**

For additional help, contact support@ghl-agency-ai.com or visit our documentation at https://docs.ghl-agency-ai.com

---

*This guide is continuously updated. Last revision: December 15, 2025*
