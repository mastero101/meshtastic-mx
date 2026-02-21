import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MeshService } from '../../services/mesh.service';
import { MeshNode, MeshPacket, TelemetryMetrics } from '../../models/mesh.model';
import { Subscription, interval } from 'rxjs';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
    selector: 'app-network',
    standalone: true,
    imports: [CommonModule, FormsModule, SafeUrlPipe],
    templateUrl: './network.component.html',
    styleUrl: './network.component.scss'
})
export class NetworkComponent implements OnInit, OnDestroy {
    nodes: MeshNode[] = [];
    packets: MeshPacket[] = [];
    allNodes: MeshNode[] = [];
    loadingNodes = true;
    loadingPackets = true;
    loadingMap = false;
    activeTab: 'nodes' | 'messages' | 'map' = 'nodes';
    lastUpdated: Date = new Date();
    latestFirmware: string = '';

    // Pagination & Search
    pageNodes = 1;
    pageMessages = 1;
    pageSize = 50;
    searchTerm = '';

    // Map
    private map?: any;
    private markers: any[] = [];

    // Detailed View
    selectedNode: MeshNode | null = null;
    nodePackets: MeshPacket[] = [];
    nodeTelemetry: MeshPacket[] = [];
    latestMetrics: TelemetryMetrics | null = null;
    loadingDetails = false;

    private refreshSubscription?: Subscription;

    constructor(
        private meshService: MeshService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.loadData();

            // Auto-refresh every 60 seconds
            this.refreshSubscription = interval(60000).subscribe(() => {
                this.loadData();
            });
        }
    }

    ngOnDestroy(): void {
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
        }
    }

    loadData(): void {
        this.fetchNodes();
        this.fetchPackets();
        this.meshService.getLatestFirmware().subscribe(v => this.latestFirmware = v);
    }

    fetchNodes(): void {
        this.loadingNodes = true;
        this.meshService.getNodes(this.pageSize, this.pageNodes).subscribe({
            next: (response) => {
                this.nodes = response.nodes;
                this.loadingNodes = false;
                this.lastUpdated = new Date();
            },
            error: (err) => {
                console.error('Error fetching nodes:', err);
                this.loadingNodes = false;
            }
        });
    }

    fetchPackets(): void {
        this.loadingPackets = true;
        this.meshService.getPackets('mexico', this.pageSize, this.pageMessages).subscribe({
            next: (packets) => {
                this.packets = packets;
                this.loadingPackets = false;
            },
            error: (err) => {
                console.error('Error fetching packets:', err);
                this.loadingPackets = false;
            }
        });
    }

    changePage(tab: 'nodes' | 'messages', delta: number): void {
        if (tab === 'nodes') {
            this.pageNodes = Math.max(1, this.pageNodes + delta);
            this.fetchNodes();
        } else {
            this.pageMessages = Math.max(1, this.pageMessages + delta);
            this.fetchPackets();
        }
        // Scroll to top of content
        window.scrollTo({ top: 400, behavior: 'smooth' });
    }

    get filteredNodes(): MeshNode[] {
        if (!this.searchTerm) return this.nodes;
        const term = this.searchTerm.toLowerCase();
        return this.nodes.filter(n =>
            n.long_name?.toLowerCase().includes(term) ||
            n.id.toLowerCase().includes(term) ||
            n.hw_model?.toLowerCase().includes(term)
        );
    }

    get filteredPackets(): MeshPacket[] {
        if (!this.searchTerm) return this.packets;
        const term = this.searchTerm.toLowerCase();
        return this.packets.filter(p =>
            p.from_long_name?.toLowerCase().includes(term) ||
            (p.text && p.text.toLowerCase().includes(term)) ||
            p.from_node_id?.toString().includes(term)
        );
    }

    viewNodeDetails(node: MeshNode): void {
        this.selectedNode = node;
        this.loadingDetails = true;
        this.nodePackets = [];
        this.nodeTelemetry = [];

        // Fetch node specific packets
        this.meshService.getNodePackets(node.node_id).subscribe({
            next: (packets) => {
                this.nodePackets = packets;
            },
            error: (err) => console.error('Error fetching node packets:', err)
        });

        // Fetch telemetry
        this.meshService.getNodeTelemetry(node.node_id).subscribe({
            next: (packets) => {
                this.nodeTelemetry = packets;
                if (packets.length > 0) {
                    this.latestMetrics = this.parseTelemetry(packets[0].payload);
                }
                this.loadingDetails = false;
            },
            error: (err) => {
                console.error('Error fetching node telemetry:', err);
                this.loadingDetails = false;
            }
        });
    }

    private parseTelemetry(payload: string): TelemetryMetrics | null {
        if (!payload) return null;

        const metrics: TelemetryMetrics = {};

        // Extract metrics using regex
        const batteryMatch = payload.match(/battery_level:\s*(\d+)/);
        const voltageMatch = payload.match(/voltage:\s*([\d.]+)/);
        const channelUtilMatch = payload.match(/channel_utilization:\s*([\d.]+)/);
        const airUtilTxMatch = payload.match(/air_util_tx:\s*([\d.]+)/);
        const uptimeMatch = payload.match(/uptime_seconds:\s*(\d+)/);
        const snrMatch = payload.match(/rx_snr:\s*(-?[\d.]+)/);
        const rssiMatch = payload.match(/rx_rssi:\s*(-?[\d.]+)/);

        if (batteryMatch) metrics.battery_level = parseInt(batteryMatch[1]);
        if (voltageMatch) metrics.voltage = parseFloat(voltageMatch[1]);
        if (channelUtilMatch) metrics.channel_utilization = parseFloat(channelUtilMatch[1]);
        if (airUtilTxMatch) metrics.air_util_tx = parseFloat(airUtilTxMatch[1]);
        if (uptimeMatch) metrics.uptime_seconds = parseInt(uptimeMatch[1]);
        if (snrMatch) metrics.rx_snr = parseFloat(snrMatch[1]);
        if (rssiMatch) metrics.rx_rssi = parseFloat(rssiMatch[1]);

        return Object.keys(metrics).length > 0 ? metrics : null;
    }

    closeDetails(): void {
        this.selectedNode = null;
        this.nodePackets = [];
        this.nodeTelemetry = [];
        this.latestMetrics = null;
    }

    setTab(tab: 'nodes' | 'messages' | 'map'): void {
        this.activeTab = tab;
        if (tab === 'map') {
            this.fetchNodesForMap();
        }
    }

    fetchNodesForMap(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        this.loadingMap = true;
        this.meshService.getAllNodes().subscribe({
            next: (nodes) => {
                this.allNodes = nodes.filter(n => n.last_lat && n.last_long);
                this.loadingMap = false;
                setTimeout(() => this.initMap(), 100);
            },
            error: (err) => {
                console.error('Error fetching nodes for map:', err);
                this.loadingMap = false;
            }
        });
    }

    async initMap() {
        if (!isPlatformBrowser(this.platformId)) return;

        // Dynamic import to avoid SSR issues
        const L = await import('leaflet');

        if (this.map) {
            this.map.remove();
        }

        this.map = L.map('main-map').setView([23.6345, -102.5528], 5); // Mexico center

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        this.updateMapMarkers(L);
    }

    updateMapMarkers(L: any) {
        if (!this.map) return;

        // Clear existing markers
        this.markers.forEach(m => m.remove());
        this.markers = [];

        this.allNodes.forEach(node => {
            if (node.last_lat && node.last_long) {
                // Use CircleMarker to avoid broken image issues with default Leaflet icons
                const marker = L.circleMarker([node.last_lat / 10000000, node.last_long / 10000000], {
                    radius: 8,
                    fillColor: '#006847', // Mexican Green
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                })
                    .bindPopup(`
                    <div class="map-popup">
                        <div class="popup-header">
                            <strong>${node.long_name || node.id}</strong>
                            <span class="popup-role">${node.role || ''}</span>
                        </div>
                        <div class="popup-body">
                            <p>${node.hw_model}</p>
                            <small>Visto: ${this.getTimeAgo(node.last_seen_us)}</small>
                        </div>
                        <button class="btn-popup-details" id="marker-${node.node_id}">Ver detalles completo</button>
                    </div>
                `, {
                        closeButton: false,
                        className: 'custom-popup'
                    })
                    .addTo(this.map);

                // Open modal on marker click (alternative to popup button)
                marker.on('popupopen', () => {
                    document.getElementById(`marker-${node.node_id}`)?.addEventListener('click', () => {
                        this.viewNodeDetails(node);
                    });
                });

                this.markers.push(marker);
            }
        });

        if (this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    formatDate(date?: Date): string {
        if (!date) return '';
        return date.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getNodeImage(hwModel: string): string {
        if (!hwModel) return '';
        // The API provides slugs like RAK4631, HELTEC_V3, etc.
        return this.meshService.getDeviceImage(hwModel);
    }

    getTimeAgo(timestamp?: number): string {
        if (!timestamp) return 'Desconocido';
        const seconds = Math.floor((Date.now() - (timestamp / 1000)) / 1000);

        if (seconds < 60) return 'Hace un momento';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours} h`;
        return `Hace ${Math.floor(hours / 24)} d`;
    }
}
