# Playwright + TypeScript Scalable Test Automation Framework Architecture (Demo E-Commerce)

## 1) High-Level Design Goals

This architecture is designed for:
- **Scalability**: easy growth from a few tests to thousands.
- **Maintainability**: low coupling, high cohesion, SOLID-aligned abstractions.
- **Reusability**: shared utilities, assertions, fixtures, and test data factories.
- **Observability**: logging, rich reporting, traces/videos/screenshots.
- **CI/CD readiness**: deterministic runs, parallelism, retries, artifacts.

---

## 2) Proposed Folder Structure

```text
playwright-framework/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── playwright.config.ts
├── README.md
├── FRAMEWORK_ARCHITECTURE.md
│
├── config/
│   ├── env/
│   │   ├── dev.env
│   │   ├── qa.env
│   │   ├── stage.env
│   │   └── prod.env
│   ├── env.config.ts
│   ├── projects.config.ts
│   └── tags.config.ts
│
├── src/
│   ├── core/
│   │   ├── base/
│   │   │   ├── base.page.ts
│   │   │   ├── base.component.ts
│   │   │   ├── base.api.client.ts
│   │   │   └── base.test.ts
│   │   ├── fixtures/
│   │   │   ├── test.fixture.ts
│   │   │   ├── auth.fixture.ts
│   │   │   ├── api.fixture.ts
│   │   │   └── data.fixture.ts
│   │   ├── hooks/
│   │   │   ├── test.hooks.ts
│   │   │   ├── suite.hooks.ts
│   │   │   └── failure.hooks.ts
│   │   ├── assertions/
│   │   │   ├── ui.assertions.ts
│   │   │   ├── api.assertions.ts
│   │   │   └── business.assertions.ts
│   │   ├── logger/
│   │   │   ├── logger.ts
│   │   │   └── log.context.ts
│   │   ├── reporting/
│   │   │   ├── reporter.meta.ts
│   │   │   └── attachments.ts
│   │   └── types/
│   │       ├── common.types.ts
│   │       ├── ui.types.ts
│   │       └── api.types.ts
│   │
│   ├── ui/
│   │   ├── pages/
│   │   │   ├── home.page.ts
│   │   │   ├── login.page.ts
│   │   │   ├── product.page.ts
│   │   │   ├── cart.page.ts
│   │   │   ├── checkout.page.ts
│   │   │   └── order-confirmation.page.ts
│   │   ├── components/
│   │   │   ├── header.component.ts
│   │   │   ├── footer.component.ts
│   │   │   ├── product-card.component.ts
│   │   │   └── mini-cart.component.ts
│   │   ├── locators/
│   │   │   ├── locator.strategy.ts
│   │   │   ├── home.locators.ts
│   │   │   ├── product.locators.ts
│   │   │   └── checkout.locators.ts
│   │   └── flows/
│   │       ├── auth.flow.ts
│   │       ├── shopping.flow.ts
│   │       └── checkout.flow.ts
│   │
│   ├── api/
│   │   ├── clients/
│   │   │   ├── auth.api.ts
│   │   │   ├── products.api.ts
│   │   │   ├── cart.api.ts
│   │   │   └── orders.api.ts
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts
│   │   │   ├── product.schema.ts
│   │   │   └── order.schema.ts
│   │   └── contracts/
│   │       ├── auth.contract.ts
│   │       ├── product.contract.ts
│   │       └── order.contract.ts
│   │
│   ├── data/
│   │   ├── static/
│   │   │   ├── users.json
│   │   │   ├── products.json
│   │   │   └── coupons.json
│   │   ├── factories/
│   │   │   ├── user.factory.ts
│   │   │   ├── product.factory.ts
│   │   │   ├── order.factory.ts
│   │   │   └── address.factory.ts
│   │   └── builders/
│   │       ├── user.builder.ts
│   │       └── order.builder.ts
│   │
│   ├── utils/
│   │   ├── wait.util.ts
│   │   ├── date.util.ts
│   │   ├── random.util.ts
│   │   ├── file.util.ts
│   │   ├── retry.util.ts
│   │   └── masking.util.ts
│   │
│   └── auth/
│       ├── storage/
│       │   ├── user.storageState.json
│       │   └── admin.storageState.json
│       └── auth.state.manager.ts
│
├── tests/
│   ├── ui/
│   │   ├── smoke/
│   │   │   ├── login.smoke.spec.ts
│   │   │   └── add-to-cart.smoke.spec.ts
│   │   ├── sanity/
│   │   │   ├── checkout.sanity.spec.ts
│   │   │   └── profile.sanity.spec.ts
│   │   └── regression/
│   │       ├── pricing.regression.spec.ts
│   │       ├── coupon.regression.spec.ts
│   │       └── order-history.regression.spec.ts
│   ├── api/
│   │   ├── smoke/
│   │   │   ├── auth-api.smoke.spec.ts
│   │   │   └── products-api.smoke.spec.ts
│   │   └── regression/
│   │       ├── cart-api.regression.spec.ts
│   │       └── orders-api.regression.spec.ts
│   └── e2e/
│       └── order-placement.e2e.spec.ts
│
├── global/
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   └── seed/
│       ├── seed.test-data.ts
│       └── cleanup.test-data.ts
│
├── scripts/
│   ├── run-by-tag.ts
│   ├── merge-reports.ts
│   ├── ci-env-check.ts
│   └── generate-auth-state.ts
│
├── artifacts/
│   ├── screenshots/
│   ├── videos/
│   ├── traces/
│   └── logs/
│
└── reports/
    ├── html/
    ├── junit/
    └── json/
```

---

## 3) Purpose of Each Major Folder/File

## Root Config Files

- **`playwright.config.ts`**: central test runner behavior: projects, retries, parallelization, timeouts, reporters, trace/video/screenshot policies.
- **`tsconfig.json`**: TypeScript compilation strategy and path aliases for clean imports.
- **`.env.example`**: contract of required environment variables.

## `config/`

- **`env.config.ts`**: typed config loader for `.env` + environment-specific files.
- **`projects.config.ts`**: browser/project matrix (Chromium/Firefox/WebKit, mobile profiles, API-only project).
- **`tags.config.ts`**: canonical tag constants and filtering conventions.
- **`env/*.env`**: isolated per-environment values (base URLs, API endpoints, creds via CI secrets injection).

## `src/core/`

Common framework engine.

- **`base/`**: abstract classes for pages/components/API clients/test base setup.
- **`fixtures/`**: custom Playwright fixtures (page objects, clients, auth context, data).
- **`hooks/`**: reusable before/after wrappers, including failure diagnostics.
- **`assertions/`**: domain-focused assertion libraries (UI/API/business outcome).
- **`logger/`**: structured logging with correlation IDs and test metadata.
- **`reporting/`**: standardized attachments to test reports.
- **`types/`**: strict interfaces/types shared across modules.

## `src/ui/`

- **`pages/`**: POM page classes; each page encapsulates operations and page-level behaviors.
- **`components/`**: reusable UI widgets used by multiple pages.
- **`locators/`**: dynamic locator strategy abstractions and per-page locator maps.
- **`flows/`**: higher-level user workflows combining multiple pages/components.

## `src/api/`

- **`clients/`**: endpoint-specific API wrappers using Playwright `request` context.
- **`schemas/`**: payload/response schema definitions for validation.
- **`contracts/`**: contract assertion helpers for HTTP + schema + business rules.

## `src/data/`

- **`static/`**: deterministic baseline data sets.
- **`factories/`**: dynamic test data generators for variability and isolation.
- **`builders/`**: fluent object builders for explicit scenario construction.

## `src/utils/`

Cross-cutting generic helpers (retry, random, time, file, waits, masking sensitive logs).

## `src/auth/`

- **`storage/`**: persisted auth states for role-based reuse.
- **`auth.state.manager.ts`**: lifecycle control (create/refresh/invalidate storage states).

## `tests/`

Separated by test type and tags for discoverability and selective execution.

- **`ui/`**: browser UI specs.
- **`api/`**: API-only specs.
- **`e2e/`**: full workflow specs across UI/API boundaries.

## `global/`

- **`global-setup.ts`**: pre-run initialization (env validation, auth state generation, data seeding).
- **`global-teardown.ts`**: cleanup and resource disposal.
- **`seed/`**: setup/cleanup scripts for shared demo data.

## `scripts/`

Developer and CI utility commands (tag execution, report merge, env validation, auth-state refresh).

## `artifacts/` & `reports/`

- **`artifacts/`**: runtime evidence (screenshots/videos/traces/logs).
- **`reports/`**: consumable outputs (HTML/JUnit/JSON).

---

## 4) How Requirements Map to Architecture

- **Playwright Test + TypeScript**: root config + TS strict typing across framework.
- **POM**: `src/ui/pages` and `src/ui/components`.
- **Data separation**: `src/data/*` with static + factories/builders.
- **UI + API support**: `tests/ui`, `tests/api`, `src/api` clients.
- **Reusable utilities/assertions**: `src/utils`, `src/core/assertions`.
- **Env config**: `config/env.config.ts` + `config/env/*.env` + `.env.example`.
- **Custom fixtures/hooks**: `src/core/fixtures`, `src/core/hooks`.
- **Tagging**: foldering + annotations managed by `config/tags.config.ts` and `scripts/run-by-tag.ts`.
- **Parallel/retries/media/reporting**: orchestrated in `playwright.config.ts`.
- **Auth reuse**: `src/auth/storage` + global setup generator.
- **Global setup/teardown**: `global/*`.
- **CI/CD readiness**: deterministic scripts, isolated outputs, JUnit/HTML artifacts.
- **Logging**: `src/core/logger` and report attachments.
- **Dynamic locators**: `src/ui/locators/locator.strategy.ts` abstraction.

---

## 5) SOLID + DRY Design Decisions

- **Single Responsibility**: pages do page behavior, clients do API calls, assertions validate outcomes.
- **Open/Closed**: add new pages/endpoints via extension, not modifications to shared contracts.
- **Liskov Substitution**: base classes define consistent interfaces for derived pages/clients.
- **Interface Segregation**: separate UI, API, and assertion interfaces to avoid bloated contracts.
- **Dependency Inversion**: flows depend on abstractions (base page/client interfaces), injected via fixtures.
- **DRY**: reusable fixtures, flow objects, shared assertions, and data factories eliminate duplication.

---

## 6) Execution Model (Conceptual)

1. `global-setup.ts` validates env, seeds data, creates auth state.
2. Playwright projects run in parallel with configured retries.
3. Fixtures instantiate POMs/API clients per test context.
4. Tests use tags (smoke/sanity/regression) for selective pipelines.
5. On failure, hooks capture screenshot/video/trace/log attachments.
6. `global-teardown.ts` cleans generated state/test data.
7. CI publishes HTML + JUnit + artifacts.

---

## 7) CI/CD Readiness Recommendations

- Keep tests hermetic and idempotent.
- Separate smoke (fast gate) and regression (scheduled/full gate).
- Cache dependencies and browser binaries in CI.
- Upload traces/videos only on failure to reduce storage.
- Export JUnit for pipeline test analytics and flaky-test dashboards.
- Use matrix execution by browser/tag for faster feedback.

---

## 8) Naming & Conventions

- Suffixes:
  - `*.page.ts`, `*.component.ts`, `*.api.ts`, `*.fixture.ts`, `*.spec.ts`.
- Test names follow behavior format: `should <expected> when <condition>`.
- Keep selectors centralized; tests should avoid raw locator usage.
- Keep assertions out of test bodies where reusable assertion methods exist.

---

## 9) Growth Path

This structure supports adding:
- visual testing modules,
- performance API checks,
- contract test packs,
- synthetic monitoring suites,
- multi-tenant environment overlays,
without major refactoring.
