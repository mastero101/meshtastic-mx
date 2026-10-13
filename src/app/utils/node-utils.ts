import { MeshNode, TelemetryMetrics } from '../models/mesh.model';

// ---------- Identificadores ----------

/** ID hexadecimal sin "!" (8 caracteres). Es el que usamos en las URLs: /network/node/9ee6b708 */
export function nodeHex(node: Pick<MeshNode, 'id' | 'node_id'>): string {
  if (node.id) return node.id.replace(/^!+/, '').toLowerCase();
  return node.node_id.toString(16).padStart(8, '0');
}

/** ID listo para mostrar: siempre con un único "!" (la API ya lo incluye). */
export function displayId(id: string): string {
  return `!${id.replace(/^!+/, '')}`;
}

export function hexToNodeId(hex: string): number | null {
  const clean = hex.replace(/^!+/, '');
  if (!/^[0-9a-f]{1,8}$/i.test(clean)) return null;
  return parseInt(clean, 16);
}

export function nodeIdToHex(nodeId: number): string {
  return nodeId.toString(16).padStart(8, '0');
}

// ---------- Estado de actividad ----------

export type NodeStatus = 'online' | 'idle' | 'offline';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** En línea: visto hace < 2 h. Inactivo: < 24 h. Desconectado: más de 24 h. */
export function nodeStatus(lastSeenUs: number | undefined, now = Date.now()): NodeStatus {
  if (!lastSeenUs) return 'offline';
  const age = now - lastSeenUs / 1000;
  if (age < 2 * HOUR_MS) return 'online';
  if (age < DAY_MS) return 'idle';
  return 'offline';
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  online: 'En línea',
  idle: 'Inactivo',
  offline: 'Desconectado',
};

/** Filtro de actividad de la página de Red (se guarda en la URL como ?actividad=). */
export type ActivityFilter = 'todos' | 'en-linea' | '24h' | '7d' | 'inactivos';

export const ACTIVITY_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'todos', label: 'Cualquier actividad' },
  { value: 'en-linea', label: 'En línea (< 2 h)' },
  { value: '24h', label: 'Activos 24 h' },
  { value: '7d', label: 'Activos 7 días' },
  { value: 'inactivos', label: 'Sin actividad > 7 días' },
];

export function matchesActivity(lastSeenUs: number, filter: ActivityFilter, now = Date.now()): boolean {
  const age = now - lastSeenUs / 1000;
  switch (filter) {
    case 'en-linea':
      return age < 2 * HOUR_MS;
    case '24h':
      return age < DAY_MS;
    case '7d':
      return age < 7 * DAY_MS;
    case 'inactivos':
      return age >= 7 * DAY_MS;
    default:
      return true;
  }
}

export function timeAgo(timestampUs: number | undefined, now = Date.now()): string {
  if (!timestampUs) return 'Desconocido';
  return timeAgoMs(now - timestampUs / 1000);
}

export function timeAgoMs(ageMs: number): string {
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) return 'hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

// ---------- Roles ----------

export const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'Cliente',
  CLIENT_MUTE: 'Cliente silencioso',
  CLIENT_HIDDEN: 'Cliente oculto',
  CLIENT_BASE: 'Cliente base',
  ROUTER: 'Router',
  ROUTER_LATE: 'Router tardío',
  ROUTER_CLIENT: 'Router cliente',
  REPEATER: 'Repetidor',
  TRACKER: 'Rastreador',
  SENSOR: 'Sensor',
  TAK: 'TAK',
  TAK_TRACKER: 'Rastreador TAK',
  LOST_AND_FOUND: 'Objetos perdidos',
};

/** Valor usado en la URL para los nodos sin rol reportado. */
export const NO_ROLE = 'SIN_ROL';

export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Sin rol';
  return ROLE_LABELS[role] ?? role;
}

// ---------- Posición ----------

export function nodeCoords(node: Pick<MeshNode, 'last_lat' | 'last_long'>): { lat: number; lng: number } | null {
  if (!node.last_lat || !node.last_long) return null;
  return { lat: node.last_lat / 1e7, lng: node.last_long / 1e7 };
}

// ---------- Batería ----------

export interface BatteryInfo {
  /** Texto a mostrar: "87%" o "Externa". */
  label: string;
  /** Porcentaje para la barra, siempre entre 0 y 100. */
  percent: number;
  /** En Meshtastic, battery_level = 101 significa alimentación externa. */
  external: boolean;
  tone: 'good' | 'warning' | 'critical';
  icon: string;
}

export function batteryInfo(level: number | undefined): BatteryInfo | null {
  if (level == null) return null;
  if (level > 100) {
    return { label: 'Externa', percent: 100, external: true, tone: 'good', icon: 'fa-plug' };
  }
  const percent = Math.max(0, Math.min(100, level));
  const tone = percent < 20 ? 'critical' : percent < 50 ? 'warning' : 'good';
  const icon =
    percent >= 90 ? 'fa-battery-full'
      : percent >= 60 ? 'fa-battery-three-quarters'
        : percent >= 30 ? 'fa-battery-half'
          : percent >= 10 ? 'fa-battery-quarter'
            : 'fa-battery-empty';
  return { label: `${percent}%`, percent, external: false, tone, icon };
}

export function formatUptime(seconds: number | undefined): string {
  if (seconds == null) return '—';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  if (days > 0) return `${days} d ${hours} h`;
  const minutes = Math.floor((seconds % 3_600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

// ---------- Telemetría ----------

const TELEMETRY_FIELDS: { key: keyof TelemetryMetrics; pattern: RegExp; int?: boolean }[] = [
  { key: 'battery_level', pattern: /\bbattery_level:\s*(-?\d+)/, int: true },
  { key: 'voltage', pattern: /\bvoltage:\s*(-?[\d.]+)/ },
  { key: 'channel_utilization', pattern: /\bchannel_utilization:\s*(-?[\d.]+)/ },
  { key: 'air_util_tx', pattern: /\bair_util_tx:\s*(-?[\d.]+)/ },
  { key: 'uptime_seconds', pattern: /\buptime_seconds:\s*(\d+)/, int: true },
  { key: 'temperature', pattern: /\btemperature:\s*(-?[\d.]+)/ },
  { key: 'relative_humidity', pattern: /\brelative_humidity:\s*(-?[\d.]+)/ },
  { key: 'barometric_pressure', pattern: /\bbarometric_pressure:\s*(-?[\d.]+)/ },
  { key: 'rx_snr', pattern: /\brx_snr:\s*(-?[\d.]+)/ },
  { key: 'rx_rssi', pattern: /\brx_rssi:\s*(-?[\d.]+)/ },
];

/**
 * Extrae métricas del payload en formato de texto protobuf que entrega MeshView.
 * Reconoce device_metrics y environment_metrics; las métricas ausentes quedan sin definir.
 */
export function parseTelemetry(payload: string | undefined): TelemetryMetrics | null {
  if (!payload) return null;
  const metrics: TelemetryMetrics = {};
  for (const field of TELEMETRY_FIELDS) {
    const match = payload.match(field.pattern);
    if (!match) continue;
    const value = field.int ? parseInt(match[1], 10) : parseFloat(match[1]);
    if (Number.isFinite(value)) metrics[field.key] = value;
  }
  return Object.keys(metrics).length > 0 ? metrics : null;
}

/** Normaliza el nombre del modelo para buscar su imagen (minúsculas, sin - ni _). */
export function normalizeModel(model: string): string {
  return model.toLowerCase().replace(/[-_]/g, '');
}
