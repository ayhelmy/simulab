'use client';

import type { CSSProperties } from 'react';
import { Input, Select } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { colors } from '@/components/home/homeTheme';

const { Search } = Input;

export interface DisciplineOption { value: string; label: string }

interface Props {
  searchValue: string;
  onSearchChange: (value: string) => void;
  level: string;
  onLevelChange: (value: string) => void;
  disciplineOptions: DisciplineOption[];
  disciplineValue: string;
  onDisciplineChange: (value: string) => void;
  hasActiveFilters: boolean;
  onResetAll: () => void;
}

const LEVELS: { value: string; label: string }[] = [
  { value: '',             label: 'All Levels'   },
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
];

export default function CatalogFilterBar({
  searchValue, onSearchChange, level, onLevelChange,
  disciplineOptions, disciplineValue, onDisciplineChange,
  hasActiveFilters, onResetAll,
}: Props) {
  const labelStyle: CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 700, color: colors.body,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  };

  return (
    <section
      aria-label="Search and filter"
      style={{
        background: colors.bgAlt,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '24px 28px',
      }}
    >
      <div className="catalog-filterbar-row" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr auto', gap: 24, alignItems: 'start' }}>
        <div>
          <span style={labelStyle}>Search</span>
          <Search
            placeholder="Search by title, topic, or objective"
            defaultValue={searchValue}
            key={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onSearch={onSearchChange}
            allowClear
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            aria-label="Search simulations"
          />
        </div>

        <div>
          <span style={labelStyle}>Level</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 4 }}>
            {LEVELS.map((opt) => {
              const active = level === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onLevelChange(opt.value)}
                  style={{
                    flex: '1 1 auto', border: 'none', borderRadius: 8, padding: '8px 12px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: active ? colors.primary : 'transparent',
                    color: active ? '#fff' : colors.body,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span style={labelStyle}>Discipline</span>
          <Select
            value={disciplineValue}
            onChange={onDisciplineChange}
            style={{ width: '100%' }}
            aria-label="Filter by discipline"
            options={[{ value: '', label: 'All Disciplines' }, ...disciplineOptions]}
          />
        </div>

        <div style={{ paddingTop: 30 }}>
          <button
            type="button"
            onClick={onResetAll}
            disabled={!hasActiveFilters}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', fontSize: 13, fontWeight: 600,
              color: hasActiveFilters ? colors.primary : '#B5BAC1',
              cursor: hasActiveFilters ? 'pointer' : 'default',
              whiteSpace: 'nowrap', padding: '8px 0',
            }}
          >
            <ReloadOutlined /> Reset all
          </button>
        </div>
      </div>
    </section>
  );
}
