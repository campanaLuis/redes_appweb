import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/externalSupabase";

export interface Evento {
  evento_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estatus: string;
  link_ubicacion: string | null;
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
