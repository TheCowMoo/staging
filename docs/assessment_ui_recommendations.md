# Assessment UI Recommendations (industry_v1)

## Section behavior
- Show an industry-specific intro sentence at the top of each section card rather than changing layout structure.

## Binary question helper
- Render a "What counts as Yes" helper text beneath every binary question to reduce false-positive self-scoring.

## State law banner
- When a state overlay applies, show a single state-law banner above the assessment instead of embedding legal text inside each question.

## Results page
- Display five sub-score cards (one per section), a single weighted overall score, the top three priorities, and a state overlay card.

## Executive dashboard
- Provide a grid mapping `facility + industry + jurisdiction` to a Red/Yellow/Green readiness state consistent with the existing synthesis matrix.

## What not to change
- Do not expand the core assessment beyond 16 questions in this release.
- Do not let the LLM infer legal requirements without the Jurisdiction Resolver determining baseline and state overlays first.
- Keep best-practice guidance separate from mandatory state law in results copy.
- Provide industry-specific narrative for the same numeric scores — do not use a single generic result narrative.

## Implementation notes
- Question IDs must remain stable (q1..q16). Use non-destructive overrides to swap copy and helper text at runtime.
- Section intros should come from `INDUSTRY_PROMPT_TAGS` or a small mapping in the client to avoid changing component layout.
- Add a `stateBanner` component that consumes `runAssessment(...).escalationFlags` or the jurisdiction resolver output to determine when to show the banner.
