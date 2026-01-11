import { Trophy, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";
import { Link } from "react-router-dom";
import { CommentWithReplies } from "@/components/CommentWithReplies";

const commentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000),
});

const emailSchema = z.string().trim().email("Invalid email address").max(255);

export const Footer = () => {
  const { toast } = useToast();
  const [commentForm, setCommentForm] = useState({ name: "", email: "", message: "" });
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = commentSchema.parse(commentForm);
      
      const { error } = await supabase
        .from("comments")
        .insert([{
          name: validated.name,
          email: validated.email,
          message: validated.message
        }]);

      if (error) throw error;

      toast({
        title: "Comment Submitted",
        description: "Thank you for your feedback!",
      });
      setCommentForm({ name: "", email: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit comment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = emailSchema.parse(newsletterEmail);
      
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .insert([{ email: validated }]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Subscribed",
            description: "This email is already subscribed to our newsletter.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Subscribed!",
          description: "You've been added to our newsletter.",
        });
        setNewsletterEmail("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to subscribe. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12">
        {/* Recent Comments with Admin Replies */}
        <div className="mb-8">
          <CommentWithReplies />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Comment Section */}
          <Card className="bg-card/80">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Leave a Comment</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Share your thoughts with us</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCommentSubmit} className="space-y-3 sm:space-y-4">
                <Input
                  placeholder="Your Name"
                  value={commentForm.name}
                  onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                  required
                  maxLength={100}
                  className="text-sm"
                />
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={commentForm.email}
                  onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })}
                  required
                  maxLength={255}
                  className="text-sm"
                />
                <Textarea
                  placeholder="Your Message"
                  value={commentForm.message}
                  onChange={(e) => setCommentForm({ ...commentForm, message: e.target.value })}
                  required
                  maxLength={1000}
                  className="min-h-[80px] sm:min-h-[100px] text-sm"
                />
                <Button type="submit" disabled={isSubmitting} className="w-full text-sm" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Comment
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Newsletter Section */}
          <Card className="bg-card/80">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Subscribe to Newsletter</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Get the latest predictions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3 sm:space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="text-sm"
                />
                <Button type="submit" disabled={isSubmitting} className="w-full text-sm" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Subscribe
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">KickoffPrediction</h3>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/responsible-gaming" className="hover:text-primary transition-colors">Responsible Gaming</Link>
          </div>
          
          <div className="text-xs sm:text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} KickoffPrediction. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};