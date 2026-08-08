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
  MessageSquare,
  ArrowLeft,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import chatService from '../services/chatService';
import fcmPushService from '../services/fcmPushService';
import type { ChatData, MessageData } from '../services/chatService';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const location = useLocation();

  const [chats, setChats] = useState<ChatData[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [text, setText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const fetchInbox = async (selectChatId?: string) => {
    try {
      const res = await chatService.getUserChats();
      if (res.status === 'success') {
        const chatsList = res.data.chats;
        setChats(chatsList);
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
    const params = new URLSearchParams(location.search);
    const selectChatId = params.get('active');
    fetchInbox(selectChatId || undefined);
  }, [location.search]);

  const [isChatDisabled, setIsChatDisabled] = useState(false);

  const fetchMessages = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const res = await chatService.getChatMessages(chatId);
      if (res.status === 'success') {
        setMessages(res.data.messages);
        if (res.data.isCompleted) {
          setIsChatDisabled(true);
        } else {
          setIsChatDisabled(false);
        }
        await chatService.markAsSeen(chatId);
        setChats((prev) =>
          prev.map((c) =>
            c._id === chatId
              ? { ...c, lastMessage: c.lastMessage ? { ...c.lastMessage, seen: true } : undefined }
              : c
          )
        );
      }
    } catch (err) {
      toast.error('Failed to load history.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectChat = (chat: ChatData) => {
    setSelectedChat(chat);
    setIsChatDisabled(!!chat.isCompleted);
    fcmPushService.setActiveChatRoom(chat._id);
    fetchMessages(chat._id);
    if (socket) socket.emit('join_chat', chat._id);
  };

  useEffect(() => {
    return () => {
      fcmPushService.setActiveChatRoom(null);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (message: MessageData) => {
      if (selectedChat && message.chat === selectedChat._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        chatService.markAsSeen(selectedChat._id);
        socket.emit('seen_message', { chatId: selectedChat._id, msgId: message._id });
      }
      setChats((prev) =>
        prev.map((c) =>
          c._id === message.chat
            ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    });
    socket.on('messages_seen', ({ chatId, seenBy }) => {
      if (selectedChat && chatId === selectedChat._id && seenBy !== user?._id) {
        setMessages((prev) => prev.map((m) => ({ ...m, seen: true })));
      }
    });
    socket.on('typing_status', ({ userId, isTyping }) => {
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

  const handleInputChange = (val: string) => {
    if (isChatDisabled) return;
    setText(val);
    if (!socket || !selectedChat || !user) return;
    if (!isTypingLocal) {
      setIsTypingLocal(true);
      socket.emit('typing', { chatId: selectedChat._id, userId: user._id, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      socket.emit('typing', { chatId: selectedChat._id, userId: user._id, isTyping: false });
    }, 1500);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || (!text && !imageFile) || isChatDisabled) return;
    setSendLoading(true);
    try {
      const res = await chatService.sendMessage(selectedChat._id, text || undefined, imageFile || undefined);
      if (res.status === 'success') {
        setText('');
        setImageFile(null);
        setImagePreview(null);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsTypingLocal(false);
        if (socket) socket.emit('typing', { chatId: selectedChat._id, userId: user?._id, isTyping: false });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send message.';
      toast.error(msg);
      if (msg.includes('completed')) {
        setIsChatDisabled(true);
      }
    } finally {
      setSendLoading(false);
    }
  };

  const getRecipientInfo = (chat: ChatData) => chat.participants.find((p) => p._id !== user?._id);

  return (
    <div className="h-[75vh] max-h-[620px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col my-1 animate-in fade-in duration-300">
      
      {/* Inbox List Screen View (when no chat selected) */}
      {!selectedChat ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="p-4 bg-white border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Direct Messages
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {loadingChats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No active chat threads yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Book a ride to start communicating with your driver</p>
              </div>
            ) : (
              chats.map((chat) => {
                const recipient = getRecipientInfo(chat);
                if (!recipient) return null;
                const hasUnread =
                  chat.lastMessage && !chat.lastMessage.seen && chat.lastMessage.sender._id !== user?._id;

                return (
                  <button
                    key={chat._id}
                    onClick={() => handleSelectChat(chat)}
                    className="w-full p-3 bg-white rounded-2xl border border-slate-100 shadow-sm active:bg-slate-100 transition-all flex items-center gap-3 text-left"
                  >
                    <img
                      src={
                        recipient.profileImage ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(recipient.name)}`
                      }
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-xs font-black text-slate-900 truncate">{recipient.name}</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {chat.lastMessage &&
                            new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {chat.lastMessage?.text || (chat.lastMessage?.image ? 'Shared an image' : 'No messages yet')}
                      </p>
                    </div>
                    {hasUnread && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full shrink-0 animate-pulse" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Active Conversation Thread View */
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
          
          {/* Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedChat(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-700 active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <img
                src={
                  getRecipientInfo(selectedChat)?.profileImage ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getRecipientInfo(selectedChat)?.name || '')}`
                }
                className="w-9 h-9 rounded-full object-cover border border-slate-100"
                alt=""
              />
              <div>
                <h3 className="text-xs font-black text-slate-900">{getRecipientInfo(selectedChat)?.name}</h3>
                <span className="text-[9px] font-extrabold uppercase text-emerald-600 tracking-wider">
                  {getRecipientInfo(selectedChat)?.role || 'Passenger'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {loadingMessages ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              messages.map((m) => {
                const isSelf = m.sender._id === user?._id;
                return (
                  <div key={m._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                        isSelf
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                      }`}
                    >
                      {m.text && <p className="break-words">{m.text}</p>}
                      {m.image && (
                        <a href={m.image} target="_blank" rel="noreferrer" className="block mt-1.5 rounded-xl overflow-hidden">
                          <img src={m.image} className="max-h-48 object-cover rounded-xl" alt="" />
                        </a>
                      )}
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isSelf ? 'text-emerald-100' : 'text-slate-400'}`}>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isSelf && (m.seen ? <CheckCheck className="w-3 h-3 text-emerald-200" /> : <Check className="w-3 h-3 text-emerald-200" />)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Typing indicator */}
            {Object.keys(typingUsers).some((k) => typingUsers[k]) && (
              <div className="flex justify-start">
                <div className="px-4 py-2 bg-white rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom input area */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            {isChatDisabled ? (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-600 text-xs font-extrabold shadow-inner">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Chat disabled because the ride is completed.</span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <label className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer active:scale-95 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                </label>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {imagePreview && (
                  <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-full"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!text && !imageFile}
                  className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;

