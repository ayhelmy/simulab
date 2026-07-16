// SRS §4.7 SIM-01: Simulation card shown in catalog.
// TODO: implement (skeleton only)

import type { Simulation } from '@/types';
import { Card, Tag, Typography } from 'antd';

const { Text } = Typography;

interface SimulationCardProps {
  simulation: Simulation;
}

export default function SimulationCard({ simulation }: SimulationCardProps) {
  return (
    <Card
      cover={simulation.thumbnailUrl ? <img src={simulation.thumbnailUrl} alt={simulation.title} style={{ height: 140, objectFit: 'cover' }} /> : undefined}
      size="small"
    >
      <Text strong style={{ display: 'block', marginBottom: 6 }}>{simulation.title}</Text>
      <Tag color="blue">{simulation.difficulty}</Tag>
      {simulation.estimatedMinutes != null && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>~{simulation.estimatedMinutes} min</Text>
      )}
      {/* TODO: Launch / attempts remaining */}
    </Card>
  );
}
