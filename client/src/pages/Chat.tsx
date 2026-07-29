import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import {
  Send,
  Image as ImageIcon,
  Check,
  CheckCheck,
  User,
  MessageSquare,
  ArrowLeft,
  Paperclip,
  X,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import chatService from '../services/chatService';
import type { ChatData, MessageData } from '../services/chatService';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const location = useLocation();

  // Active Chats list & Messages list
  const [chats, setChats] = useState<ChatData[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Form compose states
  const [text, setText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Typing state indicators
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({}); // userId -> isTyping
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Fetch active chats inbox list
  const fetchInbox = async (selectChatId?: string) => {
    try {
      const res = await chatService.getUserChats();
      if (res.status === 'success') {
        const chatsList = res.data.chats;
        setChats(chatsList);

        // Auto-select chat on query param navigation
        if (selectChatId) {
          const matched = chatsList.find((c: any) => c._id === selectChatId);
          if (matched) handleSelectChat(matched);
        }
      }
    } catch (err) {
      console.error('Failed to load chat inbox:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    // Parse query params to see if we navigate from Ride Details "Chat with Driver"
    const params = new URLSearchParams(location.search);
    const selectChatId = params.get('active');
    fetchInbox(selectChatId || undefined);
  }, [location.search]);

  // Fetch chat room messages
  const fetchMessages = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const res = await chatService.getChatMessages(chatId);
      if (res.status === 'success') {
        setMessages(res.data.messages);
        
        // Auto-clear unread seen badges
        await chatService.markAsSeen(chatId);
        
        // Reset local inbox count sync
        setChats((prev) =>
          prev.map((c) =>
            c._id === chatId
              ? { ...c, lastMessage: c.lastMessage ? { ...c.lastMessage, seen: true } : undefined }
              : c
          )
        );
      }
    } catch (err) {
      toast.error('Failed to load chat history.');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle selects chat thread
  const handleSelectChat = (chat: ChatData) => {
    setSelectedChat(chat);
    fetchMessages(chat._id);

    // Register Socket room
    if (socket) {
      socket.emit('join_chat', chat._id);
    }
  };

  // Subscribe to real-time chat updates
  useEffect(() => {
    if (!socket) return;

    // Incoming messages
    socket.on('new_message', (message: MessageData) => {
      // If message belongs to active open chat room, append
      if (selectedChat && message.chat === selectedChat._id) {
        setMessages((prev) => {
          // Avoid duplicate pushes
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });

        // Mark as seen immediately
        chatService.markAsSeen(selectedChat._id);
        socket.emit('seen_message', { chatId: selectedChat._id, msgId: message._id });
      }

      // Sync inbox lastMessage snippet in sidebar
      setChats((prev) =>
        prev.map((c) =>
          c._id === message.chat
            ? {
                ...c,
                lastMessage: message,
                updatedAt: new Date().toISOString(),
              }
            : c
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    });

    // Message read seen flags update
    socket.on('messages_seen', ({ chatId, seenBy }) => {
      if (selectedChat && chatId === selectedChat._id && seenBy !== user?._id) {
        setMessages((prev) => prev.map((m) => ({ ...m, seen: true })));
      }
    });

    // Remote typing status updates
    socket.on('typing_status', ({ userId, userName, isTyping }) => {
      if (selectedChat?.participants.some((p) => p._id === userId)) {
        setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }));
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('messages_seen');
      socket.off('typing_status');
    };
  }, [socket, selectedChat, user]);

  // Handle typing triggers (emits debounced status)
  const handleInputChange = (val: string) => {
    setText(val);
    if (!socket || !selectedChat || !user) return;

    if (!isTypingLocal) {
      setIsTypingLocal(true);
      socket.emit('typing', {
        chatId: selectedChat._id,
        userId: user._id,
        userName: user.name,
        isTyping: true,
      });
    }

    // Reset typing debounce timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      socket.emit('typing', {
        chatId: selectedChat._id,
        userId: user._id,
        userName: user.name,
        isTyping: false,
      });
    }, 1500);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Submit messaging compose
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;
    if (!text && !imageFile) return;

    setSendLoading(true);
    try {
      const res = await chatService.sendMessage(selectedChat._id, text || undefined, imageFile || undefined);
      if (res.status === 'success') {
        // Clear local inputs
        setText('');
        setImageFile(null);
        setImagePreview(null);
        
        // Explicitly clear local typing emitter
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsTypingLocal(false);
        if (socket) {
          socket.emit('typing', {
            chatId: selectedChat._id,
            userId: user?._id,
            userName: user?.name,
            isTyping: false,
          });
        }
      }
    } catch (err) {
      toast.error('Failed to send message.');
    } finally {
      setSendLoading(false);
    }
  };

  const getRecipientInfo = (chat: ChatData) => {
    return chat.participants.find((p) => p._id !== user?._id);
  };

  return (
    <div className="h-[calc(100vh-140px)] border border-zinc-800 bg-zinc-900/20 backdrop-blur rounded-3xl overflow-hidden flex font-sans light:border-zinc-200">
      {/* Sidebar inbox thread list (split view left) */}
      <aside
        className={`w-full md:w-80 border-r border-zinc-800 flex flex-col shrink-0 light:border-zinc-200 ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/20 light:border-zinc-200">
          <h2 className="font-extrabold text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            Chat Inbox
          </h2>
        </div>

        {/* Inbox Scroll list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingChats ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-zinc-850 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              No active conversations.
            </div>
          ) : (
            chats.map((chat) => {
              const recipient = getRecipientInfo(chat);
              if (!recipient) return null;

              const active = selectedChat?._id === chat._id;
              const hasUnread = chat.lastMessage && !chat.lastMessage.seen && chat.lastMessage.sender._id !== user?._id;

              return (
                <button
                  key={chat._id}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3.5 ${
                    active
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/10'
                      : 'hover:bg-zinc-800/40 text-zinc-300 light:hover:bg-zinc-100'
                  }`}
                >
                  <img
                    src={recipient.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=avatar'}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-zinc-700/30"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-xs font-bold truncate ${active ? 'text-white' : 'text-zinc-200 light:text-zinc-900'}`}>
                        {recipient.name}
                      </p>
                      <span className="text-[9px] text-zinc-500 shrink-0">
                        {chat.lastMessage &&
                          new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </span>
                    </div>

                    <p className={`text-[10px] truncate mt-1 ${active ? 'text-violet-200' : 'text-zinc-400'}`}>
                      {chat.lastMessage?.text || (chat.lastMessage?.image ? 'Sent an image' : 'Tap to message')}
                    </p>

                    {/* Unread dot */}
                    {hasUnread && !active && (
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-500 mt-1"></span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Messaging Conversation Pane (split view right) */}
      <main
        className={`flex-1 flex flex-col bg-zinc-950/40 h-full light:bg-white/40 ${
          !selectedChat ? 'hidden md:flex items-center justify-center' : 'flex'
        }`}
      >
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="px-6 py-3.5 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between shrink-0 light:border-zinc-200">
              <div className="flex items-center gap-3">
                {/* Back button (Mobile only) */}
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-1 mr-1 text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src={getRecipientInfo(selectedChat)?.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=avatar'}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-700/50"
                  alt=""
                />
                <div>
                  <h3 className="font-bold text-xs leading-tight text-zinc-150 light:text-zinc-900">
                    {getRecipientInfo(selectedChat)?.name}
                  </h3>
                  <p className="text-[10px] text-zinc-500 capitalize mt-0.5">
                    {getRecipientInfo(selectedChat)?.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Bubble stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="text-center text-zinc-650 text-xs py-10">
                  Loading chat history...
                </div>
              ) : (
                messages.map((m) => {
                  const self = m.sender._id === user?._id;

                  return (
                    <div
                      key={m._id}
                      className={`flex ${self ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[70%] p-3.5 rounded-2xl flex flex-col gap-1.5 shadow ${
                          self
                            ? 'bg-violet-600 text-white rounded-tr-none'
                            : 'bg-zinc-900 text-zinc-100 rounded-tl-none light:bg-zinc-100 light:text-zinc-950 light:border light:border-zinc-200'
                        }`}
                      >
                        {/* Text */}
                        {m.text && <p className="text-xs leading-relaxed break-words">{m.text}</p>}

                        {/* Image */}
                        {m.image && (
                          <a href={m.image} target="_blank" rel="noopener noreferrer" className="block max-w-full rounded-xl overflow-hidden border border-black/10">
                            <img src={m.image} className="max-h-48 object-cover" alt="upload" />
                          </a>
                        )}

                        {/* Ticks & Timestamp */}
                        <div className="flex items-center justify-end gap-1.5 self-end">
                          <span className={`text-[8px] uppercase tracking-tight font-medium ${self ? 'text-violet-200' : 'text-zinc-500'}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {self && (
                            <span>
                              {m.seen ? (
                                <CheckCheck className="w-3.5 h-3.5 text-violet-300" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-violet-300/60" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing animation block */}
              {Object.keys(typingUsers).some((k) => typingUsers[k]) && (
                <div className="flex justify-start">
                  <div className="p-3 bg-zinc-900 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-200"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer toolbar */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/20 shrink-0 flex flex-col gap-3 light:border-zinc-200">
              {/* Image previews */}
              {imagePreview && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                  <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 p-0.5 bg-zinc-950/80 hover:bg-zinc-900 rounded-full text-zinc-300 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                {/* Photo attachment input button */}
                <label className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 light:bg-zinc-100 light:hover:bg-zinc-200">
                  <ImageIcon className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  placeholder="Type your message..."
                  value={text}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                />

                <Button
                  type="submit"
                  disabled={!text && !imageFile}
                  loading={sendLoading}
                  className="px-4 py-3 h-auto shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageSquare className="w-12 h-12 text-zinc-800" />
            <h3 className="font-bold text-zinc-400">Select a Chat</h3>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Open a conversation from your active Inbox thread sidebar on the left to start sending messages.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Chat;
