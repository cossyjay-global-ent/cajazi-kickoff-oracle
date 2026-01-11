import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface Comment {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

interface CommentReply {
  id: string;
  comment_id: string;
  reply: string;
  created_at: string;
}

export const CommentWithReplies = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Record<string, CommentReply[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommentsWithReplies();
  }, []);

  const fetchCommentsWithReplies = async () => {
    setLoading(true);
    
    // Fetch recent comments (public view - no email)
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("id, name, message, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (commentsError) {
      console.error("Failed to load comments:", commentsError);
      setLoading(false);
      return;
    }

    setComments(commentsData || []);

    // Fetch replies for these comments
    if (commentsData && commentsData.length > 0) {
      const { data: repliesData, error: repliesError } = await supabase
        .from("comment_replies")
        .select("id, comment_id, reply, created_at")
        .in("comment_id", commentsData.map((c) => c.id))
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error("Failed to load replies:", repliesError);
      } else {
        // Group replies by comment_id
        const repliesMap: Record<string, CommentReply[]> = {};
        repliesData?.forEach((reply) => {
          if (!repliesMap[reply.comment_id]) {
            repliesMap[reply.comment_id] = [];
          }
          repliesMap[reply.comment_id].push(reply);
        });
        setReplies(repliesMap);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="bg-card/80">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comments.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/80">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Recent Comments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 bg-background/50 border border-border rounded-lg"
            >
              {/* User Comment */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-foreground">
                    {comment.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {comment.message}
                </p>
              </div>

              {/* Admin Replies */}
              {replies[comment.id] && replies[comment.id].length > 0 && (
                <div className="ml-3 border-l-2 border-primary/30 pl-3 space-y-2 mt-3">
                  {replies[comment.id].map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-primary/10 p-2 rounded-md"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" className="text-xs py-0">
                          Admin Reply
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(reply.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{reply.reply}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
