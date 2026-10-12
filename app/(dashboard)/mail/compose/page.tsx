'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  App, Form, Input, Select, Button, Upload, Spin,
} from 'antd';
import { SendOutlined, SaveOutlined, PaperClipOutlined, ArrowLeftOutlined, CloseOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  compose, saveDraft, updateDraft, sendDraft, forward, getMessage, listRecipients, uploadAttachment,
} from '@/lib/mail';
import { listCourses } from '@/lib/courses';
import type { MailAttachment, MessageableUser, Course } from '@/types';
import { mailStyles as m, MAIL_COPY, formatFileSize, useMailRole } from '@/components/mail/mailUi';

export default function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message: toast } = App.useApp();
  const role = useMailRole();

  const draftId = searchParams.get('draftId');
  const forwardId = searchParams.get('forwardId');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!!(draftId || forwardId));
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<MessageableUser[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<MessageableUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);

  useEffect(() => {
    listCourses({ limit: 100 }).then((res) => setCourses(res.courses)).catch(() => {});
  }, []);

  const searchRecipients = useCallback(async (q: string) => {
    try {
      const results = await listRecipients({ search: q, limit: 20 });
      setRecipientOptions(results);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { searchRecipients(''); }, [searchRecipients]);

  useEffect(() => {
    async function loadExisting() {
      try {
        if (draftId) {
          const draft = await getMessage(draftId);
          form.setFieldsValue({
            subject: draft.subject === '(no subject)' ? '' : draft.subject,
            body: draft.body,
            courseId: draft.courseId ?? undefined,
            to: draft.to.map((r) => r.userId),
            cc: draft.cc.map((r) => r.userId),
            bcc: draft.bcc?.map((r) => r.userId) ?? [],
          });
          setSelectedRecipients([...draft.to, ...draft.cc, ...(draft.bcc ?? [])].map((r) => ({
            id: r.userId, firstName: r.firstName, lastName: r.lastName, email: '',
          })));
          setAttachments(draft.attachments ?? []);
          if (draft.cc.length || (draft.bcc?.length ?? 0)) setShowCcBcc(true);
        } else if (forwardId) {
          const original = await getMessage(forwardId);
          form.setFieldsValue({
            subject: original.subject.startsWith('Fwd: ') ? original.subject : `Fwd: ${original.subject}`,
            body: `\n\n---------- Forwarded message ----------\nFrom: ${original.sender ? `${original.sender.firstName} ${original.sender.lastName}` : ''}\nDate: ${new Date(original.sentAt ?? original.createdAt).toLocaleString()}\nSubject: ${original.subject}\n\n${original.body}`,
            courseId: original.courseId ?? undefined,
          });
        }
      } catch {
        toast.error('Failed to load message.');
      } finally {
        setLoading(false);
      }
    }
    if (draftId || forwardId) loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, forwardId]);

  function recipientMap() {
    return new Map([...selectedRecipients, ...recipientOptions].map((u) => [u.id, u]));
  }

  async function handleUpload(file: File) {
    try {
      const uploaded = await uploadAttachment(file);
      setAttachments((prev) => [...prev, uploaded]);
    } catch {
      toast.error('Failed to upload attachment.');
    }
    return false; // prevent antd Upload's default XHR submit
  }

  async function handleSaveDraft() {
    const values = form.getFieldsValue();
    setSaving(true);
    try {
      const data = {
        to: values.to ?? [], cc: values.cc ?? [], bcc: values.bcc ?? [],
        subject: values.subject, body: values.body ?? '', courseId: values.courseId,
        attachments,
      };
      if (draftId) {
        await updateDraft(draftId, data);
        toast.success('Draft updated.');
      } else {
        const created = await saveDraft(data);
        toast.success('Draft saved.');
        router.replace(`/mail/compose?draftId=${created.id}`);
      }
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      toast.error(e.title ?? e.detail ?? 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    try {
      const values = await form.validateFields();
      setSending(true);
      if (forwardId) {
        await forward(forwardId, {
          to: values.to ?? [], cc: values.cc ?? [], bcc: values.bcc ?? [],
          subject: values.subject, body: values.body, courseId: values.courseId, attachments,
        });
      } else if (draftId) {
        await updateDraft(draftId, {
          to: values.to ?? [], cc: values.cc ?? [], bcc: values.bcc ?? [],
          subject: values.subject, body: values.body, courseId: values.courseId, attachments,
        });
        await sendDraft(draftId);
      } else {
        await compose({
          to: values.to ?? [], cc: values.cc ?? [], bcc: values.bcc ?? [],
          subject: values.subject, body: values.body, courseId: values.courseId, attachments,
        });
      }
      toast.success('Message sent.');
      router.push('/mail/sent');
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string; errorFields?: unknown };
      if (!e.errorFields) toast.error(e.title ?? e.detail ?? 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className={m.loadingPane}><Spin size="large" /></div>;

  const recipientSelectOptions = [...recipientMap().values()].map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/mail/inbox'));
  const heading = forwardId ? 'Forward message' : draftId ? 'Edit draft' : 'New message';

  return (
    <section aria-labelledby="compose-title">
      <button type="button" className={m.backLink} onClick={goBack}>
        <ArrowLeftOutlined /> Back
      </button>

      <header className={m.composeHead}>
        <h2 className={m.detailTitle} id="compose-title">{heading}</h2>
        <p className={m.composeHelper}>{MAIL_COPY[role].composeHelper}</p>
      </header>

      <Form form={form} layout="vertical" requiredMark={false} className={m.composeForm}>
        <Form.Item
          label={
            <span className={m.labelRow}>
              To
              {!showCcBcc && (
                <button type="button" className={m.labelLink} onClick={() => setShowCcBcc(true)}>Add Cc/Bcc</button>
              )}
            </span>
          }
          name="to"
          rules={[{ required: true, message: 'At least one recipient is required.' }]}
        >
          <Select
            mode="multiple"
            placeholder="Search people by name…"
            filterOption={false}
            onSearch={searchRecipients}
            options={recipientSelectOptions}
            onChange={(ids: string[]) => {
              const map = recipientMap();
              setSelectedRecipients(ids.map((id) => map.get(id)).filter((u): u is MessageableUser => !!u));
            }}
          />
        </Form.Item>

        {showCcBcc && (
          <>
            <Form.Item label="Cc" name="cc">
              <Select mode="multiple" placeholder="Cc recipients" filterOption={false} onSearch={searchRecipients} options={recipientSelectOptions} />
            </Form.Item>
            <Form.Item label="Bcc" name="bcc">
              <Select mode="multiple" placeholder="Bcc recipients" filterOption={false} onSearch={searchRecipients} options={recipientSelectOptions} />
            </Form.Item>
          </>
        )}

        <Form.Item
          label={<span>Course / context <span className={m.optional}>(optional)</span></span>}
          name="courseId"
          extra="Linking a course shows the course badge on the message."
        >
          <Select
            allowClear
            placeholder="No related course"
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item label="Subject" name="subject">
          <Input placeholder="What is this message about?" maxLength={255} />
        </Form.Item>

        <Form.Item label="Message" name="body" rules={[{ required: true, message: 'Message body is required.' }]}>
          <Input.TextArea rows={10} placeholder="Write your message…" />
        </Form.Item>

        <Form.Item label={<span>Attachments <span className={m.optional}>(optional)</span></span>}>
          <Upload beforeUpload={handleUpload} fileList={uploadingFiles} onChange={({ fileList }) => setUploadingFiles(fileList)} showUploadList={false}>
            <Button icon={<PaperClipOutlined />}>Attach file</Button>
          </Upload>
          {attachments.length > 0 && (
            <div className={m.attachList}>
              {attachments.map((a, i) => (
                <span key={i} className={m.attachChip}>
                  <PaperClipOutlined className={m.fileIcon} />
                  <span className={m.fileName}>{a.fileName}</span>
                  {a.fileSize ? <span className={m.fileSize}>{formatFileSize(a.fileSize)}</span> : null}
                  <Button
                    type="text" size="small" icon={<CloseOutlined />}
                    aria-label={`Remove ${a.fileName}`}
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                </span>
              ))}
            </div>
          )}
        </Form.Item>
      </Form>

      <div className={m.composeFooter}>
        <Button onClick={goBack}>Cancel</Button>
        <span className={m.composeFooterEnd}>
          <Button icon={<SaveOutlined />} loading={saving} onClick={handleSaveDraft}>Save Draft</Button>
          <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSend}>Send Message</Button>
        </span>
      </div>
    </section>
  );
}
