import React from 'react';
import { Calendar, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input } from './ui';

interface FilterState {
  fechaDesde: string;
  fechaHasta: string;
  empleadoId: string;
  metodoPago: string;
  precioMinimo: string;
  precioMaximo: string;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  operadores: Array<{ id: string; name: string }>;
  isOpen: boolean;
  onToggle: () => void;
  showOperadorFilter?: boolean;
  isLoading?: boolean;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  onApplyFilters,
  operadores,
  isOpen,
  onToggle,
  showOperadorFilter = true,
  isLoading = false
}) => {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6">
      {/* Header del filtro */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filtros Avanzados</h3>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {Object.values(filters).filter(value => value !== '').length} activos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onClearFilters();
              }}
              className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </button>
          )}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Contenido del filtro */}
      {isOpen && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro por rango de fechas */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha desde
              </label>
              <Input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                placeholder="Seleccionar fecha"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha hasta
              </label>
              <Input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                placeholder="Seleccionar fecha"
                disabled={isLoading}
              />
            </div>

            {/* Filtro por operador - solo para admin/supervisor */}
            {showOperadorFilter && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Operador
                </label>
                <select
                  value={filters.empleadoId}
                  onChange={(e) => handleFilterChange('empleadoId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  disabled={isLoading}
                >
                  <option value="">Todos los operadores</option>
                  {operadores.map((operador) => (
                    <option key={operador.id} value={operador.id}>
                      {operador.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por método de pago */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Método de Pago
              </label>
                <select
                  value={filters.metodoPago}
                  onChange={(e) => handleFilterChange('metodoPago', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  disabled={isLoading}
                >
                <option value="">Todos los métodos</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

            {/* Filtro por rango de precios */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Precio mínimo
              </label>
              <Input
                type="number"
                value={filters.precioMinimo}
                onChange={(e) => handleFilterChange('precioMinimo', e.target.value)}
                placeholder="0"
                min="0"
                step="1000"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Precio máximo
              </label>
              <Input
                type="number"
                value={filters.precioMaximo}
                onChange={(e) => handleFilterChange('precioMaximo', e.target.value)}
                placeholder="Sin límite"
                min="0"
                step="1000"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClearFilters}
              disabled={!hasActiveFilters || isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
            <Button
              onClick={onApplyFilters}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4 mr-2" />
                  Aplicar Filtros
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
