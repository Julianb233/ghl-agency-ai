# GoHighLevel Workflows & Automations Master Guide

## Understanding Workflows

Workflows in GHL are automated sequences that trigger based on events and execute actions. They're the backbone of marketing automation.

## Workflow Components

### 1. Triggers (Entry Points)

**Contact Triggers**
- Contact Created
- Contact Tag Added/Removed
- Contact Updated
- Birthday Trigger
- Custom Date Trigger

**Opportunity Triggers**
- Opportunity Created
- Pipeline Stage Changed
- Opportunity Status Changed (Won/Lost/Open)

**Engagement Triggers**
- Form Submitted
- Survey Submitted
- Appointment Scheduled
- Appointment Cancelled
- Appointment Reminder

**Communication Triggers**
- Inbound Call
- Missed Call
- SMS Received
- Email Opened
- Email Clicked
- Facebook Message Received

**Payment Triggers**
- Invoice Paid
- Subscription Created
- Subscription Cancelled
- Payment Failed

### 2. Actions

**Communication Actions**
- Send SMS
- Send Email (with templates)
- Send Voicemail Drop
- Send Ringless Voicemail
- Manual Call Task
- Send Facebook Message

**CRM Actions**
- Add/Remove Tag
- Update Contact Field
- Create/Update Opportunity
- Move Pipeline Stage
- Assign User
- Add Note

**Workflow Actions**
- Add to Workflow
- Remove from Workflow
- Go to Specific Step
- Wait/Delay

**Integration Actions**
- HTTP Webhook (POST/GET)
- Zapier Action
- Google Sheet Row
- Slack Notification

### 3. Conditions (If/Else)

**Contact Conditions**
- Has Tag
- Field Value Equals
- Email/Phone Exists
- Source Contains

**Time Conditions**
- Day of Week
- Time of Day
- Within Date Range

**Activity Conditions**
- Email Opened
- Link Clicked
- Replied
- Appointment Scheduled

## Advanced Workflow Patterns

### Lead Nurture Sequence
```
Trigger: Form Submitted
↓
Action: Add Tag "New Lead"
↓
Action: Send SMS "Thanks for contacting us!"
↓
Wait: 5 minutes
↓
Action: Send Email "Welcome" Template
↓
Wait: 2 days
↓
If/Else: Appointment Scheduled?
  Yes → End
  No → Continue
↓
Action: Send SMS "Would you like to book a call?"
↓
Wait: 3 days
↓
Action: Send Email "Case Study" Template
```

### Appointment Reminder Sequence
```
Trigger: Appointment Scheduled
↓
Action: Send SMS "Appointment confirmed for {date}"
↓
Wait: Until 24 hours before appointment
↓
Action: Send Email "Appointment Reminder"
↓
Wait: Until 1 hour before appointment
↓
Action: Send SMS "Your appointment is in 1 hour"
```

### Win-Back Campaign
```
Trigger: Opportunity Status = Lost
↓
Wait: 30 days
↓
If/Else: Has Tag "Do Not Contact"?
  Yes → End
  No → Continue
↓
Action: Send Email "We Miss You"
↓
Wait: 7 days
↓
Action: Send SMS with Special Offer
```

### Pipeline Automation
```
Trigger: Pipeline Stage = "Proposal Sent"
↓
Action: Create Task "Follow up in 2 days"
↓
Wait: 2 days
↓
If/Else: Stage Changed?
  Yes → End
  No → Continue
↓
Action: Send Email "Following up on proposal"
↓
Wait: 3 days
↓
Action: Send SMS "Any questions on the proposal?"
```

## Smart Lists & Segmentation

### Creating Smart Lists
1. Contacts > Smart Lists > Create
2. Set filter conditions (tags, fields, activity)
3. Save list for targeting

### Common Segments
- Hot Leads: Tag "hot-lead" AND No appointment in 7 days
- Stale Opportunities: Pipeline stage unchanged > 14 days
- Engaged Contacts: Opened email last 30 days
- Re-engagement: No activity in 60+ days

## A/B Testing in Workflows

### Test Subject Lines
```
If/Else: Random 50%
  A → Send Email Subject A
  B → Send Email Subject B
```

### Test SMS Timing
```
If/Else: Random 50%
  A → Wait 1 day
  B → Wait 3 days
↓
Action: Send SMS
```

## Workflow Best Practices

1. **Start Simple**: Begin with 3-5 step workflows
2. **Use Wait Steps**: Avoid overwhelming contacts
3. **Tag Everything**: Track workflow participation
4. **Set Goals**: Use "Goal" steps to mark conversion
5. **Test First**: Use test contacts before going live
6. **Monitor Stats**: Check open rates, click rates
7. **Clean Up**: Remove inactive workflows
8. **Document**: Name workflows clearly with descriptions

## Troubleshooting Workflows

### Common Issues

**Contacts Not Entering**
- Check trigger conditions
- Verify contact matches criteria
- Check for conflicting workflows

**Actions Not Firing**
- Check wait step timing
- Verify integration connections
- Review action conditions

**Duplicate Messages**
- Check for multiple workflow entries
- Use "Remove from Workflow" at end
- Add "Contact in Workflow" condition

### Workflow Analytics
- View in Workflow > Analytics tab
- Track: Entered, Completed, Active, Exited
- Monitor conversion rates at each step

## Templates Library

### Speed to Lead
Immediate response when form submitted:
- SMS within 1 minute
- Email within 5 minutes
- Task created for follow-up call

### Long-Term Nurture
12-week email sequence for cold leads:
- Weekly educational content
- Monthly special offers
- Quarterly check-ins

### Reactivation Campaign
For contacts with no activity 90+ days:
- "We miss you" email
- Special offer SMS
- Final "Are you still interested?" message

## Integration Examples

### Zapier Webhook Pattern
```
Trigger: Opportunity Won
↓
Action: HTTP Webhook to Zapier
↓
Zapier: Create Invoice in QuickBooks
Zapier: Update Google Sheet
Zapier: Send Slack Notification
```

### Custom API Integration
```
Trigger: Form Submitted
↓
Action: HTTP POST to your API
{
  "contactId": "{{contact.id}}",
  "email": "{{contact.email}}",
  "source": "ghl-form"
}
```
