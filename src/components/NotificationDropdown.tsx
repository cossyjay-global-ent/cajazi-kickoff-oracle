import { Bell, Check, Trash2, UserPlus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { memo, useCallback, useMemo } from "react";

interface NotificationDropdownProps {
  userId: string | null;
}

const NotificationIcon = memo(({ type }: { type: string }) => {
  switch (type) {
    case 'new_follower':
      return <UserPlus className="h-4 w-4 text-primary" />;
    case 'new_prediction':
      return <Trophy className="h-4 w-4 text-chart-2" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
});
NotificationIcon.displayName = "NotificationIcon";

const NotificationItem = memo(({ 
  notification, 
  onMarkRead, 
  onDelete 
}: { 
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const link = useMemo(() => {
    if (notification.type === 'new_follower' && notification.related_user_id) {
      return `/user/${notification.related_user_id}`;
    }
    if (notification.type === 'new_prediction') {
      return '/following';
    }
    return null;
  }, [notification.type, notification.related_user_id]);

  const handleMarkRead = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkRead(notification.id);
  }, [notification.id, onMarkRead]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(notification.id);
  }, [notification.id, onDelete]);

  const content = (
    <div className="flex items-start gap-3 w-full">
      <div className="mt-0.5"><NotificationIcon type={notification.type} /></div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex gap-1">
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleMarkRead}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <DropdownMenuItem
      className={`p-3 cursor-pointer ${!notification.read ? 'bg-muted/50' : ''}`}
      onClick={() => !notification.read && onMarkRead(notification.id)}
    >
      {link ? (
        <Link to={link} className="w-full">
          {content}
        </Link>
      ) : (
        content
      )}
    </DropdownMenuItem>
  );
});
NotificationItem.displayName = "NotificationItem";

export const NotificationDropdown = memo(({ userId }: NotificationDropdownProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(userId);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  if (!userId) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs h-7"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link to="/following">
                <Button variant="ghost" size="sm" className="w-full">
                  View Following Feed
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

NotificationDropdown.displayName = "NotificationDropdown";
