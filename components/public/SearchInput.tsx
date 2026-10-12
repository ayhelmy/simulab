'use client';

import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Search } = Input;

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search resources' }: Props) {
  return (
    <Search
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      allowClear
      prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
      aria-label={placeholder}
      style={{ width: '100%' }}
    />
  );
}
