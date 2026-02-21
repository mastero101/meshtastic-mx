export interface MeshNode {
  id: string;
  node_id: number;
  long_name: string;
  short_name: string;
  hw_model: string;
  firmware: string | null;
  role: string | null;
  last_lat: number | null;
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
  rx_snr?: number;
  rx_rssi?: number;
}
