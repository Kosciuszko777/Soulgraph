/**
 * GraphFacets — render every filled facet of a canonical SoulGraph.
 *
 * Each facet is shown with its evidence label and honest copy. The Enneagram is
 * deliberately careful: when the top-two margin is too small to call, we say the
 * pattern is not yet clear rather than pick a type.
 */

import { Fingerprint } from 'lucide-react';
import { FacetCard } from '@/components/graph/FacetCard';
import { ScaleBar } from '@/components/graph/ScaleBar';
import { useI18n } from '@/hooks/useI18n';
import { scaleLabelKeys } from '@/core/engine/instruments';
import { CORE_DIMENSIONS } from '@/core/engine/core-mapping';
import type { SoulGraph } from '@/core/graph/schema';

/** Readable pole labels for the four Jungian axes (low ←→ high). */
const JUNG_POLES: Record<string, { low: string; high: string }> = {
  energy: { low: 'jung.pole.energy.low', high: 'jung.pole.energy.high' },
  perception: { low: 'jung.pole.perception.low', high: 'jung.pole.perception.high' },
  judgment: { low: 'jung.pole.judgment.low', high: 'jung.pole.judgment.high' },
  lifestyle: { low: 'jung.pole.lifestyle.low', high: 'jung.pole.lifestyle.high' },
};

export function GraphFacets({ graph }: { graph: SoulGraph }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Jung */}
      {graph.jung && (
        <FacetCard
          title={t('instrument.jung.name')}
          evidence="interpretive"
          note={t('instrument.jung.note')}
          headline={
            graph.jung.type_code ? (
              <div className="flex items-center gap-2">
                <span className="atlas-data rounded-md border border-hairline bg-background px-2.5 py-1 text-lg tracking-[0.2em] text-primary">
                  {graph.jung.type_code}
                </span>
                <span className="atlas-label">{t('graph.jung.code_note')}</span>
              </div>
            ) : undefined
          }
        >
          {Object.entries(graph.jung.scales).map(([id, v]) => {
            const { label_key } = scaleLabelKeys('jung', id);
            const poles = JUNG_POLES[id];
            return (
              <ScaleBar
                key={id}
                label={label_key ? t(label_key) : id}
                value={v.value}
                confidence={v.confidence}
                poles={poles ? { low: t(poles.low), high: t(poles.high) } : undefined}
              />
            );
          })}
        </FacetCard>
      )}

      {/* Enneagram */}
      {graph.enneagram && (
        <FacetCard
          title={t('instrument.enneagram.name')}
          evidence="interpretive"
          note={t('instrument.enneagram.note')}
          headline={<EnneagramHeadline graph={graph} />}
        >
          {Object.entries(graph.enneagram.scales)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([id, v]) => {
              const { label_key } = scaleLabelKeys('enneagram', id);
              return (
                <ScaleBar
                  key={id}
                  label={`${id} · ${label_key ? t(label_key) : id}`}
                  value={v.value}
                  confidence={v.confidence}
                />
              );
            })}
        </FacetCard>
      )}

      {/* Life Pattern */}
      {graph.life_pattern && (
        <FacetCard
          title={t('instrument.life_pattern.name')}
          evidence="experimental"
          note={t('instrument.life_pattern.note')}
          headline={
            graph.life_pattern.pattern_code ? (
              <div className="flex items-center gap-2">
                <span className="atlas-data rounded-md border border-hairline bg-background px-2.5 py-1 text-lg text-primary">
                  {graph.life_pattern.pattern_code}
                </span>
                <span className="atlas-label">{t('graph.life.code_note')}</span>
              </div>
            ) : undefined
          }
        >
          {Object.entries(graph.life_pattern.scales).map(([id, v]) => {
            const { label_key, description_key } = scaleLabelKeys('life_pattern', id);
            return (
              <ScaleBar
                key={id}
                label={label_key ? t(label_key) : id}
                description={description_key ? t(description_key) : undefined}
                value={v.value}
                confidence={v.confidence}
              />
            );
          })}
        </FacetCard>
      )}

      {/* SoulGraph Core */}
      {graph.soulgraph_core && (
        <FacetCard
          title={t('graph.core.title')}
          evidence="experimental"
          note={t('graph.core.note')}
        >
          {(() => {
            const coreScales = graph.soulgraph_core.scales;
            return CORE_DIMENSIONS.filter((dim) => coreScales[dim]).map((dim) => {
              const v = coreScales[dim];
              return (
                <ScaleBar
                  key={dim}
                  label={t(`core.dim.${dim}`)}
                  value={v.value}
                  confidence={v.confidence}
                />
              );
            });
          })()}
        </FacetCard>
      )}

      {/* Identity — always present, minimal by design */}
      <FacetCard title={t('graph.identity.title')} evidence="psychometric" note={t('graph.identity.note')}>
        <div className="flex items-center gap-3">
          <Fingerprint className="h-5 w-5 text-muted-foreground" />
          <span className="atlas-data break-all text-sm text-muted-foreground">
            {graph.identity.pubkey.slice(0, 16)}…{graph.identity.pubkey.slice(-8)}
          </span>
        </div>
      </FacetCard>
    </div>
  );
}

function EnneagramHeadline({ graph }: { graph: SoulGraph }) {
  const { t } = useI18n();
  const e = graph.enneagram;
  if (!e) return null;

  if (!e.dominant_type) {
    return (
      <p className="rounded-md border border-dashed border-hairline bg-background/60 px-3 py-2 text-sm text-muted-foreground">
        {t('graph.enneagram.unclear')}
      </p>
    );
  }

  const { label_key } = scaleLabelKeys('enneagram', String(e.dominant_type));
  const wingKeys = e.wing ? scaleLabelKeys('enneagram', String(e.wing)) : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="atlas-data rounded-md border border-hairline bg-background px-2.5 py-1 text-lg text-primary">
        {e.dominant_type}
        {e.wing ? `w${e.wing}` : ''}
      </span>
      <span className="text-sm text-muted-foreground">
        {label_key ? t(label_key) : e.dominant_type}
        {wingKeys?.label_key ? ` · ${t('graph.enneagram.wing')} ${t(wingKeys.label_key)}` : ''}
      </span>
    </div>
  );
}
