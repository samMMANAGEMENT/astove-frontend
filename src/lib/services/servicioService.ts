import api from '../axios';

export interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  estado: boolean;
  porcentaje_pago_empleado: string;
  entidad_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ServicioRealizado {
  id: number;
  empleado_id: number;
  servicio_id: number;
  cantidad: string;
  fecha: string;
  metodo_pago: 'efectivo' | 'transferencia' | 'mixto';
  monto_efectivo: number;
  monto_transferencia: number;
  total_servicio: number;
  descuento_porcentaje: number;
  monto_descuento: number;
  total_con_descuento: number;
  empleado: {
    id: number;
    nombre: string;
    apellido: string;
  };
  servicio: {
    id: number;
    nombre: string;
    precio: number;
  };
}

export interface PaginationInfo {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  from: number;
  to: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

interface ListarServiciosRealizadosParams {
  page?: number;
  per_page?: number;
  search?: string;
  empleado_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  metodo_pago?: 'efectivo' | 'transferencia' | 'mixto';
  precio_minimo?: number;
  precio_maximo?: number;
}

const getAll = async (): Promise<Servicio[]> => {
  const response = await api.get('/servicios/listar-servicio');
  return response.data;
};

const listarServiciosRealizados = async (params: ListarServiciosRealizadosParams = {}): Promise<PaginatedResponse<ServicioRealizado>> => {
  const response = await api.get('/servicios/listar-servicios-realizados', { params });
  return response.data;
};

interface CreateServicioData {
  nombre: string;
  precio: number;
  estado: boolean;
  porcentaje_pago_empleado: number;
  entidad_id?: number;
}

interface ServicioMultiple {
  servicio_id: number;
  cantidad: number;
  descuento_porcentaje?: number;
}

interface CreateServiciosMultiplesData {
  empleado_id: number;
  fecha: string;
  metodo_pago: 'efectivo' | 'transferencia' | 'mixto';
  monto_efectivo: number;
  monto_transferencia: number;
  servicios: ServicioMultiple[];
}

const createService = async (data: CreateServicioData): Promise<Servicio> => {
  const response = await api.post('/servicios/crear-servicio', data);
  return response.data;
};

export const servicioService = {
  getAll,
  listarServiciosRealizados,
  createService,
  createServiciosMultiples: async (data: CreateServiciosMultiplesData): Promise<{ message: string; servicios_creados: number; total_general: number }> => {
    const response = await api.post('/servicios/servicios-multiples', data);
    return response.data;
  },
  updateService: async (id: number, data: CreateServicioData): Promise<Servicio> => {
    const response = await api.put(`/servicios/modificar-servicio/${id}`, data);
    return response.data;
  },
  deleteServicioRealizado: async (id: number): Promise<{ message: string; id: number }> => {
    const response = await api.delete(`/servicios/eliminar-servicio-realizado/${id}`);
    return response.data;
  },
  deleteService: async (id: number): Promise<{ message: string; id: number }> => {
    const response = await api.delete(`/servicios/eliminar-servicio/${id}`);
    return response.data;
  },
};

export default servicioService;