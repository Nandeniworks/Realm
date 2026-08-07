import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Pin, Smile, Sparkles, Trash2, Copy, CornerUpLeft, MessageSquare, 
  MoreHorizontal, Search, X, Check, CheckCheck, Edit3, ArrowDown, AtSign
} from 'lucide-react';
import ReactionBar from './ReactionBar';
import GlassCard from './GlassCard';
import { useRealm } from '../contexts/RealmContext';

const QUICK_REACTIONS = ['❤️', '😂', '😭', '🔥', '👏', '😍', '✨'];

export default function ChatPanel({ 
  onTyping, 
  typingUsers = [], 
  systemMessages = [],
  liveMessages = [],
  pinnedMessage = null,
  sendMessage,
  editMessage,
  deleteMessage,
  pinMessage,
  sendReaction,
  toggleMessageReaction,
  unreadCount = 0,
  clearUnreadCount,
  liveMembers = [],
  userName = 'You'
}) {
  const { currentRealm } = useRealm();
  
  // UI states
  const [inputText, setInputText] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Reply & Edit mode states
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);

  // Search & Filter states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilterUser, setSearchFilterUser] = useState('');

  // Mention Auto-complete popup state
  const [mentionQuery, setMentionQuery] = useState(null); // null or search string after @

  // Scroll & Unread detection
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isHost = currentRealm?.currentMembers?.find(m => m.name === 'You (Host)' || m.name === userName)?.role === 'host' || true;

  // Combine static initial placeholder messages with dynamic live socket ones
  const allMessages = useMemo(() => {
    return [...liveMessages, ...systemMessages].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [liveMessages, systemMessages]);

  // Filter messages when search is active
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim() && !searchFilterUser) return allMessages;
    
    return allMessages.filter(msg => {
      if (msg.isSystem) return false;
      const matchesText = !searchQuery.trim() || msg.text?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUser = !searchFilterUser || msg.sender?.toLowerCase().includes(searchFilterUser.toLowerCase());
      return matchesText && matchesUser;
    });
  }, [allMessages, searchQuery, searchFilterUser]);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    if (clearUnreadCount) clearUnreadCount();
    setIsScrolledUp(false);
  };

  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom('smooth');
    }
  }, [allMessages]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isBottom = scrollHeight - scrollTop - clientHeight < 60;
    
    if (isBottom) {
      setIsScrolledUp(false);
      if (clearUnreadCount) clearUnreadCount();
    } else {
      setIsScrolledUp(true);
    }
  };

  const handleSendSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMsg) {
      // Edit existing message
      if (editMessage) {
        editMessage(editingMsg.id, inputText);
      }
      setEditingMsg(null);
    } else {
      // Extract @mentions
      const mentionMatches = inputText.match(/@(\w+)/g);
      const mentions = mentionMatches ? mentionMatches.map(m => m.substring(1)) : [];

      // Send new message with optional replyTo reference
      if (sendMessage) {
        sendMessage({
          text: inputText,
          replyTo: replyToMsg ? { id: replyToMsg.id, sender: replyToMsg.sender, text: replyToMsg.text } : null,
          mentions
        });
      }
      setReplyToMsg(null);
    }

    // Reset typing status
    if (onTyping) onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setInputText('');
    setMentionQuery(null);
    scrollToBottom('smooth');
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputText(value);

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && !textBeforeCursor.slice(atIndex).includes(' ')) {
      const q = textBeforeCursor.slice(atIndex + 1);
      setMentionQuery(q);
    } else {
      setMentionQuery(null);
    }

    // Notify typing status
    if (onTyping) onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (onTyping) onTyping(false);
    }, 1500);
  };

  const handleSelectMention = (memberName) => {
    if (mentionQuery !== null) {
      const atIndex = inputText.lastIndexOf('@');
      const prefix = inputText.slice(0, atIndex);
      setInputText(`${prefix}@${memberName} `);
      setMentionQuery(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendSubmit();
    } else if (e.key === 'Escape') {
      setActiveMenuId(null);
      setHoveredMessageId(null);
      setEditingMsg(null);
      setReplyToMsg(null);
      setMentionQuery(null);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setActiveMenuId(null);
  };

  const handlePinAction = (msg) => {
    if (!isHost || !pinMessage) return;
    if (pinnedMessage?.id === msg.id) {
      pinMessage(null);
    } else {
      pinMessage(msg);
    }
    setActiveMenuId(null);
  };

  const handleDeleteAction = (id) => {
    if (deleteMessage) {
      deleteMessage(id);
    }
    setActiveMenuId(null);
  };

  const handleStartEdit = (msg) => {
    setEditingMsg(msg);
    setInputText(msg.text);
    setReplyToMsg(null);
    setActiveMenuId(null);
  };

  const handleStartReply = (msg) => {
    setReplyToMsg(msg);
    setEditingMsg(null);
    setActiveMenuId(null);
  };

  const handleMessageReactionToggle = (msgId, emoji) => {
    if (toggleMessageReaction) {
      toggleMessageReaction(msgId, emoji);
    }
    setActiveMenuId(null);
  };

  const handleReactAction = (emoji) => {
    if (sendReaction) {
      sendReaction(emoji);
    }
    if (window.spawnReactionOverlay) {
      window.spawnReactionOverlay(emoji);
    }
    setActiveMenuId(null);
  };

  // Message Grouping
  const shouldGroup = (msg, index) => {
    if (index === 0) return false;
    const prevMsg = filteredMessages[index - 1];
    if (msg.isSystem || prevMsg.isSystem) return false;
    return prevMsg.sender === msg.sender;
  };

  const avatarColors = {
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
    gold: 'bg-realm-gold/20 text-realm-gold border-realm-gold/20',
    pink: 'bg-realm-pink/20 text-realm-pink border-realm-pink/20',
    lavender: 'bg-realm-lavender/20 text-realm-lavender border-realm-lavender/20',
  };

  // Members list for @mention suggestions
  const matchingMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    return liveMembers.filter(m => 
      m.name && m.name.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [liveMembers, mentionQuery]);

  return (
    <GlassCard hover={false} className="h-full flex flex-col p-4 border-realm-lavender/5 justify-between relative overflow-hidden">
      
      {/* 1. Header Toolbar: Search Toggle & Chat Title */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-realm-lavender/10">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-realm-lavender" />
          <span className="text-xs font-bold text-realm-moon tracking-wide">Live Realm Chat</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg border transition-all ${
              showSearch 
                ? 'bg-realm-lavender/15 border-realm-lavender text-realm-lavender' 
                : 'border-realm-lavender/10 text-realm-moon-muted hover:text-realm-moon hover:border-realm-lavender/20'
            }`}
            title="Search Chat History"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Chat Search Bar Drawer */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 space-y-2 bg-realm-navy-dark/60 border border-realm-lavender/10 p-2.5 rounded-xl text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider">Search History</span>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchFilterUser(''); }}>
                <X className="w-3.5 h-3.5 text-realm-moon-muted hover:text-realm-pink" />
              </button>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-realm-navy-light/40 border border-realm-lavender/10 rounded-lg px-2.5 py-1 text-xs text-realm-moon outline-none focus:border-realm-lavender/30"
              />
              <input
                type="text"
                placeholder="Username..."
                value={searchFilterUser}
                onChange={(e) => setSearchFilterUser(e.target.value)}
                className="w-24 bg-realm-navy-light/40 border border-realm-lavender/10 rounded-lg px-2 py-1 text-xs text-realm-moon outline-none focus:border-realm-lavender/30"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Floating Pinned Message Glass Banner */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-start space-x-2.5 p-3 rounded-2xl bg-realm-lavender/5 border border-realm-lavender/10 mb-3 text-left relative overflow-hidden"
          >
            <Pin className="w-4 h-4 text-realm-gold mt-0.5 shrink-0" />
            <div className="flex flex-col flex-1 pr-4">
              <span className="text-[10px] font-bold text-realm-gold uppercase tracking-wider">Pinned Message</span>
              <span className="text-xs text-realm-moon mt-0.5 line-clamp-2">
                <strong>{pinnedMessage.sender}</strong>: {pinnedMessage.text}
              </span>
            </div>
            
            {isHost && (
              <button
                onClick={() => pinMessage(null)}
                className="absolute top-2 right-2 text-realm-moon-muted hover:text-realm-pink transition-colors text-[10px] font-semibold hover:underline"
              >
                Unpin
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Messages List Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar mb-3 min-h-0 relative text-left"
      >
        <AnimatePresence initial={false}>
          {filteredMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-realm-lavender/10 rounded-2xl"
            >
              <Smile className="w-8 h-8 text-realm-lavender/25 mb-2 animate-pulse" />
              <p className="text-xs text-realm-moon-muted italic">
                {searchQuery || searchFilterUser ? 'No matching messages found.' : '“Every great movie starts with someone saying hello.”'}
              </p>
            </motion.div>
          ) : (
            filteredMessages.map((msg, index) => {
              const isGrouped = shouldGroup(msg, index);
              const isSelf = msg.sender === 'You' || msg.sender === userName;

              // Render System messages
              if (msg.isSystem) {
                return (
                  <motion.div
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center py-2 px-4 bg-[#080c25]/30 rounded-2xl border border-realm-lavender/5 italic text-xs text-realm-lavender select-none my-2"
                  >
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-realm-pink animate-pulse" />
                      <span>{msg.text}</span>
                    </div>
                    <span className="text-[8px] text-realm-moon-muted mt-0.5">{msg.timestamp}</span>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => {
                    setHoveredMessageId(null);
                    setActiveMenuId(null);
                  }}
                  className={`flex flex-col relative group/message ${isSelf ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
                >
                  {/* Sender Name & Role Badge */}
                  {!isSelf && !isGrouped && (
                    <span className="text-[10px] font-bold text-realm-moon-muted pl-8 mb-0.5 flex items-center space-x-1">
                      <span>{msg.sender}</span>
                      {msg.role === 'host' && (
                        <span className="text-[8px] font-bold text-realm-gold bg-realm-gold/10 px-1 py-0.2 rounded border border-realm-gold/20">HOST</span>
                      )}
                    </span>
                  )}

                  {/* Reply Reference Preview Bubble */}
                  {msg.replyTo && (
                    <div className={`text-[10px] text-realm-moon-muted bg-realm-navy-dark/60 border-l-2 border-realm-lavender/40 px-2 py-1 rounded mb-1 max-w-[75%] truncate ${isSelf ? 'mr-1' : 'ml-8'}`}>
                      <span className="font-semibold text-realm-lavender">{msg.replyTo.sender}</span>: {msg.replyTo.text}
                    </div>
                  )}

                  {/* Chat bubble body */}
                  <div className={`flex items-end space-x-2 max-w-[85%] relative ${isSelf ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                    {!isSelf && (
                      <div className="w-6 h-6 shrink-0 relative">
                        {!isGrouped && (
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] border ${avatarColors[msg.color] || avatarColors.lavender}`}>
                            {msg.sender.charAt(0)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* iMessage Rounded Bubble */}
                    <div 
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed transition-all relative ${
                        isSelf 
                          ? 'bg-realm-lavender text-realm-navy-dark shadow-[0_4px_15px_rgba(195,201,255,0.1)] font-medium rounded-br-sm' 
                          : 'bg-realm-navy-light/45 border border-realm-lavender/10 text-realm-moon rounded-bl-sm backdrop-blur-xs'
                      }`}
                    >
                      {/* Highlight @mentions in text */}
                      <span>
                        {msg.text.split(/(@\w+)/g).map((part, i) => {
                          if (part.startsWith('@')) {
                            return (
                              <span key={i} className="font-bold text-realm-gold bg-realm-gold/15 px-1 rounded">
                                {part}
                              </span>
                            );
                          }
                          return part;
                        })}
                      </span>

                      {/* Timestamp & Edited status */}
                      <div className={`text-[8px] mt-1 flex items-center justify-end space-x-1 ${isSelf ? 'text-realm-navy-dark/70' : 'text-realm-moon-muted'}`}>
                        {msg.edited && <span className="italic">(edited)</span>}
                        <span>{msg.timestamp}</span>
                        {isSelf && (
                          <CheckCheck className="w-2.5 h-2.5 stroke-[2.5]" />
                        )}
                      </div>

                      {/* Per-message Reactions Row */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-black/10">
                          {msg.reactions.map((r, rIdx) => {
                            const hasReacted = r.users.includes(userName);
                            return (
                              <button
                                key={rIdx}
                                onClick={() => handleMessageReactionToggle(msg.id, r.emoji)}
                                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                                  hasReacted 
                                    ? 'bg-realm-lavender/25 border-realm-lavender text-realm-moon font-bold' 
                                    : 'bg-black/20 border-white/10 text-realm-moon-muted hover:border-white/20'
                                }`}
                              >
                                <span>{r.emoji}</span>
                                <span>{r.users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Hover Message Actions Button */}
                    {hoveredMessageId === msg.id && (
                      <div className={`absolute top-1/2 -translate-y-1/2 z-30 flex items-center space-x-1 ${isSelf ? '-left-20' : '-right-20'}`}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                          className="p-1 rounded-lg bg-realm-navy-dark border border-realm-lavender/10 hover:border-realm-lavender/30 text-realm-moon-muted hover:text-realm-moon shadow-md cursor-pointer"
                          title="Message Actions"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Message Action Menu & Quick Reactions Popup */}
                    <AnimatePresence>
                      {activeMenuId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`absolute bottom-8 z-40 bg-realm-navy-dark border border-realm-lavender/15 p-1.5 rounded-xl shadow-xl flex flex-col space-y-1 w-36 ${isSelf ? 'right-0' : 'left-0'}`}
                        >
                          {/* Quick Emoji Reaction bar inside menu */}
                          <div className="flex items-center justify-between pb-1 mb-1 border-b border-realm-lavender/10 px-1">
                            {QUICK_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleMessageReactionToggle(msg.id, emoji)}
                                className="text-xs hover:scale-125 transition-transform cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => handleStartReply(msg)}
                            className="flex items-center space-x-2 w-full px-2 py-1 rounded-lg hover:bg-realm-lavender/10 text-xs text-realm-moon text-left"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5 text-realm-moon-muted" />
                            <span>Reply</span>
                          </button>

                          <button
                            onClick={() => handleCopyText(msg.text)}
                            className="flex items-center space-x-2 w-full px-2 py-1 rounded-lg hover:bg-realm-lavender/10 text-xs text-realm-moon text-left"
                          >
                            <Copy className="w-3.5 h-3.5 text-realm-moon-muted" />
                            <span>Copy Text</span>
                          </button>
                          
                          {isHost && (
                            <button
                              onClick={() => handlePinAction(msg)}
                              className="flex items-center space-x-2 w-full px-2 py-1 rounded-lg hover:bg-realm-lavender/10 text-xs text-realm-gold text-left font-medium"
                            >
                              <Pin className="w-3.5 h-3.5" />
                              <span>{pinnedMessage?.id === msg.id ? 'Unpin' : 'Pin Message'}</span>
                            </button>
                          )}

                          {isSelf && (
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="flex items-center space-x-2 w-full px-2 py-1 rounded-lg hover:bg-realm-lavender/10 text-xs text-realm-lavender text-left font-medium"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {(isSelf || isHost) && (
                            <button
                              onClick={() => handleDeleteAction(msg.id)}
                              className="flex items-center space-x-2 w-full px-2 py-1 rounded-lg hover:bg-realm-pink/10 text-xs text-realm-pink text-left font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* 5. Jump to Latest / Unread messages Pill */}
      <AnimatePresence>
        {isScrolledUp && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 bg-realm-lavender text-realm-navy-dark px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1.5 cursor-pointer hover:bg-white transition-all"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>{unreadCount > 0 ? `${unreadCount} new unread` : 'Jump to latest'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 6. Typing Indicators Area */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="text-[11px] text-realm-lavender/80 italic text-left pl-3 mb-2 flex items-center space-x-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-realm-lavender animate-bounce" />
            <span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is typing...' : 'are typing...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Floating Emoji Reaction Bar Dock */}
      <div className="mb-2">
        <ReactionBar onReact={handleReactAction} />
      </div>

      {/* 8. Reply Preview / Edit Preview Banners */}
      <AnimatePresence>
        {replyToMsg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-between bg-realm-navy-dark/80 border border-realm-lavender/10 px-3 py-1.5 rounded-xl mb-2 text-left"
          >
            <div className="flex items-center space-x-2 truncate">
              <CornerUpLeft className="w-3.5 h-3.5 text-realm-lavender shrink-0" />
              <span className="text-xs text-realm-moon-muted truncate">
                Replying to <strong className="text-realm-lavender">{replyToMsg.sender}</strong>: {replyToMsg.text}
              </span>
            </div>
            <button onClick={() => setReplyToMsg(null)} className="text-realm-moon-muted hover:text-realm-pink">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {editingMsg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-between bg-realm-navy-dark/80 border border-realm-lavender/10 px-3 py-1.5 rounded-xl mb-2 text-left"
          >
            <div className="flex items-center space-x-2 truncate">
              <Edit3 className="w-3.5 h-3.5 text-realm-gold shrink-0" />
              <span className="text-xs text-realm-moon-muted truncate">
                Editing message...
              </span>
            </div>
            <button onClick={() => { setEditingMsg(null); setInputText(''); }} className="text-realm-moon-muted hover:text-realm-pink">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. @Mention Autocomplete Dropdown */}
      <AnimatePresence>
        {matchingMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 left-4 z-40 bg-realm-navy-dark border border-realm-lavender/20 rounded-xl p-1 shadow-xl max-h-36 overflow-y-auto w-48 text-left"
          >
            <div className="px-2 py-1 text-[9px] font-bold text-realm-lavender uppercase border-b border-realm-lavender/10">
              Mention Member
            </div>
            {matchingMembers.map(m => (
              <button
                key={m.socketId || m.name}
                onClick={() => handleSelectMention(m.name)}
                className="flex items-center space-x-2 w-full px-2 py-1.5 rounded-lg hover:bg-realm-lavender/10 text-xs text-realm-moon text-left"
              >
                <AtSign className="w-3 h-3 text-realm-gold" />
                <span>{m.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 10. Chat Input Field Panel */}
      <div className="relative flex items-center bg-realm-navy-dark border border-realm-lavender/10 rounded-2xl p-1.5 focus-within:border-realm-lavender/30 transition-all duration-300">
        <textarea
          rows="1"
          placeholder={editingMsg ? "Edit message..." : "Message friends... (type @ to mention)"}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-0 outline-none resize-none text-realm-moon placeholder-realm-moon-muted/30 text-sm px-3.5 py-1 focus:ring-0 max-h-24 scrollbar"
        />
        <motion.button
          onClick={handleSendSubmit}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-realm-lavender text-realm-navy-dark p-2.5 rounded-xl hover:bg-white transition-all shadow-md cursor-pointer flex items-center justify-center shrink-0 self-end"
        >
          <Send className="w-4 h-4 text-realm-navy-dark stroke-[2.5]" />
        </motion.button>
      </div>

    </GlassCard>
  );
}

