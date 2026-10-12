import type { ThemeConfig } from 'antd';

/**
 * BEDO design-system theme for the instructor, teaching-assistant, student and
 * Super Admin interface. Applied by `app/(dashboard)/layout.tsx` as a nested ConfigProvider,
 * so it merges over the global theme in `components/AntdProvider.tsx` and also
 * reaches modals, drawers and dropdowns rendered from those pages.
 *
 * Values: BEDO_DESIGN_SYSTEM.md sections 4 (colour), 8 (radius/border),
 * 9 (buttons), 14 (forms), 18 (authenticated interface), 21 (tables).
 */

const PRIMARY = '#F59324';
const PRIMARY_HOVER = '#E07B15';
const PRIMARY_100 = '#FEF3E2';
const PRIMARY_200 = '#FDE8C6';
const BORDER = '#DDDEDF';
const BORDER_STRONG = '#D1D5DB';
const DIVIDER = '#F3F4F6';
const SURFACE_MUTED = '#F9FAFB';
const TEXT_PRIMARY = '#111827';
const TEXT_BODY = '#374151';
const TEXT_SECONDARY = '#6B7280';
const TEXT_MUTED = '#9CA3AF';
const FOCUS_RING = '0 0 0 3px rgba(245,147,36,0.14)';

export const BEDO_APP_THEME: ThemeConfig = {
  token: {
    colorText: TEXT_BODY,
    colorTextHeading: TEXT_PRIMARY,
    colorTextSecondary: TEXT_SECONDARY,
    colorTextDescription: TEXT_SECONDARY,
    colorTextTertiary: TEXT_MUTED,
    colorTextPlaceholder: TEXT_MUTED,
    colorBorder: BORDER_STRONG,
    colorBorderSecondary: BORDER,
    colorSplit: DIVIDER,
    colorLink: PRIMARY,
    colorLinkHover: PRIMARY_HOVER,
    colorLinkActive: PRIMARY_HOVER,
    controlOutline: 'rgba(245,147,36,0.14)',
    controlOutlineWidth: 3,
    borderRadiusLG: 12,
  },
  components: {
    Card: {
      headerFontSize: 15,
      headerFontSizeSM: 15,
      headerHeightSM: 48,
      bodyPaddingSM: 16,
      extraColor: TEXT_SECONDARY,
    },
    Table: {
      headerBg: SURFACE_MUTED,
      headerColor: TEXT_BODY,
      headerSplitColor: 'transparent',
      headerSortActiveBg: DIVIDER,
      headerSortHoverBg: DIVIDER,
      bodySortBg: '#FFFFFF',
      rowHoverBg: SURFACE_MUTED,
      rowSelectedBg: PRIMARY_100,
      rowSelectedHoverBg: PRIMARY_200,
      borderColor: DIVIDER,
      cellFontSize: 14,
      cellFontSizeSM: 13,
      cellFontSizeMD: 14,
    },
    Button: {
      fontWeight: 600,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      defaultBorderColor: BORDER_STRONG,
      defaultColor: TEXT_BODY,
      defaultHoverBorderColor: PRIMARY,
      defaultHoverColor: PRIMARY_HOVER,
      defaultActiveBorderColor: PRIMARY_HOVER,
      defaultActiveColor: PRIMARY_HOVER,
      linkHoverBg: 'transparent',
    },
    Input: {
      hoverBorderColor: TEXT_MUTED,
      activeBorderColor: PRIMARY,
      activeShadow: FOCUS_RING,
    },
    InputNumber: {
      hoverBorderColor: TEXT_MUTED,
      activeBorderColor: PRIMARY,
      activeShadow: FOCUS_RING,
    },
    DatePicker: {
      hoverBorderColor: TEXT_MUTED,
      activeBorderColor: PRIMARY,
      activeShadow: FOCUS_RING,
    },
    Select: {
      hoverBorderColor: TEXT_MUTED,
      activeBorderColor: PRIMARY,
      activeOutlineColor: 'rgba(245,147,36,0.14)',
      optionSelectedBg: PRIMARY_100,
      optionSelectedColor: TEXT_PRIMARY,
      optionActiveBg: SURFACE_MUTED,
    },
    Form: {
      labelColor: TEXT_BODY,
      labelFontSize: 13,
      itemMarginBottom: 20,
      verticalLabelPadding: '0 0 4px',
    },
    Tabs: {
      itemColor: TEXT_SECONDARY,
      itemHoverColor: PRIMARY_HOVER,
      itemActiveColor: PRIMARY_HOVER,
      itemSelectedColor: PRIMARY,
      inkBarColor: PRIMARY,
    },
    Modal: {
      titleFontSize: 16,
      titleColor: TEXT_PRIMARY,
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: TEXT_BODY,
      itemHoverColor: TEXT_PRIMARY,
      itemHoverBg: 'rgba(17,24,39,0.05)',
      itemSelectedBg: PRIMARY_100,
      itemSelectedColor: PRIMARY,
      itemActiveBg: PRIMARY_200,
    },
    Tag: {
      defaultBg: DIVIDER,
      defaultColor: TEXT_BODY,
    },
    Progress: {
      defaultColor: PRIMARY,
      remainingColor: DIVIDER,
    },
    Pagination: {
      itemActiveBg: '#FFFFFF',
    },
    Segmented: {
      itemSelectedColor: TEXT_PRIMARY,
    },
  },
};

/**
 * Roles that get the BEDO app skin: the instructor / TA / student interface,
 * the Institution Admin workspace and the Super Admin platform console.
 * Department managers keep the previous shell look for now.
 */
export const BEDO_SKIN_ROLES = ['instructor', 'teaching_assistant', 'student', 'institution_admin', 'super_admin'] as const;
