import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MeshNode, NodesResponse, PacketsResponse, MeshPacket } from '../models/mesh.model';

@Injectable({
    providedIn: 'root'
})
export class MeshService {
    private baseUrl = '/mesh-api';
    private meshtasticBaseUrl = '/meshtastic-api';
    private resourceBaseUrl = '/meshtastic-resource';
    private deviceHardware: any[] = [];
    private hwMapping: Map<string, string> = new Map();

    constructor(private http: HttpClient) {
        this.fetchHardwareList();
    }

    private fetchHardwareList() {
        this.http.get<any[]>(`${this.resourceBaseUrl}/deviceHardware`).subscribe({
            next: (data) => {
                this.deviceHardware = data;
                data.forEach(hw => {
                    if (hw.images && hw.images.length > 0) {
                        // Store image with normalized slug (lowercase, no hyphens/underscores)
                        const normalizedSlug = hw.hwModelSlug.toLowerCase().replace(/[-_]/g, '');
                        this.hwMapping.set(normalizedSlug, hw.images[0]);

                        // Also store by platformioTarget if available
                        if (hw.platformioTarget) {
                            const normalizedTarget = hw.platformioTarget.toLowerCase().replace(/[-_]/g, '');
                            this.hwMapping.set(normalizedTarget, hw.images[0]);
                        }
                    }
                });
            },
            error: (err) => console.error('Error fetching hardware list:', err)
        });
    }

    getDeviceImage(hwModel: string): string {
        if (!hwModel) return '';

        // Normalize input model name
        const normalizedInput = hwModel.toLowerCase().replace(/[-_]/g, '');
        const imageName = this.hwMapping.get(normalizedInput);

        if (imageName) {
            return `https://flasher.meshtastic.org/img/devices/${imageName}`;
        }
        return '';
    }

    getLatestFirmware(): Observable<string> {
        return this.http.get<any>(`${this.meshtasticBaseUrl}/github/firmware/list`)
            .pipe(map(response => response.releases.stable[0].id));
    }

    getNodes(limit: number = 50, page: number = 1): Observable<NodesResponse> {
        return this.http.get<NodesResponse>(`${this.baseUrl}/nodes?limit=${limit}&page=${page}`);
    }

    getAllNodes(): Observable<MeshNode[]> {
        return this.http.get<NodesResponse>(`${this.baseUrl}/nodes?limit=1000`)
            .pipe(map(response => response.nodes));
    }

    getNodeById(nodeId: number): Observable<MeshNode | null> {
        return this.http.get<NodesResponse>(`${this.baseUrl}/nodes?node_id=${nodeId}`)
            .pipe(map(response => response.nodes.length > 0 ? response.nodes[0] : null));
    }

    getPackets(topic: string = 'mexico', limit: number = 50, page: number = 1): Observable<MeshPacket[]> {
        return this.http.get<PacketsResponse>(`${this.baseUrl}/packets?portnum=1&limit=${limit}&topic=${topic}&page=${page}`)
            .pipe(
                map(response => response.packets.map(packet => this.processPacket(packet)))
            );
    }

    getNodePackets(nodeId: number, limit: number = 50): Observable<MeshPacket[]> {
        return this.http.get<PacketsResponse>(`${this.baseUrl}/packets?node_id=${nodeId}&limit=${limit}&topic=mexico`)
            .pipe(
                map(response => response.packets.map(packet => this.processPacket(packet)))
            );
    }

    getNodeTelemetry(nodeId: number, limit: number = 50): Observable<MeshPacket[]> {
        return this.http.get<PacketsResponse>(`${this.baseUrl}/packets?from_node_id=${nodeId}&portnum=67&limit=${limit}&topic=mexico`)
            .pipe(
                map(response => response.packets.map(packet => this.processPacket(packet)))
            );
    }

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
