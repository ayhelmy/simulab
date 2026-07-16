'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Tag, Button, Typography, Space, Tooltip, Image } from 'antd';
import {
  ClockCircleOutlined, ExperimentOutlined, PlayCircleOutlined,
  LockOutlined, StarOutlined,
} from '@ant-design/icons';
import type { Simulation } from '@/types';

const { Title, Paragraph, Text } = Typography;

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner:     '#52c41a',
  intermediate: '#1677ff',
  advanced:     '#f5222d',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

interface Props {
  simulation: Simulation;
  isAuthenticated: boolean;
}

export default function SimulationCard({ simulation, isAuthenticated }: Props) {
  const router = useRouter();
  const isDemo = simulation.visibility === 'demo_public' || simulation.visibility === "demo_and_institution";

  function handleViewDetails() {
    router.push(`/sim/${simulation.id}`);
  }

  return (
    <Card
      className="sim-result-card"
      hoverable
      onClick={handleViewDetails}
      role="article"
      aria-label={simulation.title}
      styles={{ body: { padding: 0 } }}
    >
      <div className="sim-card-inner">
        {/* Thumbnail */}
        <div className="sim-card-thumb">
          {simulation.thumbnailUrl ? (
            <Image
              src={simulation.thumbnailUrl}
              alt={`${simulation.title} preview`}
              width="100%"
              height="100%"
              style={{ objectFit: 'cover' }}
              preview={false}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='160'%3E%3Crect width='240' height='160' fill='%23FEF3E2'/%3E%3Ccircle cx='120' cy='70' r='28' fill='%23F59324' opacity='.15'/%3E%3Cpath d='M110 65l20 10-20 10V65z' fill='%23F59324' opacity='.4'/%3E%3C/svg%3E"
            />
          ) : (
            <div className="sim-card-thumb-placeholder" aria-hidden="true">
              <ExperimentOutlined style={{ fontSize: 36, color: '#F59324', opacity: 0.35 }} />
            </div>
          )}

          {isDemo && (
            <span className="sim-card-demo-badge" aria-label="Demo available">
              Demo
            </span>
          )}
        </div>

        {/* Content */}
        <div className="sim-card-content">
          <div className="sim-card-header">
            <Title level={5} className="sim-card-title" ellipsis={{ rows: 2 }}>
              {simulation.title}
            </Title>

            {simulation.buildStatus === 'ready' || simulation.launchType === 'webgl' ? (
              <Tooltip title="WebGL Simulation">
                <span className="sim-card-type-badge">WebGL</span>
              </Tooltip>
            ) : null}
          </div>

          {simulation.description && (
            <Paragraph
              className="sim-card-description"
              ellipsis={{ rows: 2 }}
            >
              {simulation.description}
            </Paragraph>
          )}

          {/* Learning objectives preview */}
          {simulation.learningObjectives?.length > 0 && (
            <Text className="sim-card-objectives">
              <StarOutlined style={{ marginRight: 4, color: '#D97706' }} />
              {simulation.learningObjectives.slice(0, 2).join(' · ')}
            </Text>
          )}

          {/* Meta tags */}
          <div className="sim-card-tags">
            {simulation.estimatedMinutes && (
              <Tag icon={<ClockCircleOutlined />} className="sim-tag-meta">
                {simulation.estimatedMinutes} min
              </Tag>
            )}

            <Tag
              color={DIFFICULTY_COLOR[simulation.difficulty] ?? '#1677ff'}
              className="sim-tag-difficulty"
            >
              {DIFFICULTY_LABEL[simulation.difficulty] ?? simulation.difficulty}
            </Tag>

            {simulation.visibility === 'demo_public' && (
              <Tag color="#F59324" className="sim-tag-visibility">
                Public Demo
              </Tag>
            )}
          </div>

          {/* Actions */}
          <div className="sim-card-actions" onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              onClick={handleViewDetails}
              className="sim-btn-details"
            >
              View Details
            </Button>

            {isDemo ? (
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={(e) => { e.stopPropagation(); router.push(`/sim/${simulation.id}`); }}
                className="sim-btn-demo"
              >
                Preview
              </Button>
            ) : !isAuthenticated ? (
              <Button
                size="small"
                icon={<LockOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/login?next=${encodeURIComponent(`/sim/${simulation.id}`)}`);
                }}
                className="sim-btn-login"
              >
                Login to Access
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
