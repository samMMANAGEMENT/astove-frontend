import React, { useState } from "react";
import {
  User,
  Phone,
  FileText,
  Edit,
  Trash2,
  Plus,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button, Badge } from "./ui";
import { type PersonaListaEspera } from "../lib/services/listaEsperaService";

interface ListaEsperaItemProps {
  personas: PersonaListaEspera[];
  fecha: string;
  onEdit: (persona: PersonaListaEspera) => void;
  onDelete: (persona: PersonaListaEspera) => void;
  onAdd: () => void;
  onAsignarCita: (persona: PersonaListaEspera) => void;
  onCambiarFecha: (persona: PersonaListaEspera) => void;
}

const ListaEsperaItem: React.FC<ListaEsperaItemProps> = ({
  personas,
  fecha,
  onEdit,
  onDelete,
  onAdd,
  onAsignarCita,
  onCambiarFecha,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-lg min-w-[300px] max-w-[350px]">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Lista de Espera
        </h4>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()} // 👈 evitamos que el click cierre/abra
        >
          <Button
            onClick={() => onAdd()}
            size="sm"
            variant="outline"
            className="text-green-600 hover:text-green-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {/* Contenido colapsable */}
      {isOpen && (
        <div className="p-4">
          <div className="text-xs text-gray-500 mb-3">
            {new Date(fecha + 'T00:00:00').toLocaleDateString("es-CO", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {personas.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay personas en lista de espera</p>
              </div>
            ) : (
              personas.map((persona, index) => (
                <div
                  key={persona.id}
                  className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">
                        {persona.nombre}
                      </h5>
                      <p className="text-xs text-gray-600 mb-1">
                        {persona.servicio}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <div
                        onClick={() => onAsignarCita(persona)}
                        className="p-1 h-6 w-6 bg-green-500 hover:bg-green-600 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                        title="Asignar cita"
                      >
                        <Calendar className="w-3 h-3 text-white" />
                      </div>

                      <div
                        onClick={() => onCambiarFecha(persona)}
                        className="p-1 h-6 w-6 bg-blue-500 hover:bg-blue-600 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                        title="Cambiar fecha"
                      >
                        <CalendarDays className="w-3 h-3 text-white" />
                      </div>

                      <div
                        onClick={() => onEdit(persona)}
                        className="p-1 h-6 w-6 bg-yellow-500 hover:bg-yellow-600 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                        title="Editar persona"
                      >
                        <Edit className="w-3 h-3 text-white" />
                      </div>

                      <div
                        onClick={() => onDelete(persona)}
                        className="p-1 h-6 w-6 bg-red-500 hover:bg-red-600 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                        title="Eliminar persona"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {persona.telefono && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span>{persona.telefono}</span>
                      </div>
                    )}
                    {persona.notas && (
                      <div className="flex items-start gap-1 text-xs text-gray-600">
                        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
                        <span className="line-clamp-2">{persona.notas}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(persona.created_at).toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {personas.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 text-center">
                Total: {personas.length} persona
                {personas.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListaEsperaItem;
