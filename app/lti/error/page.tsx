'use client';

/**
 * LTI launch error landing page — reached via a 302 redirect from the
 * backend when OIDC login initiation or launch validation fails.
 * Route: /lti/error?code=...
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Result, Button } from 'antd';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  INVALID_REQUEST: {
    title: 'Invalid LMS Request',
    description: 'The request from your LMS was missing required information. Please contact your LMS administrator.',
  },
  UNKNOWN_PLATFORM: {
    title: 'LMS Not Registered',
    description: 'This LMS is not registered with SimuLearn. Please contact your SimuLearn administrator to complete registration.',
  },
  UNKNOWN_DEPLOYMENT: {
    title: 'Deployment Not Registered',
    description: 'This LMS deployment is not registered with SimuLearn. Please contact your SimuLearn administrator.',
  },
  STATE_NOT_FOUND: {
    title: 'Login Session Not Found',
    description: 'We could not find your login session. Please relaunch this activity from your LMS.',
  },
  STATE_EXPIRED: {
    title: 'Login Session Expired',
    description: 'Your login session expired, or this link was already used. Please relaunch this activity from your LMS.',
  },
  NONCE_MISMATCH: {
    title: 'Security Check Failed',
    description: 'The launch could not be verified as coming from a fresh request. Please relaunch this activity from your LMS.',
  },
  SIGNATURE_INVALID: {
    title: 'Launch Verification Failed',
    description: 'The launch signature could not be verified. Please contact your SimuLearn administrator.',
  },
  JWKS_FETCH_FAILED: {
    title: 'Could Not Verify LMS',
    description: 'SimuLearn could not retrieve your LMS\'s public keys. Please try again shortly, or contact your administrator.',
  },
  CLAIM_VALIDATION_FAILED: {
    title: 'Incomplete Launch Data',
    description: 'The LMS did not send all the information SimuLearn needs to complete this launch. Please contact your LMS administrator.',
  },
  UNSUPPORTED_MESSAGE_TYPE: {
    title: 'Unsupported Request Type',
    description: 'This type of LTI request is not supported yet.',
  },
  CONTEXT_NOT_PROVISIONED: {
    title: 'Activity Not Fully Set Up',
    description: 'This course was not set up through SimuLearn\'s content selection. Please ask your instructor to re-add this activity via "External Tool" > SimuLearn in your LMS.',
  },
  SIMULATION_NOT_ASSIGNED: {
    title: 'Simulation Not Available',
    description: 'This simulation is not assigned to your institution. Please contact your LMS administrator or SimuLearn administrator.',
  },
  SIMULATION_NOT_FOUND: {
    title: 'Simulation Unavailable',
    description: 'This simulation could not be found or is no longer active.',
  },
  UNAUTHORIZED_ROLE: {
    title: 'Access Denied',
    description: 'Your role is not authorized to perform this action.',
  },
  INTERNAL_ERROR: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred while processing your LMS launch. Please try again or contact support.',
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? 'INTERNAL_ERROR';
  const info = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_ERROR;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Result
        status="error"
        title={info.title}
        subTitle={info.description}
        extra={
          <Link href="/">
            <Button type="primary">Return Home</Button>
          </Link>
        }
      />
    </div>
  );
}

export default function LtiErrorPage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh' }} />}>
      <ErrorContent />
    </Suspense>
  );
}
