import { supabase } from "@/integrations/supabase/client";

export type MessageType = "Suggestion" | "Concern" | "Feedback" | "Confession" | "Appreciation";
export type MessageStatus = "pending" | "approved" | "rejected" | "solved" | "unsolved";

export interface AttachedFile {
  name: string;
  type: string;
  data: string; // base64 without prefix
}

export interface Message {
  id: number;
  type: MessageType;
  message: string;
  file?: AttachedFile;
  timestamp: string;
  status: MessageStatus;
}

export async function getMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from("aais_messages")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    type: row.type as MessageType,
    message: row.message,
    timestamp: row.timestamp,
    status: row.status as MessageStatus,
    ...(row.file_name
      ? { file: { name: row.file_name, type: row.file_type!, data: row.file_data! } }
      : {}),
  }));
}

export async function addMessage(
  msg: Omit<Message, "id" | "timestamp" | "status">
): Promise<Message | null> {
  const row: Record<string, unknown> = {
    id: Date.now(),
    type: msg.type,
    message: msg.message,
    status: "pending",
  };
  if (msg.file) {
    row.file_name = msg.file.name;
    row.file_type = msg.file.type;
    row.file_data = msg.file.data;
  }

  const { data, error } = await supabase
    .from("aais_messages")
    .insert(row as any)
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    type: data.type as MessageType,
    message: data.message,
    timestamp: data.timestamp,
    status: data.status as MessageStatus,
    ...(data.file_name
      ? { file: { name: data.file_name, type: data.file_type!, data: data.file_data! } }
      : {}),
  };
}

export async function updateMessageStatus(id: number, status: MessageStatus) {
  await supabase.from("aais_messages").update({ status }).eq("id", id);
}

export async function deleteMessage(id: number) {
  await supabase.from("aais_messages").delete().eq("id", id);
}

export async function cleanOldHistory() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("aais_messages")
    .delete()
    .in("status", ["approved", "rejected", "solved"])
    .lt("timestamp", sevenDaysAgo);
}

export function fileToBase64(file: File): Promise<AttachedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ name: file.name, type: file.type, data: base64 });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getBase64Src(file: AttachedFile) {
  return `data:${file.type};base64,${file.data}`;
}

export function isImageFile(type: string) {
  return type.startsWith("image/");
}

export const MESSAGE_TYPES: MessageType[] = ["Suggestion", "Concern", "Feedback", "Confession", "Appreciation"];

export function getCategoryColor(type: MessageType): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "Suggestion":
    case "Appreciation":
      return "default";
    case "Concern":
    case "Feedback":
      return "secondary";
    case "Confession":
      return "destructive";
    default:
      return "outline";
  }
}
