import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Send, Users, MessageSquare, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    created_at: string;
    profiles?: { name: string } | null;
}

const Chat = () => {
    const { user } = useAuth();
    const { employees } = useData(); // We need employee list for 1:1 chat selection
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null); // null = Group Chat
    const scrollRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Determine chat partner name for header
    const chatPartner = selectedUser
        ? employees.find(e => e.user_id === selectedUser)
        : null;

    const fetchMessages = async () => {
        if (!user) return;

        let query = supabase
            .from('messages')
            .select(`
        *,
        profiles:sender_id (name)
      `)
            .order('created_at', { ascending: true });

        if (selectedUser) {
            // 1:1 Chat: (me -> them) OR (them -> me)
            query = query.or(`and(sender_id.eq.${user.userId},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.userId})`);
        } else {
            // Group Chat: receiver_id is null
            query = query.is('receiver_id', null);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            // Map the profile data correctly if needed, though supabase usually returns nested object
            // Typescript might complain about the joined structure, casting or proper types needed
            // For now we assume data structure matches what we expect
            setMessages(data as any || []);
        }
    };

    // Realtime subscription
    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('chat_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    // Correct filter for realtime is tricky with complex OR logic.
                    // Simplest is to filter client-side or just refetch on any message if volume is low.
                    // For now, let's refetch on ANY message insert to keep it robust.
                },
                () => {
                    fetchMessages();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedUser, user]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            const { error } = await supabase.from('messages').insert({
                sender_id: user.userId,
                receiver_id: selectedUser, // null for Group
                content: newMessage.trim(),
            });

            if (error) throw error;
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: "Error",
                description: "Failed to send message.",
                variant: "destructive"
            });
        }
    };

    const filteredEmployees = employees
        .filter(emp => emp.user_id !== user?.userId) // Don't chat with self
        .filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in fade-in duration-500">
            {/* Sidebar: Chat List */}
            <div className="w-80 flex flex-col glass-card border-none rounded-2xl overflow-hidden shrink-0">
                <div className="p-4 border-b border-border/50 bg-muted/20">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" /> Changes
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search people..."
                            className="pl-9 bg-background/50 border-input/50"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                        {/* Group Chat Item */}
                        <button
                            onClick={() => setSelectedUser(null)}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                selectedUser === null
                                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">Team Group Chat</p>
                                <p className="text-xs opacity-70 truncate">Public channel for everyone</p>
                            </div>
                        </button>

                        <Separator className="my-2 bg-border/40" />
                        <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direct Messages</p>

                        {/* Employee List */}
                        {filteredEmployees.map(emp => (
                            <button
                                key={emp.user_id}
                                onClick={() => setSelectedUser(emp.user_id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                    selectedUser === emp.user_id
                                        ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Avatar className="h-10 w-10 border border-background shadow-sm">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`} />
                                    <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold truncate">{emp.name}</p>
                                    <p className="text-xs opacity-70 truncate capitalize">{emp.role}</p>
                                </div>
                                {emp.is_active && (
                                    <div className="h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" title="Active" />
                                )}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col glass-card border-none rounded-2xl overflow-hidden shadow-xl">
                {/* Chat Header */}
                <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-4">
                    {selectedUser ? (
                        <>
                            <Avatar className="h-10 w-10 border border-background shadow-sm">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chatPartner?.name}`} />
                                <AvatarFallback>{chatPartner?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-bold text-lg leading-none">{chatPartner?.name}</h3>
                                <p className="text-xs text-muted-foreground capitalize mt-1">{chatPartner?.role}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-sm border border-primary/10">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-none">Team Group Chat</h3>
                                <p className="text-xs text-muted-foreground mt-1">General discussion for all {employees.length} members</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center animate-in fade-in zoom-in-95 duration-500">
                                <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                                <p>No messages yet.</p>
                                <p className="text-sm opacity-70">Start the conversation!</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.sender_id === user?.userId;
                                const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;

                                return (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-3",
                                            isMe ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {!isMe && (
                                            <div className="flex-shrink-0 w-8">
                                                {showAvatar && (
                                                    <Avatar className="h-8 w-8 mt-1 border border-background shadow-sm">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.profiles?.name}`} />
                                                        <AvatarFallback className="text-[10px]">{msg.profiles?.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        )}

                                        <div className={cn(
                                            "group max-w-[75%] space-y-1",
                                            isMe ? "items-end" : "items-start"
                                        )}>
                                            {!isMe && showAvatar && (
                                                <p className="text-xs text-muted-foreground ml-1 mb-1">{msg.profiles?.name}</p>
                                            )}

                                            <div className={cn(
                                                "p-3 rounded-2xl shadow-sm break-words leading-relaxed text-sm animate-in zoom-in-95 duration-200",
                                                isMe
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-white dark:bg-muted border border-border/50 rounded-tl-sm ml-1"
                                            )}>
                                                {msg.content}
                                            </div>

                                            <p className={cn(
                                                "text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity px-2",
                                                isMe ? "text-right" : "text-left"
                                            )}>
                                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                            </p>
                                        </div>

                                        {isMe && (
                                            <div className="flex-shrink-0 w-8">
                                                {/* Placeholder for alignment or my avatar if desired */}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-background border-t border-border/50">
                    <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto">
                        <Input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder={`Message ${selectedUser ? chatPartner?.name : 'everyone'}...`}
                            className="flex-1 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors rounded-full px-4"
                            autoFocus
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!newMessage.trim()}
                            className="rounded-full h-10 w-10 shrink-0 shadow-md shadow-primary/20 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        >
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
