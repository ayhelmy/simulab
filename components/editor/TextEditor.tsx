'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import CustomEditor from 'ckeditor5-custom-build/build/ckeditor';
import type { EditorConfig } from 'ckeditor5';
import { Button, Input } from 'antd';
import { CodeOutlined, EditOutlined } from '@ant-design/icons';

import styles from './TextEditor.module.css';

const { TextArea } = Input;

interface TextEditorProps {
  body: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

type CKEditorInstance = any;

export default function TextEditor({
  body,
  readOnly = false,
  onChange,
}: TextEditorProps) {
  const editorRef = useRef<CKEditorInstance | null>(null);
  // HTML source view — a plain-textarea escape hatch that bypasses CKEditor's
  // WYSIWYG rendering entirely. CKEditor's `data` prop only seeds the editor's
  // *initial* content at mount (it isn't reactive after that), so this also
  // doubles as the reliable way to see/edit the real underlying HTML.
  const [sourceMode, setSourceMode] = useState(false);
  const [wysiwygKey, setWysiwygKey] = useState(0);

  const editorConfig = useMemo(
    () =>
      ({
        toolbar: {
          items: [
            'sourceEditing',
            'htmlEmbed',
            '|',
            'heading',
            '|',
            'fontSize',
            'fontFamily',
            'fontColor',
            'fontBackgroundColor',
            '|',
            'bold',
            'italic',
            'underline',
            '|',
            'bulletedList',
            'numberedList',
            '|',
            'link',
            '|',
            'imageUpload',
            'insertTable',
            'mediaEmbed',
            '|',
            'undo',
            'redo',
          ],
          shouldNotGroupWhenFull: true,
        },

        fontSize: {
          options: [10, 12, 14, 'default', 18, 20, 24, 28, 32, 36],
          supportAllValues: true,
        },

        fontFamily: {
          options: [
            'default',
            'Arial, Helvetica, sans-serif',
            'Tahoma, Geneva, sans-serif',
            'Times New Roman, Times, serif',
            'Courier New, Courier, monospace',
          ],
        },

        htmlSupport: {
          allow: [
            {
              name: /^(div|section|article|span|p|h1|h2|h3|h4|h5|h6|ul|ol|li|table|thead|tbody|tr|td|th|strong|b|em|i|u|a|img|iframe|video|audio|br)$/,

              // Keep TypeScript happy.
              attributes: true,
              classes: [/.*/],
              styles: [/.*/],
            },
          ],

          // Important security protection.
          disallow: [
            {
              name: 'script',
            },
            {
              name: /[\s\S]+/,
              attributes: {
                key: /^on.*$/i,
              },
            },
          ],
        },

        htmlEmbed: {
          showPreviews: false,
        },
      }) as EditorConfig,
    []
  );

  const setToolbarVisible = (
    editor: CKEditorInstance,
    visible: boolean
  ): void => {
    const toolbarElement = editor?.ui?.view?.toolbar?.element;

    if (toolbarElement) {
      toolbarElement.style.display = visible ? '' : 'none';
    }
  };

  const applyReadOnlyMode = (
    editor: CKEditorInstance,
    isReadOnly: boolean
  ): void => {
    if (isReadOnly) {
      if (typeof editor.enableReadOnlyMode === 'function') {
        editor.enableReadOnlyMode('content-viewer');
      } else {
        editor.isReadOnly = true;
      }

      setToolbarVisible(editor, false);
    } else {
      if (typeof editor.disableReadOnlyMode === 'function') {
        editor.disableReadOnlyMode('content-viewer');
      } else {
        editor.isReadOnly = false;
      }

      setToolbarVisible(editor, true);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      applyReadOnlyMode(editorRef.current, readOnly);
    }
  }, [readOnly]);

  return (
    <div
      className={`${styles.editorWrapper} ${
        readOnly ? styles.readOnly : styles.editMode
      }`}
    >
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <Button
            type="text"
            size="small"
            icon={sourceMode ? <EditOutlined /> : <CodeOutlined />}
            onClick={() => {
              if (sourceMode) setWysiwygKey((k) => k + 1); // remount CKEditor with the edited HTML as its new initial data
              setSourceMode((v) => !v);
            }}
          >
            {sourceMode ? 'Back to editor' : 'Edit as HTML'}
          </Button>
        </div>
      )}

      {sourceMode ? (
        <TextArea
          value={body ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          autoSize={{ minRows: 8, maxRows: 20 }}
          spellCheck={false}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
      ) : (
        <CKEditor
          key={wysiwygKey}
          editor={CustomEditor}
          data={body ?? ''}
          config={editorConfig}
          disableWatchdog
          onReady={(editor) => {
            editorRef.current = editor;
            applyReadOnlyMode(editor, readOnly);
          }}
          onChange={(_, editor) => {
            if (!readOnly) {
              onChange?.(editor.getData());
            }
          }}
          onError={(error, details) => {
            console.error('CKEditor error:', error, details);
          }}
        />
      )}
    </div>
  );
}