# Custom Fields for Voice AI - Bottleneck Bot

> **Create these custom fields in GoHighLevel before configuring Voice AI**

---

## Required Custom Fields

Create these fields in: **Settings → Custom Fields → Contact Fields**

### 1. agency_name

| Property | Value |
|----------|-------|
| Field Name | Agency Name |
| Field Key | agency_name |
| Field Type | Single Line Text |
| Description | Name of the caller's agency |
| Required | No |

---

### 2. sub_account_count

| Property | Value |
|----------|-------|
| Field Name | Sub-Account Count |
| Field Key | sub_account_count |
| Field Type | Dropdown |
| Description | Number of GHL sub-accounts managed |
| Required | No |

**Dropdown Options:**
- 1-5
- 6-10
- 11-20
- 21-50
- 50+

---

### 3. primary_pain_point

| Property | Value |
|----------|-------|
| Field Name | Primary Pain Point |
| Field Key | primary_pain_point |
| Field Type | Multi-Select |
| Description | Main challenges the agency faces |
| Required | No |

**Multi-Select Options:**
- GHL Management
- VA Issues
- Lead Follow-up
- Meta Ads
- Time Management
- Workflow Creation
- Campaign Management
- Client Onboarding
- Reporting
- Other

---

### 4. buying_timeline

| Property | Value |
|----------|-------|
| Field Name | Buying Timeline |
| Field Key | buying_timeline |
| Field Type | Dropdown |
| Description | When they're looking to make a decision |
| Required | No |

**Dropdown Options:**
- Ready Now
- 1-2 Weeks
- This Month
- Next Quarter
- Just Researching

---

### 5. lead_source

| Property | Value |
|----------|-------|
| Field Name | Lead Source |
| Field Key | lead_source |
| Field Type | Dropdown |
| Description | How they heard about Bottleneck Bot |
| Required | No |

**Dropdown Options:**
- Google Search
- Facebook Ad
- Referral
- YouTube
- Podcast
- LinkedIn
- Twitter/X
- Conference/Event
- Other

---

### 6. current_tools

| Property | Value |
|----------|-------|
| Field Name | Current Tools |
| Field Key | current_tools |
| Field Type | Multi-Select |
| Description | Tools they're currently using |
| Required | No |

**Multi-Select Options:**
- Virtual Assistants
- Zapier
- Make (Integromat)
- Other Automation Tools
- Manual Only
- In-house Team

---

### 7. voice_ai_notes

| Property | Value |
|----------|-------|
| Field Name | Voice AI Notes |
| Field Key | voice_ai_notes |
| Field Type | Multi-Line Text |
| Description | Auto-generated notes from Voice AI calls |
| Required | No |

---

### 8. voice_ai_lead_score

| Property | Value |
|----------|-------|
| Field Name | Voice AI Lead Score |
| Field Key | voice_ai_lead_score |
| Field Type | Number |
| Description | Automatically calculated lead score (0-100) |
| Required | No |

---

### 9. voice_ai_call_count

| Property | Value |
|----------|-------|
| Field Name | Voice AI Call Count |
| Field Key | voice_ai_call_count |
| Field Type | Number |
| Description | Number of times this contact has called |
| Required | No |

---

### 10. voice_ai_last_call

| Property | Value |
|----------|-------|
| Field Name | Voice AI Last Call |
| Field Key | voice_ai_last_call |
| Field Type | Date |
| Description | Date of the most recent Voice AI call |
| Required | No |

---

### 11. voice_ai_outcome

| Property | Value |
|----------|-------|
| Field Name | Voice AI Outcome |
| Field Key | voice_ai_outcome |
| Field Type | Dropdown |
| Description | Outcome of the Voice AI call |
| Required | No |

**Dropdown Options:**
- Demo Booked
- Sent Resources
- Requested Callback
- Transferred to Human
- Not Interested
- Wrong Number
- No Answer/Voicemail

---

### 12. agency_services

| Property | Value |
|----------|-------|
| Field Name | Agency Services |
| Field Key | agency_services |
| Field Type | Multi-Select |
| Description | Services the agency offers |
| Required | No |

**Multi-Select Options:**
- Facebook Ads
- Google Ads
- SEO
- Social Media Management
- Web Design
- Email Marketing
- SMS Marketing
- Full Service Marketing
- Lead Generation
- Reputation Management
- Other

---

## Optional Fields

These fields are nice-to-have but not required:

### contact_preference

| Property | Value |
|----------|-------|
| Field Name | Contact Preference |
| Field Key | contact_preference |
| Field Type | Dropdown |
| Description | Preferred method of contact |

**Options:**
- Phone
- Email
- SMS
- Any

---

### timezone

| Property | Value |
|----------|-------|
| Field Name | Timezone |
| Field Key | timezone |
| Field Type | Dropdown |
| Description | Caller's timezone |

**Options:**
- EST
- CST
- MST
- PST
- Other US
- International

---

## Field Mapping in Voice AI

When configuring Voice AI, map extracted data to these fields:

```
Voice AI extracts "agency name" → agency_name
Voice AI extracts "number of sub-accounts" → sub_account_count
Voice AI extracts "main challenge" → primary_pain_point
Voice AI extracts "timeline to purchase" → buying_timeline
Voice AI extracts "how they found us" → lead_source
Voice AI extracts "current automation tools" → current_tools
Voice AI generates "call notes" → voice_ai_notes
Webhook returns "lead score" → voice_ai_lead_score
```

---

## Pipeline Stages

Create a pipeline for Voice AI leads:

**Pipeline Name:** Voice AI Leads

**Stages:**
1. New Lead (Voice AI Call)
2. Qualified
3. Demo Scheduled
4. Demo Completed
5. Proposal Sent
6. Negotiation
7. Won
8. Lost

---

## Tags to Create

Create these tags for Voice AI contacts:

| Tag | Purpose |
|-----|---------|
| `voice-ai-lead` | All contacts from Voice AI calls |
| `voice-ai-demo-booked` | Contacts who booked demos |
| `voice-ai-hot-lead` | High score leads |
| `voice-ai-enterprise` | Enterprise inquiries |
| `voice-ai-nurture` | In nurture sequence |
| `voice-ai-callback-requested` | Requested human callback |
| `voice-ai-existing-customer` | Identified as existing customer |

---

## Setup Verification Checklist

- [ ] All custom fields created
- [ ] Field keys match exactly (case-sensitive)
- [ ] Dropdown options entered correctly
- [ ] Pipeline created with all stages
- [ ] Tags created
- [ ] Test contact updated correctly via Voice AI
- [ ] Fields visible in contact view
- [ ] Fields usable in workflows
