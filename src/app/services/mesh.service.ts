import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, forkJoin, map, reduce, shareReplay, catchError, of } from 'rxjs';
import {
    DeviceHardware,
    MeshNode,
    MeshPacket,
    MeshStats,
    NodeTotals,
    NodesResponse,
    PacketsResponse,
    TelemetryPoint,
} from '../models/mesh.model';
import { normalizeModel, parseTelemetry } from '../utils/node-utils';

/** La API de MeshView entrega como máximo 200 nodos por petición. */
const NODES_PAGE_SIZE = 200;
/** Tiempo que reutilizamos la lista completa de nodos entre páginas. */
const NODES_CACHE_MS = 60_000;

@Injectable({
    providedIn: 'root'
})
export class MeshService {
    private readonly http = inject(HttpClient);

    private baseUrl = '/mesh-api';
    private meshtasticBaseUrl = '/meshtastic-api';
    private resourceBaseUrl = '/meshtastic-resource';

    private allNodes$?: Observable<MeshNode[]>;
    private allNodesFetchedAt = 0;
    private stats$?: Observable<MeshStats>;
    private totals$?: Observable<NodeTotals>;
    private firmware$?: Observable<string>;
    private hardwareRequested = false;

    /** Imagen oficial por modelo normalizado (se llena con loadHardwareImages). */
    private readonly hwImages = signal<ReadonlyMap<string, string>>(new Map());

    // ---------- Nodos ----------

    /**
     * Todos los nodos de México. Recorre las páginas mientras `has_next` sea true
     * y comparte el resultado durante NODES_CACHE_MS entre quienes lo pidan.
     */
    getAllNodes(force = false): Observable<MeshNode[]> {
        const expired = Date.now() - this.allNodesFetchedAt > NODES_CACHE_MS;
        if (!this.allNodes$ || force || expired) {
            this.allNodesFetchedAt = Date.now();
            const fetchPage = (page: number) =>
                this.http.get<NodesResponse>(`${this.baseUrl}/nodes`, {
                    params: { limit: NODES_PAGE_SIZE, page },
                });

            this.allNodes$ = fetchPage(1).pipe(
                expand((res) => (res.has_next ? fetchPage(res.page + 1) : EMPTY)),
                reduce((all, res) => all.concat(res.nodes), [] as MeshNode[]),
                map((nodes) => dedupeNodes(nodes)),
                catchError((err) => {
                    // No guardar un error en caché: el siguiente intento vuelve a pedir.
                    this.allNodes$ = undefined;
                    throw err;
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        }
        return this.allNodes$;
    }

    getNodeById(nodeId: number): Observable<MeshNode | null> {
        return this.http
            .get<NodesResponse>(`${this.baseUrl}/nodes`, { params: { node_id: nodeId } })
            .pipe(map((response) => response.nodes[0] ?? null));
    }

    /** Totales ligeros (1 nodo por petición) para las estadísticas de otras páginas. */
    getNodeTotals(): Observable<NodeTotals> {
        this.totals$ ??= forkJoin({
            total: this.http
                .get<NodesResponse>(`${this.baseUrl}/nodes`, { params: { limit: 1 } })
                .pipe(map((r) => r.total)),
            routers: this.http
                .get<NodesResponse>(`${this.baseUrl}/nodes`, { params: { limit: 1, role: 'ROUTER' } })
                .pipe(map((r) => r.total)),
        }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
        return this.totals$;
    }

    /** Resumen de los últimos 7 días: paquetes, nodos activos y conteo diario. */
    getStats(): Observable<MeshStats> {
        this.stats$ ??= this.http
            .get<{ stats: MeshStats }>(`${this.baseUrl}/stats`)
            .pipe(
                map((r) => r.stats),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        return this.stats$;
    }

    // ---------- Paquetes ----------

    getPackets(topic: string = 'mexico', limit: number = 50, page: number = 1): Observable<MeshPacket[]> {
        return this.http.get<PacketsResponse>(`${this.baseUrl}/packets?portnum=1&limit=${limit}&topic=${topic}&page=${page}`)
            .pipe(
                map(response => response.packets.map(packet => this.processPacket(packet)))
            );
    }

    /** Mensajes de texto (portnum 1) enviados por un nodo. */
    getNodeMessages(nodeId: number, limit: number = 30): Observable<MeshPacket[]> {
        return this.http
            .get<PacketsResponse>(`${this.baseUrl}/packets`, {
                params: { from_node_id: nodeId, portnum: 1, limit, topic: 'mexico' },
            })
            .pipe(map((response) => response.packets.map((packet) => this.processPacket(packet))));
    }

    /** Lecturas de telemetría (portnum 67) de un nodo, de la más antigua a la más reciente. */
    getNodeTelemetry(nodeId: number, limit: number = 200): Observable<TelemetryPoint[]> {
        return this.http
            .get<PacketsResponse>(`${this.baseUrl}/packets`, {
                params: { from_node_id: nodeId, portnum: 67, limit, topic: 'mexico' },
            })
            .pipe(
                map((response) =>
                    response.packets
                        .map((packet) => {
                            const metrics = parseTelemetry(packet.payload);
                            return metrics ? { ...metrics, time: new Date(packet.import_time_us / 1000) } : null;
                        })
                        .filter((point): point is TelemetryPoint => point !== null)
                        .sort((a, b) => a.time.getTime() - b.time.getTime()),
                ),
            );
    }

    // ---------- Firmware y hardware ----------

    getLatestFirmware(): Observable<string> {
        this.firmware$ ??= this.http.get<any>(`${this.meshtasticBaseUrl}/github/firmware/list`).pipe(
            map((response) => response.releases.stable[0].id as string),
            catchError(() => of('')),
            shareReplay({ bufferSize: 1, refCount: false }),
        );
        return this.firmware$;
    }

    /** Carga (una sola vez) el catálogo oficial de hardware para mostrar imágenes de los equipos. */
    loadHardwareImages(): void {
        if (this.hardwareRequested) return;
        this.hardwareRequested = true;

        this.http.get<DeviceHardware[]>(`${this.resourceBaseUrl}/deviceHardware`).subscribe({
            next: (data) => {
                const images = new Map<string, string>();
                for (const hw of data) {
                    const image = hw.images?.[0];
                    if (!image) continue;
                    images.set(normalizeModel(hw.hwModelSlug), image);
                    if (hw.platformioTarget) images.set(normalizeModel(hw.platformioTarget), image);
                }
                this.hwImages.set(images);
            },
            error: (err) => {
                this.hardwareRequested = false;
                console.error('Error fetching hardware list:', err);
            },
        });
    }

    getDeviceImage(hwModel: string | null | undefined): string {
        if (!hwModel) return '';
        const imageName = this.hwImages().get(normalizeModel(hwModel));
        return imageName ? `https://flasher.meshtastic.org/img/devices/${imageName}` : '';
    }

    // ---------- Internos ----------

    private processPacket(packet: MeshPacket): MeshPacket {
        return {
            ...packet,
            text: this.extractTextFromPayload(packet.payload),
            timestamp: new Date(packet.import_time_us / 1000)
        };
    }


    private extractTextFromPayload(payload: string): string {
        // Look for text: "..." in the payload string
        const match = payload.match(/text:\s*"([^"]*)"/);
        if (match && match[1]) {
            return match[1];
        }

        // Fallback if not found
        // If it's a long string, maybe just show a portion or clean it up
        if (payload.includes('payload {\n  text:')) {
            const parts = payload.split('payload {\n  text: "');
            if (parts.length > 1) {
                return parts[1].split('"')[0];
            }
        }

        return 'Mensaje sin texto legible';
    }
}

/** Al paginar una lista que cambia en vivo, un nodo puede aparecer en dos páginas. */
function dedupeNodes(nodes: MeshNode[]): MeshNode[] {
    const byId = new Map<number, MeshNode>();
    for (const node of nodes) {
        const existing = byId.get(node.node_id);
        if (!existing || node.last_seen_us > existing.last_seen_us) byId.set(node.node_id, node);
    }
    return [...byId.values()];
}
