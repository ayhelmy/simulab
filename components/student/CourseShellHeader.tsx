'use client';

/**
 * Course header + course navigation — shared by every page inside a course
 * (course page and its views, and the workspace), so the student always sees
 * which course they are in, how far along they are, and the same five places.
 *
 * Preview (instructor / admin): the same header labelled "Preview mode", with
 * Manage Course and Edit Course in place of the student's progress, and only the
 * Overview and Contents links (the other views are student pages).
 *
 * Navigation uses existing routes only:
 *   Home → /courses/:id            Contents → /courses/:id/home (workspace)
 *   Simulations · Grades · Resources → /courses/:id?view=… (views of the course page)
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from 'antd';
import {
  HomeOutlined, UnorderedListOutlined, ExperimentOutlined, BarChartOutlined, FolderOpenOutlined, MenuOutlined,
  EyeOutlined, SettingOutlined, EditOutlined,
} from '@ant-design/icons';
import { Chip, ProgressBar, learningStyles as s } from './studentUi';

export type CourseTab = 'home' | 'contents' | 'simulations' | 'grades' | 'resources';

export const COURSE_VIEWS: CourseTab[] = ['simulations', 'grades', 'resources'];

export function courseTabHref(courseId: string, tab: CourseTab): string {
  if (tab === 'home') return `/courses/${courseId}`;
  if (tab === 'contents') return `/courses/${courseId}/home`;
  return `/courses/${courseId}?view=${tab}`;
}

const TABS: { key: CourseTab; label: string; icon: ReactNode }[] = [
  { key: 'home', label: 'Home', icon: <HomeOutlined /> },
  { key: 'contents', label: 'Contents', icon: <UnorderedListOutlined /> },
  { key: 'simulations', label: 'Simulations', icon: <ExperimentOutlined /> },
  { key: 'grades', label: 'Grades', icon: <BarChartOutlined /> },
  { key: 'resources', label: 'Resources', icon: <FolderOpenOutlined /> },
];

export default function CourseShellHeader({
  courseId, title, chips, scope, progress, currentModule, active, onOpenContents, preview = false,
}: {
  courseId: string;
  title: string;
  chips?: ReactNode;
  scope: (string | null | undefined)[];
  progress: { percentage: number; completedLessons: number; totalLessons: number };
  currentModule?: ReactNode;
  active: CourseTab;
  /** Below 992px the Course Contents tree lives in a drawer; this opens it. */
  onOpenContents?: () => void;
  /** Instructor / admin preview of the student workspace. */
  preview?: boolean;
}) {
  const scopeParts = scope.filter(Boolean) as string[];
  const tabs = preview
    ? TABS.filter((t) => t.key === 'home' || t.key === 'contents').map((t) => (t.key === 'home' ? { ...t, label: 'Overview' } : t))
    : TABS;
  return (
    <header className={`${s.panel} ${s.courseShell}`}>
      <div className={s.courseShellTop}>
        <div style={{ minWidth: 0 }}>
          {(chips || preview) && (
            <div className={s.metaRow} style={{ marginBottom: 6 }}>
              {preview && <Chip tone="info" icon={<EyeOutlined />}>Preview mode · students see this view</Chip>}
              {chips}
            </div>
          )}
          <h1 className={s.courseShellTitle}>{title}</h1>
          {scopeParts.length > 0 && (
            <div className={s.metaRow}>
              {scopeParts.map((part, i) => (
                <span key={i} className={`${s.meta} ${i > 0 ? s.dot : ''}`}>{part}</span>
              ))}
            </div>
          )}
        </div>
        {preview ? (
          <div className={s.courseShellProgress}>
            <div className={s.rowActions} style={{ justifyContent: 'flex-start' }}>
              <Link href={`/courses/${courseId}`}><Button size="small" icon={<SettingOutlined />}>Manage Course</Button></Link>
              <Link href={`/courses/${courseId}/edit?tab=builder`}><Button size="small" icon={<EditOutlined />}>Edit Course</Button></Link>
            </div>
            {currentModule && <span className={s.meta}>{currentModule}</span>}
          </div>
        ) : (
          <div className={s.courseShellProgress}>
            <ProgressBar
              percent={progress.percentage}
              label={<><strong>{progress.percentage}%</strong> · {progress.completedLessons} of {progress.totalLessons} activities</>}
            />
            {currentModule && <span className={s.meta}>{currentModule}</span>}
          </div>
        )}
      </div>

      <nav className={s.courseNav} aria-label="Course navigation">
        <div className={s.courseNavLinks}>
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={courseTabHref(courseId, t.key)}
              className={`${s.courseNavLink} ${active === t.key ? s.courseNavActive : ''}`}
              aria-current={active === t.key ? 'page' : undefined}
            >
              {t.icon}
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
        {onOpenContents && (
          <Button className={s.contentsToggle} size="small" icon={<MenuOutlined />} onClick={onOpenContents}>
            Course Contents
          </Button>
        )}
      </nav>
    </header>
  );
}
