import React, { useState, useEffect } from 'react';
import { FileText, Eye } from 'lucide-react';
import { facturacionService } from '../lib/services/facturacionService';
import type { Factura } from '../lib/services/facturacionService';
import { Button, DataTable, PageHeader, Modal, Badge, Spinner } from '../components/ui';
import type { Column } from '../components/ui/DataTable';

const FacturacionPage: React.FC = () => {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Action states
    const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);

    useEffect(() => {
        loadFacturas();
    }, [currentPage]);

    const loadFacturas = async () => {
        setIsLoading(true);
        try {
            const response = await facturacionService.listarFacturas({ page: currentPage, per_page: 10 });
            setFacturas(response.data);
            setTotalPages(response.pagination.total_pages);
            // Clear selection on page change if desired, or keep it. Keeping it for now.
        } catch (error) {
            console.error('Error al cargar facturas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAll = () => {
        const currentIds = facturas.map(f => f.id);
        const allSelected = currentIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
        } else {
            const newIds = currentIds.filter(id => !selectedIds.includes(id));
            setSelectedIds(prev => [...prev, ...newIds]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleView = (factura: Factura) => {
        setSelectedFactura(factura);
        setShowViewModal(true);
    };

    const handleGenerarFactura = async (factura: Factura) => {
        setGeneratingPdfId(factura.id);
        try {
            const blob = await facturacionService.descargarPDF(factura.id);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Error al generar la factura. Intente nuevamente.');
        } finally {
            setGeneratingPdfId(null);
        }
    };

    const handleGenerarFacturasMasivas = async () => {
        if (selectedIds.length === 0) return;

        setIsBulkGenerating(true);
        // Warning: This might trigger popup blockers if many are opened
        for (const id of selectedIds) {
            try {
                const blob = await facturacionService.descargarPDF(id);
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } catch (error) {
                console.error(`Error al generar PDF para ${id}:`, error);
            }
        }
        setIsBulkGenerating(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getMetodoPagoBadge = (metodo: string) => {
        const variants: Record<string, "success" | "warning" | "info" | "default"> = {
            efectivo: 'success',
            transferencia: 'info',
            mixto: 'warning'
        };
        return <Badge variant={variants[metodo] || 'default'}>{metodo ? metodo.toUpperCase() : 'N/A'}</Badge>;
    };

    const isAllSelected = facturas.length > 0 && facturas.every(f => selectedIds.includes(f.id));

    const columns: Column<Factura>[] = [
        {
            key: 'id' as keyof Factura, // Casting for strict typing
            header: (
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                    />
                </div>
            ),
            render: (_: any, row: Factura) => (
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => handleSelectOne(row.id)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium text-gray-900">#{row.id}</span>
                </div>
            )
        },
        {
            key: 'fecha',
            header: 'Fecha',
            render: (value: any) => <span className="text-sm text-gray-900">{formatDate(value)}</span>
        },
        {
            key: 'empleado',
            header: 'Vendedor',
            render: (value: any) => (
                <div className="text-sm text-gray-900">
                    {value ? `${value.nombre} ${value.apellido}` : 'Sistema'}
                </div>
            )
        },
        {
            key: 'productos',
            header: 'Productos Vendidos',
            render: (value: any) => (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                    {Array.isArray(value) && value.length > 0 ? value.map((prod, idx) => (
                        <div key={idx} className="text-xs flex justify-between gap-2 text-gray-900">
                            <span>{prod.nombre} (x{prod.pivot.cantidad})</span>
                        </div>
                    )) : <span className="text-gray-400 italic">Sin productos</span>}
                </div>
            )
        },
        {
            key: 'total',
            header: 'Total Venta',
            render: (value: any) => <span className="font-bold text-green-600">{formatCurrency(value)}</span>
        },
        {
            key: 'metodo_pago',
            header: 'Método Pago',
            render: (value: any) => getMetodoPagoBadge(String(value))
        },
        {
            key: 'id' as keyof Factura,
            header: 'Acciones',
            render: (_: any, row: Factura) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(row)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        // Simplified manual success style since Button variant might be limited
                        className={`text-green-600 hover:text-green-800 hover:bg-green-50 ${generatingPdfId === row.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerarFactura(row)}
                        disabled={generatingPdfId === row.id}
                    >
                        {generatingPdfId === row.id ? (
                            <Spinner size="sm" className="mr-1" />
                        ) : (
                            <FileText className="w-4 h-4 mr-1" />
                        )}
                        <span className="text-xs">{generatingPdfId === row.id ? '...' : 'Generar'}</span>
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
                <PageHeader
                    title="Facturación Electrónica"
                    subtitle="Gestión y emisión de facturas electrónicas para ventas realizadas"
                />
                {selectedIds.length > 0 && (
                    <Button
                        variant="primary"
                        onClick={handleGenerarFacturasMasivas}
                        className="animate-in fade-in zoom-in duration-300"
                        disabled={isBulkGenerating}
                    >
                        {isBulkGenerating ? (
                            <Spinner size="sm" className="mr-2 text-white" />
                        ) : (
                            <FileText className="w-4 h-4 mr-2" />
                        )}
                        {isBulkGenerating ? 'Generando...' : `Generar ${selectedIds.length} Facturas`}
                    </Button>
                )}
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <DataTable
                        data={facturas}
                        columns={columns}
                        // removed actions in favor of custom column
                        emptyMessage="No hay ventas pendientes de facturación"
                        showPagination={true}
                        page={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {/* Modal Detalle */}
            <Modal
                isOpen={showViewModal}
                onClose={() => setShowViewModal(false)}
                title={`Detalle de Venta #${selectedFactura?.id}`}
                size="lg"
            >
                {selectedFactura && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-500">Fecha de Venta</p>
                                <p className="font-medium text-gray-900">{formatDate(selectedFactura.fecha)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Vendedor</p>
                                <p className="font-medium text-gray-900">
                                    {selectedFactura.empleado ? `${selectedFactura.empleado.nombre} ${selectedFactura.empleado.apellido}` : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Método de Pago</p>
                                <div className="mt-1">{getMetodoPagoBadge(selectedFactura.metodo_pago || '')}</div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">ID Referencia</p>
                                <p className="font-mono text-sm text-gray-900">{selectedFactura.id}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                Productos Vendidos
                            </h4>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                            <th className="p-3">Producto</th>
                                            <th className="p-3 text-center">Cant.</th>
                                            <th className="p-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {selectedFactura.productos?.map((prod, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-900">{prod.nombre}</td>
                                                <td className="p-3 text-center text-gray-900">{prod.pivot.cantidad}</td>
                                                <td className="p-3 text-right font-medium text-gray-900">
                                                    {formatCurrency(prod.pivot.subtotal)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-semibold">
                                        <tr>
                                            <td colSpan={2} className="p-3 text-right text-gray-900">Total</td>
                                            <td className="p-3 text-right text-green-600 text-base">
                                                {formatCurrency(selectedFactura.total)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {selectedFactura.observaciones && (
                            <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
                                <p className="text-sm text-yellow-800 font-medium">Observaciones:</p>
                                <p className="text-sm text-yellow-700 mt-1">{selectedFactura.observaciones}</p>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button variant="primary" onClick={() => handleGenerarFactura(selectedFactura)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Generar Factura Electrónica
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FacturacionPage;
