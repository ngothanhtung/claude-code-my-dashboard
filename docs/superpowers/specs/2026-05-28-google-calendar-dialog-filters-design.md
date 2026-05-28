# Google Calendar: Dialog + Filters Redesign

**Date:** 2026-05-28
**Status:** Approved

## Overview

Convert the Google Calendar page's inline event creation form into a Dialog modal and add a filter toolbar to the event list, matching the pattern established by the tasks page.

## Design Decisions

- **Filter bar layout:** Two-row toolbar (matching tasks page pattern)
- **Trigger button placement:** Inside filter toolbar, right side
- **Filter types:** Date Range + Color (no attendee filter)
- **Form state management:** Convert from `react-hook-form` + `zodResolver` to `useState` + Zod (matching tasks pattern)

---

## 1. Component Architecture

### New Files

| File | Purpose |
|---|---|
| `src/modules/google/calendar/components/add-event-modal.tsx` | Dialog-based event creation form |
| `src/modules/google/calendar/components/event-list-toolbar.tsx` | Two-row filter toolbar |

### Modified Files

| File | Change |
|---|---|
| `src/app/(private)/google/calendar/page.tsx` | Remove inline form card, add `EventListToolbar` to `EventList`, pass `onAddEvent` callback |
| `src/modules/google/calendar/components/event-list.tsx` | Accept `onAddEvent` prop, render `EventListToolbar` above table |

---

## 2. EventListToolbar

### Props Interface

```ts
interface EventListToolbarProps {
  table: Table<CalendarEvent>;
  onAddEvent: () => void;
}
```

### Structure

**Row 1 — Filter Dropdowns (left side, side by side):**

| Control | Type | Options | Default |
|---|---|---|---|
| Date Range | `Select` | All, Today, This Week, This Month | All |
| Color | `Select` | All Colors, Blue, Green, Red, Orange, Purple, Pink | All Colors |

Each Select takes `flex: 1`. Gap `8px`.

**Row 2 — Search + Actions:**

- Left: `Input` (search, targets `title` column via Tanstack Table `getColumn`)
- Reset `Button` (clears all column filters + search), disabled when no filters active
- Right: `DataTableViewOptions` (existing component) + Add Event `Button`

### Filter Logic

- Date Range and Color use Tanstack Table `columnFilters` state
- Both filters are independent and combine with search
- Filter functions run in `getFilteredRowModel` — filter applied via `filterFns` on the table
- Reset button calls `table.resetColumnFilters()` + clears search filter

### Date Range Filter Implementation

```ts
// Filter function registered on the "start" column
const dateRangeFilterFn: FilterFn<CalendarEvent> = (row, columnId, filterValue) => {
  const eventStart = new Date(row.getValue<Date>(columnId));
  const now = new Date();
  switch (filterValue) {
    case 'today':
      return isSameDay(eventStart, now);
    case 'this-week':
      return isWithinInterval(eventStart, { start: startOfWeek(now), end: endOfWeek(now) });
    case 'this-month':
      return isSameMonth(eventStart, now);
    default:
      return true;
  }
};
```

Color filter: direct match on `row.original.colorId` with the selected color value (e.g., `blue`, `green`, etc.).

---

## 3. AddEventModal

### Props Interface

```ts
interface AddEventModalProps {
  onAddEvent?: (event: CalendarEvent) => void;
  trigger?: React.ReactNode;
}
```

### Dialog Structure

```
<Dialog>
  <DialogTrigger asChild>{trigger || <Button>+ Add Event</Button>}</DialogTrigger>
  <DialogContent className="sm:max-w-[525px]">
    <DialogHeader>
      <DialogTitle>Create New Event</DialogTitle>
      <DialogDescription>Fill in the details below to create a new calendar event.</DialogDescription>
    </DialogHeader>
    <form>...fields...</form>
  </DialogContent>
</Dialog>
```

### Form Fields (unchanged from current form)

| Field | Component | Required |
|---|---|---|
| Title | `Input` | Yes |
| Description | `Textarea` | No |
| Start Time | `Input type="datetime-local"` | Yes |
| End Time | `Input type="datetime-local"` | Yes |
| Timezone | `Select` | Yes |
| Location | `Input` | No |
| Attendees | Custom tag input | No |
| Color | Radio group (6 colors) | No |

### Form State

- Use `useState` for form data and errors (matching tasks pattern, not `react-hook-form`)
- Zod schema for validation (reuse existing schema from page)
- Submit via existing API route `/api/calendar/events/create`
- On success: call `onAddEvent` callback, close dialog, show `toast.success()`
- On error: show `toast.error()`

### Form Initial State

```ts
const initialState = {
  summary: '',
  description: '',
  start: '',
  end: '',
  timeZone: 'Asia/Ho_Chi_Minh',
  location: '',
  attendees: [] as string[],
  colorId: '',
};
```

---

## 4. Page Changes

In `page.tsx`:
1. Remove the inline `<Card>` with the event creation form
2. Pass `onAddEvent={() => refetch()}` to `EventList`
3. `EventList` renders `EventListToolbar` above the table
4. All existing logic (connection status, stats cards, OAuth2) remains unchanged

---

## 5. Dependencies

No new dependencies. Uses existing components:
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogTrigger` from `src/components/ui/dialog.tsx`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `src/components/ui/select.tsx`
- `Input`, `Label`, `Textarea`, `Button` (existing)
- `DataTableViewOptions` (existing from tasks module, can be shared or duplicated — prefer shared if extracted)
- `toast` from `sonner`
- `date-fns` for date range filtering (already in project via calendar module)
