import api from "../axios";

export interface FacturaProducto {
  id: number;
  nombre: string;
  pivot: {
    cantidad: number;
    subtotal: number;
  };
}

export interface Factura {
  id: number;
  total: number;
  fecha: string;
  empleado_id: number;
  metodo_pago: string;
  ganancia_total: number;
  observaciones?: string;
  empleado?: {
    id: number;
    nombre: string;
    apellido: string;
  };
  productos?: FacturaProducto[];
}

export interface FacturasResponse {
  data: Factura[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    from: number;
    to: number;
  };
}

export const facturacionService = {
  listarFacturas: async (params?: { page?: number; per_page?: number }) => {
    const response = await api.get<FacturasResponse>(
      "/facturas/listar-facturas",
      { params }
    );
    return response.data;
  },

  crearFactura: async (data: any) => {
    const response = await api.post("/facturas/crear-factura", data);
    return response.data;
  },

  descargarPDF: async (id: number) => {
    const response = await api.get(`/facturas/generar-pdf/${id}`, {
      responseType: "blob",
    });
    return response.data;
  },
};
