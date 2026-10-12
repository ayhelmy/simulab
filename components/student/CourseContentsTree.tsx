'use client';

/**
 * Course Contents tree — the persistent right-hand navigation shared by the
 * course page (/courses/:id) and the course workspace (/courses/:id/home), so
 * the tree stays in the same place and only the highlighted activity changes.
 *
 * Modules are parent nodes (state icon · title · done/total); activities are
 * indented children. Only the module holding the highlighted activity starts
 * open; the student can toggle any module.
 */

import { useState } from 'react';
import type { JourneyLesson, JourneyModule } from '@/types';
import {
  BookOutlined, CheckCircleFilled, LockOutlined, PlayCircleFilled, RightOutlined,
} from '@ant-design/icons';
import {
  LESSON_TYPE_LABEL, formatMinutes, lessonTypeIcon, lockMessage, learningStyles as s,
} from './studentUi';

export interface CourseContentsTreeProps {
  modules: JourneyModule[];
  /** The highlighted activity (orange). */
  currentLessonId: string | null;
  /** Label above the highlighted activity: "Now viewing" in the workspace, "Up next" on the course page. */
  currentLabel?: string;
  /** Recommended next activity, marked "Up next" when it isn't the highlighted one. */
  upNextId?: string | null;
  onSelectLesson: (lesson: JourneyLesson, module: JourneyModule) => void;
  showTitle?: boolean;
  /** Instructor preview: structure only — no completion marks or counts. */
  preview?: boolean;
}

export default function CourseContentsTree({
  modules, currentLessonId, currentLabel = 'Now viewing', upNextId = null, onSelectLesson, showTitle = true,
  preview = false,
}: CourseContentsTreeProps) {
  // Default: only the module holding the highlighted activity (or the up-next one) is open.
  const focusId = currentLessonId ?? upNextId;
  const focusModule = modules.find(m => m.lessons.some(l => l.id === focusId));
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isModuleOpen = (id: string) => overrides[id] ?? id === focusModule?.id;
  const toggle = (id: string) => setOverrides(prev => ({ ...prev, [id]: !isModuleOpen(id) }));

  const all = modules.flatMap(m => m.lessons);
  // The viewer's own completion; a preview shows the course structure only.
  const isDone = (l: JourneyLesson) => !preview && l.completionStatus === 'completed';
  const completed = all.filter(isDone).length;

  return (
    <>
      {/* Course progress lives in the course header; the tree head just counts. */}
      <div className={s.treeHead}>
        {showTitle && <h2 className={s.sectionTitle}>Course Contents</h2>}
        <span className={s.treeHeadCount}>
          {preview ? `${all.length} activit${all.length !== 1 ? 'ies' : 'y'}` : `${completed} of ${all.length} completed`}
        </span>
      </div>

      <nav className={s.treeScroll} aria-label="Course contents">
        {modules.map((mod) => {
          const done = mod.lessons.filter(isDone).length;
          const allDone = mod.lessons.length > 0 && done === mod.lessons.length;
          const isOpen = isModuleOpen(mod.id);
          const isFocus = mod.id === focusModule?.id;
          const listId = `tree-${mod.id}`;
          const opens = mod.isLocked ? lockMessage(mod.unlockAt, true) : null;
          return (
            <div
              key={mod.id}
              className={[s.treeModule, mod.isLocked ? s.treeModuleLocked : '', isFocus ? s.treeModuleFocus : ''].join(' ')}
            >
              <button
                type="button"
                className={s.treeModuleHead}
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => toggle(mod.id)}
              >
                <RightOutlined className={`${s.chevron} ${isOpen ? s.chevronOpen : ''}`} />
                <span className={s.treeModuleIcon} aria-hidden>
                  {mod.isLocked
                    ? <LockOutlined style={{ color: 'var(--sl-text-muted)' }} />
                    : allDone
                      ? <CheckCircleFilled style={{ color: 'var(--sl-success)' }} />
                      : <BookOutlined style={{ color: 'var(--sl-secondary)' }} />}
                </span>
                <span className={s.treeModuleTitle}>
                  {mod.title}
                  {opens && opens !== 'Locked' && <span className={s.treeModuleNote}>{opens}</span>}
                </span>
                {preview ? (
                  <span className={s.treeModuleCount} aria-label={`${mod.lessons.length} activities`}>{mod.lessons.length}</span>
                ) : (
                  <span className={s.treeModuleCount} aria-label={`${done} of ${mod.lessons.length} completed`}>
                    {done}/{mod.lessons.length}
                  </span>
                )}
              </button>

              {isOpen && (
                <ul id={listId} className={s.treeLessons}>
                  {mod.lessons.length === 0 ? (
                    <li className={s.meta} style={{ padding: '4px 10px' }}>No activities</li>
                  ) : (
                    mod.lessons.map((lesson) => {
                      const isCurrent = lesson.id === currentLessonId;
                      const isCompleted = isDone(lesson);
                      const isLocked = lesson.isLocked;
                      const isUpNext = !isCurrent && lesson.id === upNextId;
                      return (
                        <li key={lesson.id}>
                          {/* Locked items stay selectable so the student can read why. */}
                          <button
                            type="button"
                            aria-current={isCurrent ? 'step' : undefined}
                            onClick={() => onSelectLesson(lesson, mod)}
                            className={[
                              s.treeLesson,
                              isCurrent ? s.treeLessonCurrent : '',
                              isCompleted ? s.treeLessonDone : '',
                              isLocked ? s.treeLessonLocked : '',
                            ].join(' ')}
                          >
                            <span className={s.treeLessonIcon} aria-hidden>
                              {isLocked
                                ? <LockOutlined style={{ color: 'var(--sl-text-muted)' }} />
                                : isCompleted
                                  ? <CheckCircleFilled style={{ color: 'var(--sl-success)' }} />
                                  : isCurrent
                                    ? <PlayCircleFilled style={{ color: 'var(--sl-primary)' }} />
                                    // Simulations read blue (technical); quizzes and content gray.
                                    : lessonTypeIcon(lesson.lessonMode, {
                                      color: lesson.lessonMode.includes('simulation') ? 'var(--sl-secondary)' : 'var(--sl-text-secondary)',
                                    })}
                            </span>
                            <span className={s.treeLessonText}>
                              {isCurrent && <span className={s.treeNowLabel}>{currentLabel}</span>}
                              {isUpNext && <span className={s.treeUpNextLabel}>Up next</span>}
                              <span className={s.treeLessonTitle}>{lesson.title}</span>
                              <span className={s.treeLessonMeta}>
                                <span className={lesson.lessonMode.includes('simulation') ? s.treeSimType : undefined}>
                                  {LESSON_TYPE_LABEL[lesson.lessonMode]}
                                </span>
                                {lesson.estimatedMinutes != null && <span className={s.dot}>{formatMinutes(lesson.estimatedMinutes)}</span>}
                                {isLocked
                                  ? <span className={s.dot}>{lockMessage(mod.unlockAt, true)}</span>
                                  : isCompleted
                                    ? <span className={`${s.dot} ${s.treeDoneText}`}>Completed</span>
                                    : lesson.isRequired && <span className={`${s.dot} ${s.treeRequired}`}>Required</span>}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
