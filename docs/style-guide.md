# OCIO Portal Style Guide

This document captures the design language applied to the frontend, based on the repository’s executive portal requirements and the final implementation in the app shell, home page, and shared component library.

## Brand and theme

- Brand navy: #0b3a67
- Brand navy hover: #0a2c50
- Brand navy pressed: #08223f
- Brand foreground 1: #0b3a67
- Brand foreground 2: #0a2c50
- Brand foreground on light: #0b3a67
- Base theme: Fluent UI webLightTheme with the brand tokens overridden at the root provider in `frontend/src/main.tsx`.

## Typography

- Global font stack: "Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif
- Page title: `Title2` / `h2`
- Section title: `Subtitle2`
- Supporting text: `Caption1` and `Body1`
- KPI value: large numeric display, 32px/700, navy foreground

## Layout and spacing

- Page chrome: full-width header + fixed left rail, grid layout
- Header padding: spacing tokens from Fluent UI
- Main content width: constrained to a max-width layout wrapper for executive dashboard reading
- Standard spacing rhythm uses Fluent spacing tokens across cards, grid gaps, and form blocks
- Cards are rounded with shadow and neutral borders for readable hierarchy

## Color system

- Primary executive background: #0b3a67
- Neutral canvas: `colorNeutralBackground2`
- Border: `colorNeutralStroke2`
- Text hierarchy: neutral foreground on white surfaces, white foreground on dark navy surfaces
- Semantic badge mapping used in the app:
  - Draft → informative
  - Submitted → warning
  - Approved → success
  - Rejected → danger
  - Expired → danger
  - Low risk → success
  - Medium risk → warning
  - High / Critical risk → danger

## Component conventions

### App shell

- Dark navy header with brand name and sub-label
- Icon-led left navigation with an active-state light blue highlight
- Breadcrumb trail remains in the main content area
- Persona picker is styled as a rounded pill and aligned to the header actions
- Search and alert controls remain in the header actions cluster

### PageHeader

- Standardized page heading with a title, optional subtitle on its own line, optional caption hint, and action slot
- Prevents inline text-collision issues by using block layout instead of relying on whitespace flow

### KPI cards

- Each KPI card includes a label, numeric value, optional unit, optional badge, optional trend text, and optional hint
- Value and unit are rendered as separate siblings to maintain exact DOM text semantics for tests
- Left border color reflects tone: neutral / positive / warning / critical

### Section cards

- Standard card shell for dashboard sections and tables
- Header title renders as `Subtitle2`
- Subtitle/description renders as `Caption1`

### Data visuals

- Bar chart uses the executive navy palette for key bars
- Progress and status visuals remain aligned with Fluent semantic colors rather than custom design tokens

## Accessibility and interaction

- Focus rings rely on the Fluent default behavior; custom focus overrides were removed to align with the “focus is not customized” requirement.
- Interactive controls use standard Fluent button, input, dropdown, and link patterns.
- The app remains fully keyboard and screen-reader friendly through semantic landmarks and standard Fluent primitives.

## Intentional notes

- This implementation keeps the app fully data-driven; no hardcoded production credentials or live customer data are introduced.
- The design guide reflects the implemented behavior in the repo, not an abstract future state.
- Where a field had no explicit spec mapping, the app keeps the default Fluent semantic treatment rather than inventing new colors beyond the provided palette.
