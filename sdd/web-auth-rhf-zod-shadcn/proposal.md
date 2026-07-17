# Proposal: Web Auth with React Hook Form, Zod, and shadcn

## Overview

This SDD implements a complete web authentication system using **React Hook Form + Zod** for form handling and validation, **shadcn/ui** for UI components, and **Better Auth** for authentication backend integration. The implementation will adapt the existing login-form component and extend it to cover the full auth flow.

## Scope

Complete web Better Auth flow:
- Sign-in / Login
- Sign-up / Registration  
- Email verification
- Forgot/reset password
- Google OAuth integration
- Session hydration
- Safe private redirects
- New protected `/dashboard` route

## Technical Approach

- Adapt existing `apps/web/components/login-form.tsx`
- All web forms use React Hook Form + Zod + shadcn Form
- Adapt Tailwind v4 global theme for mobile and web compatibility
- Verify CSS entry paths, Uniwind/Tailwind compatibility, and Geologica assets
- Maintain mobile semantic token/component compatibility

## Deliverables

- Updated login-form component with RHF/Zod/shadcn integration
- New sign-up, forgot-password, reset-password forms
- Email verification component
- Google OAuth integration
- Protected dashboard route with proper routing guards
- Session management and hydration
- Theme updates for mobile compatibility
- Complete test coverage for all auth flows

## Dependencies

- React Hook Form
- Zod schema validation
- shadcn/ui components
- Better Auth with Drizzle ORM integration
- Tailwind CSS with Uniwind
- Geologica font assets

## Implementation Strategy

The implementation will be broken down into manageable work units following our SDD process, with focus on:
1. Form validation and component architecture
2. Auth flow implementation
3. OAuth integration
4. Protected routes and session management
5. Mobile responsive design and theming
