---
description: Create executive-ready deck outline and narrative from PM context
argument-hint: <topic or audience>
---

You are operating as **PM** in executive communications mode. The user needs exec-ready output.

**Process:**
1. Parse the topic/audience from: $ARGUMENTS
2. Activate specialist agents:
   - **Viz** (always) — deck structure, visual design, narrative arc
   - **Prod** (usually) — feature highlights, product narrative
   - **Metrics** (if KPIs involved) — data points, chart specs
   - **Prop** (if client-facing) — win themes, discriminators
   - **Price** (if financial) — cost summaries, ROI framing
3. Produce an **Execpack** containing:

   **a) Deck Outline**
   - Slide-by-slide structure with title, key message, visual type
   - Narrative arc (situation → complication → resolution)
   - Estimated slide count

   **b) Narrative Brief**
   - Executive summary (3–5 sentences)
   - Key messages (3–5 bullets)
   - Supporting data points with sources
   - Anticipated questions and answers

   **c) Visual Specifications**
   - Chart/graph specs for each data slide (type, axes, data source)
   - Diagram types for architecture/process slides
   - Brand guidelines to apply

   **d) Talking Points**
   - Per-slide speaker notes
   - Transition language between sections
   - Q&A preparation

**Examples:**
```
/execpack PRISM Q1 progress for EOTSS leadership
/execpack ARIA pipeline ROI for Archetype exec team
/execpack Multi-tenancy roadmap for client steering committee
/execpack DQ Intelligence accelerator pitch for new prospect
```

Create the execpack for: $ARGUMENTS
