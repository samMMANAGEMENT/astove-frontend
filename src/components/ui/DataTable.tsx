import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Paginator } from './index';

export interface Column<T> {
  key: keyof T;
  header: string | React.ReactNode;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

interface Action<T> {
  icon: LucideIcon;
  onClick: (row: T) => void;
  variant?: 'primary' | 'success' | 'danger' | 'warning';
  tooltip?: string | ((row: T) => string);
  disabled?: (row: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string | React.ReactNode;
  showPagination?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  actions,
  onRowClick,
  className = '',
  emptyMessage = 'No hay datos disponibles',
  showPagination = false,
  page,
  totalPages,
  onPageChange,
}: DataTableProps<T>) => {
  const getActionClasses = (variant: string) => {
    const baseClasses = 'p-1 rounded hover:bg-opacity-10 transition-colors duration-200 text-black';
    const variantClasses = {
      primary: 'text-blue-600 hover:text-blue-900 hover:bg-blue-50',
      success: 'text-green-600 hover:text-green-900 hover:bg-green-50',
      danger: 'text-red-600 hover:text-red-900 hover:bg-red-50',
      warning: 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50',
    };
    return `${baseClasses} ${variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary}`;
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        {typeof emptyMessage === 'string' ? (
          <p className="text-gray-500">{emptyMessage}</p>
        ) : (
          emptyMessage
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-black ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={index}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || '')}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {actions.map((action, actionIndex) => {
                        const Icon = action.icon;
                        const isDisabled = action.disabled ? action.disabled(row) : false;
                        const tooltipText = typeof action.tooltip === 'function' ? action.tooltip(row) : action.tooltip;

                        return (
                          <button
                            key={actionIndex}
                            className={`${getActionClasses(action.variant || 'primary')} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDisabled) {
                                action.onClick(row);
                              }
                            }}
                            title={tooltipText}
                            disabled={isDisabled}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPagination && page !== undefined && totalPages !== undefined && onPageChange && (
        <Paginator page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
};

export default DataTable; 