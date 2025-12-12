# Update Project Progress in Notion

This command updates the GHL Agency AI development progress in Notion.

## Project Reference
- **Notion Project ID:** `2b0c283b-4ad9-80ca-8a32-c390e3aa8d9f`
- **Progress Page ID:** `2c7c283b-4ad9-814a-afe1-f7ac12b23806`

## Instructions

1. **Fetch current progress** from Notion using `mcp__notion__API-get-block-children` with block_id `2c7c283b-4ad9-814a-afe1-f7ac12b23806`

2. **Run the test suite** to get current test counts:
   ```bash
   npm test -- --reporter=basic 2>&1 | tail -20
   ```

3. **Update the progress page** with:
   - Current date in "Last Updated" field
   - Test counts (passing/failing)
   - Move completed items from "In Progress" to "Completed"
   - Add new items discovered during development

4. **Update checklist items** when production readiness tasks are completed

## Usage Examples

### Update test counts after TDD work:
- Run tests, capture results
- Update the "Current Test Status" section

### Mark production checklist item complete:
- Find the relevant block using block children API
- Update the text from `[ ]` to `[x]`

### Add new completed work:
- Append to the "Completed Work" section using `mcp__notion__API-patch-block-children`

## Prompt

When invoked, summarize recent work completed, run tests to get current status, and update the Notion progress page accordingly. Ask what specific updates to make if not clear from context.
