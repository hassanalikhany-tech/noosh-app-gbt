# Inventory calculations, version 3

Recipe scaling, pantry matches, shopping shortages and cooking all share `evaluateInventory`. It allocates repeated lines sequentially across matching stock lots and never consumes more than the recorded amount. Scaling from the recipe's base servings happens once.

## Iranian units and average weights

- The app's household cup (`پیمانه`) is 250 ml; an unqualified Iranian `قاشق` means tablespoon (15 ml). Mass, volume and count conversions are direct when they stay in their own family.
- Cross-family conversions use ingredient-specific references first. When the catalogue has no reference, the engine uses labeled approximate defaults by food category and typical piece weight. Examples include one whole chicken ≈ 2 kg, egg ≈ 55 g, onion ≈ 110 g, potato ≈ 213 g, rice cup ≈ 195 g. The estimate and coefficient are saved in cooking history and surfaced to the user; admin references can override them.
- Unknown/non-numeric recipe quantities (notably «به میزان لازم»), unmatched foods and absent pantry items cannot yield a truthful gram deduction. The cooking action records those lines in its history and deducts only the amount of matching stock that exists. It never substitutes a different food or makes inventory negative.
- Changing the household or stock unit does not reinterpret the user's saved physical amount. Intrinsic gram/ml/count measurements remain stable; average references only bridge a recipe measure to the stock measure.

## Cooking and history

Pressing «پختم؛ کسر خودکار از انبار» creates and persists a transaction immediately. There is no question or manual amount adjustment at cook time. The same localStorage write updates stock and appends the transaction. A repeated transaction ID is idempotent, and Web Locks serialize same-origin tabs when supported. If storage fails, the UI reports the error instead of claiming success.

The pantry's «سابقهٔ مصرف» shows each item, amount, before/after balances and whether an average was used. Undo restores precisely the amount taken while retaining later purchases and records the reversal. A cook event with no matching stock is still logged with notes, but has no inventory changes.

## Existing data and limits

Legacy stock amounts are preserved, backed up on the first v2 write under `noosh_inventory_before_v2`, and flagged for one-time physical check; historical deductions cannot be reconstructed. Missing recipe serving counts are set to four, per the catalog owner's instruction. Source quantities described as «as needed» cannot be inferred from arithmetic and remain excluded from numeric deduction.

The unit audit in the management panel exposes entries that use unknown amounts or need a better ingredient reference. Admin-entered piece or volume references take precedence over the defaults. The defaults are deliberate estimates; they are not claims that food sizes or kitchen measures are identical for every household.

## Verification

Scenario checks cover Iranian cup-to-weight conversion, standard-spoon conversion, egg/onion/potato/chicken averages, exact mass conversions, family scaling, sequential allocation, no overdraw, transaction idempotence, missing-stock cooking records, undo, and persistence. The catalog audit is available via `npm run audit:quantities`.
