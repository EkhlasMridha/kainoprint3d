# Cost & pricing formulas

All logic lives in `src/domain/costing/` (framework-independent, no database or UI code) and is
covered by `tests/costing.test.ts` and `tests/pricing.test.ts`.

**Money:** stored as integer **poisha** (৳1 = 100 poisha). Rates such as cost per gram may be fractional;
each cost line is rounded half-up to a whole poisha **once**, and totals are the sum of the rounded lines,
so every breakdown adds up exactly. Selling prices are always rounded **up** to the configured step
(৳1/5/10/50/100), so rounding can never push a price below what the formula requires.

---

## 1. Rates

| Rate | Formula | Where it's configured |
|---|---|---|
| Depreciation / hour | (purchase price − residual value) ÷ lifetime productive hours | Printer |
| Electricity / hour | average **measured** watts ÷ 1000 × tariff per kWh | Printer |
| Maintenance / hour | entered per hour, **or** monthly budget ÷ monthly productive hours | Printer |
| Consumables / hour | nozzle cost ÷ nozzle life hours + other consumables per hour | Printer |
| Printer overhead / hour | printer-specific monthly overhead ÷ monthly productive hours | Printer |
| Material / gram | (spool price + handling cost per spool) ÷ net usable grams | Material |
| Overhead rate | Σ *included* monthly overhead ÷ basis (machine h, labour h, or units per month) | Costing settings |

## 2. Batch quantities

* Print jobs (plates) = ⌈quantity ÷ items per plate⌉. If the last plate is not full, the spare items'
  cost is absorbed by the batch (the calculator says so).
* Grams per plate = slicer total **or** model + supports + purge — never both.
* Hands-on labour hours = (plates × (setup + removal) + quantity × (post-processing + assembly +
  inspection + packaging) + model prep + communication) ÷ 60. Unattended print time is *not* labour.

## 3. Cost lines (per batch)

| # | Line | Formula |
|---|---|---|
| 1 | Material | plates × grams/plate × (1 + waste allowance if enabled) × cost/gram |
| 2 | Depreciation | machine hours × depreciation/h |
| 3 | Electricity | machine hours × electricity/h |
| 4 | Maintenance & consumables | machine hours × (maintenance/h + consumables/h) |
| 5 | Direct labour | hands-on hours × labour rate |
| 6 | Design | *include*: hours × design rate · *amortise*: design cost ÷ N units × min(qty, N) · *separate*: 0 (billed as its own fee) |
| 7 | Failure & reprint allowance | see §4 |
| 8 | Packaging, hardware & other | qty × (packaging + hardware) + other batch costs |
| 9 | Allocated overhead | basis × overhead rate + machine hours × printer overhead/h |

**Total batch cost** = sum of lines 1–9. **Unit cost** = total ÷ sellable quantity.

## 4. Failed prints

* Failure probability *p* = job override, otherwise 1 − (1 − p_printer)(1 − p_material).
* Repeating until success, expected attempts = 1 ÷ (1 − *p*), so expected **failed** attempts per good
  plate *e* = *p* ÷ (1 − *p*). *p* = 100% is rejected (cost is undefined).
* A failed attempt consumes on average a fraction *f* of a plate (configurable; 50% default).
* Failure cost = plates × *e* × [ *f* × (material + machine time × (machine rates + machine-hour overhead))
  + (optional) setup & removal labour ].
* **Not** exposed to failure: design, packaging, hardware, per-item post-processing (only good parts get those).
* "My figures already include expected failures" sets *p* = 0 so losses are never counted twice.

## 5. Double-counting guards

* Slicer total and component grams are mutually exclusive.
* The material waste allowance is opt-in per calculation; use net usable weight for spool-end waste.
* Overhead items can be excluded; the engine warns if a printer has a maintenance rate **and** monthly
  overhead includes "equipment maintenance", or if per-item packaging is entered **and** overhead
  includes "packaging supplies". The seed data excludes those two overhead items for this reason.
* Overhead is allocated on exactly one basis.

## 6. Pricing

Let *C* = unit cost, *M* = target margin, *F* = sum of percentage fees (charged on what the customer
pays), *t* = tax rate (0 when not registered), *X* = fixed fee per order ÷ quantity.

```
Net price P   = (C + X) / (1 − M − F·(1 + t))
Customer pays = P·(1 + t)          ← tax is collected for the authorities, not revenue
Fees          = F·P·(1 + t) + X
Profit        = P − fees − C
Margin        = profit ÷ P         ← share of the selling price
Markup        = profit ÷ C         ← share of the cost (a 40% margin = 66.7% markup)
```

With no tax and no fixed fee this is exactly **P = C ÷ (1 − M − F)**; with no fees, **P = C ÷ (1 − M)**.

| Tier | Cost basis | Margin |
|---|---|---|
| Minimum sustainable | C | 0% — covers costs and selling fees only |
| Standard | C | standard target margin |
| Premium / custom | C + personalisation labour + small-order fee ÷ qty + rush fee × machine h ÷ qty + extra service ÷ qty | premium margin |

Premium is never allowed below standard; standard can never be below minimum. A manual override is
checked against cost (loss), the minimum price, and the low-margin threshold.

## 7. Worked example (verifiable by hand — `tests/fixtures.ts`)

**Inputs.** Printer ৳100,000, residual ৳20,000, 4,000 h life, 120 W, ৳10/kWh, maintenance ৳5/h,
nozzle ৳1,000 / 500 h, other consumables ৳1/h, failure 10%. Material ৳2,000 + ৳90 handling, 950 g usable,
no extra failure. Labour ৳120/h, design ৳300/h. Overhead ৳4,000/month over 200 machine hours.
Job: 10 items, 5 per plate, 3 h and 50 g per plate; setup 6 + removal 4 min per plate; 6 min per item;
20 min per batch; 60 min design amortised over 100 units; packaging ৳10 + hardware ৳5 per item + ৳20 other;
failure consumption 50%, failure labour included. Margin 40%, no fees, no tax, round up to ৳5.

**Rates.** depreciation (100,000 − 20,000) ÷ 4,000 = **৳20/h** · electricity 0.12 kW × ৳10 = **৳1.20/h** ·
maintenance **৳5/h** · consumables 1,000 ÷ 500 + 1 = **৳3/h** · material 2,090 ÷ 950 = **৳2.20/g** ·
overhead 4,000 ÷ 200 = **৳20/h**.

| Line | Working | Amount |
|---|---|---|
| Material | 2 plates × 50 g × ৳2.20 | ৳220.00 |
| Depreciation | 6 h × ৳20 | ৳120.00 |
| Electricity | 6 h × ৳1.20 | ৳7.20 |
| Maintenance & consumables | 6 h × (৳5 + ৳3) | ৳48.00 |
| Direct labour | (2×10 + 10×6 + 20) = 100 min × ৳120/h | ৳200.00 |
| Design | ৳300 ÷ 100 units × 10 | ৳30.00 |
| Failure | e = 0.1 ÷ 0.9 = 1/9 → 2/9 failed plates × 50%: material 2/9×0.5×50×2.20 = 12.22; machine 2/9×0.5×3×(20+1.20+5+3+20) = 16.40; labour 2/9×10 min×৳120/h = 4.44 | ৳33.07 |
| Packaging etc. | 10 × (10 + 5) + 20 | ৳170.00 |
| Overhead | 6 h × ৳20 | ৳120.00 |
| **Total** | | **৳948.27** |
| **Unit cost** | 948.27 ÷ 10 | **৳94.83** |

**Prices.** Minimum: ৳94.83 → **৳95**. Standard: 94.827 ÷ (1 − 0.40) = ৳158.05 → **৳160**
(profit ৳65.17, margin 40.7%, markup 68.7%). Premium (50%): 94.827 ÷ 0.5 = ৳189.65 → **৳190**.
With a 2% payment fee the standard price becomes 94.827 ÷ 0.58 = ৳163.49 → ৳165.

## 8. Customer estimators (simplified, server-side only)

Customer prices come from owner-set price rules (`src/domain/estimator/`), not the internal cost model:

* **Keychain weight** ≈ W × H × T × fill factor × solid fraction × density (indicative only).
  Price = style base + extra grams × ৳/g + extra characters + extra colours + double-sided + ring,
  then material surcharge, quantity discount, one-time design fee, rush %, minimum order.
* **Organizer weight** uses a shell model: (base + outer walls + dividers in a near-square grid) ×
  wall thickness × solid fraction × density — so material grows with surface area, not volume.
  Price = grams × ৳/g + print hours × ৳/h + features + compartments + colours + text/logo, then
  surcharge, discount, setup/design fees, minimum order. Unchanged presets skip the setup fee.
* **Quantity discounts never go below a private floor:** fixed + grams × ৳/g + hours × ৳/h (estimators)
  or the product's private minimum unit price (catalog).
* Estimates are shown as a range (configurable ±%), wider when a design review is needed. Uploaded
  logos and 3D files are never "priced" automatically.
