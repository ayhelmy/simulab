'use client';

import { Card, Tag, Progress, Space, Typography, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  ExperimentDashboardStudent, ExperimentStudentAttempt, ExperimentStepStatus, ExperimentQuestionResult,
} from '@/lib/experiments';

const { Text } = Typography;

const STEP_COLOR: Record<ExperimentStepStatus['status'], string> = {
  completed: '#059669',
  started: '#5C98B7',
  retried: '#D97706',
  failed: '#DC2626',
  pending: '#DDDEDF',
};

const STATUS_TAG: Record<ExperimentStudentAttempt['status'], { color: string; label: string }> = {
  completed: { color: 'success', label: 'Completed' },
  active: { color: 'processing', label: 'In progress' },
  aborted: { color: 'error', label: 'Aborted' },
};

const RESULT_TAG: Record<ExperimentQuestionResult['result'], { color: string; label: string }> = {
  correct: { color: 'success', label: 'Correct' },
  incorrect: { color: 'error', label: 'Incorrect' },
  pending: { color: 'default', label: 'Pending' },
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '–';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function StepStrip({ steps }: { steps: ExperimentStepStatus[] }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', margin: '10px 0' }}>
      {steps.map((s) => (
        <Tooltip
          key={s.stepNumber}
          title={`Step ${s.stepNumber}${s.required ? '' : ' (extra)'} — ${s.status}${s.durationSeconds != null ? ` · ${formatDuration(s.durationSeconds)}` : ''}`}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 4, background: STEP_COLOR[s.status],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: s.status === 'pending' ? '#6B7280' : '#fff',
            border: s.required ? 'none' : '1px dashed rgba(0,0,0,0.15)',
          }}>
            {s.stepNumber}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

function BarRow({ label, num, denom }: { label: string; num: number; denom: number }) {
  const pct = denom ? Math.round((100 * num) / denom) : 0;
  return (
    <Space size={8} style={{ width: '100%', marginBottom: 4 }}>
      <Text style={{ fontSize: 12, width: 64 }} type="secondary">{label}</Text>
      <Progress percent={pct} size="small" style={{ width: 140 }} showInfo={false} />
      <Text style={{ fontSize: 12 }}>{num}/{denom}</Text>
    </Space>
  );
}

function AttemptBlock({ attempt }: { attempt: ExperimentStudentAttempt }) {
  const requiredSteps = attempt.steps.filter((s) => s.required);
  const stepsCompleted = requiredSteps.filter((s) => s.status === 'completed').length;
  const requiredQuestions = attempt.questions.filter((q) => q.required);
  const questionsCorrect = requiredQuestions.filter((q) => q.result === 'correct').length;

  const questionCols: ColumnsType<ExperimentQuestionResult> = [
    { title: 'Question', dataIndex: 'questionId', render: (v: string, row) => <Space>{v}{row.required && <Tag color="blue">required</Tag>}</Space> },
    { title: 'Attempts', dataIndex: 'latestAttempt', width: 80, align: 'right' as const },
    { title: 'Answer', dataIndex: 'answer', width: 100, render: (v: string | null) => v ?? <Text type="secondary">–</Text> },
    { title: 'Result', dataIndex: 'result', width: 90, render: (r: ExperimentQuestionResult['result']) => <Tag color={RESULT_TAG[r].color}>{RESULT_TAG[r].label}</Tag> },
  ];

  return (
    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 10, marginTop: 10 }}>
      <Space align="center" wrap>
        <Tag color={STATUS_TAG[attempt.status].color}>{STATUS_TAG[attempt.status].label}</Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(attempt.startedAt).toLocaleString()} · {formatDuration(attempt.durationSeconds)}
        </Text>
        <Text style={{ fontSize: 12, color: '#059669' }}>✓ {attempt.correctAnswers}</Text>
        <Text style={{ fontSize: 12, color: '#DC2626' }}>✗ {attempt.wrongAnswers}</Text>
      </Space>
      <StepStrip steps={attempt.steps} />
      <BarRow label="Steps" num={stepsCompleted} denom={requiredSteps.length} />
      <BarRow label="Questions" num={questionsCorrect} denom={requiredQuestions.length} />
      {attempt.questions.length > 0 && (
        <Table<ExperimentQuestionResult>
          dataSource={attempt.questions}
          columns={questionCols}
          rowKey="questionId"
          size="small"
          pagination={false}
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}

export default function StudentExperimentCard({ student }: { student: ExperimentDashboardStudent }) {
  return (
    <Card size="small" style={{ borderRadius: 12 }}>
      <div>
        <Text strong style={{ fontSize: 14 }}>{student.name}</Text>
        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{student.email}</Text>
      </div>
      {student.attempts.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>Not started yet.</Text>
      ) : (
        student.attempts.map((a) => <AttemptBlock key={a.experimentAttemptId} attempt={a} />)
      )}
    </Card>
  );
}
