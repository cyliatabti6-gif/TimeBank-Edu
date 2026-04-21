/** @typedef {{ audio: boolean, video: boolean | MediaTrackConstraints }} UserMediaConstraints */

const STORAGE_KEY = 'timebank_camera_device_id';

/**
 * Optional exact `deviceId` (from env or localStorage). No label-based logic.
 * `VITE_CAMERA_DEVICE_ID` preferred; `VITE_VIDEO_DEVICE_ID` supported for compatibility.
 */
export function getSelectedCameraDeviceId() {
  for (const key of ['VITE_CAMERA_DEVICE_ID', 'VITE_VIDEO_DEVICE_ID']) {
    const raw = import.meta.env[key];
    if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  }
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return s;
  } catch {
    /* */
  }
  return null;
}

export function setSelectedCameraDeviceId(deviceId) {
  try {
    if (deviceId) localStorage.setItem(STORAGE_KEY, deviceId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}

/**
 * Default: built-in / browser-chosen camera via `{ video: true }`.
 * With `deviceId`: exact camera only (user or env choice).
 *
 * @param {string | null | undefined} deviceId
 * @returns {{ audio: boolean, video: boolean | { deviceId: { exact: string } } }}
 */
export function buildUserMediaConstraints(deviceId) {
  if (deviceId) {
    return { audio: true, video: { deviceId: { exact: deviceId } } };
  }
  return { audio: true, video: true };
}

/**
 * @param {MediaDeviceInfo[]} devices
 */
export function logVideoInputDevices(devices) {
  if (!import.meta.env.DEV) return;
  console.debug('[camera] enumerateDevices: videoinput count =', devices.length);
  devices.forEach((d, i) => {
    console.debug(`[camera]   [${i}] deviceId=`, d.deviceId, 'groupId=', d.groupId || '—');
  });
}

/**
 * @param {MediaStream} stream
 * @param {string} [context]
 */
export function logMediaStream(stream, context = 'stream') {
  if (!import.meta.env.DEV || !stream) return;
  const tracks = stream.getTracks();
  console.debug(`[camera] ${context}: ${tracks.length} track(s)`);
  tracks.forEach((t, i) => {
    const st = t.getSettings?.() || {};
    console.debug(
      `[camera]   [${i}] kind=${t.kind} id=${t.id} enabled=${t.enabled} readyState=${t.readyState} deviceId=${st.deviceId ?? 'n/a'}`,
    );
  });
}

/**
 * @param {unknown} err
 */
export function logGetUserMediaError(err) {
  if (!import.meta.env.DEV) return;
  const e = err;
  const name = e && typeof e === 'object' && 'name' in e ? e.name : '';
  const message = e && typeof e === 'object' && 'message' in e ? e.message : String(e);
  console.error('[camera] getUserMedia error:', name, message, err);
}

/**
 * After permission, labels are usually populated.
 * @returns {Promise<MediaDeviceInfo[]>}
 */
export async function listVideoInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'videoinput');
}
