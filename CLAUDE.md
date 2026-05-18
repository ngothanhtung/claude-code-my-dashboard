# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A comprehensive admin dashboard template built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui**. Features include multiple dashboard layouts, app modules (mail, chat, calendar, tasks), authentication pages, and a live theme customizer.

## Dev Commands

```bash
npm run dev      # Start dev server (Turbopack enabled)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

**Note**: Turbopack is enabled in `next.config.ts`. ESLint uses `next/core-web-vitals` + `next/typescript`.

## Architecture

### Route Groups

- `src/app/page.tsx` → redirects to `/dashboard`
- `src/app/(auth)/` → auth pages (sign-in, sign-up, forgot-password, error pages)
- `src/app/(private)/` → protected app pages (dashboard, mail, chat, calendar, tasks, users, settings, etc.)
- `src/app/landing/` → marketing landing page with sections (hero, features, pricing, testimonials, etc.)

### Feature Modules

Each app feature lives under `src/modules/<feature>/` with a consistent structure:

```
modules/<feature>/
├── components/         # Feature-specific React components
├── hooks/              # Feature-specific hooks (e.g., use-calendar.ts, use-mail.ts)
├── services/           # Data fetching, mock data, and business logic
│   ├── data/           # JSON mock data files
│   ├── types/          # TypeScript type definitions
│   └── *-services.ts  # Service functions
```

Key modules: `calendar`, `chat`, `dashboard`, `dashboard-2`, `faqs`, `mail`, `pricing`, `settings`, `tasks`, `users`.

### UI Components

All reusable shadcn/ui components are in `src/components/ui/`. These are generated components wrapping Radix UI primitives with Tailwind styling.

### Theming System

Theme customization works by setting CSS variables on `document.documentElement`. Key files:

- `src/components/theme-provider.tsx` — manages light/dark/system theme via class toggling
- `src/hooks/use-theme-manager.ts` — applies preset themes, custom themes, or imported themes via CSS variable injection
- `src/config/theme-customizer-constants.ts` — color definitions and constants
- `src/config/theme-data.ts` — preset color themes
- `src/types/theme-customizer.ts` — type definitions for themes and presets

The `ThemeCustomizer` component (in `src/components/theme-customizer/`) allows live customization of theme, layout, and radius via a slide-over panel.

### Sidebar Layout System

Sidebar behavior is configured via `SidebarConfigContext` (`src/contexts/sidebar-context.tsx`):

- `variant`: "sidebar" | "floating" | "inset"
- `collapsible`: "offcanvas" | "icon" | "none"
- `side`: "left" | "right"

`AppSidebar` reads this config and is used in the `(private)` layout.

### Authentication

Firebase Authentication is used. Auth helpers are in `src/lib/firebase/auth.ts`:

- `signInWithEmailPassword`, `signInWithGoogle`, `signUpWithEmailPassword`, `signOutUser`
- Error messages are localized in Vietnamese
- Firebase config comes from `.env.local` (not committed — see `.gitignore`)

### State Management

- **Zustand** for global state
- **React Context** for theme (`ThemeProvider`) and sidebar config (`SidebarConfigProvider`)
- **React Hook Form + Zod** for form validation
- **`onAuthStateChanged`** in `AppSidebar` to track Firebase auth state

### Styling

- **Tailwind CSS v4** with `@tailwindcss/postcss` — uses `@theme inline {}` block for CSS variable definitions
- CSS variables (e.g., `--background`, `--primary`, `--radius`) are set on `:root` and `.dark`
- `src/lib/utils.ts` exports `cn()` — a `clsx` + `tailwind-merge` utility for conditional classNames

### URL Redirects

Defined in `next.config.ts`:

- `/home` → `/dashboard` (permanent redirect)

Legacy URL proxy in `src/proxy.ts`:

- `/login` → `/sign-in`, `/register` → `/sign-up`

## Environment Variables

Firebase config is stored in `.env.local` (gitignored). Required vars:

- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
