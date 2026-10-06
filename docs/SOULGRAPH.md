# SoulGraph — Product Constitution

> **One SoulGraph. Many applications. User controlled. AI augmented. Human connected.**

SoulGraph is a privacy-first **Human Intelligence Platform**. It builds a portable,
structured, user-owned map of an individual — the *SoulGraph* — and uses that map to
improve self-understanding, decisions, relationships, coaching, teams and
organizations. The individual always owns the map. Everything else is built on top of
that ownership.

## The architectural law

> The individual owns the SoulGraph. Relationships create the network. AI creates
> intelligence. Professionals create human value. Organizations create scale.
> Referrals create distribution.

Every technical and product decision in this repository must be checkable against that
law. If a feature would take ownership away from the individual, it is wrong, no matter
how convenient.

## The progression

```
PERSON  →  PAIR  →  TEAM  →  ORGANIZATION
```

The product grows outward from a single person. A pair is two SoulGraphs in a
consenting relationship. A team is a set of consenting SoulGraphs that share only what
each person grants. An organization is scale over many teams — and it **never** owns an
employee's SoulGraph.

## The core loop

```
Assess  →  Map  →  Understand  →  Compare  →  Simulate  →  Decide  →  Connect
```

1. **Assess** — the person answers validated instruments.
2. **Map** — answers are scored on-device into a canonical SoulGraph.
3. **Understand** — deterministic (and later AI) interpretation turns scores into insight.
4. **Compare** — longitudinal ("how have I changed?") and relational ("how do we differ?").
5. **Simulate** — explore decisions and scenarios against the map.
6. **Decide** — the person acts; the decision is recorded.
7. **Connect** — grant another person access and let the network create value.

## The eight phases

| Phase | Name | What it adds |
| --- | --- | --- |
| **I** | Identity & Assessment | Keys, vault, engine, canonical graph, demo + full assessment. |
| **II** | Personal Intelligence | SoulAI interpretation, reports, one-pager, longitudinal change. |
| **III** | Relationship Intelligence | Pair comparison, couple analysis, consent-based sharing. |
| **IV** | Professional Intelligence | Coaches and practitioners working with granted graphs. |
| **V** | Human Marketplace | Discovery and booking of human professionals (20% commission). |
| **VI** | Organizational Intelligence | Teams, departments, aggregate (never individual) org views. |
| **VII** | Referral Economy | First-touch attribution → commission ledger → payouts (30% recurring). |
| **VIII** | SoulGraph Network | The portable graph as shared infrastructure across applications. |

## The pricing ladder

All prices are **configuration** (`src/config/catalog.ts`), never hard-coded in UI or
logic. Currencies, amounts and commission rates are per-product and may change without
touching the application.

| Tier | Price | Notes |
| --- | --- | --- |
| Free demo | €0 | 15-question demo; answers carry into the full assessment. |
| Complete SoulGraph | €4.99 | One-time; full assessment scored. |
| Deep SoulGraph | €19 | One-time; extended item bank and depth. |
| Personal | CHF 9 / mo or 79 / yr | Ongoing personal intelligence. |
| Business | CHF 29 / mo or 199 / yr | Pairs, teams, professional comparison. |
| Professional | CHF 89 / mo or 799 / yr | Coaches and practitioners. |
| Organization | CHF 499 / mo | Org-scale aggregate intelligence. |
| Marketplace commission | 20% | On marketplace transactions (configurable). |
| Referral commission | 30% recurring | First-touch attribution (configurable per product). |

## Ethical boundaries (non-negotiable)

These must appear, verbatim in spirit, throughout the code and copy:

- SoulGraph **never diagnoses** mental illness, psychiatric or medical conditions,
  criminality or dangerousness.
- SoulGraph **never produces** hire / fire / untrustworthy / unstable verdicts.
- SoulGraph **never presents** probabilistic interpretation as certainty.
- Every insight carries one of **three evidence labels**:
  - **Psychometric** — built on constructs with substantial empirical support (e.g. Big Five / OCEAN).
  - **Interpretive** — established interpretive traditions (e.g. Jungian typology, Enneagram).
  - **Experimental SoulGraph** — proprietary or speculative (e.g. Life Pattern, Human Design, SoulGraph Core composites).
- SoulGraph **is not psychotherapy** and says so wherever relevant.
- **Organizations never own employee SoulGraphs.** This is enforced *cryptographically*,
  through per-facet encryption and consent-based grants — not by terms of service.

## For every future agent

Before changing anything in this repository, read **`docs/SOULGRAPH.md`** (this file)
and **`docs/ARCHITECTURE.md`**. They are the constitution. Code that violates the
architectural law or the ethical boundaries does not ship.
