import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subscription, forkJoin, map } from 'rxjs';
import { MeshService } from '../../services/mesh.service';
import { MeshNode, MeshPacket, TelemetryMetrics, TelemetryPoint } from '../../models/mesh.model';
import { MeshMapComponent } from '../../components/mesh-map/mesh-map.component';
import { ChartPoint, TelemetryChartComponent } from '../../components/telemetry-chart/telemetry-chart.component';
import { ImgFallbackDirective } from '../../directives/img-fallback.directive';
import {
  STATUS_LABELS,
  batteryInfo,
  displayId,
  formatUptime,
  hexToNodeId,
  nodeCoords,
  nodeStatus,
  roleLabel,
  timeAgo,
} from '../../utils/node-utils';

interface ChartDef {
  key: keyof TelemetryMetrics;
  title: string;
  unit: string;
  decimals: number;
  min?: number;
  max?: number;
}

/** Gráficas posibles; sólo se muestran las que tienen lecturas. */
const CHARTS: ChartDef[] = [
  { key: 'battery_level', title: 'Batería', unit: '%', decimals: 0, min: 0, max: 100 },
  { key: 'voltage', title: 'Voltaje', unit: 'V', decimals: 2 },
  { key: 'channel_utilization', title: 'Uso del canal', unit: '%', decimals: 1, min: 0 },
  { key: 'air_util_tx', title: 'Tiempo al aire (TX)', unit: '%', decimals: 2, min: 0 },
  { key: 'temperature', title: 'Temperatura', unit: '°C', decimals: 1 },
  { key: 'relative_humidity', title: 'Humedad relativa', unit: '%', decimals: 0, min: 0, max: 100 },
  { key: 'barometric_pressure', title: 'Presión barométrica', unit: 'hPa', decimals: 0 },
];

const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const shortTime = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

@Component({
  selector: 'app-node-detail',
  standalone: true,
  imports: [RouterLink, MeshMapComponent, TelemetryChartComponent, ImgFallbackDirective],
  templateUrl: './node-detail.component.html',
  styleUrl: './node-detail.component.scss',
})
export class NodeDetailComponent {
  private readonly mesh = inject(MeshService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly hexParam = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });
  protected readonly nodeId = computed(() => hexToNodeId(this.hexParam()));

  protected readonly node = signal<MeshNode | null>(null);
  protected readonly telemetry = signal<TelemetryPoint[]>([]);
  protected readonly messages = signal<MeshPacket[]>([]);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly failed = signal(false);
  protected readonly copied = signal(false);
  protected readonly now = signal(Date.now());

  private request?: Subscription;

  // ---------- Derivados ----------
  protected readonly view = computed(() => {
    const node = this.node();
    if (!node) return null;
    const status = nodeStatus(node.last_seen_us, this.now());
    const coords = nodeCoords(node);
    return {
      node,
      displayId: displayId(node.id),
      status,
      statusLabel: STATUS_LABELS[status],
      role: roleLabel(node.role),
      image: this.mesh.getDeviceImage(node.hw_model),
      lastSeen: timeAgo(node.last_seen_us, this.now()),
      lastSeenExact: dateTime.format(new Date(node.last_seen_us / 1000)),
      firstSeen: dateTime.format(new Date(node.first_seen_us / 1000)),
      coords,
      googleMaps: coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : '',
      osm: coords ? `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=14/${coords.lat}/${coords.lng}` : '',
    };
  });

  /** Último valor conocido de cada métrica (las lecturas no siempre traen todas). */
  protected readonly latest = computed(() => {
    const latest: TelemetryMetrics & { time?: Date } = {};
    for (const point of this.telemetry()) {
      for (const def of CHARTS) {
        const value = point[def.key];
        if (value !== undefined) latest[def.key] = value;
      }
      if (point.uptime_seconds !== undefined) latest.uptime_seconds = point.uptime_seconds;
      latest.time = point.time;
    }
    return latest;
  });

  protected readonly battery = computed(() => batteryInfo(this.latest().battery_level));
  protected readonly uptime = computed(() => formatUptime(this.latest().uptime_seconds));

  protected readonly charts = computed(() => {
    const points = this.telemetry();
    return CHARTS.map((def) => {
      let series: ChartPoint[] = points
        .filter((p) => p[def.key] !== undefined)
        .map((p) => ({ time: p.time, value: p[def.key] as number }));
      if (def.key === 'battery_level') {
        // 101 = alimentación externa: no es un porcentaje. Si domina, unir las pocas
        // lecturas reales a lo largo de días engañaría, así que la gráfica se omite.
        series = this.mostlyExternalPower() ? [] : series.filter((p) => p.value <= 100);
      }
      return { ...def, points: series };
    }).filter((chart) => chart.points.length > 0);
  });

  /** La mayoría de las lecturas de batería son 101 (conectado a corriente). */
  protected readonly mostlyExternalPower = computed(() => {
    const levels = this.telemetry().map((p) => p.battery_level).filter((v) => v !== undefined);
    const external = levels.filter((v) => v! > 100).length;
    return levels.length > 0 && external / levels.length >= 0.5;
  });

  protected readonly telemetryRows = computed(() =>
    [...this.telemetry()].reverse().map((p) => ({
      time: shortTime.format(p.time),
      battery: p.battery_level === undefined ? '—' : batteryInfo(p.battery_level)!.label,
      voltage: p.voltage === undefined ? '—' : `${p.voltage.toFixed(2)} V`,
      channel: p.channel_utilization === undefined ? '—' : `${p.channel_utilization.toFixed(1)}%`,
      air: p.air_util_tx === undefined ? '—' : `${p.air_util_tx.toFixed(2)}%`,
      temperature: p.temperature === undefined ? '—' : `${p.temperature.toFixed(1)} °C`,
      humidity: p.relative_humidity === undefined ? '—' : `${Math.round(p.relative_humidity)}%`,
    })),
  );

  protected readonly telemetryRange = computed(() => {
    const points = this.telemetry();
    if (points.length < 2) return '';
    return `${shortTime.format(points[0].time)} – ${shortTime.format(points.at(-1)!.time)}`;
  });

  protected readonly messageRows = computed(() =>
    this.messages().map((m) => ({ ...m, when: m.timestamp ? shortTime.format(m.timestamp) : '' })),
  );

  constructor() {
    if (!this.isBrowser) return;
    this.mesh.loadHardwareImages();

    effect(() => {
      const id = this.nodeId();
      untracked(() => {
        // El router no reinicia el scroll (a propósito: los filtros de /network no deben saltar arriba).
        window.scrollTo({ top: 0 });
        this.load(id);
      });
    });

    effect(() => {
      const name = this.node()?.long_name;
      this.title.setTitle(name ? `${name} · Red Meshtastic México` : 'Nodo · Red Meshtastic México');
    });

    this.destroyRef.onDestroy(() => this.title.setTitle('MeshtasticMx'));
  }

  load(id = this.nodeId()): void {
    this.request?.unsubscribe();
    this.node.set(null);
    this.telemetry.set([]);
    this.messages.set([]);
    this.notFound.set(false);
    this.failed.set(false);

    if (id === null) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loading.set(true);
    // Una sola suscripción: al cambiar de nodo se cancela la anterior (sin datos cruzados).
    this.request = forkJoin({
      node: this.mesh.getNodeById(id),
      telemetry: this.mesh.getNodeTelemetry(id),
      messages: this.mesh.getNodeMessages(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ node, telemetry, messages }) => {
          this.now.set(Date.now());
          this.node.set(node);
          this.notFound.set(!node);
          this.telemetry.set(telemetry);
          this.messages.set(messages);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error fetching node details:', err);
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  goBack(): void {
    // Si llegamos desde la red, volver conserva sus filtros; si se abrió un enlace directo, ir a /network.
    if (this.router.lastSuccessfulNavigation?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigate(['/network']);
    }
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }
}
