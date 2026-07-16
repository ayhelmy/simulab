// SRS §4.5 CRS-01: Course card shown in catalog and dashboard.
// TODO: implement (skeleton only)

import type { Course } from '@/types';
import { Card, Tag, Progress, Typography } from 'antd';

const { Text } = Typography;

interface CourseCardProps {
  course: Course;
  completionPct?: number;
}

export default function CourseCard({ course, completionPct }: CourseCardProps) {
  return (
    <Card
      cover={course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} style={{ height: 140, objectFit: 'cover' }} /> : undefined}
      size="small"
    >
      <Text strong style={{ display: 'block', marginBottom: 6 }}>{course.title}</Text>
      <Tag color={course.status === 'published' ? 'green' : 'default'}>{course.status}</Tag>
      {completionPct != null && (
        <Progress percent={completionPct} size="small" style={{ marginTop: 8 }} />
      )}
      {/* TODO: enroll/continue button based on enrollment status */}
    </Card>
  );
}
