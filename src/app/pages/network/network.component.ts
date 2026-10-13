import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { MeshService } from '../../services/mesh.service';
import { MeshNode, MeshPacket, MeshStats } from '../../models/mesh.model';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { StatTileComponent } from '../../components/stat-tile/stat-tile.component';
import { DailyBarsComponent } from '../../components/daily-bars/daily-bars.component';
import { MeshMapComponent } from '../../components/mesh-map/mesh-map.component';
import { ImgFallbackDirective } from '../../directives/img-fallback.directive';
import {
    ACTIVITY_OPTIONS,
    ActivityFilter,
    NO_ROLE,
    STATUS_LABELS,
    displayId,
    matchesActivity,
    nodeCoords,
    nodeHex,
    nodeIdToHex,
    nodeStatus,
    roleLabel,
    timeAgo,
    timeAgoMs,
} from '../../utils/node-utils';

type Tab = 'nodos' | 'mensajes' | 'mapa';

const TABS: { value: Tab; label: string; icon: string }[] = [
    { value: 'nodos', label: 'Nodos', icon: 'fa-tower-broadcast' },
    { value: 'mensajes', label: 'Mensajes', icon: 'fa-comments' },
    { value: 'mapa', label: 'Mapa', icon: 'fa-map-location-dot' },
];

const NODES_PER_PAGE = 48;
const MESSAGES_PER_PAGE = 50;
const REFRESH_MS = 60_000;

const messageTime = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

@Component({
    selector: 'app-network',
    standalone: true,
    imports: [RouterLink, PageHeroComponent, StatTileComponent, DailyBarsComponent, MeshMapComponent, ImgFallbackDirective],
    templateUrl: './network.component.html',
    styleUrl: './network.component.scss'
})
export class NetworkComponent {
    private readonly mesh = inject(MeshService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    protected readonly tabs = TABS;
    protected readonly activityOptions = ACTIVITY_OPTIONS;
    protected readonly skeletons = Array.from({ length: 9 }, (_, i) => i);

    // ---------- Estado de la URL ----------
    private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

    protected readonly tab = computed<Tab>(() => {
        const value = this.params().get('tab');
        return value === 'mensajes' || value === 'mapa' ? value : 'nodos';
    });
    protected readonly query = computed(() => this.params().get('q') ?? '');
    protected readonly role = computed(() => this.params().get('rol') ?? '');
    protected readonly activity = computed<ActivityFilter>(() => {
        const value = this.params().get('actividad') as ActivityFilter | null;
        return ACTIVITY_OPTIONS.some((o) => o.value === value) ? value! : 'todos';
    });
    private readonly requestedPage = computed(() => Math.max(1, Number(this.params().get('pagina')) || 1));

    protected readonly hasFilters = computed(() => !!this.query() || !!this.role() || this.activity() !== 'todos');
    /** Cambia cuando cambian los filtros: el mapa se re-encuadra sólo entonces. */
    protected readonly filterKey = computed(() => `${this.query()}|${this.role()}|${this.activity()}`);

    // ---------- Datos ----------
    protected readonly nodes = signal<MeshNode[]>([]);
    protected readonly loadingNodes = signal(true);
    protected readonly nodesError = signal(false);
    protected readonly refreshing = signal(false);
    protected readonly lastUpdated = signal<number | null>(null);
    protected readonly latestFirmware = signal('');
    protected readonly stats = signal<MeshStats | null>(null);

    protected readonly packets = signal<MeshPacket[]>([]);
    protected readonly loadingPackets = signal(false);
    protected readonly packetsError = signal(false);
    protected readonly pageMessages = signal(1);
    private packetsLoadedPage = 0;

    /** Reloj para "hace X min" y el estado en línea; avanza cada 15 s. */
    protected readonly now = signal(Date.now());

    // ---------- Derivados ----------
    protected readonly summary = computed(() => {
        const now = this.now();
        let online = 0;
        let active24h = 0;
        let withPosition = 0;
        for (const node of this.nodes()) {
            const status = nodeStatus(node.last_seen_us, now);
            if (status === 'online') online++;
            if (status !== 'offline') active24h++;
            if (nodeCoords(node)) withPosition++;
        }
        return { total: this.nodes().length, online, active24h, withPosition };
    });

    protected readonly roleOptions = computed(() => {
        const counts = new Map<string, number>();
        for (const node of this.nodes()) {
            const key = node.role || NO_ROLE;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([value, count]) => ({ value, count, label: value === NO_ROLE ? 'Sin rol' : roleLabel(value) }));
    });

    protected readonly filteredNodes = computed(() => {
        const term = this.query().trim().toLowerCase();
        const role = this.role();
        const activity = this.activity();
        const now = this.now();

        return this.nodes()
            .filter((node) => {
                if (role && (node.role || NO_ROLE) !== role) return false;
                if (!matchesActivity(node.last_seen_us, activity, now)) return false;
                if (!term) return true;
                return (
                    node.long_name?.toLowerCase().includes(term) ||
                    node.short_name?.toLowerCase().includes(term) ||
                    node.id.toLowerCase().includes(term) ||
                    node.hw_model?.toLowerCase().includes(term)
                );
            })
            .sort((a, b) => b.last_seen_us - a.last_seen_us);
    });

    protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredNodes().length / NODES_PER_PAGE)));
    protected readonly page = computed(() => Math.min(this.requestedPage(), this.totalPages()));

    /** Tarjetas de la página actual, con todo lo que muestra la plantilla ya calculado. */
    protected readonly pageNodes = computed(() => {
        const now = this.now();
        const start = (this.page() - 1) * NODES_PER_PAGE;
        return this.filteredNodes()
            .slice(start, start + NODES_PER_PAGE)
            .map((node) => {
                const status = nodeStatus(node.last_seen_us, now);
                return {
                    node,
                    hex: nodeHex(node),
                    displayId: displayId(node.id),
                    status,
                    statusLabel: STATUS_LABELS[status],
                    seen: timeAgo(node.last_seen_us, now),
                    role: node.role ? roleLabel(node.role) : '',
                    image: this.mesh.getDeviceImage(node.hw_model),
                    hasPosition: !!nodeCoords(node),
                };
            });
    });

    protected readonly mappableCount = computed(() => this.filteredNodes().filter((n) => nodeCoords(n)).length);

    protected readonly filteredPackets = computed(() => {
        const term = this.query().trim().toLowerCase();
        const list = this.packets().map((p) => ({
            ...p,
            senderHex: nodeIdToHex(p.from_node_id),
            when: p.timestamp ? messageTime.format(p.timestamp) : '',
        }));
        if (!term) return list;
        return list.filter(
            (p) =>
                p.from_long_name?.toLowerCase().includes(term) ||
                p.text?.toLowerCase().includes(term) ||
                p.senderHex.includes(term.replace(/^!/, '')),
        );
    });

    protected readonly updatedAgo = computed(() => {
        const updated = this.lastUpdated();
        return updated ? timeAgoMs(this.now() - updated) : '';
    });

    private searchTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        if (!this.isBrowser) return;

        this.mesh.loadHardwareImages();
        this.loadNodes();
        this.mesh.getLatestFirmware()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((v) => this.latestFirmware.set(v));
        this.mesh.getStats()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (s) => this.stats.set(s), error: () => this.stats.set(null) });

        interval(15_000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.now.set(Date.now()));

        // Refresco en segundo plano: sin spinner y sólo con la pestaña visible.
        interval(REFRESH_MS)
            .pipe(
                map(() => document.visibilityState === 'visible'),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((visible) => {
                if (visible) this.refresh();
            });

        // Los mensajes se piden al abrir su pestaña.
        effect(() => {
            if (this.tab() !== 'mensajes') return;
            const page = this.pageMessages();
            untracked(() => {
                if (this.packetsLoadedPage !== page) this.loadPackets(page);
            });
        });
    }

    // ---------- Acciones ----------

    refresh(): void {
        this.loadNodes(true);
        if (this.tab() === 'mensajes') this.loadPackets(this.pageMessages(), true);
    }

    setTab(tab: Tab): void {
        this.updateParams({ tab: tab === 'nodos' ? null : tab, pagina: null });
    }

    onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.updateParams({ q: value.trim() || null, pagina: null }, true), 250);
    }

    setRole(event: Event): void {
        this.updateParams({ rol: (event.target as HTMLSelectElement).value || null, pagina: null });
    }

    setActivity(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.updateParams({ actividad: value === 'todos' ? null : value, pagina: null });
    }

    clearFilters(): void {
        this.updateParams({ q: null, rol: null, actividad: null, pagina: null });
    }

    goToPage(page: number): void {
        this.updateParams({ pagina: page > 1 ? page : null });
        document.getElementById('network-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    changeMessagesPage(delta: number): void {
        this.pageMessages.update((p) => Math.max(1, p + delta));
        document.getElementById('network-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------- Carga ----------

    private loadNodes(silent = false): void {
        // Con datos en pantalla, el refresco no los reemplaza por un spinner.
        if (!silent || this.nodes().length === 0) this.loadingNodes.set(true);
        this.refreshing.set(true);

        this.mesh.getAllNodes(silent)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (nodes) => {
                    this.nodes.set(nodes);
                    this.nodesError.set(false);
                    this.lastUpdated.set(Date.now());
                    this.now.set(Date.now());
                },
                error: (err) => {
                    console.error('Error fetching nodes:', err);
                    // Si ya había datos, se conservan; el error sólo se muestra sin datos.
                    this.nodesError.set(this.nodes().length === 0);
                    this.loadingNodes.set(false);
                    this.refreshing.set(false);
                },
                complete: () => {
                    this.loadingNodes.set(false);
                    this.refreshing.set(false);
                },
            });
    }

    private loadPackets(page: number, silent = false): void {
        if (!silent) this.loadingPackets.set(true);
        this.packetsLoadedPage = page;

        this.mesh.getPackets('mexico', MESSAGES_PER_PAGE, page)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (packets) => {
                    this.packets.set(packets);
                    this.packetsError.set(false);
                    this.loadingPackets.set(false);
                },
                error: (err) => {
                    console.error('Error fetching packets:', err);
                    this.packetsLoadedPage = 0;
                    this.packetsError.set(this.packets().length === 0);
                    this.loadingPackets.set(false);
                },
            });
    }

    retryPackets(): void {
        this.loadPackets(this.pageMessages());
    }

    retryNodes(): void {
        this.loadNodes();
    }

    private updateParams(params: Params, replaceUrl = false): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: params,
            queryParamsHandling: 'merge',
            replaceUrl,
        });
    }

    protected readonly messagesPerPage = MESSAGES_PER_PAGE;
}
