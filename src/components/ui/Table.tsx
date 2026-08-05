import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/utils";
import { EmptyState } from "./EmptyState";

interface Column<T> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T, rowIndex: number) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortColumn?: keyof T | null;
  sortDirection?: "asc" | "desc";
  onSort?: (column: keyof T) => void;
  onRowClick?: (row: T, rowIndex: number) => void;
  emptyText?: string;
  emptyDescription?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  striped?: boolean;
  hoverable?: boolean;
  responsive?: boolean;
  compact?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  emptyText = "No data",
  emptyDescription = "No records to display",
  className,
  rowClassName,
  striped = true,
  hoverable = true,
  responsive = true,
  compact = false,
  pagination,
}: TableProps<T>) {
  const isEmpty = data.length === 0;

  const paginatedData = pagination
    ? data.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize,
      )
    : data;

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable || !onSort) return null;

    if (sortColumn === column.key) {
      return sortDirection === "asc" ? (
        <ChevronUp size={14} />
      ) : (
        <ChevronDown size={14} />
      );
    }

    return <ChevronsUpDown size={14} className="opacity-40" />;
  };

  return (
    <div className={cn("w-full rounded-[16px] overflow-hidden", className)}>
      {/* Container */}
      <div
        className={cn(
          "glass border border-[rgba(255,255,255,0.1)] rounded-[16px] overflow-hidden",
          responsive && "overflow-x-auto",
        )}
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.1)] backdrop-blur-xl">
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: columns
                .map((c) => c.width || "1fr")
                .join(" "),
            }}
          >
            {columns.map((column) => (
              <div
                key={String(column.key)}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]",
                  compact && "py-2",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                )}
              >
                {column.sortable && onSort ? (
                  <button
                    onClick={() => onSort(column.key)}
                    className={cn(
                      "flex items-center gap-1.5 hover:text-[var(--color-text-primary)] transition-colors",
                      sortColumn === column.key && "text-[var(--color-accent)]",
                    )}
                  >
                    {column.label}
                    {renderSortIcon(column)}
                  </button>
                ) : (
                  column.label
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {isEmpty ? (
          <div className="px-4 py-12">
            <EmptyState title={emptyText} description={emptyDescription} />
          </div>
        ) : (
          <div>
            {paginatedData.map((row, index) => (
              <div
                key={index}
                onClick={() => onRowClick?.(row, index)}
                className={cn(
                  "grid gap-px border-b border-[rgba(255,255,255,0.05)] transition-all duration-150",
                  striped && index % 2 === 1 && "bg-[rgba(255,255,255,0.02)]",
                  hoverable &&
                    onRowClick &&
                    "cursor-pointer hover:bg-[rgba(59,130,246,0.1)]",
                  hoverable &&
                    !onRowClick &&
                    "hover:bg-[rgba(255,255,255,0.03)]",
                  rowClassName?.(row, index),
                )}
                style={{
                  gridTemplateColumns: columns
                    .map((c) => c.width || "1fr")
                    .join(" "),
                }}
              >
                {columns.map((column) => (
                  <div
                    key={String(column.key)}
                    className={cn(
                      "px-4 py-3 text-sm text-[var(--color-text-primary)] truncate",
                      compact && "py-2",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.render
                      ? column.render(row[column.key], row, index)
                      : String(row[column.key] ?? "—")}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && !isEmpty && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-[var(--color-text-muted)]">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                pagination.onPageChange(Math.max(1, pagination.page - 1))
              }
              disabled={pagination.page === 1}
              className={cn(
                "px-3 py-1.5 rounded-[10px] text-sm font-medium transition-all duration-200",
                "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-primary)]",
                "hover:bg-[rgba(59,130,246,0.15)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const isNearCurrent = Math.abs(pageNum - pagination.page) <= 2;
              const isFirst = pageNum === 1;
              const isLast = pageNum === totalPages;

              if (!isNearCurrent && !isFirst && !isLast) return null;

              if (!isNearCurrent && isFirst)
                return (
                  <React.Fragment key={pageNum}>
                    <button
                      onClick={() => pagination.onPageChange(1)}
                      className={cn(
                        "px-2 py-1.5 rounded-[10px] text-sm font-medium transition-all duration-200",
                        pagination.page === 1
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-primary)] hover:bg-[rgba(59,130,246,0.15)]",
                      )}
                    >
                      1
                    </button>
                    <span className="text-[var(--color-text-muted)]">...</span>
                  </React.Fragment>
                );

              if (!isNearCurrent && isLast)
                return (
                  <React.Fragment key={pageNum}>
                    <span className="text-[var(--color-text-muted)]">...</span>
                    <button
                      onClick={() => pagination.onPageChange(totalPages)}
                      className={cn(
                        "px-2 py-1.5 rounded-[10px] text-sm font-medium transition-all duration-200",
                        pagination.page === totalPages
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-primary)] hover:bg-[rgba(59,130,246,0.15)]",
                      )}
                    >
                      {totalPages}
                    </button>
                  </React.Fragment>
                );

              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={cn(
                    "px-2 py-1.5 rounded-[10px] text-sm font-medium transition-all duration-200",
                    pagination.page === pageNum
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-primary)] hover:bg-[rgba(59,130,246,0.15)]",
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() =>
                pagination.onPageChange(
                  Math.min(totalPages, pagination.page + 1),
                )
              }
              disabled={pagination.page === totalPages}
              className={cn(
                "px-3 py-1.5 rounded-[10px] text-sm font-medium transition-all duration-200",
                "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-primary)]",
                "hover:bg-[rgba(59,130,246,0.15)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
