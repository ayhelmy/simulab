'use client';

import { useEffect, useState } from 'react';
import { Modal, Input, Spin, Alert, Typography, App } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import {
  deleteSimulation, getSimulationDeleteImpact, type SimulationDeleteImpact,
} from '@/lib/simulations';
import type { Simulation } from '@/types';

const { Text, Paragraph } = Typography;

/**
 * Permanent simulation delete (super_admin). Shows what the delete touches —
 * catalogs it is unassigned from, course lessons that get detached, recorded
 * sessions/scores — and requires typing the title before enabling Delete.
 */
export default function DeleteSimulationModal({
  sim, onClose, onDeleted,
}: {
  sim: Simulation | null;
  onClose: () => void;
  onDeleted: (sim: Simulation) => void;
}) {
  const { message } = App.useApp();
  const [impact, setImpact] = useState<SimulationDeleteImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!sim) return;
    setImpact(null);
    setLoadError(null);
    setConfirmText('');
    getSimulationDeleteImpact(sim.id)
      .then(setImpact)
      .catch((err: { title?: string; detail?: string }) =>
        setLoadError(err.title ?? err.detail ?? 'Could not load what this delete affects.'));
  }, [sim]);

  async function handleDelete() {
    if (!sim) return;
    setDeleting(true);
    try {
      await deleteSimulation(sim.id);
      message.success(`"${sim.title}" was permanently deleted.`);
      onDeleted(sim);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to delete simulation');
    } finally {
      setDeleting(false);
    }
  }

  const titleMatches = !!sim && confirmText.trim() === sim.title.trim();

  return (
    <Modal
      open={!!sim}
      title={<span><ExclamationCircleFilled style={{ color: '#cf1322', marginRight: 8 }} />Delete simulation permanently?</span>}
      okText="Delete permanently"
      okButtonProps={{ danger: true, disabled: !impact || !titleMatches, loading: deleting }}
      cancelButtonProps={{ disabled: deleting }}
      onOk={handleDelete}
      onCancel={onClose}
      maskClosable={!deleting}
      destroyOnHidden
    >
      {loadError && <Alert type="error" showIcon title={loadError} />}
      {!loadError && !impact && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}
      {impact && sim && (
        <>
          <Paragraph>
            <Text strong>{sim.title}</Text> will be removed from the database together with its WebGL build files.
            This cannot be undone.
          </Paragraph>

          <Paragraph style={{ marginBottom: 4 }}>
            <Text strong>Unassigned from {impact.catalogs.length} catalog{impact.catalogs.length === 1 ? '' : 's'}</Text>
          </Paragraph>
          {impact.catalogs.length > 0 && (
            <ul style={{ marginTop: 0 }}>{impact.catalogs.map((c) => <li key={c.id}>{c.name}</li>)}</ul>
          )}

          <Paragraph style={{ marginBottom: 4 }}>
            <Text strong>Detached from lessons in {impact.courses.length} course{impact.courses.length === 1 ? '' : 's'}</Text>
            {impact.courses.length > 0 && <Text type="secondary"> (the lessons stay but will have no simulation)</Text>}
          </Paragraph>
          {impact.courses.length > 0 && (
            <ul style={{ marginTop: 0 }}>
              {impact.courses.map((c) => (
                <li key={c.id}>{c.title} — {c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'}</li>
              ))}
            </ul>
          )}

          <Paragraph>
            <Text strong>Deleted learner data:</Text> {impact.sessionCount} session{impact.sessionCount === 1 ? '' : 's'},{' '}
            {impact.scoreCount} score{impact.scoreCount === 1 ? '' : 's'} and their tracking events.
          </Paragraph>

          <Paragraph style={{ marginBottom: 6 }}>
            Type <Text code>{sim.title}</Text> to confirm:
          </Paragraph>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onPressEnter={() => { if (titleMatches && !deleting) handleDelete(); }}
            placeholder={sim.title}
            disabled={deleting}
            autoFocus
          />
        </>
      )}
    </Modal>
  );
}
