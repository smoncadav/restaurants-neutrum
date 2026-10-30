# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

# TypeScript
npx tsc --noEmit     # Type check without emitting

# Supabase (requires Supabase CLI installed)
supabase start                                          # Start local Supabase stack
supabase db push                                        # Apply migrations
supabase gen types typescript --local > types/database.ts  # Regenerate DB types

# Test API endpoints locally (requires running server)
curl "http://localhost:3000/api/v1/restaurants?lat=4.7&lng=-74.0&radius_km=10" \
  -H "X-Api-Key: your_key"

# Stripe webhook local forwarding
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# MercadoPago webhook (expose local server via ngrok)
ngrok http 3000
```

## Architecture Overview

### Dual-Role Platform
This is a B2B marketplace for restaurants to manage meal kits. It has two distinct consumer surfaces:
1. **Internal dashboard** — Restaurant owners, nutritionists, and platform admins manage data via Next.js UI
2. **External REST API** (`/api/v1/`) — A third-party consumer platform calls this API to browse restaurants, create orders, and manage subscriptions on behalf of end customers

### Auth & Roles
Supabase Auth is the identity provider. Roles are stored in `auth.users.app_metadata.role`:
- `restaurant_owner` — CRUD on own restaurant + menus
- `nutritionist` — UPDATE only on `menu_nutrition` and `menu_health_goals`
- `platform_admin` — Full access to all resources
- External API calls use an **API key** (hashed SHA-256) validated in `lib/supabase/api-auth.ts` against the `api_keys` table, and run with `service_role`

Route guards live in `middleware.ts` → `lib/supabase/middleware.ts`. Each route group `(dashboard)`, `(admin)`, `(nutrition)` also has a layout that rechecks auth server-side.

### Payment Abstraction
`lib/payments/index.ts` defines a `PaymentProvider` interface with `createOrder`, `createSubscription`, `handleWebhook`, and `onboardRestaurant`. Two implementations exist:
- `lib/payments/stripe.ts` — Stripe Connect Express, uses `application_fee_amount` for commission
- `lib/payments/mercadopago.ts` — MercadoPago Marketplace OAuth, uses `marketplace_fee`

`getPaymentProvider(restaurant)` is the factory function — it reads `restaurant.payment_provider` and dynamically imports the correct implementation. All order/subscription API routes call this factory — the external platform never needs to know which provider is used.

Commission is stored in `commission_config` (most recent row wins) and calculated in `lib/payments/index.ts` via `getActiveCommission()` + `calculateCommission()`.

### Geo Search
`lib/geo/coverage.ts` wraps the PostGIS `search_restaurants_by_location` SQL function. This function uses `ST_DWithin` with `geography` type (meters). The `restaurants.location` column is a `geography(POINT, 4326)`.

### Supabase Clients
- `lib/supabase/client.ts` — Browser client (for Client Components)
- `lib/supabase/server.ts` — Server client (`createClient`) and privileged client (`createServiceClient` with `SUPABASE_SERVICE_ROLE_KEY`)
- Always use `createServiceClient` in API routes and webhooks (bypasses RLS)
- Always use `createClient` in Server Components for user-scoped data

### MercadoPago Token Security
`mp_access_token` for each restaurant **must not** be stored in the `restaurants` table. Only `mp_user_id` is stored. The token should be in Supabase Vault or environment variables (`MP_TOKEN_<mp_user_id>`). See `lib/payments/mercadopago.ts:getRestaurantMpToken`.

## Route Structure

```
app/
  api/
    v1/                          ← Public REST API (X-Api-Key auth)
      restaurants/               ← GET (geo search), POST
      restaurants/[id]/          ← GET, PATCH, DELETE
      restaurants/[id]/menus/    ← GET (filterable)
      menus/[id]/                ← GET (with full nutrition)
      orders/                    ← POST (auto-selects payment provider)
      orders/[id]/               ← GET
      subscriptions/             ← POST
      subscriptions/[id]/        ← GET, PATCH (pause/cancel/resume)
      webhooks/stripe/           ← POST (raw body, verifies signature)
      webhooks/mercadopago/      ← POST (IPN)
      auth/mercadopago/callback/ ← GET (OAuth callback)
    dashboard/
      payment-onboarding/        ← POST (generates Stripe/MP onboarding URL)
    auth/signout/                ← POST
  (auth)/login/ register/        ← Public auth pages
  (dashboard)/menus/ orders/ settings/  ← restaurant_owner role
  (admin)/restaurants/ commission/ reports/  ← platform_admin role
  (nutrition)/menus/             ← nutritionist role
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial.sql` | Full schema with PostGIS, RLS policies, and `search_restaurants_by_location` function |
| `types/database.ts` | Manual DB types — regenerate with `supabase gen types` after schema changes |
| `lib/payments/index.ts` | `PaymentProvider` interface, factory, commission helpers |
| `lib/geo/coverage.ts` | PostGIS geo search wrapper |
| `lib/supabase/api-auth.ts` | API key validation for external REST consumers |
| `.env.local.example` | All required environment variables |

## Environment Variables

Copy `.env.local.example` to `.env.local` before running. Required:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` / `MERCADOPAGO_ACCESS_TOKEN`
- `NEXT_PUBLIC_APP_URL`

## Stripe Countries vs MercadoPago Countries

Stripe Connect available: `MX, CL, BR, PE, UY` — anything else defaults to MercadoPago.
This logic lives in `app/(auth)/register/page.tsx` (registration) and is enforced at the provider level.
