/**
 * Generic simulation LMS event bridge (WEB-DEVELOPER-GUIDE.md §3 — attachFM103Lms),
 * generalized to work for any simulation build, not just FM103.
 *
 * The already-shipped FM103 Bernoulli build hardcodes the wire-level channel
 * `'fm103:lms'` and `payload.projectId: 'FM103'` and cannot be changed
 * retroactively. `DEFAULT_CHANNEL` is the new platform-standard channel any
 * future Unity build should target instead, validated against that
 * simulation's own `build_uuid` (the generic tracking projectId — see
 * `simulations.build_uuid`). `LEGACY_FM103_CHANNEL` exists purely so the play
 * page can keep listening for the one already-shipped build unchanged.
 *
 * Attaches one listener per entry in `channels`, each validated against its
 * own `expectedProjectId` — never a single global projectId — precisely so
 * the legacy channel's literal `'FM103'` and a new build's real `build_uuid`
 * can both be trusted at once without either channel spoofing the other.
 *
 * Delivery modes per the guide, unchanged from the original implementation:
 *   - Same page: a CustomEvent named `channel.name` dispatched on `window`,
 *     `detail` set to the payload object.
 *   - Iframe: `window.postMessage({channel: channel.name, payload}, origin)`
 *     from the build's own window; validates both the message origin and the
 *     source window before forwarding.
 */

export const DEFAULT_CHANNEL = 'simlearn:lms';
export const LEGACY_FM103_CHANNEL = 'fm103:lms';

export interface LmsChannelSpec {
  /** Wire-level channel/CustomEvent name to listen on. */
  name: string;
  /** payload.projectId must match this exactly for an event on this channel to be accepted. */
  expectedProjectId: string;
}

export interface SimulationLmsOptions {
  /** One entry per channel to listen on simultaneously (e.g. the new generic channel plus a legacy one). */
  channels: LmsChannelSpec[];
  onEvent: (payload: Record<string, unknown>) => void;
  /** Provide for iframe delivery; omit for same-page delivery. */
  frame?: HTMLIFrameElement;
  /** Required with `frame` — the exact origin the build's Parent Origin setting points at. */
  buildOrigin?: string;
}

function isLmsPayload(payload: unknown, expectedProjectId: string): payload is Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.schemaVersion === 'string' && p.projectId === expectedProjectId;
}

/**
 * Attaches listeners for every entry in `options.channels`. Returns a single
 * detach() that tears all of them down — call it on teardown.
 */
export function attachSimulationLms(options: SimulationLmsOptions): () => void {
  const { channels, onEvent, frame, buildOrigin } = options;

  if (frame) {
    if (!buildOrigin) {
      throw new Error('attachSimulationLms: buildOrigin is required for iframe delivery.');
    }
    const handleMessage = (event: MessageEvent) => {
      // Guide §3: validate both the build origin and the source iframe —
      // an empty Parent Origin on the build side disables forwarding
      // entirely, so a message that doesn't match either is never ours.
      if (event.origin !== buildOrigin) return;
      if (event.source !== frame.contentWindow) return;

      const data = event.data as { channel?: string; payload?: unknown } | undefined;
      if (!data) return;
      const spec = channels.find((c) => c.name === data.channel);
      if (!spec || !isLmsPayload(data.payload, spec.expectedProjectId)) return;

      onEvent(data.payload);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }

  const detachers = channels.map((spec) => {
    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!isLmsPayload(detail, spec.expectedProjectId)) return;
      onEvent(detail);
    };
    window.addEventListener(spec.name, handleCustomEvent);
    return () => window.removeEventListener(spec.name, handleCustomEvent);
  });
  return () => detachers.forEach((detach) => detach());
}
