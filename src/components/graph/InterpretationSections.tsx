/**
 * InterpretationSections — the rich, rule-based "Complete results".
 *
 * For each facet: a dedicated section with the evidence label, a concise
 * explanation of what the framework is and how much evidence backs it (with a
 * link to /about/method), and hedged interpretive statements for this person's
 * specific pattern. Then a "Contradictions worth noticing" block that frames
 * cross-framework tensions as questions — never verdicts.
 */

import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EvidenceBadge } from '@/components/assessment/EvidenceBadge';
import { useI18n } from '@/hooks/useI18n';
import type { GraphInterpretation, Insight } from '@/core/interpret';

const FACET_TITLE: Record<string, string> = {
  jung: 'instrument.jung.name',
  enneagram: 'instrument.enneagram.name',
  life_pattern: 'instrument.life_pattern.name',
  soulgraph_core: 'graph.core.title',
};

/** A hedged interpretive line. Low-strength signals read tentatively. */
function InsightLine({ insight }: { insight: Insight }) {
  const { t } = useI18n();
  const tentative = insight.strength < 0.3;
  return (
    <li className="flex gap-3">
      <span
        className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"
        aria-hidden="true"
      />
      <span className="leading-relaxed text-muted-foreground">
        {tentative && <span className="text-foreground/70">{t('interpret.tentative')} </span>}
        {t(insight.key)}
      </span>
    </li>
  );
}

export function InterpretationSections({
  interpretation,
}: {
  interpretation: GraphInterpretation;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl sm:text-3xl">{t('results.title')}</h2>
        <Link to="/about/method" className="atlas-label text-primary hover:underline">
          {t('results.method_link')}
        </Link>
      </div>

      {interpretation.facets.map((facet) => (
        <Card key={facet.facet} className="border-hairline bg-card/60">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl">{t(FACET_TITLE[facet.facet] ?? facet.facet)}</h3>
              <EvidenceBadge evidence={facet.evidence} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(facet.framework_key)}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground/80">
              <span className="atlas-label mr-2 text-foreground/60">{t('results.standing')}</span>
              {t(facet.standing_key)}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {facet.insights.map((insight, i) => (
                <InsightLine key={i} insight={insight} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Contradictions worth noticing — always questions, never verdicts. */}
      {interpretation.tensions.length > 0 && (
        <Card className="border-hairline bg-card/60">
          <CardHeader className="gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-cyan" />
              <h3 className="font-display text-xl">{t('results.tensions.title')}</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('results.tensions.intro')}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {interpretation.tensions.map((tension, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-dashed border-hairline bg-background/40 px-4 py-3 leading-relaxed"
                >
                  {t(tension.key)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
