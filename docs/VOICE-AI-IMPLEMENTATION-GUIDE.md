# Voice AI Implementation Guide - Bottleneck Bot

> **Complete step-by-step guide to setting up the Sarah Voice AI receptionist in GoHighLevel**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Initial Setup](#2-initial-setup)
3. [Create Custom Fields](#3-create-custom-fields)
4. [Create the Voice AI Agent](#4-create-the-voice-ai-agent)
5. [Configure System Prompt](#5-configure-system-prompt)
6. [Set Up Actions](#6-set-up-actions)
7. [Configure Calendar Integration](#7-configure-calendar-integration)
8. [Set Up Workflows](#8-set-up-workflows)
9. [Assign Phone Numbers](#9-assign-phone-numbers)
10. [Testing](#10-testing)
11. [Go-Live Checklist](#11-go-live-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Before you begin, ensure you have:

### Account Requirements
- [ ] GoHighLevel account with AI Employee access
- [ ] AI Employee enabled (Settings → AI Employee → Enable)
- [ ] Active sub-account where Voice AI will be deployed

### Phone Requirements
- [ ] LC Phone number OR Twilio number configured
- [ ] Phone number NOT already assigned to IVR or other functions
- [ ] Sufficient call credits or Twilio balance

### Calendar Requirements
- [ ] Google Calendar connected OR using GHL native calendar
- [ ] Calendar created for discovery call appointments
- [ ] Availability set in calendar

### API/Webhook Requirements (Optional)
- [ ] Webhook endpoints set up (if using custom actions)
- [ ] API authentication tokens ready
- [ ] SSL certificates valid for webhook URLs

---

## 2. Initial Setup

### Step 2.1: Enable AI Employee

1. Go to **Settings** → **AI Employee**
2. Click **Enable AI Employee**
3. Select your pricing plan:
   - Pay-per-use: Billed per minute
   - Unlimited: $97/month per sub-account
4. Accept terms and activate

### Step 2.2: Verify Phone Configuration

1. Go to **Settings** → **Phone Numbers**
2. Confirm you have an LC Phone or Twilio number
3. Note the phone number(s) you'll use for Voice AI
4. Ensure numbers are not assigned to:
   - IVR/Call Menus
   - Other automations
   - Different sub-accounts

---

## 3. Create Custom Fields

> **Reference:** `docs/voice-ai/CUSTOM-FIELDS.md` for full field definitions

### Step 3.1: Navigate to Custom Fields

1. Go to **Settings** → **Custom Fields**
2. Select **Contact** fields

### Step 3.2: Create Required Fields

Create each field with these settings:

**Field 1: agency_name**
- Type: Single Line Text
- Key: `agency_name`

**Field 2: sub_account_count**
- Type: Dropdown
- Key: `sub_account_count`
- Options: 1-5, 6-10, 11-20, 21-50, 50+

**Field 3: primary_pain_point**
- Type: Multi-Select
- Key: `primary_pain_point`
- Options: GHL Management, VA Issues, Lead Follow-up, Meta Ads, Time Management

**Field 4: buying_timeline**
- Type: Dropdown
- Key: `buying_timeline`
- Options: Ready Now, 1-2 Weeks, This Month, Next Quarter, Just Researching

**Field 5: lead_source**
- Type: Dropdown
- Key: `lead_source`
- Options: Google Search, Facebook Ad, Referral, YouTube, Podcast, LinkedIn, Other

**Field 6: voice_ai_notes**
- Type: Multi-Line Text
- Key: `voice_ai_notes`

**Field 7: voice_ai_lead_score**
- Type: Number
- Key: `voice_ai_lead_score`

### Step 3.3: Create Tags

Go to **Settings** → **Tags** and create:
- `voice-ai-lead`
- `voice-ai-demo-booked`
- `voice-ai-hot-lead`
- `voice-ai-nurture`
- `voice-ai-enterprise`

---

## 4. Create the Voice AI Agent

### Step 4.1: Navigate to AI Agents

1. Go to **Settings** → **AI Agents**
2. Click **+ Create Agent**

### Step 4.2: Basic Configuration

| Setting | Value |
|---------|-------|
| Agent Name | Sarah - Virtual Receptionist |
| Business Name | Bottleneck Bot |
| Agent Type | Voice AI |
| Voice | Select female, neutral American accent |
| Response Speed | Normal |
| Call Duration Limit | 15 minutes |

### Step 4.3: Initial Greeting

Copy and paste:

```
Hi, you've reached Bottleneck Bot! I'm Sarah. Are you looking to learn more about automating your agency operations?
```

---

## 5. Configure System Prompt

### Step 5.1: Switch to Advanced Mode

1. In your agent settings, find **Agent Goals**
2. Click **Advanced Mode** (instead of Basic Mode)
3. You'll see a large text field for custom instructions

### Step 5.2: Copy the System Prompt

> **Full prompt available at:** `docs/voice-ai/SYSTEM-PROMPT.md`

Copy the entire contents of `SYSTEM-PROMPT.md` and paste into the Advanced Mode field.

### Step 5.3: Customize Variables

Replace these placeholders with your actual values:

| Placeholder | Replace With |
|-------------|--------------|
| `[ZOOM_LINK]` | Your Zoom meeting link |
| `[YOUR_SUPPORT_NUMBER]` | Support team phone number |
| `[YOUR_SALES_NUMBER]` | Sales team phone number |
| `[YOUR_MANAGER_NUMBER]` | Manager's phone number |

### Step 5.4: Run Prompt Evaluator

1. Click **Evaluate Prompt** button
2. Review suggestions
3. Mark suggestions as "Resolved" or "Waived"
4. Re-evaluate after changes

---

## 6. Set Up Actions

### Step 6.1: Configure Contact Updates

1. In Agent Settings, find **After-Call Actions**
2. Enable **Update Contact Fields**
3. Map fields:
   - Extracted Name → First Name
   - Extracted Email → Email
   - Extracted Phone → Phone
   - Custom extractions → Custom fields

### Step 6.2: Configure Appointment Booking

1. Enable **Book Appointment** action
2. Select your calendar
3. Configure:
   - Appointment type: Discovery Call
   - Duration: 15 minutes
   - Buffer: 15 minutes

### Step 6.3: Configure SMS Actions

1. Enable **Send SMS** action
2. Create templates:

**Template 1: Demo Booked**
```
Hey {{contact.first_name}}! Your demo with Bottleneck Bot is confirmed for {{appointment.date}} at {{appointment.time}}. See you then!
```

**Template 2: Resources**
```
Hey {{contact.first_name}}! Here's that info I mentioned. Book a demo when ready: ghlagencyai.com/demo
```

### Step 6.4: Configure Workflow Triggers

1. Enable **Trigger Workflow** action
2. Map scenarios:
   - Demo Booked → "Voice AI - Demo Booked" workflow
   - No Demo → "Voice AI - Nurture Sequence" workflow
   - Hot Lead → "Voice AI - Hot Lead Alert" workflow

### Step 6.5: Configure Call Transfers

1. Enable **Transfer Call** action
2. Add destinations:
   - Support: [YOUR_SUPPORT_NUMBER]
   - Sales: [YOUR_SALES_NUMBER]
   - Enterprise: [YOUR_ENTERPRISE_NUMBER]

---

## 7. Configure Calendar Integration

### Step 7.1: Connect Calendar

1. Go to **Settings** → **Calendars**
2. Either:
   - Connect Google Calendar, OR
   - Use GHL native calendar

### Step 7.2: Create Discovery Call Calendar

1. Create new calendar: "Discovery Calls"
2. Configure:
   - Duration: 15 minutes
   - Buffer before: 15 minutes
   - Buffer after: 15 minutes

### Step 7.3: Set Availability

1. Go to calendar settings
2. Set available hours:
   - Monday-Friday: 9:00 AM - 5:00 PM
   - Saturday-Sunday: Unavailable
3. Add any blocked dates

### Step 7.4: Configure Confirmation

1. Enable email confirmations
2. Enable SMS reminders
3. Set reminder times:
   - 24 hours before
   - 1 hour before

---

## 8. Set Up Workflows

### Workflow 1: Voice AI - Demo Booked

**Trigger:** Appointment Booked

**Actions:**
1. Wait 1 minute
2. Send Email: Demo Confirmation
3. Update Pipeline: Move to "Demo Scheduled"
4. Create Task: "Prep for demo - {{contact.first_name}}"
5. Wait until 24 hours before appointment
6. Send SMS: Reminder
7. Wait until 1 hour before
8. Send SMS: Final reminder with link

### Workflow 2: Voice AI - Nurture Sequence

**Trigger:** Contact Tagged with "voice-ai-nurture"

**Actions:**
1. Wait 10 minutes
2. Send SMS: Resources link
3. Wait 2 days
4. Send Email: "Still thinking about automation?"
5. Wait 3 days
6. Send SMS: Quick follow-up
7. Wait 4 days
8. Send Email: Case study
9. Wait 7 days
10. Send Email: Final offer

### Workflow 3: Voice AI - Hot Lead Alert

**Trigger:** Custom Field "voice_ai_lead_score" > 80

**Actions:**
1. Send Internal Notification: Email/Slack
2. Create High Priority Task
3. Update Pipeline: Move to "Hot Lead"

### Workflow 4: Voice AI - Enterprise Lead

**Trigger:** Contact Tagged with "voice-ai-enterprise"

**Actions:**
1. Send Internal Alert to Sales Lead
2. Update Pipeline: Move to "Enterprise"
3. Send Email: Enterprise information pack
4. Create Task: "Enterprise outreach within 1 hour"

---

## 9. Assign Phone Numbers

### Step 9.1: Navigate to Phone Settings

1. In Agent Settings, go to **Phone and Availability**
2. Click **Assign Phone Numbers**

### Step 9.2: Select Numbers

1. Check the box next to your Voice AI phone number(s)
2. Click **Assign**

### Step 9.3: Configure Business Hours

| Day | Start | End |
|-----|-------|-----|
| Monday | 9:00 AM | 5:00 PM |
| Tuesday | 9:00 AM | 5:00 PM |
| Wednesday | 9:00 AM | 5:00 PM |
| Thursday | 9:00 AM | 5:00 PM |
| Friday | 9:00 AM | 5:00 PM |
| Saturday | Closed | Closed |
| Sunday | Closed | Closed |

### Step 9.4: Configure After-Hours

1. Enable after-hours handling
2. Options:
   - Route to same agent with modified greeting, OR
   - Route to voicemail
   - Forward to another number

---

## 10. Testing

### Step 10.1: Test Call - Basic

1. Call your Voice AI number
2. Verify:
   - [ ] Greeting plays correctly
   - [ ] Agent responds naturally
   - [ ] Agent asks qualification questions
   - [ ] Agent offers to book demo

### Step 10.2: Test Call - Booking Flow

1. Call and request to book a demo
2. Verify:
   - [ ] Agent asks for available time preference
   - [ ] Agent confirms appointment
   - [ ] Calendar event created
   - [ ] Confirmation SMS sent
   - [ ] Workflow triggered

### Step 10.3: Test Call - Transfer

1. Call and request to speak to a human
2. Verify:
   - [ ] Agent acknowledges transfer request
   - [ ] Call routes to correct destination

### Step 10.4: Test Call - Objections

1. Call and express concerns:
   - "That's too expensive"
   - "I need to think about it"
   - "I already have VAs"
2. Verify:
   - [ ] Agent handles objections smoothly
   - [ ] Agent doesn't get stuck

### Step 10.5: Verify Data Collection

1. After test calls, check contact record
2. Verify:
   - [ ] Name captured correctly
   - [ ] Email captured correctly
   - [ ] Custom fields populated
   - [ ] Tags applied
   - [ ] Notes recorded

---

## 11. Go-Live Checklist

### Pre-Launch
- [ ] All test calls passed
- [ ] Calendar availability confirmed
- [ ] Workflows tested and working
- [ ] SMS templates reviewed for errors
- [ ] Transfer numbers verified
- [ ] Team notified of launch

### Launch Day
- [ ] Monitor first 5 calls in real-time
- [ ] Check contact records update correctly
- [ ] Verify appointments book correctly
- [ ] Confirm workflows trigger properly
- [ ] Test one booking end-to-end

### Post-Launch (First Week)
- [ ] Review 10+ call recordings
- [ ] Check conversion rates
- [ ] Identify common questions not covered
- [ ] Gather team feedback
- [ ] Make prompt adjustments as needed

---

## 12. Troubleshooting

### Issue: Agent Not Answering Calls

**Check:**
1. Phone number is assigned to agent
2. Business hours are configured correctly
3. Phone number not used by other features
4. AI Employee is enabled

### Issue: Agent Not Booking Appointments

**Check:**
1. Calendar is connected
2. Availability is set
3. Required fields (name, email) being collected
4. Calendar permissions are correct

### Issue: SMS Not Sending

**Check:**
1. SMS credits available
2. Phone number has SMS capability
3. Templates don't have errors
4. Contact has valid phone number

### Issue: Workflows Not Triggering

**Check:**
1. Workflow is published (not draft)
2. Trigger conditions match
3. Contact meets trigger criteria
4. No errors in workflow log

### Issue: Agent Giving Wrong Information

**Check:**
1. System prompt has correct information
2. Pricing is up to date
3. Business details are accurate
4. Run Prompt Evaluator for issues

### Issue: Calls Dropping

**Check:**
1. Call duration limit not too short
2. Internet connection stable
3. Twilio/LC Phone status normal
4. No billing issues

---

## Support Resources

- **GHL Help Center:** help.gohighlevel.com
- **Voice AI Documentation:** help.gohighlevel.com/support/solutions/155000003911
- **Custom Actions Guide:** help.gohighlevel.com/support/solutions/155000005461

---

## Document References

| Document | Path | Purpose |
|----------|------|---------|
| System Prompt | `docs/voice-ai/SYSTEM-PROMPT.md` | Full prompt to copy |
| Actions Config | `docs/voice-ai/ACTIONS-CONFIG.md` | Action setup details |
| Custom Fields | `docs/voice-ai/CUSTOM-FIELDS.md` | Field definitions |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-24 | Initial release |
