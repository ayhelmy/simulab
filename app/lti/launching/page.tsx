'use client';

/**
 * Post-launch landing page for LTI 1.3 resource-link launches — reached via
 * a 302 redirect from POST /lti/launch once the id_token has been fully
 * validated and the user/course/lesson provisioned. Exchanges the one-time
 * launch token for a real SimuLearn session (see lib/lti.ts
 * exchangeLtiSession + backend session-exchange.service.js), logs the user
 * into the existing AuthContext exactly like a normal login, then hands off
 * to the EXISTING authenticated simulation player for students — no new
 * tracking code. Instructors/TAs land on the instructor LTI course report
 * instead, since they launch to check on students, not to play the sim.
 *
 * Route: /lti/launching?token=...
 * Lives outside the (dashboard) layout group — reached from inside an LMS
 * iframe/redirect, not from normal in-app navigation — mirrors the
 * structural pattern of app/sim/[id]/play/page.tsx.
 */

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Spin, Result, Button } from 'antd';
import { useAuth } from '@/context/AuthContext';
import { exchangeLtiSession } from '@/lib/lti';

function LaunchingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  const run = useCallback(async () => {
    if (!token) { setError('Missing launch token.'); return; }
    try {
      const session = await exchangeLtiSession(token);
      login(session.user, session.accessToken);

      const isInstructorLike = session.user.roles.some((r) => r.name === 'instructor' || r.name === 'teaching_assistant');
      if (isInstructorLike) {
        router.replace(`/instructor/lti/course/${session.courseId}/report`);
      } else {
        router.replace(`/simulations/${session.simulationId}/play?courseId=${session.courseId}&lessonId=${session.lessonId}`);
      }
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.detail ?? e.title ?? 'This launch link has expired or is invalid.');
    }
  }, [token, login, router]);

  // Guard against double-invocation (e.g. React 18 strict-mode dev double-effect).
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    run();
  }, [run]);

  if (error) {
    return (
      <Result
        status="error"
        title="Launch Could Not Be Completed"
        subTitle={error}
        extra={<Button onClick={() => router.push('/')}>Return Home</Button>}
      />
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" tip="Launching your simulation…" />
    </div>
  );
}

export default function LtiLaunchingPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
      <LaunchingContent />
    </Suspense>
  );
}
