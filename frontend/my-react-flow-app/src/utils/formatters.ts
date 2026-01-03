import { formatDistanceToNow, format } from 'date-fns';

export function formatTimestamp(timestamp: number, relative: boolean = false): string {
    const date = new Date(timestamp);

    if (relative) {
        return formatDistanceToNow(date, { addSuffix: true });
    }

    return format(date, 'HH:mm:ss.SSS');
}

export function formatLatency(ms: number): string {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}

export function formatNumber(num: number): string {
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
}

export function formatRequestsPerSecond(rps: number): string {
    if (rps < 0.01) return '0 req/s';
    if (rps < 1) return `${rps.toFixed(2)} req/s`;
    if (rps < 10) return `${rps.toFixed(1)} req/s`;
    return `${Math.round(rps)} req/s`;
}
