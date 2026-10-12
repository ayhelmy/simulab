'use client';

/**
 * Messages workspace shell: role-aware header, folder rail (Compose + folders
 * with counts) and the main pane. On mobile the rail becomes a folder tab bar
 * and Compose moves into the header. Folder counts load exactly as before.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getFolderCounts } from '@/lib/mail';
import type { MailFolderCounts } from '@/types';
import { ADMIN_PAGE_CLASS, AdminHeader } from '@/components/admin/adminUi';
import {
  mailStyles as m, FOLDERS, MAIL_COPY, MailCountsContext, folderCount, useMailRole,
} from '@/components/mail/mailUi';

export default function MailLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useMailRole();
  const [counts, setCounts] = useState<MailFolderCounts | null>(null);

  const refresh = useCallback(() => {
    getFolderCounts().then(setCounts).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh, pathname]);

  // Compose and message detail don't belong to one folder, so nothing is highlighted there.
  const activeHref = FOLDERS.find((f) => pathname.startsWith(f.href))?.href ?? null;
  const countsValue = useMemo(() => ({ counts, refresh }), [counts, refresh]);

  const composeButton = (className: string, block?: boolean) => (
    <span className={className}>
      <Button type="primary" icon={<EditOutlined />} size="large" block={block} onClick={() => router.push('/mail/compose')}>
        Compose
      </Button>
    </span>
  );

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        eyebrow={null}
        title="Messages"
        subtitle={MAIL_COPY[role].subtitle}
        actions={composeButton(m.headerCompose)}
      />

      <MailCountsContext.Provider value={countsValue}>
        <div className={m.workspace}>
          <nav className={m.rail} aria-label="Message folders">
            {composeButton(m.railCompose, true)}
            <ul className={m.folderList}>
              {FOLDERS.map((f) => {
                const active = f.href === activeHref;
                const n = folderCount(f.folder, counts);
                return (
                  <li key={f.href}>
                    <Link
                      href={f.href}
                      className={active ? `${m.folderLink} ${m.folderActive}` : m.folderLink}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span className={m.folderIcon} aria-hidden>{f.icon}</span>
                      <span className={m.folderLabel}>{f.label}</span>
                      {n > 0 && (
                        <span
                          className={f.folder === 'inbox' ? `${m.count} ${m.countUnread}` : m.count}
                          aria-label={f.folder === 'inbox' ? `${n} unread` : `${n} drafts`}
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className={m.main}>{children}</div>
        </div>
      </MailCountsContext.Provider>
    </div>
  );
}
