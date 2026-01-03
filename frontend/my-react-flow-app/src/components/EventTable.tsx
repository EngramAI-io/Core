import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import type { McpLog } from '../types';
import { StreamDirection } from '../types';
import { formatTimestamp, formatLatency } from '../utils/formatters';
import './EventTable.css';

interface EventTableProps {
  events: McpLog[];
  onEventClick: (event: McpLog) => void;
}

const columnHelper = createColumnHelper<McpLog>();

const EventTable: React.FC<EventTableProps> = ({
  events,
  onEventClick,
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('timestamp', {
        header: 'Time',
        cell: (info) => (
          <span className="cell-timestamp">{formatTimestamp(info.getValue())}</span>
        ),
        size: 100,
      }),
      columnHelper.accessor('direction', {
        header: 'Direction',
        cell: (info) => {
          const direction = info.getValue();
          const isInbound = direction === StreamDirection.Inbound;
          return (
            <span className={`pill pill-${isInbound ? 'inbound' : 'outbound'}`}>
              <span className="pill-dot" aria-hidden="true"></span>
              {isInbound ? 'Inbound' : 'Outbound'}
            </span>
          );
        },
        size: 110,
      }),
      columnHelper.accessor('method', {
        header: 'Method',
        cell: (info) => <span className="cell-method">{info.getValue() || '--'}</span>,
        size: 200,
      }),
      columnHelper.accessor('request_id', {
        header: 'Request ID',
        cell: (info) => (
          <span className="cell-request-id">{info.getValue() ?? '--'}</span>
        ),
        size: 100,
      }),
      columnHelper.accessor('latency_ms', {
        header: 'Latency',
        cell: (info) => {
          const latency = info.getValue();
          if (typeof latency !== 'number') {
            return <span className="cell-latency">--</span>;
          }

          const formatted = formatLatency(latency);
          const colorClass =
            latency > 1000 ? 'high' : latency > 500 ? 'medium' : 'low';

          return (
            <div className="latency-cell">
              <span className={`cell-latency cell-latency-${colorClass}`}>
                {formatted}
              </span>
              <div className="latency-bar-container">
                <div
                  className={`latency-bar latency-bar-${colorClass}`}
                  style={{ width: `${Math.min(100, (latency / 2000) * 100)}%` }}
                />
              </div>
            </div>
          );
        },
        size: 140,
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const hasError = (row.original.payload as any)?.error;
          return (
            <span className={`status-pill status-pill-${hasError ? 'error' : 'success'}`}>
              <span className="status-dot" aria-hidden="true"></span>
              {hasError ? 'Error' : 'Success'}
            </span>
          );
        },
        size: 120,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: events,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="event-table-container">
      <div className="table-header">
        <div className="table-title">Events</div>
        <div className="table-count">{events.length} total</div>
      </div>

      <div className="table-wrapper">
        <table className="event-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={header.column.getCanSort() ? 'sortable' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="sort-indicator">
                          {header.column.getIsSorted() === 'asc' ? (
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onEventClick(row.original)}
                className="table-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h10M4 18h7" />
                <circle cx="18" cy="18" r="3" />
                <path d="M20.5 20.5l2 2" />
              </svg>
            </div>
            <div className="empty-text">No events found</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventTable;
