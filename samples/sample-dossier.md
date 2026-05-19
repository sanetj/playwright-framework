# Sample Technical Dossier

## Architecture Summary
- React SPA served via CDN.
- Backend API at `/api/v1` with JWT bearer auth.
- Payment workflow delegates to third-party checkout provider.

## Key Workflows
1. Anonymous browse -> product details -> login prompt.
2. Authenticated cart edit -> checkout initiation -> payment callback.
3. Admin analytics route discovered through feature-flagged menu state.

## High-Value Endpoints
- `POST /api/v1/orders` (state changing, payment-adjacent)
- `PATCH /api/v1/users/:id/role` (privilege transition sensitive)
- `GET /api/v1/internal/feature-flags` (hidden surface)

## Security Observations
- CORS allow-origin observed on sensitive API responses.
- Multiple mutating endpoints observed without explicit anti-CSRF evidence.
- localStorage write activity suggests token persistence risk.

## Next Audit Areas
- IDOR tests on object reference endpoints (`/orders/:id`, `/users/:id`).
- Race-condition tests on coupon redemption and checkout transitions.
- Authz boundary tests around admin/reporting routes.
