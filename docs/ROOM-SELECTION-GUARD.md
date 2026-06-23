# Room Selection Guard - Implementation Guide

## Overview

**Compact room cards** + **validation guard** for room selection in Casa Emil booking flow.

- ✅ Cards are **50% smaller** (compact grid layout)
- ✅ **Guard prevents selecting more rooms than needed**
- ✅ **Decoupled, NO spaghetti code**
- ✅ **18/18 tests passing**

---

## Architecture

### Layer 1: Domain Logic (Decoupled) 🏛️

**File:** `src/domain/booking/room-selection-guard.ts`

Pure functions, NO UI, NO side effects:

```typescript
// Guard: Can user select another room?
canSelectRoom(state, roomIdToToggle, isCurrentlySelected)
  → { allowed: boolean, selectedIds: string[] }

// Guard: Validate final selection
validateRoomSelection(state)
  → { valid: boolean, error?: string }

// Helper: Get available rooms + their selectability
getSelectableRooms(state)
  → Array<{ id, name, selectable, reason? }>

// Helper: Show user what they need to do
suggestRoomCount(selectedCount, requiredCount)
  → "Select 2 more" | "All selected" | "Remove 1"
```

**Why decoupled?**
- Zero UI dependencies
- Testable in isolation (18 unit tests)
- Can use in API/backend
- Easy to change logic without touching UI
- Reusable in multiple components

---

### Layer 2: UI Component (Compact) 🎨

**File:** `src/components/calendar/RoomCardCompact.tsx`

Compact room card: **~160px width, 4 lines of content**

```
┌─────────────────────┐
│ 1          300 RON  │  Header: count + price
│ Triple              │  Title (1 line)
│ Room 101 - Building │  Rooms (max 2, +X more)
│          ○          │  Selection indicator
└─────────────────────┘
```

**Grid layout:**
- Desktop: `repeat(auto-fill, minmax(160px, 1fr))` → 4 cards/row
- Tablet: 3 cards/row
- Mobile: 2 cards/row

**Features:**
- Shows only essential info
- Selection visual feedback (✓ vs ○)
- Disabled state when limit reached
- Helpful hints on disabled cards

---

### Layer 3: Integration Component 🔗

**File:** `src/components/calendar/RoomSelectionWithGuard.tsx`

Connects guard + UI + state:

```
User clicks card
    ↓
toggleRoom(roomId)
    ↓
Guard validates: canSelectRoom()
    ↓
If allowed: setState(newIds)
If blocked: show warning
    ↓
Progress indicator updates: "Select 1 more..."
    ↓
User clicks "Confirm"
    ↓
Final validation: validateRoomSelection()
    ↓
If valid: onComplete() / If invalid: error shown
```

**No spaghetti:**
- Guard is pure, no coupling
- Component just calls guard and handles result
- State changes are simple and clear

---

## Usage

### In Your Booking Form

```tsx
import { RoomSelectionWithGuard } from "@/components/calendar/RoomSelectionWithGuard";

export function BookingForm({ preview }) {
  const handleComplete = (selectedOptionIds) => {
    console.log("User selected:", selectedOptionIds);
    // Save booking...
  };

  return (
    <RoomSelectionWithGuard
      preview={preview}
      onComplete={handleComplete}
      onCancel={() => setStep("previous")}
    />
  );
}
```

---

## How the Guard Works

### Scenario: User booking 2 rooms

```
Required: 2 rooms

1. User clicks Room 101
   ✓ canSelectRoom() → "allowed: true"
   Selected: [r1]

2. User clicks Room 102
   ✓ canSelectRoom() → "allowed: true"
   Selected: [r1, r2]

3. User clicks Room 103
   ❌ canSelectRoom() → "allowed: false"
   Reason: "Already selected 2 room(s). Need 2 total."
   Selected: [r1, r2] (unchanged)
   UI shows disabled state on unselected rooms

4. User clicks "Confirm"
   ✓ validateRoomSelection() → "valid: true"
   Calls onComplete([r1, r2])
```

### Scenario: User changes mind

```
Selected: [r1, r2]

1. User clicks Room 101 (to deselect)
   ✓ canSelectRoom(..., true) → "allowed: true" (deselection always ok)
   Selected: [r2]

2. User clicks Room 103
   ✓ canSelectRoom() → "allowed: true" (now has space)
   Selected: [r2, r3]

3. User clicks "Confirm"
   ✓ validateRoomSelection() → "valid: true"
```

---

## Testing

**File:** `src/domain/booking/__tests__/room-selection-guard.test.ts`

**18 tests covering:**
- ✓ Deselection always allowed
- ✓ Cannot select over limit
- ✓ Can select when under limit
- ✓ Single room requirement
- ✓ Many rooms requirement
- ✓ Validation: correct count
- ✓ Validation: too few rooms
- ✓ Validation: too many rooms
- ✓ Suggestions: various states
- ✓ Selectability: correct marking
- ✓ Integration: 2-room booking scenario
- ✓ Integration: deselect + reselect

**Run tests:**
```bash
npm test src/domain/booking/__tests__/room-selection-guard.test.ts
```

**Result:** ✅ **18/18 PASS**

---

## Compact Card Specs

| Aspect | Spec |
|--------|------|
| **Width** | 160px (minmax) |
| **Height** | ~100px |
| **Grid** | 4 cols desktop, 3 tablet, 2 mobile |
| **Font size** | 12px title, 10px details, 13px price |
| **Padding** | 8px |
| **Gap** | 12px |
| **Reduction** | ~50% vs original cards |

---

## Migration Checklist

If replacing old room selection UI:

- [ ] Import `RoomSelectionWithGuard` component
- [ ] Pass `preview` prop (GuestStayPreview)
- [ ] Implement `onComplete` handler
- [ ] Remove old card component
- [ ] Test with 1, 2, 3+ room bookings
- [ ] Test guard: try selecting 10 rooms (should block)
- [ ] Test deselection works
- [ ] Check responsive on mobile

---

## Files Created

```
src/domain/booking/
├── room-selection-guard.ts          (Pure logic, 7 functions)
└── __tests__/
    └── room-selection-guard.test.ts (18 tests)

src/components/calendar/
├── RoomCardCompact.tsx              (Compact UI)
└── RoomSelectionWithGuard.tsx       (Integration)
```

---

## Key Principles (Why This Design)

### ✅ Decoupled
- Guard logic lives in `domain/` (business logic)
- UI lives in `components/` (presentation)
- Zero imports from components in guard
- Can test guard without browser

### ✅ No Spaghetti
- Each file has ONE responsibility
- Guard = validation only
- Card = display only
- Container = orchestration only
- No mixed concerns

### ✅ Defensive
- Guard prevents invalid states
- UI respects guard results
- Final validation before submit
- Tests verify all edge cases

### ✅ Maintainable
- Pure functions are easy to change
- Tests document expected behavior
- Clear data flow (state → guard → UI)
- Reusable across components

---

## Example: Custom Integration

If you want to use just the guard (not the full component):

```tsx
import { canSelectRoom, validateRoomSelection } from "@/domain/booking/room-selection-guard";

function MyCustomRoomSelector() {
  const [selected, setSelected] = useState<string[]>([]);

  const handleToggleRoom = (roomId: string) => {
    const isSelected = selected.includes(roomId);
    const result = canSelectRoom(
      {
        requiredRoomCount: 2,
        selectedRoomIds: selected,
        availableRooms: [],
      },
      roomId,
      isSelected
    );

    if (result.allowed) {
      setSelected(result.selectedIds);
    }
  };

  return (
    // Your custom UI...
  );
}
```

---

## Questions?

- Guard not working? Check `room-selection-guard.test.ts` for expected behavior
- UI not compact enough? Adjust `minmax(160px, 1fr)` in RoomCardCompact
- Want different validation? Modify guard functions (tests will catch issues)
- Need guard in backend? Copy `room-selection-guard.ts` to your API
