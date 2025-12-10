# Stagehand Browser Automation Guide

## Overview

This guide provides navigation patterns and automation strategies for Stagehand to intelligently interact with marketing platforms, AI tools, and agency software.

## Stagehand Core Actions

### Available Actions
```typescript
// Navigate to a page
await stagehand.page.goto('https://example.com');

// Perform an action described in natural language
await stagehand.act({ action: "click the login button" });

// Extract data from the page
const data = await stagehand.extract({
  instruction: "extract all product names and prices",
  schema: z.object({
    products: z.array(z.object({
      name: z.string(),
      price: z.string()
    }))
  })
});

// Observe what's on the page
const elements = await stagehand.observe({
  instruction: "find all navigation menu items"
});
```

## Platform Navigation Patterns

### GoHighLevel (GHL)

**Login**
```typescript
await stagehand.page.goto('https://app.gohighlevel.com/');
await stagehand.act({ action: "enter email in the email field" });
await stagehand.act({ action: "enter password in the password field" });
await stagehand.act({ action: "click the Sign In button" });
```

**Dashboard Navigation**
```typescript
// Navigate to contacts
await stagehand.act({ action: "click on Contacts in the left sidebar" });

// Navigate to automation
await stagehand.act({ action: "click on Automation in the left sidebar" });

// Navigate to marketing
await stagehand.act({ action: "click on Marketing in the left sidebar" });

// Navigate to settings
await stagehand.act({ action: "click on Settings at the bottom of the sidebar" });
```

**Common Tasks**
```typescript
// Create a contact
await stagehand.act({ action: "click the Add Contact button" });
await stagehand.act({ action: "fill in the contact form with the provided information" });
await stagehand.act({ action: "click Save to create the contact" });

// Create a workflow
await stagehand.act({ action: "navigate to Automation then Workflows" });
await stagehand.act({ action: "click Create Workflow button" });
await stagehand.act({ action: "select Start from Scratch option" });

// Send campaign
await stagehand.act({ action: "go to Marketing then Email/SMS Marketing" });
await stagehand.act({ action: "click Create Campaign" });
```

---

### Google Analytics 4

**Login and Navigation**
```typescript
await stagehand.page.goto('https://analytics.google.com/');
// Usually auto-logged in via Google account

// Select property
await stagehand.act({ action: "click on the property dropdown" });
await stagehand.act({ action: "select the desired property from the list" });
```

**Reports Navigation**
```typescript
// Realtime report
await stagehand.act({ action: "click on Reports in the left menu" });
await stagehand.act({ action: "click on Realtime" });

// Acquisition report
await stagehand.act({ action: "expand Acquisition section" });
await stagehand.act({ action: "click on Traffic acquisition" });

// Engagement report
await stagehand.act({ action: "expand Engagement section" });
await stagehand.act({ action: "click on Pages and screens" });
```

**Data Extraction**
```typescript
const trafficData = await stagehand.extract({
  instruction: "extract the traffic metrics including users, sessions, and bounce rate",
  schema: z.object({
    users: z.string(),
    sessions: z.string(),
    bounceRate: z.string(),
    avgSessionDuration: z.string()
  })
});

const topPages = await stagehand.extract({
  instruction: "extract the top 10 pages with their pageviews and engagement metrics",
  schema: z.object({
    pages: z.array(z.object({
      pagePath: z.string(),
      pageviews: z.string(),
      avgEngagementTime: z.string()
    }))
  })
});
```

---

### Google Ads

**Navigation**
```typescript
await stagehand.page.goto('https://ads.google.com/');

// Select account
await stagehand.act({ action: "select the client account from the account selector" });

// Navigate to campaigns
await stagehand.act({ action: "click on Campaigns in the left navigation" });

// Navigate to ad groups
await stagehand.act({ action: "click on Ad groups in the left navigation" });

// Navigate to keywords
await stagehand.act({ action: "click on Keywords in the left navigation" });
```

**Campaign Management**
```typescript
// Create campaign
await stagehand.act({ action: "click the plus button to create new campaign" });
await stagehand.act({ action: "select the campaign objective" });
await stagehand.act({ action: "choose the campaign type" });

// Edit campaign
await stagehand.act({ action: "click on the campaign name to open settings" });
await stagehand.act({ action: "modify the budget field" });
await stagehand.act({ action: "click Save" });

// Pause/Enable
await stagehand.act({ action: "select the campaigns using checkboxes" });
await stagehand.act({ action: "click the Enable or Pause button in the toolbar" });
```

**Data Extraction**
```typescript
const campaignMetrics = await stagehand.extract({
  instruction: "extract all campaign names with their impressions, clicks, CTR, cost, and conversions",
  schema: z.object({
    campaigns: z.array(z.object({
      name: z.string(),
      impressions: z.string(),
      clicks: z.string(),
      ctr: z.string(),
      cost: z.string(),
      conversions: z.string()
    }))
  })
});
```

---

### Google Search Console

**Navigation**
```typescript
await stagehand.page.goto('https://search.google.com/search-console');

// Select property
await stagehand.act({ action: "click on the property dropdown and select the site" });

// Performance report
await stagehand.act({ action: "click on Performance in the left menu" });

// URL inspection
await stagehand.act({ action: "click on URL Inspection in the left menu" });
await stagehand.act({ action: "enter the URL to inspect in the search field" });
```

**Data Extraction**
```typescript
const searchPerformance = await stagehand.extract({
  instruction: "extract the total clicks, impressions, average CTR, and average position",
  schema: z.object({
    totalClicks: z.string(),
    totalImpressions: z.string(),
    averageCTR: z.string(),
    averagePosition: z.string()
  })
});

const topQueries = await stagehand.extract({
  instruction: "extract the top 20 search queries with clicks and impressions",
  schema: z.object({
    queries: z.array(z.object({
      query: z.string(),
      clicks: z.string(),
      impressions: z.string(),
      ctr: z.string(),
      position: z.string()
    }))
  })
});
```

---

### Ahrefs

**Navigation**
```typescript
await stagehand.page.goto('https://app.ahrefs.com/');

// Site Explorer
await stagehand.act({ action: "click on Site Explorer" });
await stagehand.act({ action: "enter the domain in the search field" });
await stagehand.act({ action: "click Search or press Enter" });

// Keywords Explorer
await stagehand.act({ action: "click on Keywords Explorer" });
await stagehand.act({ action: "enter keywords in the search field" });

// Site Audit
await stagehand.act({ action: "click on Site Audit" });
await stagehand.act({ action: "select the project to view" });
```

**Data Extraction**
```typescript
const domainOverview = await stagehand.extract({
  instruction: "extract domain rating, backlinks count, referring domains, and organic traffic",
  schema: z.object({
    domainRating: z.string(),
    backlinks: z.string(),
    referringDomains: z.string(),
    organicTraffic: z.string(),
    organicKeywords: z.string()
  })
});

const backlinks = await stagehand.extract({
  instruction: "extract the top backlinks with referring page, DR, and anchor text",
  schema: z.object({
    backlinks: z.array(z.object({
      referringPage: z.string(),
      domainRating: z.string(),
      anchorText: z.string(),
      targetUrl: z.string()
    }))
  })
});
```

---

### HubSpot

**Navigation**
```typescript
await stagehand.page.goto('https://app.hubspot.com/');

// Contacts
await stagehand.act({ action: "click on Contacts in the main navigation" });
await stagehand.act({ action: "click on Contacts from the dropdown" });

// Deals
await stagehand.act({ action: "click on Sales in the main navigation" });
await stagehand.act({ action: "click on Deals" });

// Marketing
await stagehand.act({ action: "click on Marketing in the main navigation" });
await stagehand.act({ action: "click on Email" });
```

**Common Tasks**
```typescript
// Create contact
await stagehand.act({ action: "click Create contact button" });
await stagehand.act({ action: "fill in the email field" });
await stagehand.act({ action: "fill in the first name and last name fields" });
await stagehand.act({ action: "click Create button" });

// Send email
await stagehand.act({ action: "go to Marketing then Email" });
await stagehand.act({ action: "click Create email button" });
await stagehand.act({ action: "select Regular email type" });
```

---

### Apollo.io

**Navigation**
```typescript
await stagehand.page.goto('https://app.apollo.io/');

// Search people
await stagehand.act({ action: "click on Search in the navigation" });
await stagehand.act({ action: "click on People tab" });

// Apply filters
await stagehand.act({ action: "click on Job Titles filter" });
await stagehand.act({ action: "enter the job title to search for" });
await stagehand.act({ action: "click on Company Headcount filter" });
await stagehand.act({ action: "select the employee count range" });
```

**Lead Export**
```typescript
// Select and export leads
await stagehand.act({ action: "select leads using checkboxes" });
await stagehand.act({ action: "click the Export button" });
await stagehand.act({ action: "select CSV format" });
await stagehand.act({ action: "click Export to download" });

const searchResults = await stagehand.extract({
  instruction: "extract all visible contacts with name, title, company, and email",
  schema: z.object({
    contacts: z.array(z.object({
      name: z.string(),
      title: z.string(),
      company: z.string(),
      email: z.string().optional()
    }))
  })
});
```

---

### LinkedIn Sales Navigator

**Navigation**
```typescript
await stagehand.page.goto('https://www.linkedin.com/sales/');

// Lead search
await stagehand.act({ action: "click on Lead filters" });
await stagehand.act({ action: "enter job title in the Title filter" });
await stagehand.act({ action: "select seniority levels" });
await stagehand.act({ action: "add company size filter" });
await stagehand.act({ action: "click Search" });
```

**Lead Actions**
```typescript
// Save lead
await stagehand.act({ action: "click Save on the lead card" });
await stagehand.act({ action: "select the list to save to" });

// Send InMail
await stagehand.act({ action: "click Message button on the profile" });
await stagehand.act({ action: "compose the message in the text field" });
await stagehand.act({ action: "click Send" });

// View profile
await stagehand.act({ action: "click on the lead's name to view full profile" });
```

---

### SEMrush

**Navigation**
```typescript
await stagehand.page.goto('https://www.semrush.com/');

// Domain Overview
await stagehand.act({ action: "enter domain in the search bar" });
await stagehand.act({ action: "click Search or press Enter" });

// Keyword Magic Tool
await stagehand.act({ action: "click on Keyword Magic Tool in sidebar" });
await stagehand.act({ action: "enter seed keyword" });
await stagehand.act({ action: "click Search" });
```

**Data Extraction**
```typescript
const domainMetrics = await stagehand.extract({
  instruction: "extract authority score, organic traffic, organic keywords, and backlinks",
  schema: z.object({
    authorityScore: z.string(),
    organicTraffic: z.string(),
    organicKeywords: z.string(),
    backlinks: z.string()
  })
});

const keywords = await stagehand.extract({
  instruction: "extract keyword list with volume, difficulty, and CPC",
  schema: z.object({
    keywords: z.array(z.object({
      keyword: z.string(),
      volume: z.string(),
      difficulty: z.string(),
      cpc: z.string()
    }))
  })
});
```

---

## Common Automation Patterns

### Login Pattern
```typescript
async function loginToSite(
  stagehand: Stagehand,
  url: string,
  email: string,
  password: string
) {
  await stagehand.page.goto(url);

  // Wait for page load
  await stagehand.page.waitForLoadState('networkidle');

  // Find and fill login form
  await stagehand.act({
    action: `enter "${email}" in the email or username field`
  });
  await stagehand.act({
    action: `enter the password in the password field`
  });
  await stagehand.act({
    action: "click the sign in or login button"
  });

  // Wait for redirect/dashboard
  await stagehand.page.waitForLoadState('networkidle');
}
```

### Data Scraping Pattern
```typescript
async function scrapeTableData(
  stagehand: Stagehand,
  instruction: string,
  schema: z.ZodSchema
) {
  // Wait for table to load
  await stagehand.page.waitForSelector('table', { timeout: 10000 });

  // Extract data
  const data = await stagehand.extract({
    instruction,
    schema
  });

  return data;
}
```

### Pagination Pattern
```typescript
async function scrapeWithPagination(
  stagehand: Stagehand,
  extractInstruction: string,
  schema: z.ZodSchema,
  maxPages: number = 5
) {
  const allData: any[] = [];

  for (let page = 0; page < maxPages; page++) {
    // Extract current page data
    const pageData = await stagehand.extract({
      instruction: extractInstruction,
      schema
    });

    allData.push(...pageData);

    // Check for next page
    const hasNext = await stagehand.observe({
      instruction: "find the next page button or link"
    });

    if (hasNext.length === 0) break;

    await stagehand.act({ action: "click the next page button" });
    await stagehand.page.waitForLoadState('networkidle');
  }

  return allData;
}
```

### Form Filling Pattern
```typescript
async function fillForm(
  stagehand: Stagehand,
  formData: Record<string, string>
) {
  for (const [field, value] of Object.entries(formData)) {
    await stagehand.act({
      action: `enter "${value}" in the ${field} field`
    });
  }
}
```

### Screenshot & Report Pattern
```typescript
async function captureReport(
  stagehand: Stagehand,
  reportName: string
) {
  // Take screenshot
  const screenshot = await stagehand.page.screenshot({
    fullPage: true
  });

  // Extract key metrics
  const metrics = await stagehand.extract({
    instruction: "extract all key metrics and KPIs visible on the page",
    schema: z.object({
      metrics: z.array(z.object({
        name: z.string(),
        value: z.string(),
        change: z.string().optional()
      }))
    })
  });

  return { screenshot, metrics };
}
```

## Error Handling

### Common Errors
```typescript
try {
  await stagehand.act({ action: "click the submit button" });
} catch (error) {
  if (error.message.includes('Element not found')) {
    // Try alternative selector
    await stagehand.act({ action: "click the button with text Submit" });
  } else if (error.message.includes('timeout')) {
    // Wait and retry
    await stagehand.page.waitForTimeout(2000);
    await stagehand.act({ action: "click submit" });
  }
}
```

### Retry Pattern
```typescript
async function retryAction(
  stagehand: Stagehand,
  action: string,
  maxRetries: number = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await stagehand.act({ action });
      return true;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      await stagehand.page.waitForTimeout(1000 * (i + 1));
    }
  }
  return false;
}
```

## Best Practices

### Performance
```
1. Reuse browser sessions when possible
2. Wait for network idle before extracting
3. Use specific selectors over generic ones
4. Batch operations when possible
5. Handle popups and modals proactively
```

### Reliability
```
1. Always check for login state
2. Handle CAPTCHAs appropriately
3. Respect rate limits
4. Save state/progress for long operations
5. Log all actions for debugging
```

### Security
```
1. Never hardcode credentials
2. Use environment variables
3. Encrypt stored tokens
4. Rotate API keys regularly
5. Monitor for unusual activity
```
