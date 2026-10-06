import { PlaceholderPage } from '@/components/shell/PlaceholderPage';
import { useI18n } from '@/hooks/useI18n';

export default function Begin() {
  const { t } = useI18n();
  return <PlaceholderPage titleKey="page.begin.title" bodyKey="page.begin.body" eyebrow={t('nav.begin')} />;
}
