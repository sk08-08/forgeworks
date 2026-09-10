# Forgeworks Project Structure

Forgeworks uses a feature-first architecture.

## Core rules

### app/

`app/` owns Next.js routes and route composition.

Pages should stay relatively small and delegate product logic and UI to features.

Avoid placing large reusable components, business logic, or generic helpers directly inside route folders.

---

### features/

Product-specific functionality belongs in:

`features/<feature-name>/`

A feature may contain:

- `components/`
- `actions/`
- `lib/`
- `hooks/`
- `types.ts`
- `config/`

Only create these folders when the feature actually needs them.

Examples:

- `features/forms/`
- `features/bots/`
- `features/profile/`
- `features/markdown/`
- `features/moderation/`

---

### components/ui/

Reserved for generic UI primitives.

Examples:

- Button
- Dialog
- Input
- Select
- Popover
- Tooltip

Components here should not contain Forgeworks-specific business logic.

---

### components/shared/

Reusable application-level components that are shared by multiple features but are not low-level UI primitives.

Examples may include:

- reusable search controls
- image dialogs
- shared navigation pieces
- application-specific visual utilities

---

### lib/

Reserved for shared infrastructure and utilities used across multiple features.

Feature-specific helpers should stay inside their feature.

Good candidates for global `lib/` include:

- Supabase clients
- authentication/access infrastructure
- storage infrastructure
- caching
- rate limiting
- URL safety
- error utilities
- general utilities

---

### Feature ownership

If code is only used by one feature, that feature owns it.

Example:

A helper only used by Forms belongs in:

`features/forms/lib/`

not:

`lib/`

---

### Shared subsystems

A sufficiently large subsystem used by multiple features may become its own feature.

Markdown is an example:

`features/markdown/`

---

### Server Actions

Server Actions should normally live with the feature that owns them.

Example:

`features/forms/actions/`

instead of putting every action into a global `app/actions/` directory.

---

### Avoid

- giant catch-all `components/` folders
- giant catch-all `lib/` folders
- creating empty folders "for later"
- generic filenames such as `helpers.ts` when a more specific name is possible
- huge barrel files exporting an entire feature
- moving code simply because it appears on the same page

## Guiding question

When deciding where a file belongs, ask:

> Who owns this code?

The folder structure should reflect the answer.
