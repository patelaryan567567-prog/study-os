import { PageContainer } from '@/components/layout/PageContainer';

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <PageContainer>
      <div className="glass rounded-2xl p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-accent)]">Module scaffold</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </PageContainer>
  );
}
