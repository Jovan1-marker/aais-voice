import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getMessages, updateMessageStatus, deleteMessage, cleanOldHistory,
  type Message, type MessageType, MESSAGE_TYPES, getCategoryColor,
  isImageFile, getBase64Src,
} from "@/lib/storage";
import { Check, X, Trash2, ChevronDown, ChevronUp, FileText, Image as ImageIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { format } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (sessionStorage.getItem("isAdmin") !== "true") {
      navigate("/admin");
      return;
    }
    reload();
  }, []);

  const reload = () => {
    const cleaned = cleanOldHistory();
    setMessages(cleaned);
  };

  const filtered = (status: Message["status"]) => {
    let msgs = messages.filter((m) => m.status === status);
    if (categoryFilter !== "all") {
      msgs = msgs.filter((m) => m.type === categoryFilter);
    }
    return msgs;
  };

  const pending = filtered("pending");
  const history = [...filtered("approved"), ...filtered("rejected")].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const totalPending = messages.filter((m) => m.status === "pending").length;

  const handleApprove = (id: number) => {
    updateMessageStatus(id, "approved");
    reload();
    toast({ title: "✅ Approved" });
  };

  const handleReject = (id: number) => {
    updateMessageStatus(id, "rejected");
    reload();
    toast({ title: "❌ Rejected" });
  };

  const handleDelete = (id: number) => {
    deleteMessage(id);
    reload();
    toast({ title: "🗑️ Deleted" });
  };

  const statusBadge = (status: Message["status"]) => {
    if (status === "approved")
      return <Badge className="bg-primary text-primary-foreground">Approved</Badge>;
    return <Badge variant="destructive">Rejected</Badge>;
  };

  const categoryBadgeClass = (type: MessageType) => {
    const variant = getCategoryColor(type);
    return variant;
  };

  const MessageCard = ({ msg, compact = false }: { msg: Message; compact?: boolean }) => (
    <Card className="border border-primary/30 shadow-sm animate-fade-in">
      <CardContent className={compact ? "p-4" : "p-5"}>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant={categoryBadgeClass(msg.type)}>{msg.type}</Badge>
          {msg.status !== "pending" && statusBadge(msg.status)}
          <span className="ml-auto text-xs text-muted-foreground">
            {format(new Date(msg.timestamp), "MMM d, yyyy")}
          </span>
        </div>
        <p className={`text-foreground ${compact ? "text-sm" : ""} whitespace-pre-wrap break-words`}>
          {msg.message}
        </p>
        {msg.file && (
          <div className="mt-3">
            {isImageFile(msg.file.type) ? (
              <img
                src={getBase64Src(msg.file)}
                alt={msg.file.name}
                className="max-h-48 rounded-md border"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-5 w-5" />
                <span>{msg.file.name}</span>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex gap-2 flex-wrap">
          {msg.status === "pending" ? (
            <>
              <Button size="sm" onClick={() => handleApprove(msg.id)}>
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleReject(msg.id)}>
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(msg.id)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
            <p className="text-muted-foreground text-sm">Manage incoming feedback and concerns</p>
          </div>
          <Badge className="bg-warning text-warning-foreground text-sm px-3 py-1 self-start">
            {totalPending} Pending
          </Badge>
        </div>

        <div className="mb-6">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MESSAGE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <section className="mb-10">
          <h3 className="text-lg font-semibold text-primary mb-4">
            Submitted Anonymous Messages
          </h3>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No pending messages.</p>
          ) : (
            <div className="space-y-4">
              {pending.map((msg) => (
                <MessageCard key={msg.id} msg={msg} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">History</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-muted-foreground"
            >
              {showHistory ? (
                <>Hide <ChevronUp className="ml-1 h-4 w-4" /></>
              ) : (
                <>+{history.length} in history <ChevronDown className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
          {showHistory && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No history yet.</p>
              ) : (
                history.map((msg) => (
                  <MessageCard key={msg.id} msg={msg} compact />
                ))
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
