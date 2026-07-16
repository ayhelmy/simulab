'use client';

/**
 * SCORM 2004 simulation player — renders the packaged simulation in an iframe.
 * SRS §4.7 SIM-03: communicates with SCORM API for score + suspend_data.
 * TODO: implement SCORM API bridge + session management (skeleton only)
 */

interface SimulationPlayerProps {
  launchUrl: string;
  sessionId: string;
}

export default function SimulationPlayer({ launchUrl, sessionId }: SimulationPlayerProps) {
  // TODO: inject window.API_1484_11 SCORM 2004 bridge before iframe loads
  // TODO: listen for Terminate() call to persist session state
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 600 }}>
      <iframe
        src={launchUrl}
        title="Simulation"
        data-session-id={sessionId}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
