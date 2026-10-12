'use client';

import { RESOURCE_FILTERS, type ResourceFilterType } from '@/lib/resources';
import { colors } from '@/components/home/homeTheme';
import SearchInput from './SearchInput';

interface Props {
  active: ResourceFilterType;
  onChange: (value: ResourceFilterType) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function ResourceFilter({ active, onChange, search, onSearchChange }: Props) {
  return (
    <section
      aria-label="Filter resources"
      style={{
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {RESOURCE_FILTERS.map((f) => {
          const isActive = active === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange(f.value)}
              style={{
                border: isActive ? 'none' : `1px solid ${colors.border}`,
                borderRadius: 999, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                background: isActive ? colors.primary : '#fff',
                color: isActive ? '#fff' : colors.body,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ width: 260, flexShrink: 0 }}>
        <SearchInput value={search} onChange={onSearchChange} />
      </div>
    </section>
  );
}
