'use client';

import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';

const theme = {
  token: {
    colorPrimary: '#F59324',
    colorSuccess: '#059669',
    colorWarning: '#D97706',
    colorError:   '#DC2626',
    colorInfo:    '#0284C7',
    borderRadius: 8,
    fontFamily:   'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
  },
  components: {
    Layout: {
      siderBg:    '#0C1B33',
      triggerBg:  '#162847',
      headerBg:   '#ffffff',
    },
    Menu: {
      darkItemBg:          '#0C1B33',
      darkSubMenuItemBg:   '#0C1B33',
      darkItemSelectedBg:  '#F59324',
      darkItemHoverBg:     '#162847',
      darkItemColor:       'rgba(255,255,255,0.75)',
      darkItemSelectedColor: '#ffffff',
    },
  },
};

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp>
        {children}
      </AntdApp>
    </ConfigProvider>
  );
}
