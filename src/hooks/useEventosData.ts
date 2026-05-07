import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export interface Evento {
  id: number;
  nombre: string;
  categoria: string;
  fecha: string;
  horadeinicio: string;
  horadefin: string;
  ubicacion: string | null;
  capacidadmaxima: number | null;
}

export interface RegistroEvento {
  id: number;
  eventoid: number;
  personaid: number;
  asistio: boolean | null;
  fecha_registro: string;
}

export function useEventosData() {
  return useQuery({
    queryKey: ['eventos'],
    queryFn: async () => {
      try {
        // Obtenemos eventos
        const responseEventos = await fetch("/api/chatbot/eventos", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          }
        });
        
        let eventos = [];
        if (responseEventos.ok) {
          eventos = await responseEventos.json() || [];
        }

        // Obtenemos registros de eventos
        const responseRegistros = await fetch("/api/chatbot/registros-eventos", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          }
        });
        
        let registros = [];
        if (responseRegistros.ok) {
          registros = await responseRegistros.json() || [];
        }

        // Mapear los registros a los eventos para contar asistencias
        const registrosPorEvento = (registros || []).reduce((acc: any, curr: any) => {
          const eventId = curr.eventoid;
          if (!acc[eventId]) {
            acc[eventId] = { total: 0, asistencias: 0 };
          }
          acc[eventId].total += 1;
          if (curr.asistio) {
            acc[eventId].asistencias += 1;
          }
          return acc;
        }, {});

        return (eventos || []).map((evento: any) => {
          const stats = registrosPorEvento[evento.id] || { total: 0, asistencias: 0 };
          return {
            ...evento,
            registrados_count: stats.total,
            asistencias_count: stats.asistencias
          };
        }).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      } catch (err) {
        console.error('Exception fetching eventos data:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Este hook se utilizaba para ver qué personas estaban registradas a un evento.
// Lo simulamos para que compile bien o puedes implementar el endpoint si la tabla existe.
export function usePersonasPorEvento(eventoId: number | null) {
  return useQuery({
    queryKey: ['personas-evento', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];

      try {
        // Aquí podrías implementar un join en backend, por ahora by-pass:
        return [];
      } catch (err) {
        console.error(`Exception fetching personas for evento ${eventoId}:`, err);
        return [];
      }
    },
    enabled: !!eventoId,
  });
}

export function usePersonasSinEvento(eventoId: number | null) {
  return useQuery({
    queryKey: ['personas-sin-evento', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];
      
      try {
        return [];
      } catch (err) {
        console.error('Exception fetching personas:', err);
        return [];
      }
    },
    enabled: !!eventoId,
  });
}

export interface EventoRegistro {
  evento_id: string;
  hash_code: string;
  created_at: string;
}

export interface EventoConRegistro extends Evento {
  registrado_at: string;
}

export function useEventosHistorial(hashCode: string | null) {
  return useQuery({
    queryKey: ["eventos-historial", hashCode],
    queryFn: async (): Promise<EventoConRegistro[]> => {
      if (!hashCode) return [];

      const { data: registros, error: regError } = await externalSupabase
        .from("eventos_registros")
        .select("*")
        .eq("hash_code", hashCode)
        .order("created_at", { ascending: false });

      if (regError) throw regError;
      if (!registros || registros.length === 0) return [];

      const eventoIds = registros.map((r: any) => r.evento_id);
      const { data: eventos, error: evError } = await externalSupabase
        .from("eventos")
        .select("*")
        .in("evento_id", eventoIds);

      if (evError) throw evError;

      const eventosMap = new Map((eventos || []).map((e: any) => [e.evento_id, e]));

      return registros
        .map((r: any) => {
          const evento = eventosMap.get(r.evento_id) as Evento | undefined;
          if (!evento) return null;
          return { ...evento, registrado_at: r.created_at };
        })
        .filter(Boolean) as EventoConRegistro[];
    },
    enabled: !!hashCode,
  });
}

export function useEventosProximos() {
  return useQuery({
    queryKey: ["eventos-proximos"],
    queryFn: async (): Promise<Evento[]> => {
      const now = new Date().toISOString();
      const { data, error } = await externalSupabase
        .from("eventos")
        .select("*")
        .gte("fecha_inicio", now)
        .order("fecha_inicio", { ascending: true });

      if (error) throw error;
      return (data || []) as Evento[];
    },
  });
}

export async function buscarEvento(eventoId: string): Promise<Evento | null> {
  const { data, error } = await externalSupabase
    .from("eventos")
    .select("*")
    .eq("evento_id", eventoId)
    .single();

  if (error || !data) return null;
  return data as Evento;
}

export async function verificarRegistro(eventoId: string, hashCode: string): Promise<boolean> {
  const { data } = await externalSupabase
    .from("eventos_registros")
    .select("evento_id")
    .eq("evento_id", eventoId)
    .eq("hash_code", hashCode)
    .maybeSingle();

  return !!data;
}

export async function registrarAsistencia(eventoId: string, hashCode: string): Promise<void> {
  const { error } = await externalSupabase
    .from("eventos_registros")
    .insert({ evento_id: eventoId, hash_code: hashCode });

  if (error) throw error;
}
