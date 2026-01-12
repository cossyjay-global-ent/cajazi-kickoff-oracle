import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FullPageState } from "@/components/FullPageState";
import { toast } from "sonner";
import { ArrowLeft, Eye, Send, Mail, Users, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Newsletter {
  id: string;
  subject: string;
  content: string;
  sent_at: string;
  recipient_count: number;
}

export default function AdminNewsletter() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    fetchSubscriberCount();
    fetchNewsletters();
  };

  const fetchSubscriberCount = async () => {
    const { count, error } = await supabase
      .from("newsletter_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("verified", true)
      .is("unsubscribed_at", null);

    if (!error && count !== null) {
      setSubscriberCount(count);
    }
  };

  const fetchNewsletters = async () => {
    const { data, error } = await supabase
      .from("newsletters")
      .select("id, subject, content, sent_at, recipient_count")
      .order("sent_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNewsletters(data);
    }
  };

  const handleSendNewsletter = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    if (subject.length > 200) {
      toast.error("Subject must be 200 characters or less");
      return;
    }

    if (subscriberCount === 0) {
      toast.error("No active subscribers to send to");
      return;
    }

    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Session expired. Please log in again.");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: { subject: subject.trim(), content: content.trim() },
      });

      if (error) {
        console.error("Newsletter send error:", error);
        toast.error(error.message || "Failed to send newsletter");
        return;
      }

      if (data?.success) {
        toast.success(data.message || "Newsletter sent successfully!");
        setSubject("");
        setContent("");
        fetchNewsletters();
      } else {
        toast.error(data?.error || "Failed to send newsletter");
      }
    } catch (error: any) {
      console.error("Newsletter send error:", error);
      toast.error("An error occurred while sending the newsletter");
    } finally {
      setSending(false);
    }
  };

  const formatContent = (html: string) => {
    // Convert newlines to <br> and wrap paragraphs
    const formatted = html
      .split("\n\n")
      .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
    
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'strong', 'em'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  };

  if (loading) {
    return (
      <FullPageState
        variant="loading"
        title="Loading..."
        description="Checking admin access"
      />
    );
  }

  if (!isAdmin) {
    return (
      <FullPageState
        variant="error"
        title="Access Denied"
        description="You don't have permission to access this page."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Newsletter Manager</h1>
            <p className="text-muted-foreground text-sm">Send newsletters to your subscribers</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{subscriberCount}</p>
                  <p className="text-xs text-muted-foreground">Active Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{newsletters.length}</p>
                  <p className="text-xs text-muted-foreground">Newsletters Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compose Newsletter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Compose Newsletter
            </CardTitle>
            <CardDescription>
              Write and send a newsletter to all verified subscribers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Subject <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Enter newsletter subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {subject.length}/200 characters
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Content <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Write your newsletter content here...&#10;&#10;Use blank lines to separate paragraphs.&#10;HTML tags like <b>bold</b>, <a href='...'>links</a> are supported."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] text-base font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports basic HTML: &lt;b&gt;, &lt;i&gt;, &lt;a&gt;, &lt;p&gt;, &lt;br&gt;
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={!subject.trim() && !content.trim()}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleSendNewsletter}
                disabled={sending || !subject.trim() || !content.trim() || subscriberCount === 0}
                className="flex-1"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {subscriberCount} Subscribers
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Newsletters */}
        {newsletters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Newsletters
              </CardTitle>
              <CardDescription>
                History of sent newsletters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Recipients</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsletters.map((newsletter) => (
                      <TableRow key={newsletter.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {newsletter.subject}
                        </TableCell>
                        <TableCell className="text-center">
                          {newsletter.recipient_count}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Date(newsletter.sent_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Newsletter Preview</DialogTitle>
              <DialogDescription>
                This is how your newsletter will appear to subscribers
              </DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden mt-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 text-center">
                <h2 className="text-xl font-bold">⚽ KickoffPrediction</h2>
              </div>
              {/* Content */}
              <div className="p-6 bg-card">
                <h3 className="text-lg font-semibold mb-4">{subject || "(No subject)"}</h3>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: content ? formatContent(content) : "<p>(No content)</p>" 
                  }}
                />
              </div>
              {/* Footer */}
              <div className="bg-muted p-4 text-center text-xs text-muted-foreground">
                <p>You are receiving this email because you subscribed on kickoffprediction.com</p>
                <p className="mt-2">
                  <span className="text-primary underline cursor-pointer">Unsubscribe</span> from future emails
                </p>
                <p className="mt-2">© {new Date().getFullYear()} KickoffPrediction. All rights reserved.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
