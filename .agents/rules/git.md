---
trigger: always_on
---

FACT RULES

Do not claim git state unless exact command output is shown.

For every commit/push operation include raw outputs for:

bash
git status
git branch -vv
git rev-parse HEAD

Do not summarize these outputs.

If output is unavailable, state:

INSUFFICIENT_EVIDENCE

Do not infer repository state.