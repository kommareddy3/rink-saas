# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-forgot.spec.ts >> Forgot password >> entering an email shows the 'reset link sent' confirmation
- Location: e2e/auth-forgot.spec.ts:12:3

# Error details

```
Error: page.goto: NS_ERROR_CONNECTION_REFUSED
Call log:
  - navigating to "http://localhost:5173/auth?mode=forgot", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - heading [level=1] [ref=e5]
  - paragraph
  - paragraph
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { randomEmail } from "./helpers";
  3  | 
  4  | /**
  5  |  * Forgot-password flow → Supabase fires `reset-password.html`.
  6  |  *
  7  |  * The success view appears regardless of whether the email matches an
  8  |  * existing account (anti-enumeration), so we can assert it deterministically
  9  |  * with any email format.
  10 |  */
  11 | test.describe("Forgot password", () => {
  12 |   test("entering an email shows the 'reset link sent' confirmation", async ({ page }) => {
  13 |     const email = randomEmail("e2e-forgot");
  14 | 
> 15 |     await page.goto("/auth?mode=forgot");
     |                ^ Error: page.goto: NS_ERROR_CONNECTION_REFUSED
  16 | 
  17 |     // Heading on the FORGOT view is "Forgot your password?"
  18 |     await expect(
  19 |       page.getByRole("heading", { name: /forgot|reset/i })
  20 |     ).toBeVisible();
  21 | 
  22 |     await page.getByLabel(/account email|^email$/i).fill(email);
  23 |     await page.getByRole("button", { name: /send reset link|send.*link|reset password/i }).click();
  24 | 
  25 |     // Success heading "Reset link sent" or supporting copy.
  26 |     await expect(
  27 |       page.getByText(/reset link sent|check.*for the reset link|sent/i)
  28 |     ).toBeVisible({ timeout: 15_000 });
  29 |   });
  30 | });
  31 | 
```