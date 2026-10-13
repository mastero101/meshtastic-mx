export interface MeshNode {
  /** Viene de la API con el prefijo "!" incluido, p. ej. "!9ee6b708". */
  id: string;
  node_id: number;
  long_name: string;
  short_name: string;
  hw_model: string;
  firmware: string | null;
  role: string | null;
  topic?: string;
  /** Grados × 1e7 */
  last_lat: number | null;
  /** Grados × 1e7 */
  last_long: number | null;
  channel: string;
  is_mqtt_gateway: boolean | null;
  first_seen_us: number;
  last_seen_us: number;
}

export interface NodesResponse {
  nodes: MeshNode[];
  total: number;
  limit: number;
  page: number;
  has_prev: boolean;
  has_next: boolean;
}

export interface MeshPacket {
  id: number;
  import_time_us: number;
  topic: string;
  packet_type: string;
  from_node_id: number;
  to_node_id: number;
  from_long_name: string;
  to_long_name: string | null;
  long_name: string;
  portnum: number;
  channel: string;
  payload: string;
  // Extracted fields for easier use
  text?: string;
  timestamp?: Date;
}

export interface PacketsResponse {
  packets: MeshPacket[];
}

export interface TelemetryMetrics {
  battery_level?: number;
  voltage?: number;
  channel_utilization?: number;
  air_util_tx?: number;
  uptime_seconds?: number;
  temperature?: number;
  relative_humidity?: number;
  barometric_pressure?: number;
  rx_snr?: number;
  rx_rssi?: number;
}

/** Una lectura de telemetría con la hora en que la recibió MeshView. */
export interface TelemetryPoint extends TelemetryMetrics {
  time: Date;
}

export interface DailyPacketCount {
  day_utc: string;
  packet_count: number;
}

/** Respuesta de /api/stats (ventana móvil de 7 días). */
export interface MeshStats {
  as_of_epoch: number;
  window_days: number;
  packets_total: number;
  active_nodes: number;
  channels_seen: number;
  daily: DailyPacketCount[];
}

/** Totales que la API sólo entrega como `total` de /nodes. */
export interface NodeTotals {
  total: number;
  routers: number;
}

export interface DeviceHardware {
  hwModelSlug: string;
  platformioTarget?: string;
  displayName?: string;
  images?: string[] | null;
}
