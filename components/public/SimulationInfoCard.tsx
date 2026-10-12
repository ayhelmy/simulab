'use client';

import { useRouter } from 'next/navigation';
import { PlayCircleOutlined, LockOutlined } from '@ant-design/icons';
import type { SimulationDetail } from '@/types';
import { colors, cardStyle } from '@/components/home/homeTheme';
import PlaceholderPanel from '@/components/home/PlaceholderPanel';
import LearningObjectives from './LearningObjectives';

interface Props {
  simulation: SimulationDetail;
  isAuthenticated: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ fontSize: 13.5, color: colors.body }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: colors.heading }}>{value}</span>
    </div>
  );
}

export default function SimulationInfoCard({ simulation, isAuthenticated }: Props) {
  const router = useRouter();
  const isDemo = simulation.visibility === 'demo_public' || simulation.visibility === 'demo_and_institution';

  return (
    <section style={{ ...cardStyle, background: colors.bgAlt, padding: '24px 28px', marginBottom: 24 }} aria-label="Simulation information">
      <div className="sim-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 32, alignItems: 'start' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.heading, margin: '0 0 14px' }}>
            Simulation Info
          </h2>

          <div style={{ marginBottom: 20 }}>
            {simulation.discipline && <InfoRow label="Discipline" value={simulation.discipline} />}
            <InfoRow label="Topic" value={simulation.title} />
            {simulation.estimatedMinutes != null && <InfoRow label="Duration" value={`${simulation.estimatedMinutes} min`} />}
            <InfoRow label="Difficulty" value={DIFFICULTY_LABEL[simulation.difficulty] ?? simulation.difficulty} />
            {simulation.version && <InfoRow label="Version" value={`v${simulation.version}`} />}
          </div>

          <LearningObjectives objectives={simulation.learningObjectives ?? []} />

          {isDemo ? (
            <button
              type="button"
              disabled={true}
              onClick={() => router.push(`/sim/${simulation.id}/play`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: colors.primary, color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 24px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', 
              }}
            >
              <PlayCircleOutlined /> Start Demo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => isAuthenticated
                ? router.push('/dashboard')
                : router.push(`/login?next=${encodeURIComponent(`/sim/${simulation.id}`)}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: colors.primary, color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 24px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {isAuthenticated ? <PlayCircleOutlined /> : <LockOutlined />}
              {isAuthenticated ? 'Go to Dashboard' : 'Log In to Access'}
            </button>
          )}
        </div>

        <PlaceholderPanel
          src={simulation.thumbnailUrl}
          alt={`${simulation.title} preview`}
          aspectRatio="16 / 9"
          borderRadius={14}
        />
      </div>
    </section>
  );
}
