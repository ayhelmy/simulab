'use client';

import { useState, type ReactNode } from 'react';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { colors } from '@/components/home/homeTheme';
import type { SimulationCatalog } from '@/types';
import CatalogTreeFilter from './CatalogTreeFilter';

interface Option { value: string; label: string }

interface Props {
  catalogTree: SimulationCatalog[];
  catalogLoading: boolean;
  selectedCatalogKeys: string[];
  onCatalogSelect: (keys: string[], includeChildren: boolean) => void;
  level: string;
  onLevelChange: (value: string) => void;
}

const LEVEL_OPTIONS: Option[] = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
];

function AccordionSection({
  title, defaultOpen = true, children,
}: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px',
          fontSize: 14.5, fontWeight: 700, color: colors.heading,
        }}
      >
        {title}
        {open ? <UpOutlined style={{ fontSize: 12, color: colors.body }} /> : <DownOutlined style={{ fontSize: 12, color: colors.body }} />}
      </button>
      {open && <div style={{ padding: '0 8px 8px' }}>{children}</div>}
    </div>
  );
}

function FilterRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', background: active ? '#fff' : 'none',
        border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 13.5,
        color: active ? colors.primary : colors.body, fontWeight: active ? 700 : 400, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export default function CatalogSidebarFilters({
  catalogTree, catalogLoading, selectedCatalogKeys, onCatalogSelect, level, onLevelChange,
}: Props) {
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <AccordionSection title="Discipline">
        <CatalogTreeFilter
          catalogs={catalogTree}
          loading={catalogLoading}
          selectedKeys={selectedCatalogKeys}
          onSelect={onCatalogSelect}
        />
      </AccordionSection>

      <div style={{ height: 1, background: colors.border, margin: '0 16px' }} />

      <AccordionSection title="Level">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {LEVEL_OPTIONS.map((l) => (
            <FilterRow
              key={l.value}
              label={l.label}
              active={level === l.value}
              onClick={() => onLevelChange(level === l.value ? '' : l.value)}
            />
          ))}
        </div>
      </AccordionSection>

      <div style={{ height: 1, background: colors.border, margin: '0 16px' }} />

      <AccordionSection title="Availability" defaultOpen={false}>
        <p style={{ fontSize: 12.5, color: colors.body, padding: '4px 12px 8px', margin: 0 }}>
          Availability filtering is coming soon.
        </p>
      </AccordionSection>
    </div>
  );
}
