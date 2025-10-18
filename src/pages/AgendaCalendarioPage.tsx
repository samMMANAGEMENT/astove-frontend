import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Trash2,
  Grid3X3,
  CalendarDays,
  Clock,
  Edit
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Card,
  PageHeader,
  Badge,
  Button,
  Modal,
  Input,
  Spinner,
} from '../components/ui';
import agendaService, { type CrearCitaData } from '../lib/services/agendaService';

interface Horario {
  id: number;
  titulo: string;
  hora_inicio: string;
  hora_fin: string;
  color: string;
  notas?: string;
  disponible: boolean;
  es_especifico?: boolean;
  cita?: {
    id: number;
    cliente_nombre: string;
    cliente_telefono?: string;
    servicio: string;
    estado: string;
    notas?: string;
  };
}

interface DiaCalendario {
  dia: number;
  fecha: string;
  dia_semana: string;
  es_hoy: boolean;
  es_pasado: boolean;
  horarios: Horario[];
}

interface CalendarioData {
  agenda: {
    id: number;
    nombre: string;
    descripcion?: string;
    operador?: {
      id: number;
      nombre: string;
      apellido: string;
    };
  };
  mes: number;
  anio: number;
  nombre_mes: string;
  calendario: DiaCalendario[];
}

type VistaCalendario = 'mes' | 'semana' | 'dia';

const AgendaCalendarioPage: React.FC = () => {
  const { agendaId } = useParams<{ agendaId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [calendarioData, setCalendarioData] = useState<CalendarioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [vistaActual, setVistaActual] = useState<VistaCalendario>('semana');
  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
  useEffect(() => {
    if (isMobile) {
      setVistaActual('dia');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Estados para modal de cita
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<{
    horario: Horario;
    fecha: string;
  } | null>(null);
  
  // Estados para crear horario personalizado
  const [showCrearHorarioModal, setShowCrearHorarioModal] = useState(false);
  const [horarioPersonalizadoData, setHorarioPersonalizadoData] = useState<{
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    titulo: string;
    color: string;
    notas: string;
  } | null>(null);
  const [citaData, setCitaData] = useState<Partial<CrearCitaData>>({
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_email: '',
    servicio: '',
    notas: '',
    estado: 'pendiente'
  });
  const [isSavingCita, setIsSavingCita] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  // Edición de horarios (espacios)
  const [showEditarHorarioModal, setShowEditarHorarioModal] = useState(false);
  const [horarioEditForm, setHorarioEditForm] = useState<{ titulo: string; hora_inicio: string; hora_fin: string; dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'; color: string; notas: string; activo: boolean; id?: number; } | null>(null);
  const diasSemanaValores: Array<'domingo'|'lunes'|'martes'|'miercoles'|'jueves'|'viernes'|'sabado'> = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  
  // Función auxiliar para formatear horas al formato H:i:s
  const formatearHora = (hora: string): string => {
    if (hora.includes(':') && hora.split(':').length === 2) {
      return hora + ':00';
    }
    return hora;
  };
  // Confirmaciones y carga
  const [showConfirmEliminarCita, setShowConfirmEliminarCita] = useState(false);
  const [isDeletingCita, setIsDeletingCita] = useState(false);
  const [showConfirmEliminarHorario, setShowConfirmEliminarHorario] = useState(false);
  const [isDeletingHorario, setIsDeletingHorario] = useState(false);
  const [isSavingHorario, setIsSavingHorario] = useState(false);
  const [openingHorarioId, setOpeningHorarioId] = useState<number | null>(null);

  useEffect(() => {
    if (agendaId) {
      // Verificar si hay parámetros en la URL para selección automática
      const fechaParam = searchParams.get('fecha');
      
      if (fechaParam) {
        const ref = parseYmdToLocalDate(fechaParam);
        setMesActual(ref.getMonth() + 1);
        setAnioActual(ref.getFullYear());
      }
      
      cargarCalendario();
    }
  }, [agendaId, mesActual, anioActual]);

  // Selección automática en cuanto exista calendarioData
  useEffect(() => {
    const fechaParam = searchParams.get('fecha');
    const horarioParam = searchParams.get('horario');
    if (calendarioData && fechaParam && horarioParam) {
      seleccionarHorarioAutomaticamente(fechaParam, parseInt(horarioParam));
    }
  }, [calendarioData]);

  const seleccionarHorarioAutomaticamente = (fecha: string, horarioId: number) => {
    if (!calendarioData) return;
    
    const diaEncontrado = calendarioData.calendario.find(dia => dia.fecha === fecha);
    if (diaEncontrado) {
      const horarioEncontrado = diaEncontrado.horarios.find(h => h.id === horarioId);
      if (horarioEncontrado && horarioEncontrado.disponible) {
        abrirModalCita(horarioEncontrado, fecha);
        // Limpiar los parámetros de URL después de la selección
        setSearchParams({});
      }
    }
  };

  const cargarCalendario = async () => {
    if (!agendaId) return;
    
    setIsLoading(true);
    try {
      const data = await agendaService.obtenerCalendarioAgenda(
        parseInt(agendaId), 
        mesActual, 
        anioActual
      );
      setCalendarioData(data);
    } catch (error: any) {
      console.error('Error al cargar calendario:', error);
      toast.error(error.response?.data?.error || 'Error al cargar el calendario');
    } finally {
      setIsLoading(false);
    }
  };

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    if (direccion === 'anterior') {
      if (mesActual === 1) {
        setMesActual(12);
        setAnioActual(anioActual - 1);
      } else {
        setMesActual(mesActual - 1);
      }
    } else {
      if (mesActual === 12) {
        setMesActual(1);
        setAnioActual(anioActual + 1);
      } else {
        setMesActual(mesActual + 1);
      }
    }
  };

  const cambiarVista = (vista: VistaCalendario) => {
    setVistaActual(vista);
  };

  const abrirModalCita = (horario: Horario, fecha: string) => {
    if (!horario.disponible) {
      // Si ya hay una cita, mostrar detalles
      setCitaSeleccionada({ horario, fecha });
      setCitaData({
        cliente_nombre: horario.cita?.cliente_nombre || '',
        cliente_telefono: horario.cita?.cliente_telefono || '',
        servicio: horario.cita?.servicio || '',
        notas: horario.cita?.notas || '',
        estado: horario.cita?.estado as any || 'pendiente'
      });
      setIsEditingExisting(false);
    } else {
      // Si está disponible, crear nueva cita
      setCitaSeleccionada({ horario, fecha });
      setCitaData({
        cliente_nombre: '',
        cliente_telefono: '',
        cliente_email: '',
        servicio: '',
        notas: '',
        estado: 'pendiente'
      });
      setIsEditingExisting(false);
    }
    setShowCitaModal(true);
  };

  const abrirCrearHorarioPersonalizado = (fecha: string, horaInicio: string) => {
    // Calcular hora de fin (1 hora después por defecto)
    const [hora, minuto] = horaInicio.split(':');
    const horaInicioDate = new Date();
    horaInicioDate.setHours(parseInt(hora), parseInt(minuto), 0, 0);
    const horaFinDate = new Date(horaInicioDate.getTime() + 60 * 60 * 1000); // +1 hora
    const horaFin = `${horaFinDate.getHours().toString().padStart(2, '0')}:${horaFinDate.getMinutes().toString().padStart(2, '0')}`;

    setHorarioPersonalizadoData({
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      titulo: 'Nuevo Horario',
      color: '#3B82F6',
      notas: ''
    });
    setShowCrearHorarioModal(true);
  };

  const crearHorarioPersonalizado = async () => {
    if (!agendaId || !horarioPersonalizadoData) return;
    
    try {
      setIsSavingHorario(true);
      
      // Obtener el día de la semana de la fecha
      const fechaLocal = new Date(horarioPersonalizadoData.fecha + 'T00:00:00');
      const diaSemana = diasSemanaValores[fechaLocal.getDay()];
      
      const payload = {
        agenda_id: parseInt(agendaId),
        titulo: horarioPersonalizadoData.titulo,
        hora_inicio: formatearHora(horarioPersonalizadoData.hora_inicio),
        hora_fin: formatearHora(horarioPersonalizadoData.hora_fin),
        dia_semana: diaSemana,
        fecha: horarioPersonalizadoData.fecha,
        color: horarioPersonalizadoData.color,
        notas: horarioPersonalizadoData.notas,
        activo: true
      };
      
      await agendaService.createHorario(payload);
      toast.success('Horario personalizado creado');
      setShowCrearHorarioModal(false);
      setHorarioPersonalizadoData(null);
      await cargarCalendario();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear horario personalizado');
    } finally {
      setIsSavingHorario(false);
    }
  };

  const abrirEditarHorario = async (horario: Horario, fecha: string) => {
    if (!agendaId) return;
    try {
      setOpeningHorarioId(horario.id);
      // Establecer la información de la fecha para poder usarla en guardarEdicionHorario
      setCitaSeleccionada({ horario, fecha });
      
      // Buscar detalles del horario para obtener dia_semana y activo
      const lista = await agendaService.getHorariosByAgenda(parseInt(agendaId));
      const detalle = lista.find(h => h.id === horario.id);
      const fechaLocal = new Date(fecha + 'T00:00:00');
      const diaSemana = detalle?.dia_semana || (diasSemanaValores[fechaLocal.getDay()] as any);
      setHorarioEditForm({
        id: horario.id,
        titulo: detalle?.titulo || horario.titulo,
        hora_inicio: detalle?.hora_inicio || horario.hora_inicio,
        hora_fin: detalle?.hora_fin || horario.hora_fin,
        dia_semana: diaSemana,
        color: (detalle as any)?.color || (horario as any).color || '#93C5FD',
        notas: (detalle as any)?.notas || horario.notas || '',
        activo: (detalle as any)?.activo ?? true,
      });
      setShowEditarHorarioModal(true);
    } catch (e:any) {
      toast.error('No se pudo cargar el horario');
    } finally {
      setOpeningHorarioId(null);
    }
  };

  const guardarEdicionHorario = async () => {
    if (!agendaId || !horarioEditForm?.id || !citaSeleccionada) return;
    try {
      setIsSavingHorario(true);
      
      // Verificar si el horario que se está editando es específico o base
      const horarioOriginal = calendarioData?.calendario
        .flatMap(dia => dia.horarios)
        .find(h => h.id === horarioEditForm.id);
      
      if (horarioOriginal?.es_especifico) {
        // Si es un horario específico, actualizar directamente
        const payload = {
          agenda_id: parseInt(agendaId),
          titulo: horarioEditForm.titulo,
          hora_inicio: formatearHora(horarioEditForm.hora_inicio),
          hora_fin: formatearHora(horarioEditForm.hora_fin),
          dia_semana: horarioEditForm.dia_semana,
          color: horarioEditForm.color,
          notas: horarioEditForm.notas,
          activo: horarioEditForm.activo,
        } as any;
        await agendaService.updateHorario(horarioEditForm.id, payload);
        toast.success('Horario actualizado');
      } else {
        // Si es un horario base, crear un horario específico para esta fecha
        const payload = {
          horario_base_id: horarioEditForm.id,
          fecha: citaSeleccionada.fecha,
          titulo: horarioEditForm.titulo,
          hora_inicio: formatearHora(horarioEditForm.hora_inicio),
          hora_fin: formatearHora(horarioEditForm.hora_fin),
          color: horarioEditForm.color,
          notas: horarioEditForm.notas,
          activo: horarioEditForm.activo,
        };
        await agendaService.crearHorarioEspecifico(payload);
        toast.success('Horario específico creado para esta fecha');
      }
      
      setShowEditarHorarioModal(false);
      setCitaSeleccionada(null); // Limpiar el estado
      await cargarCalendario();
    } catch (error:any) {
      toast.error(error.response?.data?.error || 'Error al actualizar horario');
    } finally {
      setIsSavingHorario(false);
    }
  };

  const eliminarHorario = async () => {
    if (!horarioEditForm?.id) return;
    try {
      setIsDeletingHorario(true);
      
      // Verificar si el horario que se está eliminando es específico o base
      const horarioOriginal = calendarioData?.calendario
        .flatMap(dia => dia.horarios)
        .find(h => h.id === horarioEditForm.id);
      
      if (horarioOriginal?.es_especifico) {
        // Si es un horario específico, eliminarlo directamente
        await agendaService.deleteHorario(horarioEditForm.id);
        toast.success('Horario específico eliminado');
      } else {
        // Si es un horario base, crear un horario específico desactivado para esta fecha
        if (citaSeleccionada) {
          const payload = {
            horario_base_id: horarioEditForm.id,
            fecha: citaSeleccionada.fecha,
            titulo: horarioEditForm.titulo,
            hora_inicio: formatearHora(horarioEditForm.hora_inicio),
            hora_fin: formatearHora(horarioEditForm.hora_fin),
            color: horarioEditForm.color,
            notas: horarioEditForm.notas,
            activo: false, // Desactivar para esta fecha específica
          };
          await agendaService.crearHorarioEspecifico(payload);
          toast.success('Horario desactivado para esta fecha');
        } else {
          await agendaService.deleteHorario(horarioEditForm.id);
          toast.success('Horario eliminado');
        }
      }
      
      setShowEditarHorarioModal(false);
      setShowConfirmEliminarHorario(false);
      setCitaSeleccionada(null); // Limpiar el estado
      await cargarCalendario();
    } catch (error:any) {
      toast.error(error.response?.data?.error || 'Error al eliminar horario');
    } finally {
      setIsDeletingHorario(false);
    }
  };

  const guardarCita = async () => {
    if (!agendaId || !citaSeleccionada) return;

    setIsSavingCita(true);
    try {
      const data: CrearCitaData = {
        agenda_id: parseInt(agendaId),
        horario_id: citaSeleccionada.horario.id,
        cliente_nombre: citaData.cliente_nombre!,
        cliente_telefono: citaData.cliente_telefono,
        cliente_email: citaData.cliente_email,
        servicio: citaData.servicio!,
        fecha: citaSeleccionada.fecha,
        hora_inicio: citaSeleccionada.horario.hora_inicio,
        hora_fin: citaSeleccionada.horario.hora_fin,
        estado: citaData.estado!,
        notas: citaData.notas
      };

      await agendaService.crearCita(data);
      toast.success('Cita agendada correctamente');
      setShowCitaModal(false);
      // Recargar el calendario para actualizar el estado
      await cargarCalendario();
    } catch (error: any) {
      console.error('Error al guardar cita:', error);
      toast.error(error.response?.data?.error || 'Error al agendar la cita');
    } finally {
      setIsSavingCita(false);
    }
  };

  const eliminarCita = async () => {
    if (!citaSeleccionada?.horario.cita?.id) return;
    try {
      setIsDeletingCita(true);
      await agendaService.eliminarCita(citaSeleccionada.horario.cita.id);
      toast.success('Cita eliminada correctamente');
      setShowCitaModal(false);
      setShowConfirmEliminarCita(false);
      setIsEditingExisting(false);
      // Recargar el calendario para actualizar el estado
      await cargarCalendario();
    } catch (error: any) {
      console.error('Error al eliminar cita:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar la cita');
    } finally {
      setIsDeletingCita(false);
    }
  };

  const actualizarCita = async () => {
    if (!citaSeleccionada?.horario.cita?.id) return;
    setIsSavingCita(true);
    try {
      const id = citaSeleccionada.horario.cita.id;
      const data = {
        cliente_nombre: citaData.cliente_nombre!,
        cliente_telefono: citaData.cliente_telefono,
        cliente_email: citaData.cliente_email,
        servicio: citaData.servicio!,
        estado: citaData.estado!,
        notas: citaData.notas,
      };
      await agendaService.actualizarCita(id, data);
      toast.success('Cita actualizada correctamente');
      setShowCitaModal(false);
      setIsEditingExisting(false);
      await cargarCalendario();
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error('No tienes permisos para editar esta cita');
      } else {
        toast.error(error.response?.data?.error || 'Error al actualizar la cita');
      }
    } finally {
      setIsSavingCita(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      confirmada: 'success' as const,
      pendiente: 'warning' as const,
      cancelada: 'danger' as const,
      completada: 'info' as const
    };
    return <Badge variant={variants[estado as keyof typeof variants]}>{estado.toUpperCase()}</Badge>;
  };

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Utilidades de fecha local
  const parseYmdToLocalDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const toYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Determinar los días a mostrar según la vista seleccionada
  const getDiasParaMostrar = (): DiaCalendario[] => {
    if (!calendarioData) return [];
    if (vistaActual === 'mes') return calendarioData.calendario;

    // Fecha de referencia: parámetro ?fecha= o hoy
    const fechaParam = searchParams.get('fecha');
    const ref = fechaParam ? parseYmdToLocalDate(fechaParam) : new Date();

    if (vistaActual === 'dia') {
      const fechaISO = toYmd(ref);
      return calendarioData.calendario.filter(d => d.fecha === fechaISO);
    }

    // Semana (domingo a sábado) usando fechas locales
    const refLocal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const day = refLocal.getDay(); // 0=domingo
    const start = new Date(refLocal);
    start.setDate(refLocal.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return calendarioData.calendario.filter(d => {
      const f = parseYmdToLocalDate(d.fecha);
      return f >= start && f <= end;
    });
  };

  const diasParaMostrar = getDiasParaMostrar();

  // Función para generar slots de tiempo vacíos (cada 30 minutos de 6:00 a 22:00)
  const generarSlotsTiempo = () => {
    const slots = [];
    for (let hora = 6; hora < 22; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const tiempo = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
        slots.push(tiempo);
      }
    }
    return slots;
  };

  const slotsTiempo = generarSlotsTiempo();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!calendarioData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No se pudo cargar el calendario</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 agenda-calendar">
      <PageHeader
        title={`Calendario - ${calendarioData.agenda.nombre}`}
        subtitle={`Operador: ${calendarioData.agenda.operador?.nombre} ${calendarioData.agenda.operador?.apellido}`}
      />

      {/* Información de la agenda */}
      <div className="agenda-info">
        <div className="agenda-title">{calendarioData.agenda.nombre}</div>
        <div className="agenda-operator">
          Operador: {calendarioData.agenda.operador?.nombre} {calendarioData.agenda.operador?.apellido}
        </div>
        {calendarioData.agenda.descripcion && (
          <div className="agenda-description">{calendarioData.agenda.descripcion}</div>
        )}
      </div>

      <Card>
        <div className="p-6">
          {/* Header del calendario */}
          <div className="calendar-navigation">
            <Button
              variant="outline"
              onClick={() => navigate('/agendas')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Button>

            <div className="flex items-center gap-4">
              <button
                className="nav-button"
                onClick={() => cambiarMes('anterior')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="current-month">
                {calendarioData.nombre_mes} {calendarioData.anio}
              </div>
              
              <button
                className="nav-button"
                onClick={() => cambiarMes('siguiente')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Selector de fecha y botón Hoy */}
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="date"
                  value={(() => {
                    const fechaParam = searchParams.get('fecha');
                    if (fechaParam) return fechaParam;
                    const hoy = new Date();
                    const y = hoy.getFullYear();
                    const m = String(hoy.getMonth() + 1).padStart(2, '0');
                    const d = String(hoy.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                  })()}
                  onChange={(e) => {
                    setSearchParams({ fecha: e.target.value });
                  }}
                  className="px-2 py-1 border rounded"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const hoy = new Date();
                    const y = hoy.getFullYear();
                    const m = String(hoy.getMonth() + 1).padStart(2, '0');
                    const d = String(hoy.getDate()).padStart(2, '0');
                    setSearchParams({ fecha: `${y}-${m}-${d}` });
                    setMesActual(hoy.getMonth() + 1);
                    setAnioActual(y);
                  }}
                >
                  Hoy
                </Button>
              </div>
            </div>

            {/* Filtros de vista */}
            <div className="flex items-center gap-2">
              <Button
                variant={vistaActual === 'mes' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => cambiarVista('mes')}
                className="flex items-center gap-1"
              >
                <Grid3X3 className="w-4 h-4" />
                Mes
              </Button>
              <Button
                variant={vistaActual === 'semana' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => cambiarVista('semana')}
                className="flex items-center gap-1"
              >
                <CalendarDays className="w-4 h-4" />
                Semana
              </Button>
              <Button
                variant={vistaActual === 'dia' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => cambiarVista('dia')}
                className="flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                Día
              </Button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="calendar-grid grid grid-cols-1 sm:grid-cols-7 gap-2">
            {diasSemana.map((dia) => (
              <div key={dia} className="calendar-header">
                {dia}
              </div>
            ))}
          </div>

          {/* Calendario */}
          <div className="calendar-grid grid grid-cols-1 sm:grid-cols-7 gap-2">
            {diasParaMostrar.map((dia) => (
              <div
                key={dia.fecha}
                className={`calendar-day ${
                  dia.es_hoy ? 'today' : 
                  dia.es_pasado ? 'past' : ''
                }`}
              >
                <div className={`day-number ${
                  dia.es_hoy ? 'today' : 
                  dia.es_pasado ? 'past' : ''
                }`}>
                  {dia.dia}
                </div>
                
                <div className="space-y-1 relative">
                  {/* Slots de tiempo clickeables */}
                  {slotsTiempo.map((slot) => {
                    // Verificar si hay un horario existente en este slot
                    const horarioExistente = dia.horarios.find(h => {
                      const inicio = h.hora_inicio.substring(0, 5); // HH:MM
                      return inicio === slot;
                    });

                    if (horarioExistente) {
                      // Mostrar horario existente
                      return (
                        <div
                          key={`${dia.fecha}-${slot}-existing`}
                          className={`time-slot ${
                            horarioExistente.disponible 
                              ? 'available' 
                              : 'occupied'
                          }`}
                          onClick={() => abrirModalCita(horarioExistente, dia.fecha)}
                          style={{ borderLeftColor: horarioExistente.color }}
                        >
                          <div className="time-slot-title">
                            {horarioExistente.titulo}
                            {horarioExistente.es_especifico && (
                              <span className="ml-1 text-xs text-blue-600" title="Horario específico de este día">
                                ⭐
                              </span>
                            )}
                          </div>
                          <div className="time-slot-time">
                            {formatTime(horarioExistente.hora_inicio)} - {formatTime(horarioExistente.hora_fin)}
                          </div>
                          {horarioExistente.disponible && (
                            <div className="mt-1 flex justify-end">
                              <button
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-60"
                                onClick={(e) => { e.stopPropagation(); abrirEditarHorario(horarioExistente, dia.fecha); }}
                                title="Editar horario"
                                disabled={openingHorarioId === horarioExistente.id}
                              >
                                {openingHorarioId === horarioExistente.id ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <>
                                    <Edit className="w-3 h-3" /> Editar
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {!horarioExistente.disponible && (
                            <div className="time-slot-client">
                              {horarioExistente.cita?.cliente_nombre}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Mostrar slot vacío clickeable
                      return (
                        <div
                          key={`${dia.fecha}-${slot}-empty`}
                          className="time-slot-empty border border-dashed border-gray-300 rounded p-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[60px] flex flex-col justify-center"
                          onClick={() => abrirCrearHorarioPersonalizado(dia.fecha, slot)}
                          title={`Crear horario a las ${slot}`}
                        >
                          <div className="time-slot-time text-gray-400 text-sm">
                            {slot}
                          </div>
                          <div className="text-xs text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
                            + Crear horario
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Modal para crear/ver cita */}
      <Modal
        isOpen={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        title={citaSeleccionada?.horario.disponible ? 'Agendar Cita' : 'Detalles de Cita'}
        size="md"
      >
        <div className="cita-modal">
        <div className="space-y-4">
          {citaSeleccionada && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                {citaSeleccionada.horario.titulo}
              </h3>
              <p className="text-blue-700 text-sm">
                {formatTime(citaSeleccionada.horario.hora_inicio)} - {formatTime(citaSeleccionada.horario.hora_fin)}
              </p>
              <p className="text-blue-600 text-sm">
                {parseYmdToLocalDate(citaSeleccionada.fecha).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {citaSeleccionada?.horario.disponible ? (
            // Formulario para nueva cita
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Cliente *
                </label>
                <Input
                  value={citaData.cliente_nombre}
                  onChange={(e) => setCitaData({ ...citaData, cliente_nombre: e.target.value })}
                  placeholder="Nombre completo del cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <Input
                  value={citaData.cliente_telefono}
                  onChange={(e) => setCitaData({ ...citaData, cliente_telefono: e.target.value })}
                  placeholder="Número de teléfono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={citaData.cliente_email}
                  onChange={(e) => setCitaData({ ...citaData, cliente_email: e.target.value })}
                  placeholder="Email del cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicio *
                </label>
                <Input
                  value={citaData.servicio}
                  onChange={(e) => setCitaData({ ...citaData, servicio: e.target.value })}
                  placeholder="Tipo de servicio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={citaData.notas}
                  onChange={(e) => setCitaData({ ...citaData, notas: e.target.value })}
                  placeholder="Notas adicionales"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowCitaModal(false)}
                  disabled={isSavingCita}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={guardarCita}
                  disabled={isSavingCita || !citaData.cliente_nombre || !citaData.servicio}
                >
                  {isSavingCita ? <Spinner size="sm" className="mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Agendar Cita
                </Button>
              </div>
            </div>
          ) : (
            // Ver/editar cita existente
            <div className="space-y-4">
              {isEditingExisting ? (
                // Formulario de edición
                <div className="space-y-4 text-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Cliente *
                    </label>
                    <Input
                      value={citaData.cliente_nombre}
                      onChange={(e) => setCitaData({ ...citaData, cliente_nombre: e.target.value })}
                      placeholder="Nombre completo del cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <Input
                      value={citaData.cliente_telefono}
                      onChange={(e) => setCitaData({ ...citaData, cliente_telefono: e.target.value })}
                      placeholder="Número de teléfono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={citaData.cliente_email}
                      onChange={(e) => setCitaData({ ...citaData, cliente_email: e.target.value })}
                      placeholder="Email del cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servicio *
                    </label>
                    <Input
                      value={citaData.servicio}
                      onChange={(e) => setCitaData({ ...citaData, servicio: e.target.value })}
                      placeholder="Tipo de servicio"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={citaData.estado}
                      onChange={(e) => setCitaData({ ...citaData, estado: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="cancelada">Cancelada</option>
                      <option value="completada">Completada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <textarea
                      value={citaData.notas}
                      onChange={(e) => setCitaData({ ...citaData, notas: e.target.value })}
                      placeholder="Notas adicionales"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditingExisting(false)}
                      disabled={isSavingCita}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={actualizarCita}
                      disabled={isSavingCita || !citaData.cliente_nombre || !citaData.servicio}
                    >
                      {isSavingCita ? <Spinner size="sm" /> : 'Guardar cambios'}
                    </Button>
                  </div>
                </div>
              ) : (
                // Vista solo lectura
                <>
                  <div className="space-y-3 text-gray-500">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{citaData.cliente_nombre}</span>
                    </div>
                    {citaData.cliente_telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{citaData.cliente_telefono}</span>
                      </div>
                    )}
                    {citaData.cliente_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{citaData.cliente_email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{citaData.servicio}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getEstadoBadge(citaData.estado!)}
                    </div>
                    {citaData.notas && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">{citaData.notas}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setShowCitaModal(false)}
                    >
                      Cerrar
                    </Button>
                    <Button
                      onClick={() => setIsEditingExisting(true)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setShowConfirmEliminarCita(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Cita
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        </div>
      </Modal>
      {/* Modal confirmación eliminar cita */}
      <Modal
        isOpen={showConfirmEliminarCita}
        onClose={() => setShowConfirmEliminarCita(false)}
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          <p className="text-gray-700">¿Deseas eliminar esta cita? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirmEliminarCita(false)} disabled={isDeletingCita}>Cancelar</Button>
            <Button variant="danger" onClick={eliminarCita} disabled={isDeletingCita}>
              {isDeletingCita ? <Spinner size="sm" /> : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Modal para editar horario */}
      <Modal
        isOpen={showEditarHorarioModal}
        onClose={() => setShowEditarHorarioModal(false)}
        title={(() => {
          const horarioOriginal = calendarioData?.calendario
            .flatMap(dia => dia.horarios)
            .find(h => h.id === horarioEditForm?.id);
          return horarioOriginal?.es_especifico ? 'Editar Horario Específico' : 'Editar Horario';
        })()}
      >
        {horarioEditForm && (
          <div className="space-y-4 text-gray-600">
            {(() => {
              const horarioOriginal = calendarioData?.calendario
                .flatMap(dia => dia.horarios)
                .find(h => h.id === horarioEditForm.id);
              
              if (!horarioOriginal?.es_especifico) {
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Este es un horario base que se repite semanalmente. 
                      Al editarlo, se creará un horario específico solo para esta fecha sin afectar otros días.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <Input value={horarioEditForm.titulo} onChange={(e)=>setHorarioEditForm({ ...horarioEditForm, titulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                <input type="time" value={horarioEditForm.hora_inicio} onChange={(e)=>setHorarioEditForm({ ...horarioEditForm, hora_inicio: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                <input type="time" value={horarioEditForm.hora_fin} onChange={(e)=>setHorarioEditForm({ ...horarioEditForm, hora_fin: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Día de la semana</label>
              <select value={horarioEditForm.dia_semana} onChange={(e)=>setHorarioEditForm({ ...horarioEditForm, dia_semana: e.target.value as any })} className="w-full px-3 py-2 border rounded-md">
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sabado">Sábado</option>
                <option value="domingo">Domingo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input type="color" value={horarioEditForm.color} onChange={(e)=>setHorarioEditForm({ ...horarioEditForm, color: e.target.value })} className="h-10 w-16 p-0 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={horarioEditForm.notas} onChange={(e)=>setHorarioEditForm({ ...horarioEditForm, notas: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={horarioEditForm.activo} onChange={(e)=>setHorarioEditForm({ ...horarioEditForm, activo: e.target.checked })} />
              Activo
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={()=>{setShowEditarHorarioModal(false); setCitaSeleccionada(null);}} disabled={isSavingHorario || isDeletingHorario}>Cancelar</Button>
              <Button variant="danger" onClick={()=>setShowConfirmEliminarHorario(true)} disabled={isSavingHorario || isDeletingHorario}>
                Eliminar
              </Button>
              <Button onClick={guardarEdicionHorario} disabled={isSavingHorario}>
                {isSavingHorario ? <Spinner size="sm" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal confirmación eliminar horario */}
      <Modal
        isOpen={showConfirmEliminarHorario}
        onClose={() => setShowConfirmEliminarHorario(false)}
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          <p className="text-gray-700">¿Deseas eliminar este horario? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={()=>{setShowConfirmEliminarHorario(false); setCitaSeleccionada(null);}} disabled={isDeletingHorario}>Cancelar</Button>
            <Button variant="danger" onClick={eliminarHorario} disabled={isDeletingHorario}>
              {isDeletingHorario ? <Spinner size="sm" /> : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para crear horario personalizado */}
      <Modal
        isOpen={showCrearHorarioModal}
        onClose={() => setShowCrearHorarioModal(false)}
        title="Crear Horario Personalizado"
        size="md"
      >
        {horarioPersonalizadoData && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-black">
              <p className="text-sm text-blue-800">
                <strong>Fecha:</strong> {parseYmdToLocalDate(horarioPersonalizadoData.fecha).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del Horario *</label>
              <Input
                value={horarioPersonalizadoData.titulo}
                onChange={(e) => setHorarioPersonalizadoData({ ...horarioPersonalizadoData, titulo: e.target.value })}
                placeholder="Ej: Corte de cabello, Manicura, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-black">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio</label>
                <input
                  type="time"
                  value={horarioPersonalizadoData.hora_inicio}
                  onChange={(e) => setHorarioPersonalizadoData({ ...horarioPersonalizadoData, hora_inicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Fin</label>
                <input
                  type="time"
                  value={horarioPersonalizadoData.hora_fin}
                  onChange={(e) => setHorarioPersonalizadoData({ ...horarioPersonalizadoData, hora_fin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={horarioPersonalizadoData.color}
                onChange={(e) => setHorarioPersonalizadoData({ ...horarioPersonalizadoData, color: e.target.value })}
                className="h-10 w-16 p-0 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={horarioPersonalizadoData.notas}
                onChange={(e) => setHorarioPersonalizadoData({ ...horarioPersonalizadoData, notas: e.target.value })}
                placeholder="Notas adicionales sobre este horario"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCrearHorarioModal(false);
                  setHorarioPersonalizadoData(null);
                }}
                disabled={isSavingHorario}
              >
                Cancelar
              </Button>
              <Button
                onClick={crearHorarioPersonalizado}
                disabled={isSavingHorario || !horarioPersonalizadoData.titulo.trim()}
              >
                {isSavingHorario ? <Spinner size="sm" className="mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Crear Horario
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AgendaCalendarioPage;
