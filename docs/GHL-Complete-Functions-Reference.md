# GHL Agent AI - Complete Functions Reference

**Author**: Manus AI  
**Date**: November 18, 2025  
**Version**: 1.0  
**Purpose**: Comprehensive documentation of ALL GoHighLevel functions needed for browser automation training

---

## Document Overview

This document provides an exhaustive list of every GoHighLevel function that the GHL Agent AI must be able to automate. Each function is documented with navigation paths, element selectors, complexity ratings, and training priority based on the application's goals of automating agency workflows, client management, and campaign execution.

The functions are organized by GHL module and include detailed information needed to train Stagehand/Playwright browser automation agents.

---

## Module 1: Contacts & CRM

### Priority: CRITICAL (Tier 1)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/contacts`

---

### 1.1 Contact Creation

**Function ID**: `contact_create`  
**Description**: Create a new contact with basic information  
**Complexity**: Simple  
**Training Priority**: 1 (Highest)

**Navigation Path**:
1. Navigate to Contacts module
2. Click "Add Contact" button
3. Fill contact form
4. Save contact

**Required Fields**:
- First Name (optional but recommended)
- Last Name (optional but recommended)
- Email OR Phone (at least one required)

**Optional Fields**:
- Company Name
- Address (Street, City, State, ZIP, Country)
- Tags
- Custom Fields
- Source
- Assigned User
- Contact Type

**Element Selectors**:
```json
{
  "add_contact_button": {
    "primary": "button[data-testid='add-contact']",
    "fallback": ["button:has-text('Add Contact')", "//button[contains(text(), 'Add')]"]
  },
  "first_name_input": {
    "primary": "input[name='firstName']",
    "fallback": ["input[placeholder*='First Name']"]
  },
  "last_name_input": {
    "primary": "input[name='lastName']",
    "fallback": ["input[placeholder*='Last Name']"]
  },
  "email_input": {
    "primary": "input[name='email']",
    "fallback": ["input[type='email']"]
  },
  "phone_input": {
    "primary": "input[name='phone']",
    "fallback": ["input[type='tel']"]
  },
  "save_button": {
    "primary": "button[type='submit']",
    "fallback": ["button:has-text('Save')", "button:has-text('Create')"]
  }
}
```

**Stagehand Action Sequence**:
```typescript
await stagehand.act("click the Add Contact button");
await stagehand.act("type %firstName% into the first name field", { variables: { firstName } });
await stagehand.act("type %lastName% into the last name field", { variables: { lastName } });
await stagehand.act("type %email% into the email field", { variables: { email } });
await stagehand.act("type %phone% into the phone field", { variables: { phone } });
await stagehand.act("click the Save button");
```

---

### 1.2 Contact Import (Bulk CSV)

**Function ID**: `contact_import_csv`  
**Description**: Import multiple contacts from CSV file  
**Complexity**: Moderate  
**Training Priority**: 2

**Navigation Path**:
1. Navigate to Contacts module
2. Click "Import" button
3. Upload CSV file
4. Map CSV columns to GHL fields
5. Confirm import

**CSV Requirements**:
- Must include header row
- At least one of: Email, Phone
- Supported columns: First Name, Last Name, Email, Phone, Company, Address, Tags, Custom Fields

**Element Selectors**:
```json
{
  "import_button": {
    "primary": "button[data-testid='import-contacts']",
    "fallback": ["button:has-text('Import')"]
  },
  "file_upload_input": {
    "primary": "input[type='file']",
    "fallback": ["input[accept='.csv']"]
  },
  "column_mapping_dropdowns": {
    "primary": "select[name^='column_']",
    "fallback": ["select.column-mapper"]
  },
  "confirm_import_button": {
    "primary": "button[data-testid='confirm-import']",
    "fallback": ["button:has-text('Import Contacts')"]
  }
}
```

---

### 1.3 Contact Editing

**Function ID**: `contact_edit`  
**Description**: Update existing contact information  
**Complexity**: Simple  
**Training Priority**: 1

**Navigation Path**:
1. Navigate to Contacts module
2. Search for contact or select from list
3. Click contact to open detail view
4. Edit fields
5. Save changes

**Editable Fields**: All fields from Contact Creation plus:
- Opportunity Stage
- Pipeline Assignment
- DND (Do Not Disturb) Settings
- Contact Owner

**Element Selectors**:
```json
{
  "search_input": {
    "primary": "input[placeholder*='Search contacts']",
    "fallback": ["input[type='search']"]
  },
  "contact_row": {
    "primary": "tr[data-contact-id]",
    "fallback": ["div.contact-row"]
  },
  "edit_button": {
    "primary": "button[data-testid='edit-contact']",
    "fallback": ["button:has-text('Edit')"]
  }
}
```

---

### 1.4 Contact Tagging

**Function ID**: `contact_add_tags`  
**Description**: Add tags to contacts for segmentation  
**Complexity**: Simple  
**Training Priority**: 1

**Navigation Path**:
1. Open contact detail view
2. Click "Add Tag" button or tag input
3. Type tag name or select existing tag
4. Confirm tag addition

**Tag Operations**:
- Add single tag
- Add multiple tags
- Remove tag
- Create new tag
- Bulk tag multiple contacts

**Element Selectors**:
```json
{
  "tag_input": {
    "primary": "input[placeholder*='Add tag']",
    "fallback": ["input.tag-input"]
  },
  "tag_dropdown": {
    "primary": "div[data-testid='tag-dropdown']",
    "fallback": ["div.tag-suggestions"]
  },
  "tag_item": {
    "primary": "div[data-tag-name]",
    "fallback": ["div.tag-option"]
  },
  "remove_tag_button": {
    "primary": "button[data-testid='remove-tag']",
    "fallback": ["button.tag-remove"]
  }
}
```

---

### 1.5 Contact Deletion

**Function ID**: `contact_delete`  
**Description**: Delete contact from system  
**Complexity**: Simple  
**Training Priority**: 3

**Navigation Path**:
1. Open contact detail view
2. Click "More Actions" or three-dot menu
3. Select "Delete Contact"
4. Confirm deletion

**Warning**: Permanent action, cannot be undone

---

### 1.6 Custom Field Management

**Function ID**: `custom_field_create`  
**Description**: Create custom fields for contacts  
**Complexity**: Moderate  
**Training Priority**: 3

**Navigation Path**:
1. Navigate to Settings → Custom Fields
2. Click "Add Custom Field"
3. Configure field type and properties
4. Save custom field

**Field Types**:
- Text (single line)
- Textarea (multi-line)
- Number
- Date
- Dropdown (single select)
- Checkbox (multi-select)
- File Upload

---

### 1.7 Smart Lists

**Function ID**: `smart_list_create`  
**Description**: Create dynamic contact lists based on filters  
**Complexity**: Complex  
**Training Priority**: 2

**Navigation Path**:
1. Navigate to Contacts → Smart Lists
2. Click "Create Smart List"
3. Name the list
4. Add filter conditions
5. Save smart list

**Filter Conditions**:
- Tag is/is not
- Custom field equals/contains
- Email status (subscribed/unsubscribed)
- Last activity date
- Opportunity stage
- Source

---

## Module 2: Workflows & Automation

### Priority: CRITICAL (Tier 1)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/workflows`

---

### 2.1 Workflow Creation

**Function ID**: `workflow_create`  
**Description**: Create automated workflow with triggers and actions  
**Complexity**: Complex  
**Training Priority**: 1 (Highest)

**Navigation Path**:
1. Navigate to Automations → Workflows
2. Click "Create Workflow"
3. Name workflow
4. Select trigger type
5. Add workflow steps (actions)
6. Configure each step
7. Activate workflow

**Trigger Types**:
- Contact Tag Added
- Contact Tag Removed
- Form Submitted
- Appointment Booked
- Appointment Cancelled
- Opportunity Stage Changed
- Opportunity Status Changed
- Opportunity Created
- Contact Created
- Contact Updated
- Inbound Message Received
- Inbound Call Received
- Webhook Received
- Manual Trigger

**Action Types**:
- Send Email
- Send SMS
- Send Voicemail Drop
- Wait/Delay
- If/Else Condition
- Go To (jump to another step)
- Add Tag
- Remove Tag
- Update Contact Field
- Create Opportunity
- Update Opportunity
- Send Internal Notification
- HTTP Post (webhook)
- Create Task
- Send Email to Team
- Add to Campaign
- Remove from Campaign
- Trigger Workflow
- Stop Workflow

**Element Selectors**:
```json
{
  "create_workflow_button": {
    "primary": "button[data-testid='create-workflow']",
    "fallback": ["button:has-text('Create Workflow')", "//button[contains(text(), 'Create')]"]
  },
  "workflow_name_input": {
    "primary": "input[name='workflow-name']",
    "fallback": ["input[placeholder*='Workflow Name']"]
  },
  "trigger_dropdown": {
    "primary": "select[name='trigger-type']",
    "fallback": ["div[data-testid='trigger-selector']"]
  },
  "add_action_button": {
    "primary": "button[data-testid='add-action']",
    "fallback": ["button:has-text('Add Action')"]
  },
  "action_menu": {
    "primary": "div[data-testid='action-menu']",
    "fallback": ["div.action-selector"]
  },
  "activate_button": {
    "primary": "button[data-testid='activate-workflow']",
    "fallback": ["button:has-text('Activate')"]
  }
}
```

**Stagehand Action Sequence** (Basic Email Workflow):
```typescript
await stagehand.act("click the Create Workflow button");
await stagehand.act("type %workflowName% into the workflow name field", { variables: { workflowName } });
await stagehand.act("select %triggerType% from the trigger dropdown", { variables: { triggerType: "Contact Tag Added" } });
await stagehand.act("click the Add Action button");
await stagehand.act("select Send Email from the action menu");
await stagehand.act("select email template %templateName%", { variables: { templateName } });
await stagehand.act("click the Activate button");
```

---

### 2.2 Workflow Editing

**Function ID**: `workflow_edit`  
**Description**: Modify existing workflow  
**Complexity**: Complex  
**Training Priority**: 1

**Operations**:
- Add new steps
- Remove steps
- Reorder steps
- Edit step configuration
- Change trigger
- Activate/Deactivate

---

### 2.3 Workflow Duplication

**Function ID**: `workflow_duplicate`  
**Description**: Clone existing workflow  
**Complexity**: Simple  
**Training Priority**: 2

**Navigation Path**:
1. Navigate to Workflows list
2. Click three-dot menu on workflow
3. Select "Duplicate"
4. Rename duplicated workflow

---

### 2.4 Workflow Deletion

**Function ID**: `workflow_delete`  
**Description**: Delete workflow  
**Complexity**: Simple  
**Training Priority**: 3

---

### 2.5 Workflow Testing

**Function ID**: `workflow_test`  
**Description**: Test workflow with sample data  
**Complexity**: Moderate  
**Training Priority**: 2

---

## Module 3: Funnels & Websites

### Priority: CRITICAL (Tier 1)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/funnels`

---

### 3.1 Funnel Creation

**Function ID**: `funnel_create`  
**Description**: Create multi-page funnel  
**Complexity**: Advanced  
**Training Priority**: 1

**Navigation Path**:
1. Navigate to Sites → Funnels
2. Click "Create Funnel"
3. Choose template or start from scratch
4. Name funnel
5. Add pages
6. Customize each page
7. Publish funnel

**Funnel Page Types**:
- Landing Page
- Opt-in Page
- Thank You Page
- Sales Page
- Order Form
- Upsell Page
- Downsell Page
- Webinar Registration
- Appointment Booking

**Element Selectors**:
```json
{
  "create_funnel_button": {
    "primary": "button[data-testid='create-funnel']",
    "fallback": ["button:has-text('Create Funnel')"]
  },
  "template_selector": {
    "primary": "div[data-testid='template-grid']",
    "fallback": ["div.template-list"]
  },
  "funnel_name_input": {
    "primary": "input[name='funnel-name']",
    "fallback": ["input[placeholder*='Funnel Name']"]
  },
  "add_page_button": {
    "primary": "button[data-testid='add-page']",
    "fallback": ["button:has-text('Add Page')"]
  },
  "page_editor": {
    "primary": "div[data-testid='page-editor']",
    "fallback": ["iframe#page-builder"]
  },
  "publish_button": {
    "primary": "button[data-testid='publish-funnel']",
    "fallback": ["button:has-text('Publish')"]
  }
}
```

---

### 3.2 Page Editing

**Function ID**: `funnel_page_edit`  
**Description**: Edit funnel page content  
**Complexity**: Advanced  
**Training Priority**: 1

**Editor Operations**:
- Add sections
- Add elements (text, image, button, form, video)
- Edit element properties
- Adjust layout
- Configure form submissions
- Set up tracking
- Mobile responsive editing

**Element Types**:
- Text/Heading
- Paragraph
- Image
- Button/CTA
- Form
- Video (YouTube, Vimeo, Custom)
- Countdown Timer
- Social Proof
- Testimonials
- Pricing Table
- FAQ Accordion
- Divider
- Spacer
- Custom HTML/CSS/JS

---

### 3.3 Form Builder

**Function ID**: `form_create`  
**Description**: Create custom forms  
**Complexity**: Moderate  
**Training Priority**: 1

**Form Field Types**:
- Text Input
- Email Input
- Phone Input
- Textarea
- Dropdown
- Radio Buttons
- Checkboxes
- Date Picker
- File Upload
- Hidden Field

**Form Settings**:
- Submit button text
- Success message
- Redirect URL
- Workflow trigger on submission
- Email notifications
- Required fields
- Field validation

---

### 3.4 Website Builder

**Function ID**: `website_create`  
**Description**: Create full website  
**Complexity**: Advanced  
**Training Priority**: 2

**Website Components**:
- Multiple pages
- Navigation menu
- Header/Footer
- Blog
- SEO settings
- Custom domain
- SSL certificate

---

## Module 4: Email Marketing

### Priority: CRITICAL (Tier 1)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/marketing/emails`

---

### 4.1 Email Campaign Creation

**Function ID**: `email_campaign_create`  
**Description**: Create and send email campaign  
**Complexity**: Moderate  
**Training Priority**: 1

**Navigation Path**:
1. Navigate to Marketing → Email
2. Click "Create Campaign"
3. Select template or build from scratch
4. Customize email content
5. Configure sender info
6. Select recipients (list, tags, smart list)
7. Schedule or send immediately

**Email Components**:
- Subject Line
- Preview Text
- From Name
- From Email
- Reply-To Email
- Email Body (HTML editor)
- Merge Fields/Personalization
- Images
- Buttons/CTAs
- Links
- Unsubscribe Link (required)

**Element Selectors**:
```json
{
  "create_campaign_button": {
    "primary": "button[data-testid='create-email-campaign']",
    "fallback": ["button:has-text('Create Campaign')"]
  },
  "subject_input": {
    "primary": "input[name='subject']",
    "fallback": ["input[placeholder*='Subject']"]
  },
  "from_name_input": {
    "primary": "input[name='from-name']",
    "fallback": ["input[placeholder*='From Name']"]
  },
  "email_editor": {
    "primary": "div[data-testid='email-editor']",
    "fallback": ["iframe.email-builder"]
  },
  "recipient_selector": {
    "primary": "div[data-testid='recipient-selector']",
    "fallback": ["div.audience-picker"]
  },
  "send_button": {
    "primary": "button[data-testid='send-email']",
    "fallback": ["button:has-text('Send')"]
  }
}
```

---

### 4.2 Email Template Creation

**Function ID**: `email_template_create`  
**Description**: Create reusable email template  
**Complexity**: Moderate  
**Training Priority**: 2

---

### 4.3 A/B Testing

**Function ID**: `email_ab_test`  
**Description**: Set up A/B test for email campaigns  
**Complexity**: Complex  
**Training Priority**: 3

---

## Module 5: SMS Marketing

### Priority: HIGH (Tier 2)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/marketing/sms`

---

### 5.1 SMS Campaign Creation

**Function ID**: `sms_campaign_create`  
**Description**: Create and send SMS campaign  
**Complexity**: Simple  
**Training Priority**: 2

**SMS Requirements**:
- Message content (160 characters recommended)
- Merge fields for personalization
- Compliance (TCPA, opt-out instructions)
- Sender phone number

**Element Selectors**:
```json
{
  "create_sms_campaign_button": {
    "primary": "button[data-testid='create-sms-campaign']",
    "fallback": ["button:has-text('Create SMS Campaign')"]
  },
  "message_textarea": {
    "primary": "textarea[name='message']",
    "fallback": ["textarea[placeholder*='Message']"]
  },
  "sender_phone_dropdown": {
    "primary": "select[name='sender-phone']",
    "fallback": ["div[data-testid='phone-selector']"]
  },
  "recipient_selector": {
    "primary": "div[data-testid='sms-recipient-selector']",
    "fallback": ["div.sms-audience-picker"]
  }
}
```

---

### 5.2 SMS Template Creation

**Function ID**: `sms_template_create`  
**Description**: Create reusable SMS template (snippet)  
**Complexity**: Simple  
**Training Priority**: 2

---

## Module 6: Calendars & Appointments

### Priority: CRITICAL (Tier 1)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/calendars`

---

### 6.1 Calendar Creation

**Function ID**: `calendar_create`  
**Description**: Create appointment calendar  
**Complexity**: Moderate  
**Training Priority**: 1

**Navigation Path**:
1. Navigate to Calendars
2. Click "Create Calendar"
3. Name calendar
4. Set availability hours
5. Configure appointment types
6. Set up notifications
7. Customize booking page

**Calendar Settings**:
- Calendar Name
- Description
- Availability Hours (by day of week)
- Buffer Time (before/after appointments)
- Minimum Notice (how far in advance)
- Date Range (how far out bookings allowed)
- Assigned Team Members
- Booking Page Customization

**Element Selectors**:
```json
{
  "create_calendar_button": {
    "primary": "button[data-testid='create-calendar']",
    "fallback": ["button:has-text('Create Calendar')"]
  },
  "calendar_name_input": {
    "primary": "input[name='calendar-name']",
    "fallback": ["input[placeholder*='Calendar Name']"]
  },
  "availability_settings": {
    "primary": "div[data-testid='availability-settings']",
    "fallback": ["div.availability-config"]
  },
  "save_calendar_button": {
    "primary": "button[data-testid='save-calendar']",
    "fallback": ["button:has-text('Save')"]
  }
}
```

---

### 6.2 Appointment Type Creation

**Function ID**: `appointment_type_create`  
**Description**: Create appointment type/service  
**Complexity**: Moderate  
**Training Priority**: 1

**Appointment Type Settings**:
- Name
- Duration
- Description
- Color
- Form Fields (custom questions)
- Confirmation Message
- Reminder Settings
- Meeting Location (Zoom, Google Meet, Phone, In-Person, Custom)

---

### 6.3 Appointment Booking

**Function ID**: `appointment_book`  
**Description**: Manually book appointment for contact  
**Complexity**: Simple  
**Training Priority**: 2

---

### 6.4 Appointment Rescheduling

**Function ID**: `appointment_reschedule`  
**Description**: Reschedule existing appointment  
**Complexity**: Simple  
**Training Priority**: 2

---

### 6.5 Appointment Cancellation

**Function ID**: `appointment_cancel`  
**Description**: Cancel appointment  
**Complexity**: Simple  
**Training Priority**: 2

---

## Module 7: Opportunities & Pipelines

### Priority: HIGH (Tier 2)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/opportunities`

---

### 7.1 Pipeline Creation

**Function ID**: `pipeline_create`  
**Description**: Create sales pipeline  
**Complexity**: Moderate  
**Training Priority**: 2

**Pipeline Components**:
- Pipeline Name
- Stages (multiple)
- Stage Names
- Stage Order
- Automation Triggers per Stage

**Element Selectors**:
```json
{
  "create_pipeline_button": {
    "primary": "button[data-testid='create-pipeline']",
    "fallback": ["button:has-text('Create Pipeline')"]
  },
  "pipeline_name_input": {
    "primary": "input[name='pipeline-name']",
    "fallback": ["input[placeholder*='Pipeline Name']"]
  },
  "add_stage_button": {
    "primary": "button[data-testid='add-stage']",
    "fallback": ["button:has-text('Add Stage')"]
  },
  "stage_name_input": {
    "primary": "input[name='stage-name']",
    "fallback": ["input[placeholder*='Stage Name']"]
  }
}
```

---

### 7.2 Opportunity Creation

**Function ID**: `opportunity_create`  
**Description**: Create sales opportunity  
**Complexity**: Simple  
**Training Priority**: 2

**Opportunity Fields**:
- Contact (required)
- Pipeline (required)
- Stage (required)
- Name/Title
- Value (monetary)
- Status (open, won, lost, abandoned)
- Assigned User
- Notes

---

### 7.3 Opportunity Stage Update

**Function ID**: `opportunity_update_stage`  
**Description**: Move opportunity to different stage  
**Complexity**: Simple  
**Training Priority**: 2

---

## Module 8: Conversations & Messaging

### Priority: HIGH (Tier 2)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/conversations`

---

### 8.1 Manual Message Sending

**Function ID**: `conversation_send_message`  
**Description**: Send manual SMS/Email from conversations  
**Complexity**: Simple  
**Training Priority**: 3

---

### 8.2 Conversation AI Setup

**Function ID**: `conversation_ai_setup`  
**Description**: Configure AI chatbot for conversations  
**Complexity**: Advanced  
**Training Priority**: 4

---

## Module 9: Reputation Management

### Priority: MEDIUM (Tier 3)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/reputation`

---

### 9.1 Review Request Campaign

**Function ID**: `review_request_create`  
**Description**: Set up automated review requests  
**Complexity**: Moderate  
**Training Priority**: 3

---

### 9.2 Review Monitoring

**Function ID**: `review_monitor`  
**Description**: Monitor reviews from Google, Facebook, etc.  
**Complexity**: Simple  
**Training Priority**: 3

---

## Module 10: Social Planner

### Priority: MEDIUM (Tier 3)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/social-planner`

---

### 10.1 Social Post Creation

**Function ID**: `social_post_create`  
**Description**: Create and schedule social media posts  
**Complexity**: Moderate  
**Training Priority**: 3

**Supported Platforms**:
- Facebook
- Instagram
- Twitter/X
- LinkedIn
- Google Business Profile

---

## Module 11: Memberships & Courses

### Priority: MEDIUM (Tier 3)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/memberships`

---

### 11.1 Membership Site Creation

**Function ID**: `membership_create`  
**Description**: Create membership area  
**Complexity**: Advanced  
**Training Priority**: 3

---

### 11.2 Course Creation

**Function ID**: `course_create`  
**Description**: Create online course  
**Complexity**: Advanced  
**Training Priority**: 3

**Course Components**:
- Course Name
- Description
- Modules
- Lessons
- Quizzes
- Certificates
- Drip Content Schedule

---

## Module 12: Payments & Commerce

### Priority: MEDIUM (Tier 3)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/payments`

---

### 12.1 Product Creation

**Function ID**: `product_create`  
**Description**: Create product for sale  
**Complexity**: Moderate  
**Training Priority**: 3

**Product Types**:
- One-Time Payment
- Subscription/Recurring
- Payment Plan

---

### 12.2 Order Form Creation

**Function ID**: `order_form_create`  
**Description**: Create order/checkout form  
**Complexity**: Moderate  
**Training Priority**: 3

---

### 12.3 Stripe Integration

**Function ID**: `stripe_connect`  
**Description**: Connect Stripe payment processor  
**Complexity**: Moderate  
**Training Priority**: 3

---

## Module 13: Reporting & Analytics

### Priority: LOW (Tier 4)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/reporting`

---

### 13.1 Dashboard Viewing

**Function ID**: `dashboard_view`  
**Description**: View analytics dashboard  
**Complexity**: Simple  
**Training Priority**: 4

---

### 13.2 Custom Report Creation

**Function ID**: `report_create`  
**Description**: Create custom report  
**Complexity**: Complex  
**Training Priority**: 4

---

## Module 14: Settings & Configuration

### Priority: MEDIUM (Tier 3)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/settings`

---

### 14.1 Sub-Account Creation

**Function ID**: `subaccount_create`  
**Description**: Create new sub-account (agency only)  
**Complexity**: Advanced  
**Training Priority**: 3

**Sub-Account Settings**:
- Business Name
- Address
- Phone
- Email
- Industry
- Timezone
- Snapshot Template (optional)

---

### 14.2 User Management

**Function ID**: `user_create`  
**Description**: Add user to sub-account  
**Complexity**: Simple  
**Training Priority**: 3

**User Roles**:
- Admin (full access)
- User (limited access)
- Custom Roles (configurable permissions)

---

### 14.3 Integration Setup

**Function ID**: `integration_setup`  
**Description**: Connect third-party integrations  
**Complexity**: Moderate  
**Training Priority**: 3

**Common Integrations**:
- Zapier
- Google Calendar
- Google My Business
- Facebook
- Stripe
- Twilio
- Mailgun
- Webhooks

---

### 14.4 Custom Domain Setup

**Function ID**: `custom_domain_setup`  
**Description**: Connect custom domain to funnels/websites  
**Complexity**: Moderate  
**Training Priority**: 3

---

## Module 15: Trigger Links

### Priority: HIGH (Tier 2)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/trigger-links`

---

### 15.1 Trigger Link Creation

**Function ID**: `trigger_link_create`  
**Description**: Create link that triggers actions when clicked  
**Complexity**: Simple  
**Training Priority**: 2

**Trigger Actions**:
- Add Tag
- Remove Tag
- Start Workflow
- Update Custom Field
- Add to Campaign
- Remove from Campaign
- Update Opportunity Stage

**Element Selectors**:
```json
{
  "create_trigger_link_button": {
    "primary": "button[data-testid='create-trigger-link']",
    "fallback": ["button:has-text('Create Trigger Link')"]
  },
  "link_name_input": {
    "primary": "input[name='link-name']",
    "fallback": ["input[placeholder*='Link Name']"]
  },
  "action_selector": {
    "primary": "select[name='trigger-action']",
    "fallback": ["div[data-testid='action-selector']"]
  },
  "redirect_url_input": {
    "primary": "input[name='redirect-url']",
    "fallback": ["input[placeholder*='Redirect URL']"]
  }
}
```

---

## Module 16: Forms (Standalone)

### Priority: HIGH (Tier 2)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/forms`

---

### 16.1 Survey/Form Creation

**Function ID**: `survey_create`  
**Description**: Create standalone survey or form  
**Complexity**: Moderate  
**Training Priority**: 2

**Form Features**:
- Multi-step forms
- Conditional logic
- File uploads
- Signature capture
- Payment collection
- Appointment booking
- Custom thank you page

---

## Module 17: Tasks

### Priority: MEDIUM (Tier 3)
### Base URL: `https://app.gohighlevel.com/v2/location/{locationId}/tasks`

---

### 17.1 Task Creation

**Function ID**: `task_create`  
**Description**: Create task for team member  
**Complexity**: Simple  
**Training Priority**: 3

**Task Fields**:
- Title
- Description
- Assigned User
- Due Date
- Priority
- Related Contact
- Related Opportunity

---

## Summary: Function Priority Matrix

| Module | Total Functions | Tier 1 (Critical) | Tier 2 (High) | Tier 3 (Medium) | Tier 4 (Low) |
|--------|----------------|-------------------|---------------|-----------------|--------------|
| Contacts & CRM | 7 | 4 | 2 | 1 | 0 |
| Workflows | 5 | 2 | 2 | 1 | 0 |
| Funnels & Websites | 4 | 2 | 1 | 1 | 0 |
| Email Marketing | 3 | 1 | 1 | 1 | 0 |
| SMS Marketing | 2 | 0 | 2 | 0 | 0 |
| Calendars | 5 | 2 | 3 | 0 | 0 |
| Opportunities | 3 | 0 | 3 | 0 | 0 |
| Conversations | 2 | 0 | 1 | 1 | 0 |
| Reputation | 2 | 0 | 0 | 2 | 0 |
| Social Planner | 1 | 0 | 0 | 1 | 0 |
| Memberships | 2 | 0 | 0 | 2 | 0 |
| Payments | 3 | 0 | 0 | 3 | 0 |
| Reporting | 2 | 0 | 0 | 0 | 2 |
| Settings | 4 | 0 | 0 | 4 | 0 |
| Trigger Links | 1 | 0 | 1 | 0 | 0 |
| Forms | 1 | 0 | 1 | 0 | 0 |
| Tasks | 1 | 0 | 0 | 1 | 0 |
| **TOTAL** | **48** | **11** | **17** | **18** | **2** |

---

## Training Implementation Roadmap

### Phase 1 (Weeks 1-2): Tier 1 Critical Functions
Document and train agents on the 11 most critical functions:
1. Contact Creation
2. Contact Editing
3. Contact Tagging
4. Workflow Creation
5. Workflow Editing
6. Funnel Creation
7. Funnel Page Editing
8. Email Campaign Creation
9. Calendar Creation
10. Appointment Type Creation
11. Form Builder

**Expected Coverage**: 60% of all automation requests

---

### Phase 2 (Weeks 3-4): Tier 2 High Priority Functions
Add 17 high-priority functions:
- Contact Import
- Smart Lists
- Workflow Duplication
- SMS Campaigns
- Appointment Booking/Rescheduling/Cancellation
- Pipeline Creation
- Opportunity Management
- Trigger Links
- Survey Creation

**Expected Coverage**: 85% of all automation requests

---

### Phase 3 (Weeks 5-8): Tier 3 Medium Priority Functions
Add 18 medium-priority functions covering:
- Sub-account creation
- User management
- Integrations
- Custom domains
- Reputation management
- Social planning
- Memberships/Courses
- Payments/Commerce
- Tasks

**Expected Coverage**: 95% of all automation requests

---

### Phase 4 (Weeks 9-12): Tier 4 & Advanced Features
Complete coverage with remaining functions:
- Custom reporting
- Advanced analytics
- Edge cases and troubleshooting

**Expected Coverage**: 98%+ of all automation requests

---

## Conclusion

This comprehensive reference documents all 48 core GoHighLevel functions needed for the GHL Agent AI browser automation system. Each function includes navigation paths, element selectors, complexity ratings, and training priorities to guide the Stagehand/Playwright agent training process.

By following the phased implementation roadmap, the system will achieve 60% coverage within 2 weeks, 85% within 4 weeks, and 95%+ within 8 weeks, providing comprehensive automation capabilities for agency workflows and client management.

---

**Next Steps**: Use this reference to create detailed training documentation for each Tier 1 function, following the templates provided in the AI Agent Training Methodology document.
