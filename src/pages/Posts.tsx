import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getBase64Src, isImageFile, getCategoryColor,
  type Message, type MessageType,
} from "@/lib/storage";
import { FileText, ArrowLeft, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";
import { format, formatDistanceToNow } from "date-fns";

const INITIAL_VISIBLE = 3;

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

const Posts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Message[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("aais_messages")
      .select("*")
      .eq("status", "approved")
      .order("timestamp", { ascending: false });

    if (data) {
      setPosts(
        data.map((row) => ({
          id: row.id,
          type: row.type as MessageType,
          message: row.message,
          timestamp: row.timestamp,
          status: row.status as Message["status"],
          ...(row.file_name
            ? { file: { name: row.file_name, type: row.file_type!, data: row.file_data! } }
            : {}),
        }))
      );
    }
  };

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel("posts_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "aais_messages" }, () => loadPosts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const visiblePosts = showAll ? posts : posts.slice(0, INITIAL_VISIBLE);
  const hiddenCount = posts.length - INITIAL_VISIBLE;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground mb-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Submit
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary">Freedom Wall</h2>
            <p className="text-muted-foreground text-sm mt-1">Approved anonymous messages from the community</p>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No approved posts yet.</p>
        ) : (
          <div className="space-y-4">
            {visiblePosts.map((msg) => (
              <Card key={msg.id} className="border border-primary/20 shadow-sm animate-fade-in">
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
                          className="max-h-64 rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
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
                </CardContent>
              </Card>
            ))}
            {!showAll && hiddenCount > 0 && (
              <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
                +{hiddenCount} more <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
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

export default Posts;
