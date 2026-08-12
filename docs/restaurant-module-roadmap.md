# Restaurant module roadmap

Agreed plan for table management, orders, and kitchen flow. Update this doc when scope changes.

---

## Phase 1 — Industry / login wiring ✅

- Shop `industryType` and module flags on login and settings refresh
- Frontend `useShopIndustry()`, `hasTableManagement()`, etc.

---

## Phase 2 — Product number ✅

- `productNumber` on products, search, cart lines, UI badges

---

## Phase 3 — Table setup ✅

**Purpose:** Master data only — configure tables per branch.

| Area | What |
|------|------|
| Backend | `ShopTable` model, `/api/tables` CRUD + bulk create |
| Settings | **Manage tables** (owner/admin, restaurant + `tableManagement`) |
| Components | `TablePickerGrid`, `TablePickerModal` (reused in Phase 4) |

**Not in Phase 3:** cart linking, occupied status, order type prompt.

**Phase 3 Home placeholder (temporary):** “Select table” on Home — preview only; **not** the final UX. Replace in Phase 4.

---

## Phase 4 — Cart + table linking (order start on Products tab)

**Purpose:** Tie dine-in orders to tables; derive occupied/free from open carts.

### Build order (do in this sequence)

1. **Cart model & API**
   - Add to `cart.js`: `orderType` (`takeaway` | `dine_in` | `delivery`), `tableId`, `orderLabel`
   - Create/update cart with these fields; validate dine-in + table management requires `tableId`

2. **Products tab — start order flow** (primary entry point)
   - On **first product add** (new cart / `forceNewCart`):
     - Restaurant shop → prompt: **Takeaway** or **Dine-in**
     - **Takeaway** → create cart, no table
     - **Dine-in** + `tableManagement` → open table picker → create cart with `tableId`
   - Further adds use existing cart `orderType` / `tableId` (no repeat prompt)
   - Retail / non-restaurant → unchanged (no prompt)

3. **Occupied status (data layer)**
   - Open dine-in carts with `tableId` mark those tables as **occupied**
   - API: extend tables list or separate endpoint to merge table + cart status
   - Update `toTablePickerItems()` to use real status (not hardcoded `free`)

4. **Home — table status board** ⏳ **DO LAST in Phase 4**
   - **Monitor only** — check which tables are free vs occupied
   - Green = free, Red = occupied (ongoing order on that table)
   - **Not** for starting orders (that stays on Products tab)
   - Optional later: tap occupied table → view/resume order
   - Remove Phase 3 “select table for order” behavior from Home

### Occupied rule

A table is **occupied** when there is an open cart/order with:

- `orderType === 'dine_in'`
- `tableId` = that table
- Cart status still open (`pending` / `added`, not paid/completed)

Paid or cancelled → table returns to **free**.

---

## Phase 5 — KOT + Kitchen tab

- Kitchen order tickets from cart items
- Kitchen tab for restaurant + `kitchenOrders`

---

## Phase 6 — Orders hub

- Search/filter many tables (35+)
- Orders list hub for restaurant operations

---

## Deferred

- **Multi-branch UI** — branch picker on login, create branch (foundation exists: single branch auto-select)

---

## Screen roles (summary)

| Screen | Role |
|--------|------|
| Settings → Manage tables | Setup tables (Phase 3) |
| Products tab | Start order: Takeaway / Dine-in → table if dine-in (Phase 4) |
| Home → Table status | View free/occupied only — **last item in Phase 4** |
| Kitchen | KOT (Phase 5) |

---

## Frontend API integration (all phases)

**Reference screen:** `fontend/src/screens/settings/paymentAndFeature/payment/SubscriptionPaymentsScreen.tsx`

Every screen or component that calls a thunk/service must handle **expired or invalid tokens** the same way.

### Service layer (`*Service.tsx`)

- Use `apiClient` (JWT attached automatically).
- Use `ensureInternetConnection()` before requests.
- On catch, `rejectWithValue(toApiErrorResponse(error))` so 401 + `TOKEN_EXPIRED` / `TOKEN_INVALID` etc. reach the UI.

### UI layer (screens, modals)

In every `try/catch` around `.unwrap()`:

```typescript
} catch (error: unknown) {
  const handled = await handleSessionExpiredApiError(error, show_Alert);
  if (handled) return;

  // Only show generic error if session was NOT expired
  show_Alert('error', 'Load failed', getApiErrorMessage(error, '...'), 1, true, 'OK');
}
```

`handleSessionExpiredApiError` (`fontend/src/utils/apiErrorAlert.ts`):

- Detects 401 session errors (`TOKEN_EXPIRED`, `TOKEN_INVALID`, `TRIAL_ENDED`, …)
- Shows **Session expired** alert with **Login** button
- Clears token + Redux session → navigates to `LoginScreen`
- Returns `true` if handled — **do not** show a second generic error

### Required hooks/imports per screen

```typescript
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import {
  handleSessionExpiredApiError,
  getApiErrorMessage,
} from '../../../utils/apiErrorAlert';
```

Render alert only when config exists:

```typescript
{alertConfig && (
  <CommonAlert ... onClose={hideAlert} />
)}
```

### Phase 3 table screens (already follow this)

- `ManageTablesScreen.tsx` ✅
- `TableFormScreen.tsx` ✅
- `TablePickerModal.tsx` — must use same pattern when loading tables

### Phase 4+ (apply to all new API calls)

- Products tab order-type / table picker flow
- Home table status board (last in Phase 4)
- Kitchen / orders hub (Phases 5–6)

---

*Last updated: API integration must follow SubscriptionPaymentsScreen + handleSessionExpiredApiError; Home table status last in Phase 4.*
