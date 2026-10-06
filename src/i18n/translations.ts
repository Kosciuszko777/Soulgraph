/**
 * i18n infrastructure. English is the default; German is second and uses SWISS
 * conventions — "ss", never "ß".
 *
 * A flat key → string map per locale. Keys are dotted namespaces. Missing keys fall
 * back to English, then to the key itself.
 */

export type Locale = 'en' | 'de';

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
];

type Dict = Record<string, string>;

const en: Dict = {
  'app.name': 'SoulGraph',
  'app.tagline': 'Human Intelligence Platform',

  'nav.graph': 'My SoulGraph',
  'nav.privacy': 'Privacy',
  'nav.method': 'Method',
  'nav.settings': 'Settings',
  'nav.unlock': 'Unlock',
  'nav.about': 'About',
  'nav.begin': 'Create my SoulGraph',

  'landing.headline': 'Know yourself. Understand others.',
  'landing.subline': 'One private map of how you think, decide, relate and act.',
  'landing.cta': 'Create my SoulGraph',
  'landing.cta_note': 'No account required',
  'landing.law': 'One SoulGraph. Many applications. User controlled. AI augmented. Human connected.',

  'landing.how.title': 'How it works',
  'landing.how.assess.title': 'Assess',
  'landing.how.assess.body': 'Answer validated instruments at your own pace. No right answers — only yours.',
  'landing.how.map.title': 'Map',
  'landing.how.map.body': 'Your answers are scored on your device into a structured, versioned map of you.',
  'landing.how.understand.title': 'Understand',
  'landing.how.understand.body': 'Turn the map into clear insight about how you think, decide, relate and act.',

  'landing.privacy.title': 'Your SoulGraph belongs to you',
  'landing.privacy.body': 'Your answers are scored on your device, encrypted before anything leaves it, and never published. Relay sync is off by default. There is no server that can read your SoulGraph — because there is no server.',

  'landing.evidence.note': 'Every insight carries an evidence label — Psychometric, Interpretive, or Experimental SoulGraph. SoulGraph never diagnoses, never judges, and is not psychotherapy.',

  'evidence.psychometric': 'Psychometric',
  'evidence.interpretive': 'Interpretive',
  'evidence.experimental': 'Experimental SoulGraph',

  'method.evidence.title': 'Three evidence labels',
  'method.evidence.psychometric.body': 'Built on constructs with substantial empirical support — for example the Big Five (OCEAN).',
  'method.evidence.interpretive.body': 'Drawn from established interpretive traditions — for example Jungian typology or the Enneagram.',
  'method.evidence.experimental.body': 'Proprietary or speculative composites — Life Pattern, Human Design, and SoulGraph Core.',
  'method.boundaries.title': 'What SoulGraph will never do',
  'method.boundaries.body': 'SoulGraph never diagnoses mental illness, psychiatric or medical conditions, criminality or dangerousness. It never produces hire, fire, untrustworthy or unstable verdicts, and never presents probabilistic interpretation as certainty. SoulGraph is not psychotherapy. Organizations never own employee SoulGraphs — this is enforced cryptographically, not by terms of service.',

  'page.begin.title': 'Create your SoulGraph',
  'page.begin.body': 'A short, 15-question demo to get started. Your answers carry over into your full SoulGraph — nothing is re-asked.',
  'page.graph.title': 'My SoulGraph',
  'page.graph.body': 'Your private, versioned map. Facets appear here as you complete assessments.',
  'page.onepager.title': 'SoulGraph one-pager',
  'page.onepager.body': 'A single-page summary of your SoulGraph, for yourself or to share by consent.',
  'page.unlock.title': 'Unlock your SoulGraph',
  'page.unlock.body': 'Entitlements are verifiable facts, not switches. Every tier below is read from configuration — prices are never hard-coded. Payments settle over Lightning.',
  'page.privacy_center.title': 'Privacy Center',
  'page.privacy_center.body': 'Control sync, grants and revocation. Nothing psychological ever leaves your device unencrypted.',
  'page.settings.title': 'Settings',
  'page.settings.body': 'Identity, theme, language and sync relays.',
  'page.method.title': 'Method & evidence',
  'page.method.body': 'How SoulGraph scores, what each evidence label means, and what SoulGraph will never do.',
  'page.legal.privacy.title': 'Privacy',
  'page.legal.terms.title': 'Terms',

  'placeholder.coming': 'Charted — not yet built',

  /* --- Assessment --- */
  'assessment.progress.item': 'Item',
  'assessment.likert.aria': 'How much do you agree with this statement?',
  'assessment.likert.disagree': 'Disagree',
  'assessment.likert.agree': 'Agree',
  'assessment.nav.back': 'Back',
  'assessment.nav.next': 'Next',
  'assessment.nav.finish': 'See my SoulGraph',
  'assessment.nav.scoring': 'Scoring on your device…',
  'assessment.footer.local': 'Scored on your device. Encrypted before anything is stored. Never published.',
  'assessment.footer.no_encrypt': 'Your current signer cannot encrypt. Use a NIP-07 extension or a local key that supports NIP-44 to save your SoulGraph.',
  'assessment.done.title': 'Your SoulGraph is mapped',
  'assessment.done.body': 'Your answers were scored on your device and sealed into an encrypted, versioned map. Explore it now.',
  'assessment.done.cta': 'Open my SoulGraph',

  /* --- Graph --- */
  'graph.summary.title': 'Overall confidence',
  'graph.summary.scaled': 'Scaled, not population-normed — a value shows how far up the possible range you scored, never a percentile.',
  'graph.summary.full_cta': 'Go deeper',
  'graph.footer.boundaries': 'SoulGraph never diagnoses, never judges, and never presents interpretation as certainty. It is not psychotherapy. This is a reflective map — a tendency, not a box.',
  'graph.signin.body': 'Your SoulGraph is private to you. Create or sign in to a Nostr identity to begin.',
  'graph.empty.body': 'You have not mapped a SoulGraph yet. The free 15-question demo takes a couple of minutes.',
  'graph.empty.cta': 'Take the demo',
  'graph.jung.code_note': 'a convenience label, not a box',
  'graph.life.code_note': 'reflective pattern number',
  'graph.enneagram.unclear': 'Your top two patterns are too close to call yet. Answer the full assessment to clarify — we will not pick one for you.',
  'graph.enneagram.wing': 'leaning',
  'graph.core.title': 'SoulGraph Core',
  'graph.core.note': 'Experimental composites across your other facets. A composite is only as grounded as its inputs, and the combination itself is proprietary — always experimental.',
  'graph.identity.title': 'Identity',
  'graph.identity.note': 'Only your public key. Never your legal name, phone or address.',

  /* Jung axis poles (low ←→ high) */
  'jung.pole.energy.low': 'Inward',
  'jung.pole.energy.high': 'Outward',
  'jung.pole.perception.low': 'Patterns',
  'jung.pole.perception.high': 'Detail',
  'jung.pole.judgment.low': 'Values',
  'jung.pole.judgment.high': 'Logic',
  'jung.pole.lifestyle.low': 'Open',
  'jung.pole.lifestyle.high': 'Planned',

  /* SoulGraph Core dimensions */
  'core.dim.autonomy': 'Autonomy',
  'core.dim.analytical_orientation': 'Analytical orientation',
  'core.dim.emotional_sensitivity': 'Emotional sensitivity',
  'core.dim.social_energy': 'Social energy',
  'core.dim.exploration': 'Exploration',
  'core.dim.structure': 'Structure',
  'core.dim.risk_tolerance': 'Risk tolerance',
  'core.dim.harmony': 'Harmony',
  'core.dim.assertiveness': 'Assertiveness',
  'core.dim.meaning_orientation': 'Meaning orientation',
  'core.dim.stability': 'Stability',
  'core.dim.adaptability': 'Adaptability',
  'core.dim.novelty_seeking': 'Novelty seeking',
  'core.dim.cooperation': 'Cooperation',
  'core.dim.dominance': 'Dominance',
  'core.dim.introspection': 'Introspection',

  'footer.vibed': 'Vibed with Shakespeare',

  'theme.toggle': 'Toggle theme',
  'lang.toggle': 'Language',
};

// German — Swiss conventions ("ss", never "ß").
const de: Dict = {
  'app.name': 'SoulGraph',
  'app.tagline': 'Plattform für menschliche Intelligenz',

  'nav.graph': 'Mein SoulGraph',
  'nav.privacy': 'Privatsphäre',
  'nav.method': 'Methode',
  'nav.settings': 'Einstellungen',
  'nav.unlock': 'Freischalten',
  'nav.about': 'Über',
  'nav.begin': 'Mein SoulGraph erstellen',

  'landing.headline': 'Erkenne dich selbst. Verstehe andere.',
  'landing.subline': 'Eine private Karte davon, wie du denkst, entscheidest, dich verbindest und handelst.',
  'landing.cta': 'Mein SoulGraph erstellen',
  'landing.cta_note': 'Kein Konto erforderlich',
  'landing.law': 'Ein SoulGraph. Viele Anwendungen. Von dir kontrolliert. KI-gestützt. Menschlich verbunden.',

  'landing.how.title': 'So funktioniert es',
  'landing.how.assess.title': 'Erfassen',
  'landing.how.assess.body': 'Beantworte validierte Instrumente in deinem Tempo. Keine richtigen Antworten — nur deine.',
  'landing.how.map.title': 'Abbilden',
  'landing.how.map.body': 'Deine Antworten werden auf deinem Gerät zu einer strukturierten, versionierten Karte von dir ausgewertet.',
  'landing.how.understand.title': 'Verstehen',
  'landing.how.understand.body': 'Verwandle die Karte in klare Einsichten darüber, wie du denkst, entscheidest, dich verbindest und handelst.',

  'landing.privacy.title': 'Dein SoulGraph gehört dir',
  'landing.privacy.body': 'Deine Antworten werden auf deinem Gerät ausgewertet, verschlüsselt, bevor irgendetwas es verlässt, und niemals veröffentlicht. Die Relay-Synchronisation ist standardmässig ausgeschaltet. Es gibt keinen Server, der deinen SoulGraph lesen kann — weil es keinen Server gibt.',

  'landing.evidence.note': 'Jede Einsicht trägt ein Evidenz-Label — Psychometrisch, Interpretativ oder Experimentell (SoulGraph). SoulGraph diagnostiziert nie, urteilt nie und ist keine Psychotherapie.',

  'evidence.psychometric': 'Psychometrisch',
  'evidence.interpretive': 'Interpretativ',
  'evidence.experimental': 'Experimentell (SoulGraph)',

  'method.evidence.title': 'Drei Evidenz-Labels',
  'method.evidence.psychometric.body': 'Basiert auf Konstrukten mit substanzieller empirischer Grundlage — zum Beispiel den Big Five (OCEAN).',
  'method.evidence.interpretive.body': 'Aus etablierten interpretativen Traditionen — zum Beispiel der jungianischen Typologie oder dem Enneagramm.',
  'method.evidence.experimental.body': 'Proprietäre oder spekulative Composites — Life Pattern, Human Design und SoulGraph Core.',
  'method.boundaries.title': 'Was SoulGraph niemals tut',
  'method.boundaries.body': 'SoulGraph diagnostiziert niemals psychische Erkrankungen, psychiatrische oder medizinische Zustände, Kriminalität oder Gefährlichkeit. Es fällt niemals Urteile über Einstellung, Entlassung, Vertrauenswürdigkeit oder Stabilität und stellt probabilistische Interpretationen nie als Gewissheit dar. SoulGraph ist keine Psychotherapie. Organisationen besitzen niemals die SoulGraphs ihrer Mitarbeitenden — das wird kryptografisch durchgesetzt, nicht durch Nutzungsbedingungen.',

  'page.begin.title': 'Erstelle deinen SoulGraph',
  'page.begin.body': 'Eine kurze Demo mit 15 Fragen zum Einstieg. Deine Antworten werden in deinen vollständigen SoulGraph übernommen — nichts wird erneut gefragt.',
  'page.graph.title': 'Mein SoulGraph',
  'page.graph.body': 'Deine private, versionierte Karte. Facetten erscheinen hier, sobald du Erhebungen abschliesst.',
  'page.onepager.title': 'SoulGraph auf einer Seite',
  'page.onepager.body': 'Eine einseitige Zusammenfassung deines SoulGraph — für dich selbst oder zum einvernehmlichen Teilen.',
  'page.unlock.title': 'Schalte deinen SoulGraph frei',
  'page.unlock.body': 'Berechtigungen sind überprüfbare Tatsachen, keine Schalter. Jede Stufe unten wird aus der Konfiguration gelesen — Preise sind nie fest einprogrammiert. Zahlungen werden über Lightning abgewickelt.',
  'page.privacy_center.title': 'Privatsphäre-Zentrum',
  'page.privacy_center.body': 'Steuere Synchronisation, Freigaben und Widerruf. Nichts Psychologisches verlässt dein Gerät jemals unverschlüsselt.',
  'page.settings.title': 'Einstellungen',
  'page.settings.body': 'Identität, Erscheinungsbild, Sprache und Sync-Relays.',
  'page.method.title': 'Methode & Evidenz',
  'page.method.body': 'Wie SoulGraph auswertet, was jedes Evidenz-Label bedeutet und was SoulGraph niemals tun wird.',
  'page.legal.privacy.title': 'Datenschutz',
  'page.legal.terms.title': 'Nutzungsbedingungen',

  'placeholder.coming': 'Kartiert — noch nicht gebaut',

  /* --- Assessment --- */
  'assessment.progress.item': 'Frage',
  'assessment.likert.aria': 'Wie sehr stimmst du dieser Aussage zu?',
  'assessment.likert.disagree': 'Stimme nicht zu',
  'assessment.likert.agree': 'Stimme zu',
  'assessment.nav.back': 'Zurück',
  'assessment.nav.next': 'Weiter',
  'assessment.nav.finish': 'Meinen SoulGraph ansehen',
  'assessment.nav.scoring': 'Wird auf deinem Gerät ausgewertet…',
  'assessment.footer.local': 'Auf deinem Gerät ausgewertet. Verschlüsselt, bevor etwas gespeichert wird. Niemals veröffentlicht.',
  'assessment.footer.no_encrypt': 'Dein aktueller Signierer kann nicht verschlüsseln. Nutze eine NIP-07-Erweiterung oder einen lokalen Schlüssel mit NIP-44-Unterstützung, um deinen SoulGraph zu speichern.',
  'assessment.done.title': 'Dein SoulGraph ist kartiert',
  'assessment.done.body': 'Deine Antworten wurden auf deinem Gerät ausgewertet und in eine verschlüsselte, versionierte Karte versiegelt. Erkunde sie jetzt.',
  'assessment.done.cta': 'Meinen SoulGraph öffnen',

  /* --- Graph --- */
  'graph.summary.title': 'Gesamtvertrauen',
  'graph.summary.scaled': 'Skaliert, nicht an einer Bevölkerung normiert — ein Wert zeigt, wie weit oben im möglichen Bereich du liegst, nie ein Perzentil.',
  'graph.summary.full_cta': 'Tiefer gehen',
  'graph.footer.boundaries': 'SoulGraph diagnostiziert nie, urteilt nie und stellt Interpretation nie als Gewissheit dar. Es ist keine Psychotherapie. Dies ist eine reflektierende Karte — eine Tendenz, keine Schublade.',
  'graph.signin.body': 'Dein SoulGraph ist privat. Erstelle eine Nostr-Identität oder melde dich an, um zu beginnen.',
  'graph.empty.body': 'Du hast noch keinen SoulGraph kartiert. Die kostenlose Demo mit 15 Fragen dauert nur ein paar Minuten.',
  'graph.empty.cta': 'Demo starten',
  'graph.jung.code_note': 'ein praktisches Etikett, keine Schublade',
  'graph.life.code_note': 'reflektierende Musterzahl',
  'graph.enneagram.unclear': 'Deine zwei stärksten Muster liegen noch zu nah beieinander. Beantworte die vollständige Erhebung zur Klärung — wir wählen keines für dich aus.',
  'graph.enneagram.wing': 'mit Tendenz zu',
  'graph.core.title': 'SoulGraph Core',
  'graph.core.note': 'Experimentelle Composites über deine anderen Facetten. Ein Composite ist nur so fundiert wie seine Eingaben, und die Kombination selbst ist proprietär — stets experimentell.',
  'graph.identity.title': 'Identität',
  'graph.identity.note': 'Nur dein öffentlicher Schlüssel. Niemals dein bürgerlicher Name, deine Telefonnummer oder Adresse.',

  'jung.pole.energy.low': 'Nach innen',
  'jung.pole.energy.high': 'Nach aussen',
  'jung.pole.perception.low': 'Muster',
  'jung.pole.perception.high': 'Detail',
  'jung.pole.judgment.low': 'Werte',
  'jung.pole.judgment.high': 'Logik',
  'jung.pole.lifestyle.low': 'Offen',
  'jung.pole.lifestyle.high': 'Geplant',

  'core.dim.autonomy': 'Autonomie',
  'core.dim.analytical_orientation': 'Analytische Ausrichtung',
  'core.dim.emotional_sensitivity': 'Emotionale Sensibilität',
  'core.dim.social_energy': 'Soziale Energie',
  'core.dim.exploration': 'Erkundung',
  'core.dim.structure': 'Struktur',
  'core.dim.risk_tolerance': 'Risikobereitschaft',
  'core.dim.harmony': 'Harmonie',
  'core.dim.assertiveness': 'Durchsetzungsvermögen',
  'core.dim.meaning_orientation': 'Sinnorientierung',
  'core.dim.stability': 'Stabilität',
  'core.dim.adaptability': 'Anpassungsfähigkeit',
  'core.dim.novelty_seeking': 'Neugier auf Neues',
  'core.dim.cooperation': 'Kooperation',
  'core.dim.dominance': 'Dominanz',
  'core.dim.introspection': 'Introspektion',

  'footer.vibed': 'Vibed mit Shakespeare',

  'theme.toggle': 'Erscheinungsbild wechseln',
  'lang.toggle': 'Sprache',
};

import { instrumentsEn, instrumentsDe } from './instruments';

export const TRANSLATIONS: Record<Locale, Dict> = {
  en: { ...en, ...instrumentsEn },
  de: { ...de, ...instrumentsDe },
};
