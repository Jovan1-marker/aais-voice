import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addMessage, fileToBase64, MESSAGE_TYPES, type MessageType, type AttachedFile } from "@/lib/storage";
import { Upload, FileText, X, Image as ImageIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Index = () => {
  const [type, setType] = useState<MessageType | "">("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<AttachedFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 5MB.", variant: "destructive" });
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) {
      toast({ title: "Invalid file type", description: "Only PNG, JPG, PDF, DOCX allowed.", variant: "destructive" });
      return;
    }
    const attached = await fileToBase64(f);
    setFile(attached);
    setFileName(f.name);
    if (f.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (!type) {
      toast({ title: "Select a category", description: "Please choose a message type.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Empty message", description: "Please type your message.", variant: "destructive" });
      return;
    }
    if (message.trim().length > 2000) {
      toast({ title: "Message too long", description: "Max 2000 characters.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    addMessage({ type: type as MessageType, message: message.trim(), ...(file ? { file } : {}) });
    toast({ title: "✅ Submitted!", description: "Your anonymous message has been sent." });
    setType("");
    setMessage("");
    setFile(null);
    setFileName("");
    setFilePreview(null);
    setIsSubmitting(false);
  };

  const removeFile = () => {
    setFile(null);
    setFileName("");
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-12 md:py-20 text-center px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-primary mb-3 animate-fade-in">
            Speak Up. Be Heard.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Where voices unite to build a better AAIS.
          </p>
        </section>

        <section className="container mx-auto max-w-xl px-4 pb-16">
          <Card className="border-2 border-primary/40 shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary text-xl">Submit a Message</CardTitle>
              <CardDescription>
                Your identity is completely hidden. Help us improve our school better by sharing your honest thoughts, suggestions, and concerns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-primary font-medium">Choose what type of anonymous message</Label>
                <Select value={type} onValueChange={(v) => setType(v as MessageType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-primary font-medium">Your Message</Label>
                <Textarea
                  placeholder="Type your message here... 😊"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-primary font-medium">Attachment (optional)</Label>
                <div
                  className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Attach file (optional – image, pdf, document)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF, DOCX • Max 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
                {fileName && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-md">
                    {filePreview ? (
                      <img src={filePreview} alt="preview" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <FileText className="h-8 w-8 text-primary" />
                    )}
                    <span className="text-sm flex-1 truncate">{fileName}</span>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Button
                className="w-full text-base font-semibold h-12"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                Submit Anonymously
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
