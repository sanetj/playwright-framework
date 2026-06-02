# RV4 Findings Report - Investigation Pipeline Validation

## 1. Target
*   **Target Application:** OWASP crAPI (completely seeded dynamic environment)

## 2. Validation Scope
*   Differential analysis and active threat-modeling on OWASP crAPI components (Vehicles, Orders, Video, Mechanic Reports)
*   Differential analysis covering 16 authorization pairs (BAC and IDOR vectors)
*   Multi-stage pipeline compilation: Resource Signals → Ownership Intelligence → Authorization Pairing → Verification Planning → Investigation Assembly → Investigation Clustering → Investigation Compression → Narrative Intelligence → Evidence Mapping → Bundle Assembly

## 3. Defects Discovered & 10.H1 Hardening

### Root Cause A: Observation ID Collision
*   **Description:** Legacy observation IDs were formatted as `obs_${relationship}_${subjectId}_${concreteId}`. This structure caused collision between resource instances from different families sharing identical serial IDs (e.g., Order 6 and Video 6 both mapping to `obs_OWNS_usr_8_6`), causing silent observation drop.
*   **Hardening Remediation:** Restructured the identifier namespace to include the sanitized resource family namespace. The new layout is: `obs_${relationship}_${subjectId}_${cleanFamilySegment}_${concreteId}`, guaranteeing unique global observation records.

### Root Cause B: Query Parameter Ownership Extraction
*   **Description:** LEGACY parameters lacked query parameter parsing hooks to handle route formats like `?report_id=X`. These parameters were parsed with generic string index splitters, failing to resolve numeric resource IDs.
*   **Hardening Remediation:** Standardized the identifier query-extraction flow. Developed an explicit parameter whitelist (`id`, `uuid`, `report_id`, `order_id`, etc.) and sorted parameter keys alphabetically before matching to ensure deterministic identifier resolution.

### Root Cause C: Profile Route False-Positive Matching
*   **Description:** Naive substring matching on `/me` triggered false-positives on paths like `/merchant` and `/mechanic`, polluting the session mapping boundaries by mistakenly classifying public service routes as user self-service actions.
*   **Hardening Remediation:** Refactored the profile route matcher to split and check URLs by exact segment array matching (`segment === 'me'`, `'profile'`, etc.) rather than naive substring matching.

## 4. Remediation Summary
*   All three root cause issues resolved directly inside `ownership-inferencer.ts`.
*   All local unit tests (105 total) passed cleanly under strict typecheck settings.

## 5. Revalidation Results
*   **RV4-0C-R1 (Ownership Revalidation):** Resolved all 8 seeded target resources correctly to User A (`usr_8`) and User B (`usr_9`) without collision or data drop.
*   **RV4-0D (Authorization Pairing):** Correctly paired resource-tenant vectors into 16 attacking permutations (6 IDOR, 10 BAC).
*   **RV4-0E (Verification Planning):** Correctly generated 14 blueprints, safely filtering out profile endpoints that lacked replay templates.
*   **RV4-0F (Investigation Assembly):** Output 14 trace-linked canonical assembly structures.
*   **RV4-0G (Investigation Clustering):** Successfully reduced the 14 assemblies into 7 vector-family clusters.
*   **RV4-0H (Investigation Compression):** Mapped the 7 clusters 1:1 into 7 Finding Candidates.
*   **RV4-0I (Narrative Intelligence):** Built 7 natural-language validation reports detailing the actor context.
*   **RV4-0J (Evidence Mapping):** Mapped the 7 narratives back to telemetry indicators.
*   **RV4-0K (Bundle Assembly):** Finalized 7 complete bundles mapping all trace components.

## 6. Lessons Learned
*   Passive signal extraction limits can prevent user profiles from being treated as direct targets if the crawler does not trigger them under a replay-compatible template format.
*   Namespace isolation is a critical invariant to prevent silent collision drops during telemetry correlation.

## 7. Remaining Risks
*   **Target Coverage:** New APIs added to target systems without standard REST routing structures might bypass whitelist heuristics.
*   **Identity Sync:** Rapid session token rotation during dynamic crawling may lead to un-aligned session intervals if telemetry captures lag.
