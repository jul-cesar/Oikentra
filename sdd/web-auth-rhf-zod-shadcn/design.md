# Design: Web Auth Architecture and Implementation Plan

## System Architecture

### Technology Stack

#### Frontend
- **React 19** with Server Components
- **React Hook Form v7** for form state management
- **Zod v4** for runtime type validation and schema definition
- **shadcn/ui v4** for component library and design system
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS v4** with Uniwind for utility-first styling
- **Geologica** font family integration

#### Backend
- **Better Auth v1** with Drizzle ORM
- **PostgreSQL** database
- **Nanostores** for reactive state management
- **bcrypt** for password hashing
- **jose** for JWT token handling
- **OpenAPI** for API documentation

### Component Structure

```
apps/web/components/
├── ui/                    # shadcn/ui components
├── forms/                 # Form components (login, signup, etc.)
├── auth/                  # Auth-specific components
│   ├── login-form.tsx    # Existing - TO BE UPDATED
│   ├── signup-form.tsx   # New - React Hook Form + Zod + shadcn
│   ├── forgot-password-form.tsx # New
│   ├── reset-password-form.tsx  # New
│   ├── email-verification.tsx   # Existing - TO BE ADAPTED
│   └── dashboard.tsx     # New protected component
├── hooks/
│   ├── use-auth.ts       # Auth state and session management
│   ├── use-forms.ts      # Form validation and submission
│   └── use-oauth.ts     # OAuth integration hooks
├── lib/
│   ├── auth/             # Auth configuration
│   ├── forms/            # Form utilities
│   └── validation/       # Zod schemas
└── api/                  # Auth API routes
```

## Form Design with React Hook Form + Zod + shadcn

### Login Form Architecture

Current `apps/web/components/login-form.tsx` will be transformed:

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  
  // Form submission handler
  onSubmit(data: LoginFormData) {
    // Handle login
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        // ... other fields
      </form>
    </Form>
  );
}
```

### Shared Form Patterns

All forms will follow this pattern:
- **React Hook Form** for form state and validation
- **Zod schemas** for validation rules
- **shadcn/ui Form components** for consistent styling
- **TypeScript** for full type safety
- **Form field error handling** with inline validation messages
- **Loading states** during form submission

## Tailwind v4 with Uniwind Design System

### Theme Configuration

```css
/* apps/web/lib/theme.css */
@theme {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
}
```

### Geologica Font Integration

```css
/* apps/web/lib/fonts.css */
@import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Geologica', sans-serif;
  font-weight: 400;
  letter-spacing: -0.02em;
}

.headline {
  font-weight: 700;
  letter-spacing: -0.03em;
}

.body-large {
  font-weight: 300;
  letter-spacing: -0.01em;
}
```

### Mobile Semantic Token Compatibility

Mobile components will maintain semantic token consistency:

```tsx
// apps/web/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## Better Auth Integration

### Backend API Configuration

```typescript
// apps/auth-service/db/schema.ts
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  password: text("password"), // Hashed
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Authentication Flow

```
Login Flow:
1. User submits login form (client-side validation)
2. Frontend sends credentials to /api/auth/sign-in
3. Better Auth validates credentials and issues session token
4. Frontend stores session token in secure cookie/localStorage
5. Subsequent requests include token for validation
6. Protected routes check session and redirect if not authenticated

Google OAuth Flow:
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. Google returns with authorization code
4. Backend exchanges code for access token
5. Backend fetches user profile from Google
6. Create/update local user account
7. Return session token
```

## Route Structure

### App Router Configuration

```
apps/web/app/
├── (auth)/                     # Auth routes (overlay on mobile)
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── signup/
│   │   └── page.tsx          # Sign-up page  
│   ├── forgot-password/
│   │   └── page.tsx          # Forgot password
│   ├── reset-password/
│   │   └── page.tsx          # Reset password (with token)
│   └── verify-email/
│       └── page.tsx          # Email verification
├── dashboard/                  # Protected route
│   ├── page.tsx              # Dashboard
│   └── layout.tsx            # Dashboard layout
├── api/
│   ├── auth/                 # Server-side auth handlers
│   │   ├── sign-in.ts        # POST /api/auth/sign-in
│   │   ├── sign-up.ts        # POST /api/auth/sign-up
│   │   ├── sign-out.ts       # POST /api/auth/sign-out
│   │   ├── verify-email.ts   # POST /api/auth/verify-email
│   │   ├── forgot-password.ts # POST /api/auth/forgot-password
│   │   ├── reset-password.ts  # POST /api/auth/reset-password
│   │   └── session.ts        # GET /api/auth/session
│   └── google/               # Google OAuth routes
│       └── callback.ts       # GET /api/auth/google/callback
└── layout.tsx                # Root layout with theme provider
```

## Threat Matrix Analysis

### Security Threats and Mitigation

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| Credential Stuffing | High | Medium | Rate limiting, account lockouts, MFA |
| Brute Force Attacks | High | High | Rate limiting, captcha, account lockouts |
| Phishing & Token Theft | High | Medium | Secure cookie storage, token expiration |
| SQL Injection | Critical | Low | Parameterized queries, input validation |
| XSS Attacks | High | Medium | Input sanitization, CSP headers |
| Session Fixation | Medium | Low | Session regeneration on login |
| OAuth Redirect Attacks | Medium | Medium | PKCE, state parameter validation |

### RED Tests (Before Implementation)

**RED Test 1: Invalid Login Credentials**
- Test: Submit login with wrong password
- Expected: Show error message, prevent login
- Red Test: Verify incorrect credentials fail with "Invalid credentials"

**RED Test 2: Missing Required Fields**
- Test: Submit empty login form
- Expected: Show validation error for email/password
- Red Test: Verify Zod validation blocks submission with field errors

**RED Test 3: Invalid Email Format**
- Test: Submit form with malformed email
- Expected: Show email validation error
- Red Test: Verify Zod regex pattern validation works

**RED Test 4: Account Not Verified**
- Test: Submit login with unverified email
- Expected: Show verification required message
- Red Test: Verify auth service checks email verification status

**RED Test 5: Google OAuth Malformed Callback**
- Test: Access OAuth callback with invalid state
- Expected: Show error, redirect to login
- Red Test: Verify PKCE validation rejects invalid callbacks

**RED Test 6: Password Reset with Invalid Token**
- Test: Access reset password page with invalid/expired token
- Expected: Show token validation error
- Red Test: Verify token validation rejects invalid/reset tokens

## Implementation Dependencies

### Critical Path Dependencies

1. **Database Setup** (Phase 1)
   - Drizzle ORM configuration
   - PostgreSQL connection
   - User schema creation
   - Password hashing setup

2. **Auth Core** (Phase 2)
   - Better Auth integration
   - API route implementation
   - Session management
   - Token handling

3. **Form Components** (Phase 3)
   - React Hook Form setup
   - Zod validation schemas
   - shadcn/ui integration
   - Component architecture

4. **OAuth Integration** (Phase 4)
   - Google OAuth configuration
   - Callback handling
   - Profile mapping
   - User creation/update

5. **Protected Routes** (Phase 5)
   - Route guards
   - Session validation
   - Redirect logic
   - Dashboard implementation

6. **Email Verification** (Phase 6)
   - Verification token generation
   - Email sending logic
   - Verification page
   - Token cleanup

7. **Password Reset** (Phase 7)
   - Reset token generation
   - Email sending
   - Token validation
   - Password update

8. **Testing** (Phase 8)
   - Unit tests for validation
   - Integration tests for auth flows
   - E2E tests for user journeys
   - Security tests

## Review Workload Forecast

### Line Count Estimates

| Phase | Estimated Lines | Files | Complexity |
|-------|----------------|-------|------------|
| Phase 1: Infrastructure | 200-300 lines | 8 files | Low-Medium |
| Phase 2: Core Auth | 500-600 lines | 12 files | Medium |
| Phase 3: Forms | 400-500 lines | 15 files | Medium |
| Phase 4: OAuth | 300-400 lines | 8 files | Medium |
| Phase 5: Protected Routes | 200-300 lines | 6 files | Low |
| Phase 6: Email Verification | 150-200 lines | 5 files | Low |
| Phase 7: Password Reset | 150-200 lines | 5 files | Low |
| Phase 8: Testing | 400-500 lines | 20 files | High |

### Total Estimate
- **Estimated changed lines**: 2,300-2,500 lines
- **400-line budget risk**: High
- **Chained PRs recommended**: Yes

## Implementation Rollout Strategy

### Work Units for Chained PRs

**Work Unit 1: Foundation & Infrastructure**
- **Goal**: Database setup, auth core API routes
- **PR 1**: `/api/auth/` endpoints (sign-in, sign-up, session)
- **Test**: Manual API testing with Postman/curl
- **Rollback**: Remove auth routes without affecting frontend

**Work Unit 2: Form Components**
- **Goal**: Login, signup forms with validation
- **PR 2**: Form components with RHF + Zod + shadcn
- **Test**: Form validation unit tests
- **Rollback**: Remove form components, keep auth API

**Work Unit 3: OAuth Integration**
- **Goal**: Google OAuth flow
- **PR 3**: OAuth configuration and callbacks
- **Test**: OAuth flow end-to-end
- **Rollback**: Disable OAuth without affecting core auth

**Work Unit 4: Protected Routes & Verification**
- **Goal**: Dashboard, email verification
- **PR 4**: Protected routes and verification pages
- **Test**: Protected route access control
- **Rollback**: Remove route guards, keep page components

**Work Unit 5: Password Reset & Testing**
- **Goal**: Password reset flow + comprehensive testing
- **PR 5**: Reset functionality + full test suite
- **Test**: Complete user journey tests
- **Rollback**: Disable reset functionality, keep tests

## Risk Assessment

### High Risks
1. **Database Migration**: Complex schema changes with existing data
2. **Session Management**: Cross-browser session consistency
3. **OAuth Integration**: Third-party API changes

### Medium Risks
1. **Form Validation**: Complex Zod schema edge cases
2. **Mobile Compatibility**: Tailwind v4 Uniwind issues
3. **Performance**: Large form validation impact

### Low Risks
1. **Component Integration**: shadcn/ui compatibility
2. **Styling**: Theme application consistency
3. **Testing**: Test coverage completeness

## Success Metrics

### Functional Metrics
- [ ] All authentication flows work end-to-end
- [ ] Form validation prevents invalid submissions
- [ ] OAuth integration completes successfully
- [ ] Protected routes enforce access control
- [ ] Email verification secures new accounts

### Technical Metrics
- [ ] Test coverage >80%
- [ ] Bundle size under 500KB (gzipped)
- [ ] Performance score > 90 in Lighthouse
- [ ] Accessibility score > 90
- [ ] Mobile responsive on all devices

### User Metrics
- [ ] Login time < 2 seconds
- [ ] Password reset completion > 95%
- [ ] Email verification rate > 80%
- [ ] User satisfaction score > 4/5
- [ ] Support tickets < 5 per 1000 users
