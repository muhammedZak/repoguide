# DESIGN.md — UI Design System & Implementation Rules

## 1. Purpose

This document defines the visual language, interaction patterns, and implementation rules for the application.

All UI work must follow this document unless a task explicitly overrides it.

When creating or modifying UI:

1. Reuse existing patterns before inventing new ones.
2. Prefer consistency over novelty.
3. Keep interfaces simple and easy to understand.
4. Design for mobile, tablet, and desktop.
5. Maintain accessibility.
6. Do not introduce arbitrary colors, spacing, typography, or component styles.

---

# 2. Design Philosophy

The product should feel:

- Clean
- Modern
- Calm
- Professional
- Lightweight
- Consistent
- Easy to scan

The interface should prioritize **clarity over decoration**.

Avoid unnecessary visual complexity.

Every element should have a clear purpose.

---

# 3. Core UI Principles

## Hierarchy

Every screen should clearly communicate:

1. Where the user is
2. What the most important information is
3. What action they should take next

Use hierarchy through:

- Typography
- Spacing
- Alignment
- Contrast
- Size

Do not rely on excessive colors to create hierarchy.

---

## Simplicity

Prefer the simplest UI that solves the problem.

Avoid:

- Excessive cards
- Too many borders
- Deeply nested containers
- Decorative gradients without purpose
- Excessive shadows
- Large amounts of helper text
- Multiple competing primary actions

---

## Consistency

The same interaction should look and behave the same throughout the application.

Examples:

- Primary buttons use one consistent style.
- Inputs use one consistent style.
- Cards use the same radius and border treatment.
- Page headings follow the same structure.
- Modal actions appear in predictable locations.

---

# 4. Visual Style

Use a modern SaaS-style interface with restrained visual treatment.

Prefer:

- Neutral backgrounds
- Strong typography
- Subtle borders
- Small amounts of brand color
- Moderate border radius
- Soft or minimal shadows
- Generous whitespace

Avoid making every section look like an independent floating card.

Use whitespace and grouping before adding borders or backgrounds.

---

# 5. Color System

Never introduce random color values inside components.

Colors should come from the project's theme/design tokens.

Use semantic roles.

Example:

```txt
background
surface
surface-muted

text-primary
text-secondary
text-muted

border
border-strong

primary
primary-hover
primary-foreground

success
warning
danger
info
```

## Color Rules

Primary color:
- Main CTA
- Active states
- Important interactive elements

Neutral colors:
- Most interface surfaces
- Borders
- Secondary text
- Layout structure

Danger color:
- Destructive actions only

Success color:
- Successful states and confirmations

Warning color:
- Situations requiring attention

Do not use semantic colors decoratively.

---

# 6. Typography

Use one primary sans-serif typeface unless the project explicitly requires another.

Recommended hierarchy:

```txt
Display / Hero
Page Title
Section Heading
Card Heading
Body
Small Body
Label
Caption
```

Example scale:

```txt
Hero:        48–64px
Page title:  30–36px
H2:          24–30px
H3:          18–20px
Body:        16px
Small:       14px
Caption:     12px
```

Use responsive typography where appropriate.

## Typography Rules

- Prefer sentence case.
- Avoid excessive bold text.
- Use font weight to create hierarchy, not decoration.
- Body text should remain highly readable.
- Keep long-form content within a comfortable reading width.
- Do not use extremely light font weights for important content.

---

# 7. Spacing System

Use a consistent spacing scale.

Recommended base:

```txt
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
80px
```

Prefer values from this scale instead of arbitrary spacing.

## General Rules

Small relationships:

```txt
4–8px
```

Related elements:

```txt
8–16px
```

Component groups:

```txt
16–24px
```

Sections:

```txt
32–64px
```

Major page regions:

```txt
64–96px
```

Spacing should communicate relationships between elements.

---

# 8. Layout

Use predictable page structures.

Typical application page:

```txt
Application Shell
 ├── Navigation
 └── Main Content
      ├── Page Header
      ├── Primary Content
      └── Secondary Content
```

## Content Width

Do not stretch content unnecessarily across very large screens.

Use appropriate maximum widths for:

- Forms
- Settings pages
- Articles
- Dashboards
- Tables

Dashboards may use wider layouts than forms or reading experiences.

---

# 9. Responsive Design

Design mobile-first.

Every screen must work at approximately:

```txt
Mobile:   < 640px
Tablet:   640–1024px
Desktop:  > 1024px
```

Do not simply shrink desktop interfaces.

On smaller screens:

- Stack content where necessary.
- Reduce secondary information.
- Collapse navigation appropriately.
- Keep primary actions accessible.
- Avoid horizontal scrolling.
- Allow tables to adapt, scroll, or transform appropriately.

Touch targets should be large enough for comfortable interaction.

---

# 10. Grid

Use responsive grids where appropriate.

Examples:

```txt
Mobile:
1 column

Tablet:
1–2 columns

Desktop:
2–4 columns depending on content
```

Do not force equal-width columns when content naturally requires different proportions.

---

# 11. Borders

Use borders sparingly.

Default:

```txt
1px subtle neutral border
```

Borders should generally separate interactive controls or meaningful regions.

Do not surround every piece of content with a border.

---

# 12. Border Radius

Use a small, consistent radius system.

Example:

```txt
Small:   6px
Default: 8px
Large:   12px
XL:      16px
Full:    9999px
```

Avoid mixing many unrelated radius values.

Pills should mainly be used for:

- Tags
- Status indicators
- Filters
- Compact controls

Not every button should automatically be pill-shaped.

---

# 13. Shadows

Use shadows minimally.

Preferred hierarchy:

```txt
No shadow
Subtle shadow
Elevated shadow
Modal / overlay shadow
```

Most cards and containers should rely on:

- Background
- Border
- Spacing

rather than heavy shadows.

---

# 14. Buttons

Use a limited button hierarchy.

## Primary

Used for the main action on the screen.

Examples:

```txt
Create project
Save changes
Checkout
Continue
```

Usually only one dominant primary action should appear within a region.

---

## Secondary

Used for supporting actions.

Examples:

```txt
Cancel
Preview
Back
Export
```

---

## Ghost

Used for low-emphasis actions.

Examples:

```txt
Edit
View details
More
```

---

## Destructive

Only for destructive actions.

Examples:

```txt
Delete
Remove
Revoke
```

Destructive actions should not visually compete with normal primary actions.

---

## Button Rules

Buttons should have:

- Clear labels
- Hover state
- Focus state
- Disabled state
- Loading state where relevant

Prefer:

```txt
Save changes
```

instead of vague labels such as:

```txt
Submit
OK
Yes
```

when a more descriptive action is possible.

---

# 15. Forms

Forms should be easy to scan.

Preferred structure:

```txt
Label
Input
Helper text / error
```

Do not use placeholders as replacements for labels.

## Form Rules

- Clearly mark required information when necessary.
- Show validation near the related field.
- Preserve entered values after validation failures.
- Disable submission while an important request is processing.
- Provide clear success/error feedback.
- Group related fields together.

For long forms, divide content into logical sections.

---

# 16. Inputs

Inputs should have consistent:

- Height
- Border
- Radius
- Padding
- Typography
- Focus style
- Error state
- Disabled state

Do not create a completely different visual treatment for every input type.

---

# 17. Cards

Cards are appropriate when information represents a distinct object or group.

Examples:

- Product
- Order
- Project
- Team
- Subscription
- Statistic

Do not place every section inside a card.

Avoid:

```txt
Card
  └── Card
       └── Card
```

unless the nested hierarchy has a strong semantic reason.

---

# 18. Navigation

Navigation should clearly indicate:

- Current location
- Available destinations
- Hierarchy

Primary navigation should remain stable across the product.

Do not frequently move important navigation actions between screens.

On mobile, use an appropriate collapsed navigation pattern.

---

# 19. Tables

Use tables for genuinely tabular information.

Tables should provide:

- Clear headers
- Good alignment
- Comfortable row spacing
- Appropriate numeric alignment
- Loading state
- Empty state

Avoid putting excessive actions directly inside every row.

Use menus where necessary.

For mobile, determine whether the table should:

- Horizontally scroll
- Reduce columns
- Convert to stacked rows/cards

based on the importance of the information.

---

# 20. Modals

Use modals for focused temporary interactions.

Good examples:

- Confirm deletion
- Create a small object
- Edit a small set of properties

Avoid putting large workflows inside modals.

A modal should normally contain:

```txt
Title
Optional description

Content

Secondary action
Primary action
```

Destructive confirmations must clearly explain what will happen.

---

# 21. Dropdowns and Menus

Use menus for collections of secondary actions.

Do not hide the primary action inside a menu.

Menus should:

- Have clear labels
- Be keyboard accessible
- Close predictably
- Avoid excessive nesting

---

# 22. Status Indicators

Statuses should combine color with text.

Example:

```txt
● Active
● Pending
● Failed
```

Never communicate important status using color alone.

---

# 23. Icons

Use one consistent icon library throughout the application.

Do not mix multiple icon styles unless absolutely necessary.

Icons should normally support text rather than replace it.

Icon-only buttons must have accessible labels/tooltips where appropriate.

Avoid decorative icons that add visual noise.

---

# 24. Empty States

Every data-driven interface should consider an empty state.

A useful empty state contains:

```txt
What happened
Why the page is empty
What the user can do next
```

Example:

```txt
No projects yet

Create your first project to start organizing your work.

[Create project]
```

Avoid meaningless messages such as:

```txt
No data
```

---

# 25. Loading States

Avoid blank screens during loading.

Use the appropriate pattern:

```txt
Skeleton
Spinner
Progress indicator
Optimistic UI
```

Prefer skeletons when loading structured page content.

Use spinners for small isolated actions.

---

# 26. Error States

Errors should explain:

1. What happened
2. Whether the user can recover
3. What action they can take

Avoid displaying raw server errors to users.

Bad:

```txt
Error 500
```

Better:

```txt
We couldn't load your projects.

Try again.
```

---

# 27. Feedback

Every meaningful interaction should provide feedback.

Examples:

```txt
Saving...
Saved

Uploading...
Upload complete

Deleting...
Deleted
```

Avoid leaving users uncertain whether an action succeeded.

---

# 28. Accessibility

UI implementation must support accessibility.

Minimum expectations:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Accessible form labels
- Sufficient contrast
- Alt text for meaningful images
- ARIA attributes only where necessary
- Do not rely on color alone
- Appropriate heading hierarchy

Interactive elements must use appropriate elements.

Prefer:

```html
<button>
```

instead of clickable:

```html
<div>
```

---

# 29. Motion

Motion should communicate change, not decorate the interface.

Use subtle transitions for:

- Hover states
- Menus
- Modals
- Drawers
- Expanding sections
- State changes

Recommended duration:

```txt
Fast:    100–150ms
Normal:  150–250ms
Slow:    250–400ms
```

Avoid long or distracting animations.

Respect reduced-motion preferences.

---

# 30. Content Design

UI copy should be:

- Short
- Clear
- Human
- Action-oriented

Prefer:

```txt
Create project
```

over:

```txt
Initiate Project Creation
```

Prefer:

```txt
Couldn't save changes.
```

over:

```txt
An unexpected error has occurred while attempting to process your request.
```

---

# 31. Component Architecture

Before creating a component, check whether an existing component can be reused.

Prefer reusable primitives such as:

```txt
Button
Input
Textarea
Select
Checkbox
Radio
Badge
Avatar
Card
Modal
Drawer
Dropdown
Tooltip
Tabs
Table
Pagination
Skeleton
Toast
```

Then compose them into feature components.

Example:

```txt
ProductCard
OrderTable
ProfileForm
CheckoutSummary
```

Do not create giant universal components with dozens of configuration props.

---

# 32. Component States

Every interactive component should consider relevant states.

Example button:

```txt
default
hover
focus
active
disabled
loading
```

Example input:

```txt
default
focus
filled
disabled
error
```

Example data component:

```txt
loading
empty
success
error
```

Do not implement only the ideal success state.

---

# 33. Tailwind / CSS Rules

If Tailwind CSS is used:

Prefer design-system classes and reusable components.

Avoid excessive arbitrary values such as:

```txt
mt-[17px]
w-[437px]
rounded-[13px]
```

unless required by a specific design.

Prefer:

```txt
mt-4
max-w-md
rounded-lg
```

Do not repeat very long class collections throughout the codebase when they represent the same component.

---

# 34. UI Implementation Workflow

When implementing a new screen, the coding agent should follow this order.

## Step 1 — Understand the screen

Identify:

- User goal
- Primary action
- Secondary actions
- Information hierarchy
- Possible states

---

## Step 2 — Check existing UI

Inspect:

- Existing components
- Existing page patterns
- Existing spacing
- Existing colors
- Existing typography

Reuse them whenever appropriate.

---

## Step 3 — Build structure

Implement the semantic layout first.

Do not immediately focus on detailed styling.

---

## Step 4 — Establish hierarchy

Apply:

- Typography
- Spacing
- Alignment
- Grouping

before adding decorative elements.

---

## Step 5 — Add responsive behavior

Verify:

```txt
Mobile
Tablet
Desktop
```

---

## Step 6 — Add interaction states

Implement:

```txt
Hover
Focus
Disabled
Loading
Empty
Error
Success
```

where applicable.

---

## Step 7 — Accessibility check

Verify:

```txt
Keyboard navigation
Focus visibility
Labels
Semantic elements
Contrast
```

---

## Step 8 — Final visual cleanup

Check:

- Alignment
- Spacing consistency
- Typography consistency
- Button hierarchy
- Excessive borders
- Excessive cards
- Responsive overflow
- Visual noise

---

# 35. Agent Decision Rules

When requirements are ambiguous, follow these priorities:

```txt
1. Existing product patterns
2. This DESIGN.md
3. Existing reusable components
4. Common UX conventions
5. Simplest reasonable solution
```

Do not redesign unrelated parts of the application while completing a focused task.

If a screen already establishes a pattern, preserve that pattern unless the task explicitly requires redesigning it.

---

# 36. What the Agent Must NOT Do

Do not:

- Invent random colors.
- Invent random spacing values.
- Introduce another icon library unnecessarily.
- Use gradients everywhere.
- Add shadows to every container.
- Wrap every section in cards.
- Make every button pill-shaped.
- Create excessive animations.
- Hide important actions.
- Use tiny text for important information.
- Create desktop-only layouts.
- Ignore empty/loading/error states.
- Use placeholder text as labels.
- Replace semantic HTML with clickable divs.
- Create inconsistent versions of existing components.
- Redesign unrelated screens during small tasks.
- Add visual complexity simply to make the interface look "modern."

---

# 37. Design Review Checklist

Before considering UI work complete, verify:

## Visual consistency

- [ ] Typography follows the design system.
- [ ] Colors use existing tokens.
- [ ] Spacing uses the spacing scale.
- [ ] Border radius is consistent.
- [ ] Icons use the project's icon system.

## UX

- [ ] Primary action is obvious.
- [ ] Information hierarchy is clear.
- [ ] Labels are understandable.
- [ ] Interactions provide feedback.
- [ ] Empty states are handled.
- [ ] Loading states are handled.
- [ ] Error states are handled.

## Responsive

- [ ] Mobile layout works.
- [ ] Tablet layout works.
- [ ] Desktop layout works.
- [ ] No accidental horizontal overflow exists.

## Accessibility

- [ ] Semantic HTML is used.
- [ ] Keyboard navigation works.
- [ ] Focus states are visible.
- [ ] Inputs have labels.
- [ ] Images have appropriate alt text.
- [ ] Important information does not depend only on color.

## Code

- [ ] Existing components were reused when possible.
- [ ] No unnecessary new dependencies were added.
- [ ] Components remain understandable.
- [ ] Styling follows existing project conventions.
- [ ] No unrelated code was redesigned.

---

# 38. Final Rule

The goal is not to make each screen individually impressive.

The goal is to make the entire application feel like **one coherent product**.

Whenever choosing between:

```txt
more decorative
```

and:

```txt
more clear
```

choose **more clear**.

Whenever choosing between:

```txt
new pattern
```

and:

```txt
existing consistent pattern
```

choose the **existing pattern**.

Whenever choosing between:

```txt
complex implementation
```

and:

```txt
simple implementation with equivalent UX
```

choose the **simple implementation**.