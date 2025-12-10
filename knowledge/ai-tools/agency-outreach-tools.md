# Agency Outreach & Prospecting Tools Guide

## Overview

Outreach and prospecting tools help marketing agencies find leads, research prospects, automate outreach, and manage relationships at scale.

## Lead Generation Tools

### 1. Apollo.io

**Overview**
All-in-one sales intelligence and engagement platform.

**Features**
- 275M+ contacts database
- Email finder and verification
- Sequences and automation
- CRM integration
- Intent data
- Dialer

**Browser Navigation**
```
Login: https://app.apollo.io/
Dashboard: Main metrics and activity
People Search: Find contacts by criteria
Companies: Search and filter companies
Sequences: Automated outreach campaigns
Enrichment: Enhance existing data
```

**Search Filters**
```
Person filters:
- Job titles (Marketing Director, CMO)
- Seniority (C-Level, VP, Director)
- Department (Marketing, Sales)
- Location
- Company size
- Industry

Company filters:
- Revenue range
- Employee count
- Industry/vertical
- Technology stack
- Funding stage
```

**Sequence Setup**
```
Step 1: Initial email (Day 0)
Step 2: Follow-up email (Day 3)
Step 3: LinkedIn connection (Day 5)
Step 4: Follow-up email (Day 7)
Step 5: Breakup email (Day 14)

Best practices:
- Personalize first line
- Reference company/role specifics
- Clear value proposition
- Single call-to-action
- A/B test subject lines
```

---

### 2. ZoomInfo

**Overview**
Enterprise B2B data and intelligence platform.

**Features**
- Company and contact database
- Intent signals
- Website visitor tracking
- Workflows
- Integrations

**Data Points**
```
Contact info:
- Direct dial phone
- Email address
- Social profiles
- Employment history

Company info:
- Revenue
- Employee count
- Tech stack
- Org charts
- News and updates
```

**Browser Navigation**
```
Search: app.zoominfo.com/search
- Advanced filters
- Saved searches
- List building

Intent: Intent data signals
- Topics being researched
- Buying signals
- Competitive research

Workflows: Automated actions
- Enrich CRM records
- Alert on signals
- Sync to sequences
```

---

### 3. LinkedIn Sales Navigator

**Overview**
LinkedIn's premium sales prospecting tool.

**Features**
- Advanced search filters
- Lead recommendations
- InMail credits
- CRM sync
- TeamLink connections

**Search Strategies**
```
Boolean search:
"Marketing" AND ("Director" OR "VP" OR "Head")
NOT "Assistant" NOT "Coordinator"

Filter combinations:
- 2nd degree connections (warm intros)
- Posted on LinkedIn (active users)
- Changed jobs (recent changes)
- Mentioned in news
```

**Browser Navigation**
```
Home: linkedin.com/sales/
Search: Advanced lead/account search
Lists: Saved leads and accounts
InMail: Direct messaging
Alerts: Lead activity notifications
```

**Outreach Templates**
```
Connection request (300 chars):
"Hi [Name], I noticed [specific observation].
I help [type of company] with [specific outcome].
Would love to connect and share insights."

InMail structure:
1. Personalized opening (reference their content/company)
2. Credibility statement
3. Value proposition
4. Soft call-to-action
5. Sign-off
```

---

### 4. Hunter.io

**Overview**
Email finder and verification tool.

**Features**
- Domain search
- Email finder
- Email verifier
- Campaigns
- Chrome extension

**API Integration**
```javascript
// Find emails for domain
const response = await fetch(
  `https://api.hunter.io/v2/domain-search?domain=example.com&api_key=${API_KEY}`
);

// Verify email
const verify = await fetch(
  `https://api.hunter.io/v2/email-verifier?email=test@example.com&api_key=${API_KEY}`
);

// Response includes:
{
  result: "deliverable" | "undeliverable" | "risky",
  score: 95,
  smtp_check: true,
  mx_records: true
}
```

**Browser Navigation**
```
Domain Search: hunter.io/search
- Enter domain
- View all found emails
- Filter by department
- Export results

Email Finder: hunter.io/email-finder
- Enter name + domain
- Get most likely email
- Confidence score

Campaigns: hunter.io/campaigns
- Create sequences
- Track opens/clicks
- Manage follow-ups
```

---

### 5. Lemlist

**Overview**
Cold email outreach with personalization.

**Features**
- Image personalization
- Video personalization
- Automated sequences
- Deliverability tools
- A/B testing

**Personalization Options**
```
Text variables:
{{firstName}}, {{company}}, {{customField}}

Image personalization:
- Personalized screenshots
- Custom images with name
- LinkedIn profile in image

Video personalization:
- Name on whiteboard
- Custom thumbnails
- Dynamic greetings
```

**Sequence Best Practices**
```
Email 1 (Day 0):
- Personalized observation
- Clear value prop
- Soft CTA

Email 2 (Day 3):
- Reference previous email
- Add social proof
- Different angle

Email 3 (Day 7):
- Share relevant content
- Case study
- Ask question

Email 4 (Day 14):
- Breakup email
- Leave door open
- Final value offer
```

---

### 6. Instantly.ai

**Overview**
Cold email infrastructure and automation.

**Features**
- Unlimited email accounts
- Email warmup
- Campaign automation
- Deliverability monitoring
- Analytics

**Setup Process**
```
1. Connect email accounts
   - Multiple domains recommended
   - SPF, DKIM, DMARC setup

2. Email warmup (2-4 weeks)
   - Gradual volume increase
   - Engagement simulation

3. Campaign creation
   - Upload leads
   - Create sequences
   - Set sending limits

4. Monitor deliverability
   - Open rates
   - Reply rates
   - Bounce rates
   - Spam reports
```

**Deliverability Tips**
```
Domain setup:
- Separate domains for outreach
- Proper DNS records
- Domain age (30+ days)

Sending practices:
- Max 50 emails/day/account
- Randomized sending times
- Natural sending patterns
- Avoid spam triggers
```

---

### 7. Vidyard

**Overview**
Video messaging for sales and marketing.

**Features**
- Screen recording
- Webcam recording
- Video hosting
- Analytics
- Integrations

**Video Outreach Tips**
```
Structure (under 90 seconds):
1. Personalized greeting (10s)
2. Why reaching out (20s)
3. Value proposition (30s)
4. Call to action (15s)
5. Sign off (5s)

Best practices:
- Show prospect's website/LinkedIn
- Mention specific details
- Be authentic
- Include thumbnail
- Track engagement
```

---

### 8. Calendly

**Overview**
Scheduling automation for meetings.

**Features**
- Calendar integration
- Multiple meeting types
- Team scheduling
- Payment collection
- Workflows

**Setup for Agencies**
```
Meeting types:
- Discovery call (30 min)
- Strategy session (60 min)
- Quick check-in (15 min)
- Team meeting (45 min)

Automation:
- Confirmation emails
- Reminder sequences
- Follow-up workflows
- No-show handling
```

---

### 9. Loom

**Overview**
Async video messaging platform.

**Features**
- Screen + webcam recording
- Instant sharing
- Viewer analytics
- Comments and reactions
- Transcription

**Sales Use Cases**
```
Prospecting:
- Personalized outreach videos
- Website/product walkthroughs
- Custom demo recordings

Follow-up:
- Recap meeting discussions
- Answer questions async
- Share proposals visually

Support:
- Tutorial videos
- Bug explanations
- Feature demonstrations
```

---

### 10. Snov.io

**Overview**
All-in-one outreach platform.

**Features**
- Email finder
- Email verifier
- Drip campaigns
- Email tracker
- CRM

**Workflow**
```
1. Find emails
   - Domain search
   - LinkedIn prospector
   - Company search

2. Verify emails
   - Bulk verification
   - Real-time API
   - Risk scoring

3. Create campaign
   - Sequence builder
   - A/B testing
   - Scheduling

4. Track results
   - Opens and clicks
   - Replies
   - Conversions
```

---

## Prospecting Workflows

### Cold Email Workflow
```
Week 1: Research & List Building
├── Define ICP (Ideal Customer Profile)
├── Build target account list
├── Find decision makers
└── Verify email addresses

Week 2-3: Campaign Preparation
├── Write email sequences
├── Set up personalization
├── Warm up domains
└── Test deliverability

Week 4+: Launch & Optimize
├── Start campaigns
├── Monitor metrics
├── A/B test variations
└── Follow up with engaged
```

### LinkedIn Outreach Workflow
```
Day 1: Connection request
├── Personalized message
├── Reference mutual connection
└── State reason for connecting

Day 3: (If accepted) First message
├── Thank for connecting
├── Share relevant content
└── No pitch yet

Day 7: Value add message
├── Industry insight
├── Case study
└── Helpful resource

Day 14: Soft pitch
├── Mention service
├── Offer to discuss
└── Clear next step
```

### Multi-Channel Cadence
```
Day 1: Email #1 + LinkedIn view
Day 2: LinkedIn connection request
Day 4: Email #2 (if no reply)
Day 5: LinkedIn message (if connected)
Day 7: Email #3 + LinkedIn engagement
Day 10: Phone call attempt
Day 14: Breakup email
Day 21: LinkedIn InMail (if not connected)
```

## Lead Scoring

### Scoring Model
```
Demographic fit (0-40 points):
- Job title match: +10
- Seniority level: +10
- Company size fit: +10
- Industry match: +10

Behavioral signals (0-40 points):
- Email opened: +5
- Link clicked: +10
- Website visit: +10
- Content download: +15

Engagement (0-20 points):
- Reply to email: +10
- LinkedIn engagement: +5
- Meeting booked: +20 (max)

Thresholds:
- Hot lead: 60+ points
- Warm lead: 40-59 points
- Cold lead: <40 points
```

## Metrics & KPIs

### Email Outreach
```
Deliverability: 95%+ (target)
Open rate: 40-60% (cold email)
Reply rate: 5-15%
Positive reply: 2-5%
Meeting booked: 1-3%
```

### LinkedIn Outreach
```
Connection acceptance: 30-50%
Message response: 10-20%
Meeting conversion: 2-5%
```

### Overall Pipeline
```
Contacts reached: 1000
Responses: 50-100 (5-10%)
Qualified leads: 20-40 (2-4%)
Meetings booked: 10-20 (1-2%)
Opportunities: 5-10 (0.5-1%)
Closed deals: 2-5 (0.2-0.5%)
```

## Best Practices

### Personalization
```
Research checklist:
□ LinkedIn profile reviewed
□ Recent posts/activity noted
□ Company news checked
□ Mutual connections identified
□ Pain points hypothesized
□ Relevant case study selected
```

### Compliance
```
GDPR:
- Legitimate interest basis
- Easy opt-out
- Data subject rights
- Record keeping

CAN-SPAM:
- Clear sender identity
- Physical address
- Unsubscribe option
- Honor opt-outs

CCPA:
- Privacy policy
- Do not sell option
- Data access rights
```

### Avoiding Spam
```
Content tips:
- Avoid spam trigger words
- Keep links minimal
- Text-based (not image-heavy)
- Personalize genuinely
- Include unsubscribe

Technical tips:
- Authenticate domains
- Warm up accounts
- Monitor reputation
- Use dedicated IPs
- Rotate sending accounts
```
