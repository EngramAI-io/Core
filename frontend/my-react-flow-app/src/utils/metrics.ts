import type { McpLog } from '../types';
import { StreamDirection } from '../types';

export interface MetricsData {
    requestsPerSecond: number;
    errorRate: number;
    p95Latency: number;
    activeTools: number;
    totalRequests: number;
    totalErrors: number;
}

export function calculateMetrics(events: McpLog[], windowSeconds: number = 60): MetricsData {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const recentEvents = events.filter(e => now - e.timestamp < windowMs);

    const totalRequests = events.length;
    const recentRequestCount = recentEvents.length;
    const requestsPerSecond = windowSeconds > 0 ? recentRequestCount / windowSeconds : 0;

    // Count errors (Inbound with error payload)
    const totalErrors = events.filter(
        e => e.direction === StreamDirection.Inbound && (e.payload as any)?.error
    ).length;

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Calculate P95 latency
    const latencies = events
        .filter(e => e.direction === StreamDirection.Inbound && typeof e.latency_ms === 'number')
        .map(e => e.latency_ms!)
        .sort((a, b) => a - b);

    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies.length > 0 ? latencies[p95Index] || 0 : 0;

    // Count unique tools (methods)
    const uniqueMethods = new Set(
        events
            .filter(e => e.method)
            .map(e => e.method!)
    );
    const activeTools = uniqueMethods.size;

    return {
        requestsPerSecond,
        errorRate,
        p95Latency,
        activeTools,
        totalRequests,
        totalErrors,
    };
}

export function calculateP50(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.5);
    return sorted[idx] || 0;
}

export function calculateP99(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[idx] || 0;
}

export function groupByTimeWindow(
    events: McpLog[],
    windowMs: number
): Map<number, McpLog[]> {
    const groups = new Map<number, McpLog[]>();

    events.forEach(event => {
        const bucket = Math.floor(event.timestamp / windowMs) * windowMs;
        const existing = groups.get(bucket) || [];
        existing.push(event);
        groups.set(bucket, existing);
    });

    return groups;
}
