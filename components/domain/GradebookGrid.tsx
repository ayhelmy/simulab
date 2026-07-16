'use client';

/**
 * Spreadsheet-style gradebook grid.
 * SRS §4.8 GRD-01: displays grade items as columns, students as rows.
 * TODO: implement with virtualized table (skeleton only)
 */

import type { GradeItem, Grade, User } from '@/types';

interface GradebookGridProps {
  gradeItems: GradeItem[];
  students: User[];
  grades: Grade[];
}

export default function GradebookGrid({ gradeItems, students, grades }: GradebookGridProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            {gradeItems.map((item) => <th key={item.id}>{item.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.firstName} {s.lastName}</td>
              {gradeItems.map((item) => {
                const g = grades.find((gr) => gr.gradeItemId === item.id && gr.userId === s.id);
                return <td key={item.id}>{g?.score ?? '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
