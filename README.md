# ERP

Small ERP-style web app for managing clients, projects, time entries, approvals, invoicing, and historical reporting.

The frontend is built with React, TypeScript, and Vite. Data is loaded from Supabase and written back directly from the UI.

## What It Does

- Track clients and their billing details.
- Create and manage projects with hourly rates, budgets, and statuses.
- Log billable time entries.
- Approve work entries before invoicing.
- Generate invoice drafts from approved work.
- Review project, invoice, and time-entry history.

The main UI is split into four views:

- `Yhteenveto` for dashboard metrics
- `Seuranta` for project and time tracking
- `Hallinta` for approvals and invoicing
- `Historia` for historical review

## Tech Stack

- React 19
- TypeScript
- Vite
- Supabase JavaScript client
- Tailwind CSS 4

## Requirements

- Node.js 20+
- npm 10+
- A Supabase project with the required tables

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Make sure your Supabase database schema is up to date.

This repository currently includes the migration below for client billing fields:

- `supabase/migrations/20260505_add_client_billing_fields.sql`

If the base schema is not already present in your Supabase project, create the required tables first before applying the migration.

4. Start the development server:

```bash
npm run dev
```

The app will be available at the local Vite development URL, typically `http://localhost:5173`.

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Data Model Overview

The app works primarily with four entities:

- `clients`
- `projects`
- `time_entries`
- `invoices`

At the TypeScript level these are defined in `src/types/types.ts`, and Supabase row-to-app mapping logic lives in `src/data/supabaseMappers.ts`.

## Project Structure

```text
src/
  components/        UI views for dashboard, tracking, approvals, invoicing, and history
  data/              Supabase row mapping helpers
  types/             Shared TypeScript domain types
  utils/             Small utility helpers
  supabaseClient.ts  Supabase client initialization
supabase/
  migrations/        SQL migrations
```

## Notes

- The app fails fast if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing.
- Supabase access is initialized in `src/supabaseClient.ts`.
- The current implementation loads clients, projects, time entries, and invoices on app startup.

## Build

Production build:

```bash
npm run build
```

This runs TypeScript project builds first and then creates the Vite production bundle.
