# Verification — Noosh 17.29

## Scope

Make the pantry the primary view, combine quick selection with inventory, provide expandable ingredient groups, improve inventory entry and inventory-aware recipe matching, and load the public catalogue for guest sessions as well as signed-in sessions.

## Automated checks

- TypeScript: `npm run lint`.
- Logic: `npm test` runs a bundled fixture against the actual planner and text/guest helpers. Cloud recipe/profile services are replaced with explicit fixtures; no production data is written.
- 16 checks cover strict empty favorites, category exclusions, quick meals including unknown duration, Persian nature values, vegetarian exclusion, disliked ingredients, active challenge filtering, weekly/monthly lengths, replacement uniqueness, Persian/Arabic text and digit normalization, and guest persistence across exit.
- Production: `npm run build`.

The current package includes a pantry-first hero with a real food image, quick item/quantity/unit entry, expandable ingredient categories and subcategories that add directly to inventory, and recipe matches that consider available amounts and family size. Country filters derive additional options from the loaded international catalogue. Firebase and the GitHub CSV fallback are fetched together, with visible retry/error status and bounded network waits.

## Browser checks

- Guest entry displays a local profile with no phone submission.
- Weekly plan displays seven cards; daily plan displays three suggestions.
- Favorite state remains after reload.
- Undo restores the prior seven-card plan and survives reload.
- Shopping sync opens a categorized list with 12 items for the tested plan.
- Searching `كشك` returns recipes whose name or ingredients contain کشک.
- Enter on a focused recipe card opens its recipe.
- 390 × 844 responsive layout: root client width and scroll width both 390 pixels.

## External boundaries

The local preview connected to the configured recipe source and displayed all 667 dishes in both the kitchen counter and recipe library. This confirms the app's current read path and visible catalogue count; production Firebase rules and account-specific access were not separately audited.

The meal-planning hero now features a generated, photorealistic Iranian chelo kabab barg image, distinct from the zereshk polo image on the kitchen page.

The shopping list now supports editing an item's amount and unit, accepts Persian and Arabic numerals, and prints the active items in a compact two-column layout with quantities. The print list flows naturally across pages instead of forcing a page break after every 20 items.

The inventory-based dish recommendations no longer crash while rendering the cookable filter counts; both the filter and its count now read the correct result property.

Phone sign-in uses Firebase Phone Authentication with E.164 international numbers and reCAPTCHA, preserves old Iranian profile document IDs, verifies existing phone profiles before onboarding, and stores Firebase Auth persistence locally. Real SMS requires the project setup listed in `AUTH_SETUP.md`; local development should use Firebase's fictional phone numbers.

SMS delivery, real-user authentication, production database authorization, payment, AI inference, and settlement were not exercised. Existing client-side demo OTP/admin behavior requires a trusted backend before a public release. Fonts and images remain network assets. Build may report large vendor chunks; code splitting does not make the app a fully offline PWA.
