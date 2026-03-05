import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Check, X, Trash2, ChevronDown, ChevronUp, FileText, CheckCircle, XCircle, Newspaper } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";
import { format, formatDistanceToNow } from "date-fns";

const INITIAL_VISIBLE = 3;

const isSolveType = (type: MessageType) => type === "Suggestion" || type === "Concern";

const TimeAgo = ({ timestamp }: { timestamp: string }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs text-muted-foreground">
      {format(new Date(timestamp), "MMM d, yyyy")} · {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
    </span>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSolveHistory, setShowSolveHistory] = useState(false);
  const [showPublishedPosts, setShowPublishedPosts] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAllPending, setShowAllPending] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const reload = useCallback(async () => {
    await cleanOldHistory();
    const msgs = await getMessages();
    setMessages(msgs);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("isAdmin") !== "true") {
      navigate("/admin");
      return;
    }
    reload();

    const channel = supabase
      .channel("aais_messages_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aais_messages" },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = (statuses: Message["status"][]) => {
    let msgs = messages.filter((m) => statuses.includes(m.status));
    if (categoryFilter !== "all") {
      msgs = msgs.filter((m) => m.type === categoryFilter);
    }
    return msgs;
  };

  const pending = filtered(["pending"]);
  const approvedPosts = messages
    .filter((m) => m.status === "approved")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const approveRejectHistory = filtered(["approved", "rejected"]).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const solveHistory = filtered(["solved", "unsolved"]).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const totalPending = messages.filter((m) => m.status === "pending").length;

  const shouldCollapsePending = categoryFilter === "all" && pending.length > INITIAL_VISIBLE && !showAllPending;
  const visiblePending = shouldCollapsePending ? pending.slice(0, INITIAL_VISIBLE) : pending;
  const hiddenPendingCount = pending.length - INITIAL_VISIBLE;

  const shouldCollapsePosts = approvedPosts.length > INITIAL_VISIBLE && !showAllPosts;
  const visiblePosts = shouldCollapsePosts ? approvedPosts.slice(0, INITIAL_VISIBLE) : approvedPosts;
  const hiddenPostsCount = approvedPosts.length - INITIAL_VISIBLE;

  const handleAction = async (id: number, status: Message["status"], label: string) => {
    await updateMessageStatus(id, status);
    await reload();
    const emoji = status === "approved" || status === "solved" ? "✅" : "❌";
    toast({ title: `${emoji} ${label}` });
  };

  const handleDelete = async (id: number) => {
    await deleteMessage(id);
    await reload();
    toast({ title: "🗑️ Deleted" });
  };

  const statusBadge = (status: Message["status"]) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-primary text-primary-foreground">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "solved":
        return <Badge className="bg-primary text-primary-foreground">Solved</Badge>;
      case "unsolved":
        return <Badge variant="destructive">Unsolved</Badge>;
      default:
        return null;
    }
  };

  const PendingCard = ({ msg }: { msg: Message }) => (
    <Card className="border border-primary/30 shadow-sm animate-fade-in">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant={getCategoryColor(msg.type)}>{msg.type}</Badge>
          <span className="ml-auto">
            <TimeAgo timestamp={msg.timestamp} />
          </span>
        </div>
        <p className="text-foreground whitespace-pre-wrap break-words">{msg.message}</p>
        {msg.file && (
          <div className="mt-3">
            {isImageFile(msg.file.type) ? (
              <img
                src={getBase64Src(msg.file)}
                alt={msg.file.name}
                className="max-h-48 rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox({ src: getBase64Src(msg.file!), alt: msg.file!.name })}
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
          {isSolveType(msg.type) ? (
            <>
              <Button size="sm" onClick={() => handleAction(msg.id, "solved", "Solved")}>
                <CheckCircle className="mr-1 h-4 w-4" /> Solve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleAction(msg.id, "unsolved", "Unsolved")}>
                <XCircle className="mr-1 h-4 w-4" /> Unsolve
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => handleAction(msg.id, "approved", "Approved")}>
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleAction(msg.id, "rejected", "Rejected")}>
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const PostCard = ({ msg }: { msg: Message }) => (
    <Card className="border border-primary/20 shadow-sm animate-fade-in">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant={getCategoryColor(msg.type)}>{msg.type}</Badge>
          <Badge className="bg-primary text-primary-foreground">Approved</Badge>
          <span className="ml-auto">
            <TimeAgo timestamp={msg.timestamp} />
          </span>
        </div>
        <p className="text-foreground text-sm whitespace-pre-wrap break-words">{msg.message}</p>
        {msg.file && (
          <div className="mt-3">
            {isImageFile(msg.file.type) ? (
              <img
                src={getBase64Src(msg.file)}
                alt={msg.file.name}
                className="max-h-40 rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox({ src: getBase64Src(msg.file!), alt: msg.file!.name })}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-5 w-5" />
                <span>{msg.file.name}</span>
              </div>
            )}
          </div>
        )}
        <div className="mt-3">
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(msg.id)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete from Posts
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const HistorySection = ({
    title,
    items,
    show,
    onToggle,
  }: {
    title: string;
    items: Message[];
    show: boolean;
    onToggle: () => void;
  }) => (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onToggle} className="text-muted-foreground">
          {show ? (
            <>Hide <ChevronUp className="ml-1 h-4 w-4" /></>
          ) : (
            <>+{items.length} in history <ChevronDown className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      </div>
      {show && (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No history yet.</p>
          ) : (
            items.map((msg) => (
              <Card key={msg.id} className="border border-primary/30 shadow-sm animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant={getCategoryColor(msg.type)}>{msg.type}</Badge>
                    {statusBadge(msg.status)}
                    <span className="ml-auto">
                      <TimeAgo timestamp={msg.timestamp} />
                    </span>
                  </div>
                  <p className="text-foreground text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className="mt-3">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(msg.id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </section>
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
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setShowAllPending(false); }}>
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
          <h3 className="text-lg font-semibold text-primary mb-4">Submitted Anonymous Messages</h3>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No pending messages.</p>
          ) : (
            <div className="space-y-4">
              {visiblePending.map((msg) => (
                <PendingCard key={msg.id} msg={msg} />
              ))}
              {shouldCollapsePending && (
                <Button variant="outline" className="w-full" onClick={() => setShowAllPending(true)}>
                  +{hiddenPendingCount} more <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              )}
              {showAllPending && categoryFilter === "all" && pending.length > INITIAL_VISIBLE && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAllPending(false)}>
                  Show less <ChevronUp className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Published Posts - inline in dashboard */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Newspaper className="h-5 w-5" /> Published Posts
            </h3>
            <Button variant="ghost" size="sm" onClick={() => { setShowPublishedPosts(!showPublishedPosts); setShowAllPosts(false); }} className="text-muted-foreground">
              {showPublishedPosts ? (
                <>Hide <ChevronUp className="ml-1 h-4 w-4" /></>
              ) : (
                <>{approvedPosts.length} posts <ChevronDown className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
          {showPublishedPosts && (
            <div className="space-y-3">
              {approvedPosts.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No published posts yet.</p>
              ) : (
                <>
                  {visiblePosts.map((msg) => (
                    <PostCard key={msg.id} msg={msg} />
                  ))}
                  {shouldCollapsePosts && (
                    <Button variant="outline" className="w-full" onClick={() => setShowAllPosts(true)}>
                      +{hiddenPostsCount} more <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                  {showAllPosts && approvedPosts.length > INITIAL_VISIBLE && (
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAllPosts(false)}>
                      Show less <ChevronUp className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <HistorySection
          title="Approved / Rejected History"
          items={approveRejectHistory}
          show={showHistory}
          onToggle={() => setShowHistory(!showHistory)}
        />

        <HistorySection
          title="Solved / Unsolved History"
          items={solveHistory}
          show={showSolveHistory}
          onToggle={() => setShowSolveHistory(!showSolveHistory)}
        />
      </main>
      <Footer />

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          open={!!lightbox}
          onOpenChange={(open) => !open && setLightbox(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
