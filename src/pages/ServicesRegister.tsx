import { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal';
import Autocomplete from '../components/ui/Autocomplete';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CustomDatePicker from '../components/ui/DatePicker';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import { DataTable, PageHeader, SearchFilters, Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import servicioService, { type ServicioRealizado, type PaginationInfo } from '../lib/services/servicioService';
import { Trash2, AlertTriangle } from 'lucide-react';
import AdvancedFilters from '../components/AdvancedFilters';
import '../lib/dateConfig';
import { formatDateForAPI } from '../lib/dateConfig';

interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  porcentaje_pago_empleado: string;
}

interface Operador {
  id: string;
  name: string;
}

interface ServicioSeleccionado {
  servicio: Servicio;
  cantidad: string;
  descuentoPorcentaje: string;
  total: number;
  totalConDescuento: number;
}



export default function ServicesRegister() {
  const { user } = useAuth();

  // Estados para servicios y operadores
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [selectedOperador, setSelectedOperador] = useState<Operador | null>(null);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'mixto'>('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoTransferencia, setMontoTransferencia] = useState('');
  const [fechaServicio, setFechaServicio] = useState<Date>(new Date()); // Fecha por defecto: hoy
  const [modalOpen, setModalOpen] = useState(false);

  // Estados para múltiples servicios
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<ServicioSeleccionado[]>([]);
  const [showServiciosSelector, setShowServiciosSelector] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [servicioSearchValue, setServicioSearchValue] = useState('');
  const [serviciosRealizados, setServiciosRealizados] = useState<ServicioRealizado[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    from: 0,
    to: 0
  });
  const [perPage, setPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<ServicioRealizado | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para filtros avanzados
  const [filters, setFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    empleadoId: '',
    metodoPago: '',
    precioMinimo: '',
    precioMaximo: ''
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Hooks para API
  const apiServicios = useApi();
  const apiOperadores = useApi();
  const apiAsignar = useApi();

  // Función helper para formatear moneda en formato colombiano
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Función para formatear número para input (sin símbolo de moneda)
  const formatNumberForInput = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Función para desformatear número (quitar separadores)
  const unformatNumber = (value: string) => {
    return value.replace(/\./g, '').replace(/,/g, '');
  };

  // Función helper para formatear fechas de manera consistente
  const formatDate = (dateValue: string | Date) => {
    // Si la fecha viene como string Y-m-d, usarla directamente
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('es-CO');
    }
    // Si viene como datetime con hora, mostrar fecha y hora
    if (typeof dateValue === 'string' && dateValue.includes(':')) {
      const date = new Date(dateValue);
      return date.toLocaleDateString('es-CO') + ' ' + date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    // Si viene como datetime, usar el método normal
    return new Date(dateValue).toLocaleDateString('es-CO');
  };

  // Obtener servicios al montar
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apiServicios.get('/servicios/listar-servicio'),
      cargarServiciosRealizados()
    ])
      .then(([serviciosData]) => {
        // Asegurar que siempre sean arrays
        setServicios(Array.isArray(serviciosData) ? serviciosData : []);
      })
      .catch((error) => {
        console.error('Error cargando datos:', error);
        // En caso de error, establecer arrays vacíos
        setServicios([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Cargar operadores para filtros (solo para admin/supervisor)
  useEffect(() => {
    if (user?.role?.nombre !== 'operador') {
      apiOperadores.get('/operadores/listar-operador')
        .then((data) => {
          // Mapear para mostrar nombre + apellido
          const operadoresMapeados = (Array.isArray(data) ? data : []).map((op: any) => ({
            id: op.id.toString(),
            name: `${op.nombre} ${op.apellido}`
          }));
          setOperadores(operadoresMapeados);
        })
        .catch((error) => {
          console.error('Error cargando operadores para filtros:', error);
          setOperadores([]);
        });
    }
  }, [user]);

  // Obtener operadores cuando se abre el modal
  useEffect(() => {
    if (modalOpen) {
      // Si el usuario es operador, solo cargar su información
      if (user?.role?.nombre === 'operador' && user?.operador) {
        const operadorActual = {
          id: user.operador.id.toString(),
          name: `${user.operador.nombre} ${user.operador.apellido}`
        };
        setOperadores([operadorActual]);
        setSelectedOperador(operadorActual); // Auto-seleccionar el operador actual
      } else {
        // Si es admin o supervisor, cargar todos los operadores
        apiOperadores.get('/operadores/listar-operador')
          .then((data) => {
            // Mapear para mostrar nombre + apellido
            const operadoresMapeados = (Array.isArray(data) ? data : []).map((op: any) => ({
              id: op.id.toString(),
              name: `${op.nombre} ${op.apellido}`
            }));
            setOperadores(operadoresMapeados);
          })
          .catch((error) => {
            console.error('Error cargando operadores:', error);
            setOperadores([]);
          });
      }
    }
  }, [modalOpen, user]);

  // Recalcular montos automáticamente cuando cambie la cantidad, descuento o el método de pago
  useEffect(() => {
    if (serviciosSeleccionados.length > 0 && modalOpen) {
      const totalServicios = calcularTotalServiciosSeleccionados();

      // Redondear a 2 decimales
      const totalRedondeado = Math.round(totalServicios * 100) / 100;

      // Solo actualizar si los montos actuales no suman el total correcto
      const totalActual = calcularTotalMontos();
      const totalActualRedondeado = Math.round(totalActual * 100) / 100;

      if (Math.abs(totalRedondeado - totalActualRedondeado) > 0.01) {
        if (metodoPago === 'efectivo') {
          setMontoEfectivo(formatNumberForInput(totalRedondeado));
          setMontoTransferencia('0');
        } else if (metodoPago === 'transferencia') {
          setMontoEfectivo('0');
          setMontoTransferencia(formatNumberForInput(totalRedondeado));
        } else if (metodoPago === 'mixto') {
          const mitad = totalRedondeado / 2;
          setMontoEfectivo(formatNumberForInput(mitad));
          setMontoTransferencia(formatNumberForInput(mitad));
        }
      }
    }
  }, [serviciosSeleccionados, metodoPago, modalOpen]);



  // Abrir modal y setear servicio seleccionado
  const handleOpenModal = (servicio: Servicio) => {
    setSelectedOperador(null);
    setMetodoPago('efectivo');
    setMontoEfectivo('');
    setMontoTransferencia('');
    setFechaServicio(new Date()); // Resetear a fecha actual
    setModalOpen(true);
    setSuccessMsg('');

    // Agregar el servicio seleccionado a la lista de múltiples servicios
    const nuevoServicio: ServicioSeleccionado = {
      servicio,
      cantidad: '1',
      descuentoPorcentaje: '0',
      total: servicio.precio,
      totalConDescuento: servicio.precio
    };
    setServiciosSeleccionados([nuevoServicio]);
  };



  // Agregar servicio a la lista de seleccionados
  const agregarServicioALista = (servicio: Servicio) => {
    const yaExiste = serviciosSeleccionados.find(s => s.servicio.id === servicio.id);
    if (yaExiste) {
      toast.warning('Este servicio ya está en la lista');
      return;
    }

    const nuevoServicio: ServicioSeleccionado = {
      servicio,
      cantidad: '1',
      descuentoPorcentaje: '0',
      total: servicio.precio,
      totalConDescuento: servicio.precio
    };

    setServiciosSeleccionados([...serviciosSeleccionados, nuevoServicio]);
    setServicioSearchValue(''); // Limpiar el campo de búsqueda
  };

  // Remover servicio de la lista
  const removerServicioDeLista = (servicioId: string) => {
    setServiciosSeleccionados(serviciosSeleccionados.filter(s => s.servicio.id !== servicioId));
  };

  // Actualizar cantidad de un servicio
  const actualizarCantidadServicio = (servicioId: string, cantidad: string) => {
    setServiciosSeleccionados(serviciosSeleccionados.map(s => {
      if (s.servicio.id === servicioId) {
        const total = s.servicio.precio * Number(cantidad);
        const descuento = total * (Number(s.descuentoPorcentaje) / 100);
        return {
          ...s,
          cantidad,
          total,
          totalConDescuento: total - descuento
        };
      }
      return s;
    }));
  };

  // Actualizar descuento de un servicio
  const actualizarDescuentoServicio = (servicioId: string, descuento: string) => {
    setServiciosSeleccionados(serviciosSeleccionados.map(s => {
      if (s.servicio.id === servicioId) {
        const total = s.servicio.precio * Number(s.cantidad);
        const montoDescuento = total * (Number(descuento) / 100);
        return {
          ...s,
          descuentoPorcentaje: descuento,
          total,
          totalConDescuento: total - montoDescuento
        };
      }
      return s;
    }));
  };

  // Calcular total de todos los servicios seleccionados
  const calcularTotalServiciosSeleccionados = () => {
    return serviciosSeleccionados.reduce((total, s) => total + s.totalConDescuento, 0);
  };

  // Cerrar modal y resetear formulario
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOperador(null);
    setMetodoPago('efectivo');
    setMontoEfectivo('');
    setMontoTransferencia('');
    setFechaServicio(new Date());
    setServiciosSeleccionados([]);
  };

  // Calcular total de los montos ingresados
  const calcularTotalMontos = () => {
    const efectivo = parseFloat(unformatNumber(montoEfectivo)) || 0;
    const transferencia = parseFloat(unformatNumber(montoTransferencia)) || 0;
    return efectivo + transferencia;
  };

  // Validar que los montos sumen el total con descuento
  const validarMontos = () => {
    const totalServicios = calcularTotalServiciosSeleccionados();
    const totalMontos = calcularTotalMontos();

    // Redondear a 2 decimales para evitar problemas de precisión
    const totalServiciosRedondeado = Math.round(totalServicios * 100) / 100;
    const totalMontosRedondeado = Math.round(totalMontos * 100) / 100;

    return Math.abs(totalServiciosRedondeado - totalMontosRedondeado) < 0.01;
  };

  // Actualizar montos automáticamente según método de pago
  const handleMetodoPagoChange = (nuevoMetodo: 'efectivo' | 'transferencia' | 'mixto') => {
    setMetodoPago(nuevoMetodo);
    const totalServicios = calcularTotalServiciosSeleccionados();

    // Redondear a 2 decimales
    const totalRedondeado = Math.round(totalServicios * 100) / 100;

    if (nuevoMetodo === 'efectivo') {
      setMontoEfectivo(formatNumberForInput(totalRedondeado));
      setMontoTransferencia('0');
    } else if (nuevoMetodo === 'transferencia') {
      setMontoEfectivo('0');
      setMontoTransferencia(formatNumberForInput(totalRedondeado));
    } else {
      // Mixto - dividir 50/50 automáticamente
      const mitad = totalRedondeado / 2;
      setMontoEfectivo(formatNumberForInput(mitad));
      setMontoTransferencia(formatNumberForInput(mitad));
    }
  };

  // Asignar múltiples servicios realizados
  const handleAsignarMultiples = async () => {
    if (!selectedOperador || serviciosSeleccionados.length === 0) return;

    // Validación adicional para operadores
    if (user?.role?.nombre === 'operador') {
      if (selectedOperador.id !== user.operador?.id?.toString()) {
        toast.error('Solo puedes registrar servicios para tu cuenta');
        return;
      }
    }

    // Validar que la fecha sea válida
    if (!fechaServicio || isNaN(fechaServicio.getTime())) {
      toast.error('Por favor selecciona una fecha válida');
      return;
    }

    // Validar que los montos sumen el total
    const totalServicios = calcularTotalServiciosSeleccionados();
    const totalMontos = calcularTotalMontos();

    if (Math.abs(totalServicios - totalMontos) > 0.01) {
      toast.error('La suma de efectivo y transferencia debe ser igual al total de todos los servicios');
      return;
    }

    setIsSubmitting(true);

    try {
      const serviciosData = serviciosSeleccionados.map(s => ({
        servicio_id: Number(s.servicio.id),
        cantidad: Number(s.cantidad),
        descuento_porcentaje: Number(s.descuentoPorcentaje) || 0
      }));

      await servicioService.createServiciosMultiples({
        empleado_id: Number(selectedOperador.id),
        fecha: formatDateForAPI(fechaServicio),
        metodo_pago: metodoPago,
        monto_efectivo: parseFloat(unformatNumber(montoEfectivo)) || 0,
        monto_transferencia: parseFloat(unformatNumber(montoTransferencia)) || 0,
        servicios: serviciosData
      });

      toast.success(`¡${serviciosSeleccionados.length} servicios asignados exitosamente!`);
      cargarServiciosRealizados(1, searchValue);
      setTimeout(() => {
        setModalOpen(false);
        setServiciosSeleccionados([]);
      }, 1200);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al asignar los servicios');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recargar solo el histórico después de asignar
  const cargarServiciosRealizados = async (page = 1, search = '', itemsPerPage = perPage, customFilters = filters) => {
    try {
      const params: any = {
        page,
        per_page: itemsPerPage
      };

      // Agregar búsqueda si existe
      if (search) {
        params.search = search;
      }

      // Si es operador, filtrar solo sus servicios
      if (user?.role?.nombre === 'operador' && user?.operador?.id) {
        params.empleado_id = user.operador.id;
      }

      // Agregar filtros avanzados
      if (customFilters.fechaDesde) {
        params.fecha_desde = customFilters.fechaDesde;
      }
      if (customFilters.fechaHasta) {
        params.fecha_hasta = customFilters.fechaHasta;
      }
      if (customFilters.empleadoId && user?.role?.nombre !== 'operador') {
        params.empleado_id = customFilters.empleadoId;
      }
      if (customFilters.metodoPago) {
        params.metodo_pago = customFilters.metodoPago;
      }
      if (customFilters.precioMinimo) {
        params.precio_minimo = parseFloat(customFilters.precioMinimo);
      }
      if (customFilters.precioMaximo) {
        params.precio_maximo = parseFloat(customFilters.precioMaximo);
      }

      const response = await servicioService.listarServiciosRealizados(params);
      setServiciosRealizados(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error recargando servicios realizados:', error);
      setServiciosRealizados([]);
      setPagination({
        current_page: 1,
        per_page: 10,
        total: 0,
        total_pages: 0,
        from: 0,
        to: 0
      });
    }
  };

  // Funciones para manejar filtros
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    setIsLoadingFilters(true);
    setFilters({
      fechaDesde: '',
      fechaHasta: '',
      empleadoId: '',
      metodoPago: '',
      precioMinimo: '',
      precioMaximo: ''
    });
    // Recargar datos sin filtros
    await cargarServiciosRealizados(1, searchValue, perPage, {
      fechaDesde: '',
      fechaHasta: '',
      empleadoId: '',
      metodoPago: '',
      precioMinimo: '',
      precioMaximo: ''
    });
    setIsLoadingFilters(false);
  };

  const handleApplyFilters = async () => {
    setIsLoadingFilters(true);
    setFiltersOpen(false);
    await cargarServiciosRealizados(1, searchValue, perPage, filters);
    setIsLoadingFilters(false);
  };

  // Filtrar servicios por nombre
  const filteredServicios = (servicios || []).filter(servicio => {
    const searchLower = searchValue.toLowerCase();
    return servicio.nombre.toLowerCase().includes(searchLower);
  });

  const handleFiltersClick = () => {
    console.log('Abrir filtros avanzados');
  };

  // Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    cargarServiciosRealizados(newPage, searchValue);
  };

  // Manejar búsqueda en servicios realizados
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Resetear a página 1 cuando se busca
    cargarServiciosRealizados(1, value);
  };

  // Manejar cambio de elementos por página
  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    // Resetear a página 1 cuando se cambia el número de elementos por página
    cargarServiciosRealizados(1, searchValue, newPerPage);
  };

  // Funciones para eliminar servicio realizado
  const handleDeleteClick = (servicio: ServicioRealizado) => {
    setServicioToDelete(servicio);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!servicioToDelete) return;

    setIsDeleting(true);
    try {
      await servicioService.deleteServicioRealizado(servicioToDelete.id);
      toast.success('Servicio eliminado correctamente');
      cargarServiciosRealizados(pagination.current_page, searchValue); // Recargar la lista con la página actual
      setDeleteModalOpen(false);
      setServicioToDelete(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al eliminar el servicio');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setServicioToDelete(null);
  };

  return (
    <div className="container mx-auto py-8 px-2">
      <PageHeader
        title={user?.role?.nombre === 'operador' ? 'Registrar Mi Servicio' : 'Registrar Servicio Realizado'}
        subtitle={user?.role?.nombre === 'operador'
          ? 'Registra servicios realizados en tu cuenta y consulta tu histórico'
          : 'Asigna servicios a empleados y consulta el histórico de movimientos'
        }
      >

      </PageHeader>
      {isLoading ? (
        <Spinner className="my-16" size="lg" />
      ) : (
        <>
          <Card className="mb-6">
            <SearchFilters
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onFiltersClick={handleFiltersClick}
              searchPlaceholder="Buscar servicios por nombre..."
            />
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 pt-2">
            {filteredServicios.map((servicio) => (
              <div
                key={servicio.id}
                className="group relative transform transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
                onClick={() => handleOpenModal(servicio)}
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-blue-300 transition-all duration-300 h-full">
                  {/* Header con gradiente */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                    <h3 className="text-lg font-semibold text-center leading-tight">
                      {servicio.nombre}
                    </h3>
                  </div>

                  {/* Contenido principal */}
                  <div className="p-6 space-y-4">
                    {/* Precio destacado */}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800 mb-1">
                        {formatCurrency(servicio.precio)}
                      </div>
                      <div className="text-sm text-gray-500">Precio del servicio</div>
                    </div>

                    {/* Porcentaje del empleado */}
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-50 border border-blue-200 rounded-full px-4 py-2 self-center">
                        <span className="text-sm font-medium text-blue-700">
                          {servicio.porcentaje_pago_empleado}% para empleado
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Indicador de hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 to-transparent h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-center h-full">
                      <span className="text-xs text-gray-600 font-medium">Clic para seleccionar</span>
                    </div>
                  </div>

                  {/* Indicador de hover */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Modal isOpen={modalOpen} onClose={handleCloseModal} title="Asignar Servicios" size="xl">
            <div className="space-y-6">
              {/* Información general */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📋</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800">Registro de Servicios</h3>
                    <p className="text-sm text-blue-700">
                      Configura los servicios seleccionados y agrega más si es necesario.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selección de operador y fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium mb-1 text-gray-500">Empleado/Operador</label>
                  {user?.role?.nombre === 'operador' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 h-[42px] flex items-center">
                      <div className="flex items-center space-x-3 w-full">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {user.operador?.nombre?.[0] || 'O'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-blue-800 text-sm">
                            {user.operador ? `${user.operador.nombre} ${user.operador.apellido}` : 'Operador'}
                          </div>
                          <div className="text-xs text-blue-600">Tu cuenta</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Autocomplete
                      options={operadores}
                      value={selectedOperador}
                      onChange={setSelectedOperador}
                      placeholder="Selecciona un operador"
                      loading={apiOperadores.isLoading}
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium mb-1 text-gray-500">Fecha del Servicio</label>
                  <CustomDatePicker
                    selected={fechaServicio}
                    onChange={(date) => setFechaServicio(date || new Date())}
                    placeholder="Seleccionar fecha"
                    className="h-[42px]"
                  />
                  {fechaServicio && fechaServicio.toDateString() !== new Date().toDateString() && (
                    <div className="mt-1 text-xs text-blue-600 font-medium">
                      📅 Registrando servicio para fecha: {fechaServicio.toLocaleDateString('es-CO')}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de servicios seleccionados */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{serviciosSeleccionados.length}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800">Servicios Seleccionados</h3>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {serviciosSeleccionados.length} servicio(s)
                  </span>
                </div>

                {serviciosSeleccionados.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No hay servicios seleccionados</p>
                    <p className="text-sm text-gray-400 mt-1">Haz clic en los servicios de abajo para agregarlos</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {serviciosSeleccionados.map((servicioSeleccionado) => (
                      <div key={servicioSeleccionado.servicio.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                {servicioSeleccionado.servicio.nombre}
                              </h4>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {servicioSeleccionado.servicio.porcentaje_pago_empleado}% empleado
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Precio unitario: {formatCurrency(servicioSeleccionado.servicio.precio)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removerServicioDeLista(servicioSeleccionado.servicio.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50 hover:scale-110 transition-transform"
                          >
                            ✕
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                            <Input
                              type="number"
                              value={servicioSeleccionado.cantidad}
                              onChange={(e) => actualizarCantidadServicio(servicioSeleccionado.servicio.id, e.target.value)}
                              min="1"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Descuento (%)</label>
                            <Input
                              type="number"
                              value={servicioSeleccionado.descuentoPorcentaje}
                              onChange={(e) => actualizarDescuentoServicio(servicioSeleccionado.servicio.id, e.target.value)}
                              min="0"
                              max="100"
                              step="0.01"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(servicioSeleccionado.total)}</span>
                          </div>
                          {Number(servicioSeleccionado.descuentoPorcentaje) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Descuento:</span>
                              <span className="font-medium text-orange-600">
                                -{formatCurrency(servicioSeleccionado.total - servicioSeleccionado.totalConDescuento)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-gray-800">Total:</span>
                            <span className="text-blue-600">{formatCurrency(servicioSeleccionado.totalConDescuento)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selector de servicios con autocomplete */}
                <div className="mt-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800">Agregar Servicio</h4>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {servicios.filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id)).length} disponibles
                      </span>
                    </div>

                    {servicios.filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id)).length > 0 ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <Input
                            type="text"
                            value={servicioSearchValue}
                            onChange={(e) => setServicioSearchValue(e.target.value)}
                            placeholder="Buscar y seleccionar servicio..."
                            className="pr-10"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-gray-400">🔍</span>
                          </div>
                        </div>

                        {/* Lista de servicios filtrados */}
                        {servicioSearchValue && servicios.filter(s =>
                          !serviciosSeleccionados.find(ss => ss.servicio.id === s.id) &&
                          s.nombre.toLowerCase().includes(servicioSearchValue.toLowerCase())
                        ).length > 0 && (
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                              {servicios.filter(s =>
                                !serviciosSeleccionados.find(ss => ss.servicio.id === s.id) &&
                                s.nombre.toLowerCase().includes(servicioSearchValue.toLowerCase())
                              ).map((servicio) => (
                                <div
                                  key={servicio.id}
                                  onClick={() => agregarServicioALista(servicio)}
                                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{servicio.nombre}</div>
                                      <div className="text-sm text-gray-500">
                                        {servicio.porcentaje_pago_empleado}% para empleado
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-green-700">
                                        {formatCurrency(servicio.precio)}
                                      </div>
                                      <div className="text-xs text-gray-400">Clic para agregar</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Mensaje cuando no hay resultados */}
                        {servicioSearchValue && servicios.filter(s =>
                          !serviciosSeleccionados.find(ss => ss.servicio.id === s.id) &&
                          s.nombre.toLowerCase().includes(servicioSearchValue.toLowerCase())
                        ).length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No se encontraron servicios con "{servicioSearchValue}"
                            </div>
                          )}

                        {/* Lista de servicios disponibles (cuando no hay búsqueda) */}
                        {!servicioSearchValue && servicios.filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id)).length > 0 && (
                          <div className="text-center py-2">
                            <div className="text-xs text-gray-500 mb-2">
                              Escribe para buscar servicios disponibles
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                              {servicios.filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id)).slice(0, 3).map((servicio) => (
                                <div
                                  key={servicio.id}
                                  onClick={() => agregarServicioALista(servicio)}
                                  className="p-2 hover:bg-blue-50 cursor-pointer border border-gray-200 rounded transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700">{servicio.nombre}</span>
                                    <span className="text-sm font-bold text-green-600">
                                      {formatCurrency(servicio.precio)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {servicios.filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id)).length > 3 && (
                                <div className="text-xs text-gray-400 italic">
                                  +{servicios.filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id)).length - 3} más disponibles
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-gray-500 text-sm">🎉 ¡Ya tienes todos los servicios agregados!</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>



              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-600">Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleMetodoPagoChange('efectivo')}
                    className={`p-3 rounded-lg border-2 transition-all ${metodoPago === 'efectivo'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-green-300 hover:bg-green-25'
                      }`}
                  >
                    <div className="text-center mx-auto self-center flex flex-col">
                      <div className="text-lg font-semibold">💵</div>
                      <div className="text-sm">Efectivo</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMetodoPagoChange('transferencia')}
                    className={`p-3 rounded-lg border-2 transition-all ${metodoPago === 'transferencia'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-blue-300 hover:bg-blue-25'
                      }`}
                  >
                    <div className="text-center mx-auto self-center flex flex-col">
                      <div className="text-lg font-semibold">🏦</div>
                      <div className="text-sm">Transferencia</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMetodoPagoChange('mixto')}
                    className={`p-3 rounded-lg border-2 transition-all ${metodoPago === 'mixto'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-purple-300 hover:bg-purple-25'
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">💳</div>
                      <div className="text-sm">Mixto</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Montos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Monto en Efectivo</label>
                  <Input
                    type="text"
                    value={montoEfectivo}
                    onChange={e => {
                      const rawValue = unformatNumber(e.target.value);
                      const numValue = parseFloat(rawValue) || 0;
                      setMontoEfectivo(formatNumberForInput(numValue));
                    }}
                    placeholder="0"
                    disabled={metodoPago === 'transferencia'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Monto en Transferencia</label>
                  <Input
                    type="text"
                    value={montoTransferencia}
                    onChange={e => {
                      const rawValue = unformatNumber(e.target.value);
                      const numValue = parseFloat(rawValue) || 0;
                      setMontoTransferencia(formatNumberForInput(numValue));
                    }}
                    placeholder="0"
                    disabled={metodoPago === 'efectivo'}
                  />
                </div>
              </div>

              {/* Validación de montos */}
              {serviciosSeleccionados.length > 0 && (
                <div className={`p-4 rounded-lg border-2 ${validarMontos() ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'
                  }`}>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className={`font-medium ${validarMontos() ? 'text-green-700' : 'text-orange-800'}`}>
                      Total servicios:
                    </span>
                    <span className={`font-bold text-lg ${validarMontos() ? 'text-green-700' : 'text-orange-800'
                      }`}>
                      {formatCurrency(calcularTotalServiciosSeleccionados())}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-medium ${validarMontos() ? 'text-green-700' : 'text-orange-800'}`}>
                      Total ingresado:
                    </span>
                    <span className={`font-bold text-lg ${validarMontos() ? 'text-green-700' : 'text-orange-800'
                      }`}>
                      {formatCurrency(calcularTotalMontos())}
                    </span>
                  </div>
                  {!validarMontos() && (
                    <div className="text-orange-800 text-xs mt-3 font-medium flex items-center">
                      <span className="mr-1">⚠️</span>
                      Los montos deben sumar exactamente el total de todos los servicios
                    </div>
                  )}
                  {validarMontos() && (
                    <div className="text-green-700 text-xs mt-3 font-medium flex items-center">
                      <span className="mr-1">✅</span>
                      Montos correctos
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleAsignarMultiples}
                disabled={!selectedOperador || serviciosSeleccionados.length === 0 || !validarMontos() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Spinner size="sm" className="mr-2" />
                    Registrando...
                  </div>
                ) : (
                  user?.role?.nombre === 'operador' ? 'Registrar Mis Servicios' : 'Registrar Servicios'
                )}
              </Button>
              {successMsg && <div className="text-green-600 text-center font-semibold mt-2">{successMsg}</div>}
              {apiAsignar.error && <div className="text-red-500 text-center mt-2">{apiAsignar.error}</div>}
            </div>
          </Modal>



          {/* Tabla de servicios realizados */}
          <div className="mt-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">
                {user?.role?.nombre === 'operador' ? 'Mi Histórico de Servicios' : 'Histórico de Servicios Realizados'}
              </h2>
              <div className="flex items-center space-x-4">
                {pagination.total > 0 && (
                  <div className="text-sm text-gray-600">
                    Mostrando {pagination.from} a {pagination.to} de {pagination.total} registros
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Mostrar:</label>
                  <select
                    value={perPage}
                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                    className="text-gray-600 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-600">por página</span>
                </div>
              </div>
            </div>

            {/* Filtros avanzados */}
            <AdvancedFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              onApplyFilters={handleApplyFilters}
              operadores={operadores}
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen(!filtersOpen)}
              showOperadorFilter={user?.role?.nombre !== 'operador'}
              isLoading={isLoadingFilters}
            />

            <DataTable
              data={serviciosRealizados}
              showPagination={true}
              page={pagination.current_page}
              totalPages={pagination.total_pages}
              onPageChange={handlePageChange}
              columns={[
                {
                  key: 'servicio',
                  header: 'Servicio',
                  render: (_: any, row: ServicioRealizado) => (
                    <span className="font-medium text-blue-700">{row.servicio.nombre}</span>
                  ),
                },
                {
                  key: 'empleado',
                  header: 'Empleado',
                  render: (_: any, row: ServicioRealizado) => (
                    <span className="text-black">{row.empleado.nombre} {row.empleado.apellido}</span>
                  ),
                },
                {
                  key: 'servicio_id',
                  header: 'Precio',
                  render: (_: any, row: ServicioRealizado) => (
                    <span className="text-green-700 font-semibold">{formatCurrency(row.servicio.precio)}</span>
                  ),
                },
                {
                  key: 'cantidad',
                  header: 'Cantidad',
                  render: (value) => (
                    <span className="text-black">{String(value)}</span>
                  ),
                },
                {
                  key: 'descuento_porcentaje',
                  header: 'Descuento',
                  render: (_: any, row: ServicioRealizado) => {
                    if (row.descuento_porcentaje > 0) {
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                            {row.descuento_porcentaje}%
                          </span>
                          <div className="text-xs text-gray-600">
                            <div>Original: {formatCurrency(row.total_servicio)}</div>
                            <div>Final: {formatCurrency(row.total_con_descuento)}</div>
                          </div>
                        </div>
                      );
                    }
                    return <span className="text-gray-400">Sin descuento</span>;
                  },
                },
                {
                  key: 'fecha',
                  header: 'Fecha',
                  render: (value) => (
                    <span className="text-black">{formatDate(String(value))}</span>
                  ),
                },
                {
                  key: 'metodo_pago',
                  header: 'Método de Pago',
                  render: (_: any, row: ServicioRealizado) => {
                    const isMixto = row.monto_efectivo > 0 && row.monto_transferencia > 0;
                    return (
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isMixto ? 'bg-purple-100 text-purple-700' :
                            row.metodo_pago === 'efectivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                          {isMixto ? 'Mixto' : row.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                        </span>
                        {isMixto && (
                          <div className="text-xs text-gray-600">
                            <div>💵 {formatCurrency(row.monto_efectivo)}</div>
                            <div>🏦 {formatCurrency(row.monto_transferencia)}</div>
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                // Columna de acciones solo para admin y supervisor
                ...(user?.role?.nombre === 'admin' || user?.role?.nombre === 'supervisor' ? [{
                  key: 'id' as keyof ServicioRealizado,
                  header: 'Acciones',
                  render: (_: any, row: ServicioRealizado) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteClick(row)}
                        className="px-2 py-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    </div>
                  ),
                }] : []),
              ]}
              emptyMessage={user?.role?.nombre === 'operador'
                ? "No has realizado servicios aún."
                : "No hay servicios realizados aún."
              }
            />
          </div>

          {/* Modal de confirmación de eliminación */}
          <Modal
            isOpen={deleteModalOpen}
            onClose={handleCancelDelete}
            title="Confirmar Eliminación"
            size="md"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">¿Estás seguro?</h3>
                  <p className="text-sm text-red-700">
                    Esta acción no se puede deshacer. El servicio será eliminado permanentemente.
                  </p>
                </div>
              </div>

              {servicioToDelete && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Detalles del servicio:</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Servicio:</span> {servicioToDelete.servicio.nombre}</p>
                    <p><span className="font-medium">Empleado:</span> {servicioToDelete.empleado.nombre} {servicioToDelete.empleado.apellido}</p>
                    <p><span className="font-medium">Fecha:</span> {formatDate(servicioToDelete.fecha)}</p>
                    <p><span className="font-medium">Total:</span> {formatCurrency(servicioToDelete.total_con_descuento)}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal selector de servicios */}
          <Modal
            isOpen={showServiciosSelector}
            onClose={() => setShowServiciosSelector(false)}
            title="Seleccionar Servicio"
            size="lg"
          >
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Servicios Disponibles</h3>
                <p className="text-sm text-blue-700">
                  Selecciona el servicio que deseas agregar a tu lista.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {servicios
                  .filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id))
                  .map((servicio) => (
                    <div
                      key={servicio.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                      onClick={() => {
                        agregarServicioALista(servicio);
                        setShowServiciosSelector(false);
                        toast.success(`Servicio "${servicio.nombre}" agregado`);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{servicio.nombre}</h4>
                        <span className="text-sm text-gray-500">Clic para agregar</span>
                      </div>
                      <div className="text-lg font-bold text-green-700">
                        {formatCurrency(servicio.precio)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {servicio.porcentaje_pago_empleado}% para empleado
                      </div>
                    </div>
                  ))}
              </div>

              {servicios.filter(s => !serviciosSeleccionados.find(ss => ss.servicio.id === s.id)).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay más servicios disponibles</p>
                  <p className="text-sm text-gray-400 mt-1">Ya tienes todos los servicios agregados</p>
                </div>
              )}
            </div>
          </Modal>

        </>
      )}
    </div>
  );
}