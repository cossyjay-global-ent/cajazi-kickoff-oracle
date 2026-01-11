import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2, Edit2, X, Check } from "lucide-react";

interface Comment {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

interface CommentReply {
  id: string;
  comment_id: string;
  admin_id: string;
  reply: string;
  created_at: string;
}

export const CommentManager = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Record<string, CommentReply[]>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [showReplyForm, setShowReplyForm] = useState<Record<string, boolean>>({});
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load comments");
      console.error(error);
    } else {
      setComments(data || []);
      // Fetch replies for all comments
      if (data && data.length > 0) {
        fetchReplies(data.map((c) => c.id));
      }
    }
    setLoading(false);
  };

  const fetchReplies = async (commentIds: string[]) => {
    const { data, error } = await supabase
      .from("comment_replies")
      .select("*")
      .in("comment_id", commentIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch replies:", error);
      return;
    }

    // Group replies by comment_id
    const repliesMap: Record<string, CommentReply[]> = {};
    data?.forEach((reply) => {
      if (!repliesMap[reply.comment_id]) {
        repliesMap[reply.comment_id] = [];
      }
      repliesMap[reply.comment_id].push(reply);
    });
    setReplies(repliesMap);
  };

  const handleSubmitReply = async (commentId: string) => {
    const replyText = replyInputs[commentId]?.trim();
    if (!replyText) {
      toast.error("Reply cannot be empty");
      return;
    }

    setSubmitting((prev) => ({ ...prev, [commentId]: true }));

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("You must be logged in");
      setSubmitting((prev) => ({ ...prev, [commentId]: false }));
      return;
    }

    const { error } = await supabase.from("comment_replies").insert({
      comment_id: commentId,
      admin_id: session.session.user.id,
      reply: replyText,
    });

    if (error) {
      toast.error("Failed to submit reply");
      console.error(error);
    } else {
      toast.success("Reply submitted successfully");
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
      setShowReplyForm((prev) => ({ ...prev, [commentId]: false }));
      fetchReplies(comments.map((c) => c.id));
    }

    setSubmitting((prev) => ({ ...prev, [commentId]: false }));
  };

  const handleEditReply = async (replyId: string) => {
    if (!editReplyText.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }

    const { error } = await supabase
      .from("comment_replies")
      .update({ reply: editReplyText.trim() })
      .eq("id", replyId);

    if (error) {
      toast.error("Failed to update reply");
      console.error(error);
    } else {
      toast.success("Reply updated successfully");
      setEditingReply(null);
      setEditReplyText("");
      fetchReplies(comments.map((c) => c.id));
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    const { error } = await supabase
      .from("comment_replies")
      .delete()
      .eq("id", replyId);

    if (error) {
      toast.error("Failed to delete reply");
      console.error(error);
    } else {
      toast.success("Reply deleted successfully");
      fetchReplies(comments.map((c) => c.id));
    }
  };

  const startEditReply = (reply: CommentReply) => {
    setEditingReply(reply.id);
    setEditReplyText(reply.reply);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            User Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading comments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          User Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No comments yet
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 bg-background border border-border rounded-lg"
              >
                {/* Comment Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-foreground">{comment.name}</div>
                    <div className="text-xs text-muted-foreground">{comment.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()} at{" "}
                    {new Date(comment.created_at).toLocaleTimeString()}
                  </div>
                </div>

                {/* Comment Message */}
                <div className="bg-muted/50 p-3 rounded-md mb-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {comment.message}
                  </p>
                </div>

                {/* Admin Replies */}
                {replies[comment.id] && replies[comment.id].length > 0 && (
                  <div className="ml-4 border-l-2 border-primary/30 pl-4 space-y-3 mb-3">
                    {replies[comment.id].map((reply) => (
                      <div key={reply.id} className="bg-primary/10 p-3 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="text-xs">
                            Admin Reply
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {editingReply === reply.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editReplyText}
                              onChange={(e) => setEditReplyText(e.target.value)}
                              className="min-h-[60px] text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditReply(reply.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingReply(null);
                                  setEditReplyText("");
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {reply.reply}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => startEditReply(reply)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleDeleteReply(reply.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form Toggle */}
                {showReplyForm[comment.id] ? (
                  <div className="ml-4 border-l-2 border-primary/30 pl-4 space-y-2">
                    <Textarea
                      placeholder="Write your admin reply..."
                      value={replyInputs[comment.id] || ""}
                      onChange={(e) =>
                        setReplyInputs((prev) => ({
                          ...prev,
                          [comment.id]: e.target.value,
                        }))
                      }
                      className="min-h-[80px] text-sm"
                      maxLength={1000}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={submitting[comment.id]}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {submitting[comment.id] ? "Sending..." : "Send Reply"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setShowReplyForm((prev) => ({
                            ...prev,
                            [comment.id]: false,
                          }))
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setShowReplyForm((prev) => ({
                        ...prev,
                        [comment.id]: true,
                      }))
                    }
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
