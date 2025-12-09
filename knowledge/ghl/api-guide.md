# GoHighLevel (GHL) API Complete Guide

## Overview

GoHighLevel is an all-in-one marketing and CRM platform for agencies. This guide covers the API, webhooks, and integration patterns.

## API Authentication

### Getting API Keys
1. Go to Settings > API & Integrations
2. Click "Create API Key"
3. Select permissions (read/write for each module)
4. Copy and securely store the API key

### Authentication Headers
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### API Base URL
- Production: `https://rest.gohighlevel.com/v1`
- New API (v2): `https://services.leadconnectorhq.com`

## Core API Endpoints

### Contacts API

**Create Contact**
```http
POST /contacts
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "locationId": "your_location_id",
  "tags": ["lead", "website"],
  "customField": {
    "your_custom_field_id": "value"
  }
}
```

**Get Contact**
```http
GET /contacts/{contactId}
```

**Update Contact**
```http
PUT /contacts/{contactId}
{
  "firstName": "John Updated",
  "tags": ["customer"]
}
```

**Search Contacts**
```http
GET /contacts?locationId=xxx&query=john@example.com
```

### Opportunities API

**Create Opportunity**
```http
POST /opportunities
{
  "title": "New Deal",
  "contactId": "contact_id",
  "pipelineId": "pipeline_id",
  "pipelineStageId": "stage_id",
  "status": "open",
  "monetaryValue": 5000
}
```

**Update Opportunity Stage**
```http
PUT /opportunities/{opportunityId}
{
  "pipelineStageId": "new_stage_id",
  "status": "won"
}
```

### Conversations API

**Send SMS**
```http
POST /conversations/messages
{
  "type": "SMS",
  "contactId": "contact_id",
  "message": "Hello from GHL!"
}
```

**Send Email**
```http
POST /conversations/messages
{
  "type": "Email",
  "contactId": "contact_id",
  "subject": "Follow-up",
  "message": "Your email body here",
  "emailFrom": "your@email.com"
}
```

### Calendars API

**Get Calendars**
```http
GET /calendars?locationId=xxx
```

**Create Appointment**
```http
POST /calendars/appointments
{
  "calendarId": "calendar_id",
  "contactId": "contact_id",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "title": "Consultation Call"
}
```

### Pipelines API

**Get Pipelines**
```http
GET /pipelines?locationId=xxx
```

**Get Pipeline Stages**
```http
GET /pipelines/{pipelineId}
```

## Webhooks

### Webhook Events
- `contact.created`
- `contact.updated`
- `contact.deleted`
- `opportunity.created`
- `opportunity.status_changed`
- `opportunity.stage_changed`
- `appointment.booked`
- `appointment.cancelled`
- `form.submitted`
- `call.completed`
- `sms.received`
- `email.opened`
- `email.clicked`

### Webhook Payload Example
```json
{
  "event": "contact.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "locationId": "xxx",
  "data": {
    "id": "contact_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

### Setting Up Webhooks
1. Go to Settings > Webhooks
2. Click "Add Webhook"
3. Enter your endpoint URL
4. Select events to subscribe to
5. Save and test

## Workflows & Automations

### Workflow Triggers
- Form Submission
- Pipeline Stage Change
- Tag Added/Removed
- Appointment Booked
- Custom Date Field
- Birthday/Anniversary
- Inbound Call
- SMS/Email Received

### Workflow Actions
- Send SMS/Email
- Add/Remove Tag
- Update Contact Field
- Create Opportunity
- Assign to User
- Add to Campaign
- Wait (Time Delay)
- If/Else Branch
- Webhook (HTTP Request)

### Best Practices
1. Always add error handling branches
2. Use wait steps between messages
3. Tag contacts for tracking
4. Test workflows with test contacts
5. Monitor workflow analytics

## Integrations

### Zapier Integration
GHL connects to 5000+ apps via Zapier triggers:
- New Contact
- New Opportunity
- Form Submitted
- Appointment Scheduled

### Native Integrations
- Google Calendar
- Google My Business
- Facebook Lead Ads
- Stripe
- Twilio
- Mailgun
- SendGrid

## Rate Limits

- Standard: 100 requests/minute
- Burst: 10 requests/second
- Contact imports: 1000/batch
- Webhook retries: 3 attempts with exponential backoff

## Error Codes

| Code | Description |
|------|-------------|
| 401 | Invalid or expired API key |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Custom Fields

### Creating Custom Fields
1. Go to Settings > Custom Fields
2. Select object type (Contact, Opportunity, etc.)
3. Add field with unique key
4. Set field type (text, number, date, dropdown)

### Using Custom Fields in API
```json
{
  "customField": {
    "field_key_1": "value1",
    "field_key_2": "value2"
  }
}
```
