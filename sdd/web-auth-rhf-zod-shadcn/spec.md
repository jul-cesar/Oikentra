# Spec: Web Auth Flow Requirements

## User Stories

### 1. Authentication Core
- **AS A** user **I WANT** a unified login/signup experience **SO THAT** I can access the platform seamlessly
- **AS A** user **I WANT** email/password authentication with proper validation **SO THAT** I can create secure accounts
- **AS A** user **I WANT** Google OAuth integration **SO THAT** I can use existing Google credentials
- **AS A** user **I WANT** password reset functionality **SO THAT** I can recover access to my account

### 2. Email Verification
- **AS A** new user **I WANT** email verification after registration **SO THAT** my account is secured
- **AS A** user **I WANT** a clear verification page with success/error states **SO THAT** I understand my verification status

### 3. Session Management
- **AS A** user **I WANT** session persistence across page refreshes **SO THAT** I stay logged in
- **AS A** user **I WANT** secure session hydration on app load **SO THAT** I have a smooth experience

### 4. Protected Routes
- **AS A** authenticated user **I WANT** access to the dashboard **SO THAT** I can manage my account
- **AS A** anonymous user **I WANT** redirects to login when accessing protected pages **SO THAT** I am guided properly

### 5. Form Requirements
- **AS A** developer **I WANT** consistent form validation using React Hook Form and Zod **SO THAT** data integrity is maintained
- **AS A** developer **I WANT** shadcn/ui integration for consistent styling **SO THAT** the UI matches the design system

## Technical Specifications

### Form Validation Schema
- All forms must use Zod for schema validation
- Minimum: name, email, password fields
- Email validation with pattern matching
- Password complexity requirements (min length, special chars, etc.)

### Component Architecture
- Login form: Adapt existing `apps/web/components/login-form.tsx`
- Form fields: Use React Hook Form with zod resolver
- shadcn/ui Form components for consistent styling
- Mobile-responsive design

### OAuth Integration
- Google OAuth 2.0
- Session token storage
- Redirect handling
- Error handling and fallbacks

### Security Requirements
- Password hashing (bcrypt)
- Email verification tokens
- Session timeout handling
- CSRF protection
- Rate limiting on auth endpoints

### Performance Requirements
- Lazy loading for auth components
- Code splitting for forms
- Minimized bundle size
- Efficient validation

## Implementation Details

### Files to Create/Modify
1. `apps/web/components/login-form.tsx` - Updated with RHF/Zod
2. `apps/web/components/signup-form.tsx` - New sign-up form
3. `apps/web/components/forgot-password-form.tsx` - New forgot password form
4. `apps/web/components/reset-password-form.tsx` - New reset password form
5. `apps/web/components/dashboard.tsx` - New dashboard route
6. `apps/web/hooks/use-auth.ts` - Auth state management
7. `apps/web/lib/auth/...` - Auth configuration
8. `apps/web/app/(auth)/...` - Auth routes
9. `apps/web/app/dashboard/...` - Dashboard routes

### API Routes
- `POST /api/auth/sign-in` - Login endpoint
- `POST /api/auth/sign-up` - Registration endpoint
- `POST /api/auth/sign-out` - Logout endpoint
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/session` - Session validation
- `GET /api/auth/google/callback` - OAuth callback

## Acceptance Criteria

### Authentication Flow
- [ ] Login form authenticates users correctly
- [ ] Registration creates new users with email verification
- [ ] Password reset flow works end-to-end
- [ ] Google OAuth redirects to provider and handles callback
- [ ] Session persists across page refreshes

### User Experience
- [ ] All forms validate inputs client-side
- [ ] Error messages are clear and user-friendly
- [ ] Loading states during form submission
- [ ] Responsive design on mobile and desktop
- [ ] Accessibility compliant

### Security
- [ ] Passwords hashed before storage
- [ ] Email verification required for new accounts
- [ ] Session tokens securely stored
- [ ] Rate limiting on auth endpoints
- [ ] Proper CORS configuration

## Testing Strategy
- Unit tests for form validation schemas
- Integration tests for auth flows
- E2E tests for user journeys
- Security tests for authentication bypass attempts
