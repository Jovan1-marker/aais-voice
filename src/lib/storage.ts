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

const STORAGE_KEY = "aais_messages";

export function getMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: Message[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

export function addMessage(msg: Omit<Message, "id" | "timestamp" | "status">): Message {
  const messages = getMessages();
  const newMsg: Message = {
    ...msg,
    id: Date.now(),
    timestamp: new Date().toISOString(),
    status: "pending",
  };
  messages.push(newMsg);
  saveMessages(messages);
  return newMsg;
}

export function updateMessageStatus(id: number, status: MessageStatus) {
  const messages = getMessages();
  const idx = messages.findIndex((m) => m.id === id);
  if (idx !== -1) {
    messages[idx].status = status;
    saveMessages(messages);
  }
}

export function deleteMessage(id: number) {
  const messages = getMessages().filter((m) => m.id !== id);
  saveMessages(messages);
}

export function cleanOldHistory() {
  const messages = getMessages();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = messages.filter(
    (m) => m.status === "pending" || m.status === "unsolved" || new Date(m.timestamp).getTime() > sevenDaysAgo
  );
  saveMessages(filtered);
  return filtered;
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
