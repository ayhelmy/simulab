'use client';

import { useState, useRef } from 'react';
import { importValidate, importConfirm } from '@/lib/users';
import type { ImportPreview, ImportResult } from '@/lib/users';
import {
  Modal, Button, Upload, Alert, Tag, Typography, Space, Steps,
  Statistic, Row, Col,
} from 'antd';
import { InboxOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface Props {
  onClose:   () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ onClose, onSuccess }: Props) {
  const [step, setStep]         = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [preview, setPreview]   = useState<ImportPreview | null>(null);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const selectedFile = fileList[0]?.originFileObj as File | undefined;

  async function handleValidate() {
    if (!selectedFile) { setError('Please select a CSV file.'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await importValidate(selectedFile);
      setPreview(data);
      setStep(1);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to parse CSV');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview?.valid.length) return;
    setLoading(true);
    setError(null);
    try {
      const data = await importConfirm(preview.valid);
      setResult(data);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { title?: string };
      setError(e.title ?? 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { title: 'Upload CSV' },
    { title: 'Preview' },
    { title: 'Done' },
  ];

  function renderFooter() {
    if (step === 0) return [
      <Button key="cancel" onClick={onClose}>Cancel</Button>,
      <Button key="validate" type="primary" loading={loading} disabled={!selectedFile} onClick={handleValidate}>
        Validate CSV
      </Button>,
    ];
    if (step === 1) return [
      <Button key="back" onClick={() => { setStep(0); setPreview(null); }}>← Back</Button>,
      <Button key="import" type="primary" loading={loading} disabled={!preview?.valid.length} onClick={handleConfirm}>
        Import {preview?.valid.length ?? 0} Users
      </Button>,
    ];
    return [
      <Button key="done" type="primary" onClick={onSuccess}>Done</Button>,
    ];
  }

  return (
    <Modal
      open
      title="Bulk Import Users"
      onCancel={onClose}
      footer={renderFooter()}
      width={580}
      destroyOnHidden
    >
      <Steps current={step} items={steps} size="small" style={{ marginBottom: 24 }} />

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      {/* Step 0: Upload */}
      {step === 0 && (
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            Upload a CSV with columns: <code>email, firstName, lastName, role</code>
          </Paragraph>
          <Dragger
            accept=".csv,text/csv"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => { setFileList(fl); setError(null); }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Click or drag a CSV file here</p>
            <p className="ant-upload-hint">Max 5 MB · email, firstName, lastName, role</p>
          </Dragger>
        </Space>
      )}

      {/* Step 1: Preview */}
      {step === 1 && preview && (
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col span={8}>
              <Statistic title="Total Rows" value={preview.summary.total} />
            </Col>
            <Col span={8}>
              <Statistic title="Valid" value={preview.summary.validCount} styles={{ content: { color: '#059669' } }} />
            </Col>
            <Col span={8}>
              <Statistic title="Errors" value={preview.summary.errorCount} styles={{ content: { color: '#DC2626' } }} />
            </Col>
          </Row>

          {preview.errors.length > 0 && (
            <div>
              <Text type="danger" strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                <WarningOutlined /> {preview.errors.length} row{preview.errors.length > 1 ? 's' : ''} will be skipped
              </Text>
              <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #FECACA', borderRadius: 6, padding: 8 }}>
                {preview.errors.map((e) => (
                  <div key={e.row} style={{ fontSize: 12, color: '#374151', padding: '2px 0', borderBottom: '1px solid #FEE2E2' }}>
                    <strong>Row {e.row}</strong> {e.email ? `(${e.email})` : ''}: {e.errors.join('; ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.valid.length > 0 && (
            <div>
              <Text style={{ color: '#059669', fontSize: 13, display: 'block', marginBottom: 6 }} strong>
                <CheckCircleOutlined /> {preview.valid.length} user{preview.valid.length > 1 ? 's' : ''} ready to import
              </Text>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #A7F3D0', borderRadius: 6, padding: 8 }}>
                {preview.valid.map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #D1FAE5' }}>
                    <span><strong>{row.firstName} {row.lastName}</strong> — {row.email}</span>
                    <Tag color="blue" style={{ margin: 0 }}>{row.role}</Tag>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Space>
      )}

      {/* Step 2: Done */}
      {step === 2 && result && (
        <Space orientation="vertical" style={{ width: '100%', textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#059669' }} />
          <Text strong style={{ fontSize: 18, color: '#059669', display: 'block' }}>Import Complete</Text>
          <Row gutter={24} justify="center">
            <Col>
              <Statistic title="Created" value={result.created.length} styles={{ content: { color: '#059669' } }} />
            </Col>
            <Col>
              <Statistic title="Failed" value={result.failed.length} styles={{ content: { color: '#DC2626' } }} />
            </Col>
          </Row>
          {result.failed.length > 0 && (
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #FECACA', borderRadius: 6, padding: 8 }}>
              {result.failed.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0' }}>
                  {f.email}: {f.error}
                </div>
              ))}
            </div>
          )}
        </Space>
      )}
    </Modal>
  );
}
