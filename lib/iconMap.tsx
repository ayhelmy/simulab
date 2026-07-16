/**
 * Maps Ant Design icon name strings (as stored in page_content.icon_name)
 * to actual React icon components.
 */

import React from 'react';
import {
  ExperimentOutlined, SafetyCertificateOutlined, TeamOutlined,
  RocketOutlined, TrophyOutlined, GlobalOutlined,
  HeartOutlined, BookOutlined, VideoCameraOutlined,
  FileTextOutlined, QuestionCircleOutlined, ApiOutlined,
  SettingOutlined, HomeOutlined, SafetyOutlined, ToolOutlined,
  AimOutlined, ThunderboltOutlined, CarOutlined, ReadOutlined,
  CodeOutlined, WifiOutlined, ApartmentOutlined, StarOutlined,
  BulbOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloudOutlined, DatabaseOutlined, LineChartOutlined, LockOutlined,
  MailOutlined, MessageOutlined, MobileOutlined, PieChartOutlined,
  UserOutlined, BankOutlined, AppstoreOutlined,
} from '@ant-design/icons';

const ICON_MAP: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  ExperimentOutlined, SafetyCertificateOutlined, TeamOutlined,
  RocketOutlined, TrophyOutlined, GlobalOutlined,
  HeartOutlined, BookOutlined, VideoCameraOutlined,
  FileTextOutlined, QuestionCircleOutlined, ApiOutlined,
  SettingOutlined, HomeOutlined, SafetyOutlined, ToolOutlined,
  AimOutlined, ThunderboltOutlined, CarOutlined, ReadOutlined,
  CodeOutlined, WifiOutlined, ApartmentOutlined, StarOutlined,
  BulbOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloudOutlined, DatabaseOutlined, LineChartOutlined, LockOutlined,
  MailOutlined, MessageOutlined, MobileOutlined, PieChartOutlined,
  UserOutlined, BankOutlined, AppstoreOutlined,
};

export function resolveIcon(
  iconName: string | null,
  color: string | null,
  size = 28,
): React.ReactNode {
  if (!iconName) return null;
  const Icon = ICON_MAP[iconName];
  if (!Icon) return null;
  return <Icon style={{ fontSize: size, color: color ?? '#F59324' }} />;
}

export const ICON_NAMES = Object.keys(ICON_MAP);
