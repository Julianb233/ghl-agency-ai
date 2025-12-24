# Voice AI Actions Configuration - Bottleneck Bot

> **Configure these actions in GoHighLevel Voice AI → Agent Settings**

---

## Standard Actions

### 1. Update Contact Fields

**Purpose:** Save caller information to their contact record

**Field Mapping:**

| Voice AI Field | GHL Contact Field | Type |
|----------------|-------------------|------|
| Caller Name | First Name + Last Name | Standard |
| Email | Email | Standard |
| Phone | Phone | Standard (auto-captured) |
| Agency Name | agency_name | Custom |
| Sub-account Count | sub_account_count | Custom |
| Pain Point | primary_pain_point | Custom |
| Lead Source | lead_source | Custom |
| Timeline | buying_timeline | Custom |
| Call Notes | voice_ai_notes | Custom |

**Trigger:** Automatically during and after every call

---

### 2. Book Appointment

**Purpose:** Schedule discovery calls with qualified leads

**Configuration:**
- **Calendar:** Connect to "Discovery Calls" calendar in GHL
- **Appointment Type:** 15-minute Discovery Call
- **Buffer Time:** 15 minutes between calls
- **Availability:** Mon-Fri, 9am-5pm (your timezone)

**Required Before Booking:**
- Caller name (first and last)
- Email address
- Phone number

**Confirmation Actions:**
- Send calendar invite to caller
- Add to "Demo Booked" pipeline stage
- Trigger "Voice AI - Demo Booked" workflow

---

### 3. Send SMS

**Purpose:** Follow-up with callers after the call ends

**SMS Templates:**

#### Demo Booked Confirmation
```
Hey {{contact.first_name}}! Thanks for calling Bottleneck Bot. Your demo is confirmed for {{appointment.date}} at {{appointment.time}}.

Here's your meeting link: [ZOOM_LINK]

See you then!
- The Bottleneck Bot Team
```

#### Didn't Book - Nurture
```
Hey {{contact.first_name}}! Thanks for calling Bottleneck Bot.

Want to see how 487+ agencies are saving 20+ hours a week?

Book a demo when you're ready: ghlagencyai.com/demo

Talk soon!
```

#### Sent Resources
```
Hey {{contact.first_name}}! Here's that info I mentioned:

Case Studies: ghlagencyai.com/case-studies
How It Works: ghlagencyai.com/how-it-works
Book a Demo: ghlagencyai.com/demo

Questions? Just reply to this text!
```

---

### 4. Trigger Workflow

**Purpose:** Add callers to appropriate automation sequences

**Workflow Triggers:**

| Scenario | Workflow Name | When |
|----------|---------------|------|
| Demo booked | Voice AI - Demo Booked | After booking confirmed |
| Didn't book | Voice AI - Nurture Sequence | Call ends, no booking |
| Hot lead | Voice AI - Hot Lead Alert | Qualified, wants callback |
| Enterprise | Voice AI - Enterprise Lead | 50+ sub-accounts mentioned |
| Existing customer | Voice AI - Customer Support | Identified as customer |

---

### 5. Transfer Call

**Purpose:** Route calls to human team members when needed

**Transfer Destinations:**

| Condition | Transfer To | Phone/Extension |
|-----------|-------------|-----------------|
| Billing issue | Support Team | [YOUR_SUPPORT_NUMBER] |
| Enterprise inquiry | Sales Lead | [YOUR_SALES_NUMBER] |
| Angry caller | Manager | [YOUR_MANAGER_NUMBER] |
| Technical question | Support | [YOUR_SUPPORT_NUMBER] |
| Cancel request | Retention | [YOUR_RETENTION_NUMBER] |

**Transfer Message (to caller):**
"Let me connect you with someone who can help. One moment please."

**Transfer Message (to team):**
"Incoming transfer from Voice AI. Caller: {{contact.first_name}}. Reason: [transfer_reason]"

---

## Custom Actions (Webhooks)

### Custom Action 1: Lead Scoring

**Purpose:** Score leads in real-time based on qualification data

**Trigger Conditions:**
- After qualification questions answered
- When agency size is mentioned
- When pain points are identified

**Webhook Configuration:**
```
Method: POST
URL: https://your-domain.com/api/voice-ai/lead-score

Headers:
- Authorization: Bearer YOUR_API_KEY
- Content-Type: application/json

Request Body:
{
  "contact_id": "{{contact.id}}",
  "phone": "{{contact.phone}}",
  "agency_size": "{{extracted.agency_size}}",
  "sub_accounts": "{{extracted.sub_account_count}}",
  "pain_points": "{{extracted.pain_points}}",
  "timeline": "{{extracted.timeline}}",
  "lead_source": "{{extracted.lead_source}}",
  "call_timestamp": "{{call.timestamp}}"
}
```

**Expected Response:**
```json
{
  "score": 85,
  "priority": "high",
  "recommended_action": "book_demo",
  "notes": "Hot lead - mentions VA frustration"
}
```

---

### Custom Action 2: CRM Enrichment

**Purpose:** Pull existing customer data for personalization

**Trigger Conditions:**
- When email is mentioned
- When company name is mentioned
- At call start (if caller ID matches existing contact)

**Webhook Configuration:**
```
Method: POST
URL: https://your-domain.com/api/voice-ai/enrich

Headers:
- Authorization: Bearer YOUR_API_KEY
- Content-Type: application/json

Request Body:
{
  "phone": "{{contact.phone}}",
  "email": "{{extracted.email}}",
  "company": "{{extracted.company_name}}"
}
```

**Expected Response:**
```json
{
  "is_existing_customer": false,
  "previous_calls": 0,
  "company_info": {
    "name": "Agency XYZ",
    "size": "10-20",
    "industry": "digital marketing"
  },
  "personalization": {
    "mention_previous_interaction": false,
    "relevant_case_study": "marketing_agency_case"
  }
}
```

---

### Custom Action 3: Appointment Availability Check

**Purpose:** Check real-time calendar availability

**Trigger Conditions:**
- When caller asks about scheduling
- Before presenting time slots

**Webhook Configuration:**
```
Method: POST
URL: https://your-domain.com/api/voice-ai/availability

Headers:
- Authorization: Bearer YOUR_API_KEY
- Content-Type: application/json

Request Body:
{
  "calendar_id": "discovery_calls",
  "date_range": "next_7_days",
  "duration_minutes": 15
}
```

**Expected Response:**
```json
{
  "available_slots": [
    {"date": "2024-12-26", "time": "10:00 AM", "timezone": "EST"},
    {"date": "2024-12-26", "time": "2:00 PM", "timezone": "EST"},
    {"date": "2024-12-27", "time": "11:00 AM", "timezone": "EST"}
  ],
  "next_available": "Tomorrow at 10 AM"
}
```

---

### Custom Action 4: Call Summary Logging

**Purpose:** Log detailed call summaries for team review

**Trigger Conditions:**
- When call ends

**Webhook Configuration:**
```
Method: POST
URL: https://your-domain.com/api/voice-ai/log-call

Headers:
- Authorization: Bearer YOUR_API_KEY
- Content-Type: application/json

Request Body:
{
  "call_id": "{{call.id}}",
  "contact_id": "{{contact.id}}",
  "duration_seconds": "{{call.duration}}",
  "outcome": "{{call.outcome}}",
  "booked_demo": "{{call.appointment_booked}}",
  "transferred": "{{call.was_transferred}}",
  "sentiment": "{{call.sentiment}}",
  "key_topics": "{{call.topics}}",
  "follow_up_required": "{{call.needs_followup}}",
  "transcript_summary": "{{call.summary}}"
}
```

---

## Workflow Definitions

### Voice AI - Demo Booked

**Trigger:** Appointment booked via Voice AI

**Steps:**
1. Wait 1 minute
2. Send confirmation email with meeting details
3. Add to "Demo Scheduled" pipeline stage
4. Create task for sales team: "Prep for demo - {{contact.first_name}}"
5. Wait 24 hours before appointment
6. Send reminder SMS
7. Wait 1 hour before appointment
8. Send final reminder SMS with join link

---

### Voice AI - Nurture Sequence

**Trigger:** Call completed, no demo booked

**Steps:**
1. Wait 10 minutes
2. Send SMS with resources
3. Wait 2 days
4. Send email: "Still thinking about automation?"
5. Wait 3 days
6. Send SMS: "Quick question..."
7. Wait 4 days
8. Send email: Case study relevant to their agency type
9. Wait 7 days
10. Send final email: Limited-time offer

---

### Voice AI - Hot Lead Alert

**Trigger:** Lead score > 80 OR mentions "ready to start"

**Steps:**
1. Immediately notify sales team via Slack/Email
2. Create high-priority task
3. Add to "Hot Lead" pipeline stage
4. If no response in 2 hours, escalate to manager

---

### Voice AI - Enterprise Lead

**Trigger:** Mentions 50+ sub-accounts OR "enterprise"

**Steps:**
1. Immediately notify sales lead
2. Add to "Enterprise" pipeline
3. Send custom enterprise information packet
4. Create task for personal outreach within 1 hour

---

## Testing Checklist

Before going live, test each action:

- [ ] Contact fields update correctly
- [ ] Appointment books to correct calendar
- [ ] SMS sends with correct content
- [ ] Workflows trigger appropriately
- [ ] Transfers route to correct destinations
- [ ] Webhooks return expected responses
- [ ] Lead scoring calculates correctly
- [ ] All custom fields populate

---

## Monitoring & Optimization

**Key Metrics to Track:**
- Call-to-demo booking rate
- Average call duration
- Transfer rate
- Lead score accuracy
- Workflow completion rate

**Weekly Review:**
- Listen to 5-10 call recordings
- Check for missed booking opportunities
- Identify common questions not covered
- Update prompts based on findings
