'use client';

/**
 * Pick one of the courses you manage, then continue with a simulation in that
 * course. Used by the Simulations list and detail pages for:
 *   add       Add to Course  → the course Builder, with the simulation pre-selected
 *   activity  View Activity  → the course's analytics for this simulation
 * Navigation only — no data is written here.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Input, Spin, Alert, Button } from 'antd';
import { SearchOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { listCourses } from '@/lib/courses';
import type { Course } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { Chip, learningStyles as s, type ChipTone } from '@/components/student/studentUi';

export type CoursePickerPurpose = 'add' | 'activity';

const STATUS_TONE: Record<string, ChipTone> = { draft: 'warning', published: 'success', archived: 'neutral' };

const COPY: Record<CoursePickerPurpose, { title: string; intro: string; ok: string }> = {
  add: {
    title: 'Add to Course',
    intro: 'Choose the course to add this simulation to. You’ll pick the module in the course Builder.',
    ok: 'Continue to Builder',
  },
  activity: {
    title: 'View Activity',
    intro: 'Choose the course whose simulation activity you want to see.',
    ok: 'View Activity',
  },
};

export function coursePickerHref(purpose: CoursePickerPurpose, courseId: string, simulationId: string): string {
  return purpose === 'add'
    ? `/courses/${courseId}/edit?tab=builder&addSim=${encodeURIComponent(simulationId)}`
    : `/courses/${courseId}/simulations/${simulationId}/analytics`;
}

export default function CoursePickerModal({
  open, purpose, simulation, onClose,
}: {
  open: boolean;
  purpose: CoursePickerPurpose;
  simulation: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const isAdmin = hasRole('super_admin') || hasRole('institution_admin') || hasRole('dept_manager');

  useEffect(() => {
    if (!open || !user || courses) return;
    // Same request as the Courses page: instructors list only their own courses.
    listCourses({ limit: 50, instructorId: isAdmin ? undefined : user.id })
      .then(({ courses: list }) => setCourses(list.filter((c) => c.status !== 'archived')))
      .catch((e: { detail?: string; title?: string }) => setError(e?.detail ?? e?.title ?? 'Failed to load your courses.'));
  }, [open, user, courses, isAdmin]);

  // Start fresh every time the picker is closed.
  const close = () => { setSelected(null); setSearch(''); onClose(); };

  const copy = COPY[purpose];
  const q = search.trim().toLowerCase();
  const visible = (courses ?? []).filter((c) => !q || c.title.toLowerCase().includes(q));

  const go = () => {
    if (!selected || !simulation) return;
    close();
    router.push(coursePickerHref(purpose, selected, simulation.id));
  };

  return (
    <Modal
      open={open}
      title={copy.title}
      onCancel={close}
      width={560}
      destroyOnHidden
      rootClassName={s.page}
      footer={
        <div className={s.modalFooter}>
          <Button onClick={close}>Cancel</Button>
          <Button type="primary" disabled={!selected} onClick={go}>{copy.ok}</Button>
        </div>
      }
    >
      {simulation && (
        <p className={s.modalHelp} style={{ marginTop: 0 }}>
          <strong style={{ color: 'var(--sl-text-primary)' }}>{simulation.title}</strong> · {copy.intro}
        </p>
      )}

      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : !courses ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : courses.length === 0 ? (
        <EmptyState description="You don’t manage any active courses yet." />
      ) : (
        <>
          {courses.length > 6 && (
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search your courses"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 10 }}
              aria-label="Search your courses"
            />
          )}
          <div className={s.pickerList} role="radiogroup" aria-label="Your courses">
            {visible.map((c) => {
              const active = selected === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${s.pickerItem} ${active ? s.pickerItemActive : ''}`}
                  onClick={() => setSelected(c.id)}
                >
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className={s.pickerTitle}>{c.title}</span>
                    <span className={s.meta}>
                      {[c.departmentName, c.semesterTermName].filter(Boolean).join(' · ') || 'Interactive Simulation Course'}
                    </span>
                  </span>
                  <Chip tone={STATUS_TONE[c.status] ?? 'neutral'} className={s.chipSm} style={{ textTransform: 'capitalize' }}>
                    {c.status}
                  </Chip>
                  {active && <CheckCircleFilled className={s.pickerCheck} aria-hidden />}
                </button>
              );
            })}
            {!visible.length && <p className={s.meta}>No courses match “{search}”.</p>}
          </div>
        </>
      )}
    </Modal>
  );
}
