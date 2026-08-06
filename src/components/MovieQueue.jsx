import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Plus, Clock, User, Film, Trash2, ListOrdered, 
  ArrowUp, ArrowDown, Search, Link2, X, Sparkles, AlertCircle, GripVertical, Lock
} from 'lucide-react';
import GlassCard from './GlassCard';
import Button from './Button';
import { useRealm } from '../contexts/RealmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  searchYouTubeVideos, 
  getTrendingYouTubeVideos, 
  getYouTubeVideoDetails 
} from '../utils/youtubeApi';

export default function MovieQueue({ onSelectMovie }) {
  const { currentRealm, updateRealm } = useRealm();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('link'); // link, search, recent
  const [inputUrl, setInputUrl] = useState('');
  const [errorCard, setErrorCard] = useState(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);

  const debounceTimerRef = useRef(null);

  const queue = currentRealm?.queue || [];
  const code = currentRealm?.code || currentRealm?.inviteCode;

  const requesterUserId = currentUser?._id || currentUser?.uid || currentUser?.id;
  const isHost = currentRealm?.owner?.toString() === requesterUserId?.toString() || 
                  currentRealm?.ownerId?.toString() === requesterUserId?.toString() ||
                  currentRealm?.admins?.some(a => a.toString() === requesterUserId?.toString());

  const canEditQueue = isHost || (currentRealm?.allowQueueEditing !== false);

  // Safe extraction regex for youtube ID
  const extractYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Load trending videos on search tab active
  useEffect(() => {
    if (activeTab === 'search') {
      setSearchLoading(true);
      getTrendingYouTubeVideos()
        .then(res => {
          setTrendingVideos(res);
          setSearchLoading(false);
        })
        .catch(() => setSearchLoading(false));
    }
  }, [activeTab]);

  // Debounced search logic (450ms)
  useEffect(() => {
    if (activeTab !== 'search') return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      searchYouTubeVideos(searchQuery)
        .then((res) => {
          setSearchResults(res);
          setSearchLoading(false);
        })
        .catch(() => setSearchLoading(false));
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, activeTab]);

  // Handle URL Pasting & Metadata Enrichment
  const handleAddMovie = async (e) => {
    if (e) e.preventDefault();
    setErrorCard(null);
    if (!canEditQueue) {
      setErrorCard("Queue editing is currently locked by host.");
      return;
    }
    if (!inputUrl.trim() || !code) return;

    const videoId = extractYoutubeId(inputUrl.trim());
    if (!videoId) {
      setErrorCard("Invalid YouTube link. Please check the URL format.");
      return;
    }

    try {
      setSearchLoading(true);
      const enrichedItem = await getYouTubeVideoDetails(videoId);
      await pushToQueue(enrichedItem);
      setInputUrl('');
    } catch (err) {
      setErrorCard("Failed to load video details: " + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const pushToQueue = async (item) => {
    if (!code) return;
    if (!canEditQueue) {
      setErrorCard("Queue editing is currently locked by host.");
      return;
    }
    
    // Prevent duplicates
    if (queue.some(q => q.videoId === item.videoId)) {
      setErrorCard("This video is already in the queue.");
      return;
    }

    const enrichedItem = {
      ...item,
      addedBy: currentUser?.displayName || currentUser?.username || 'Guest'
    };

    const newQueue = [...queue, enrichedItem];
    try {
      await updateRealm(code, { queue: newQueue });
      if (window.realmSocket) {
        window.realmSocket.emit('queueUpdated', { code, queue: newQueue });
      }
    } catch (err) {
      console.error(err);
      setErrorCard("Failed to add video to queue: " + err.message);
    }
  };

  const handleRemove = async (index, e) => {
    e.stopPropagation();
    if (!code || !canEditQueue) return;
    const newQueue = queue.filter((_, i) => i !== index);
    try {
      await updateRealm(code, { queue: newQueue });
      if (window.realmSocket) {
        window.realmSocket.emit('queueUpdated', { code, queue: newQueue });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveUp = async (index, e) => {
    e.stopPropagation();
    if (index === 0 || !code || !canEditQueue) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index - 1];
    newQueue[index - 1] = temp;
    try {
      await updateRealm(code, { queue: newQueue });
      if (window.realmSocket) {
        window.realmSocket.emit('queueUpdated', { code, queue: newQueue });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveDown = async (index, e) => {
    e.stopPropagation();
    if (index === queue.length - 1 || !code || !canEditQueue) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index + 1];
    newQueue[index + 1] = temp;
    try {
      await updateRealm(code, { queue: newQueue });
      if (window.realmSocket) {
        window.realmSocket.emit('queueUpdated', { code, queue: newQueue });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearQueue = async (e) => {
    e.stopPropagation();
    if (!code || !canEditQueue) return;
    if (window.confirm('Are you sure you want to clear all queue items?')) {
      try {
        await updateRealm(code, { queue: [] });
        if (window.realmSocket) {
          window.realmSocket.emit('queueUpdated', { code, queue: [] });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    if (!canEditQueue) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (!canEditQueue) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    if (!canEditQueue) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex || !code) return;
    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(dropIndex, 0, draggedItem);
    setDraggedIndex(null);
    try {
      await updateRealm(code, { queue: newQueue });
      if (window.realmSocket) {
        window.realmSocket.emit('queueUpdated', { code, queue: newQueue });
      }
    } catch (err) {
      console.error('Failed to reorder queue:', err);
    }
  };

  const handlePlayNow = async (movie) => {
    if (!code) return;
    try {
      await updateRealm(code, {
        currentVideo: movie,
        playbackState: {
          videoId: movie.videoId,
          isPlaying: false,
          currentTime: 0,
          playbackRate: 1.0,
          lastUpdated: new Date()
        }
      });
      if (window.realmSocket) {
        window.realmSocket.emit('videoChanged', { code, video: movie });
      }
      if (onSelectMovie) {
        onSelectMovie(movie);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* 1. Preview Overlay dialog */}
      <AnimatePresence>
        {previewVideo && (
          <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewVideo(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-realm-navy-dark border border-realm-lavender/10 p-4 rounded-3xl relative z-10"
            >
              <button
                onClick={() => setPreviewVideo(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-realm-moon-muted hover:text-realm-moon hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-realm-moon text-left pr-10 mb-4 truncate">
                Preview: {previewVideo.title}
              </h3>

              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black mb-4 border border-realm-lavender/5">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${previewVideo.videoId}?autoplay=1&controls=1&modestbranding=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="px-4 py-2 text-xs font-semibold text-realm-moon-muted hover:text-realm-moon transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={() => {
                    pushToQueue(previewVideo);
                    setPreviewVideo(null);
                  }}
                  variant="primary"
                  icon={Plus}
                  disabled={!canEditQueue}
                >
                  Add to Queue
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Primary Next Up Queue Listing Card */}
      <GlassCard hover={false} className="border-realm-lavender/5">
        <div className="flex items-center justify-between mb-5 border-b border-realm-lavender/5 pb-3">
          <div className="flex items-center space-x-2 text-realm-lavender">
            <ListOrdered className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-realm-moon font-sans">Next Up</h2>
            {!canEditQueue && (
              <span className="flex items-center space-x-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/15 font-bold">
                <Lock className="w-3 h-3" />
                <span>Locked by Host</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {queue.length > 0 && canEditQueue && (
              <button
                onClick={handleClearQueue}
                className="text-[10px] font-bold text-realm-pink hover:text-white px-2 py-1 rounded-lg border border-realm-pink/20 hover:bg-realm-pink/15 transition-all cursor-pointer"
              >
                Clear Queue
              </button>
            )}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-realm-lavender/10 text-realm-lavender border border-realm-lavender/5 font-mono">
              {queue.length} {queue.length === 1 ? 'video' : 'videos'}
            </span>
          </div>
        </div>

        {/* Queue Items */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {queue.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 px-4 border border-dashed border-realm-lavender/10 rounded-2xl"
              >
                <Film className="w-8 h-8 text-realm-lavender/20 mx-auto mb-2" />
                <p className="text-xs text-realm-moon-muted italic">
                  &ldquo;Choose the next video.&rdquo;
                </p>
              </motion.div>
            ) : (
              queue.map((movie, index) => (
                <motion.div
                  key={movie.videoId || index}
                  layoutId={movie.videoId || index}
                  draggable={canEditQueue}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ x: 4, scale: 1.01, rotate: 0.5, backgroundColor: 'rgba(16, 20, 45, 0.45)' }}
                  onClick={() => handlePlayNow(movie)}
                  className={`flex items-center justify-between p-3 rounded-2xl border border-realm-lavender/5 bg-realm-navy-light/10 hover:border-realm-lavender/15 transition-all group cursor-pointer ${
                    draggedIndex === index ? 'opacity-40 border-dashed border-realm-lavender' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                    {canEditQueue && (
                      <div className="cursor-grab text-realm-moon-muted/40 hover:text-realm-moon shrink-0">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}

                    <div className="w-16 h-10 rounded-lg bg-[#080a15] flex items-center justify-center border border-realm-lavender/5 overflow-hidden relative shrink-0">
                      {movie.thumbnailUrl ? (
                        <img src={movie.thumbnailUrl} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <Film className="w-4 h-4 text-realm-lavender/20" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                        <Play className="w-4 h-4 text-realm-lavender fill-current" />
                      </div>
                    </div>

                    <div className="flex flex-col text-left flex-1 min-w-0">
                      <span className="text-sm font-semibold text-realm-moon leading-tight truncate group-hover:text-realm-lavender transition-colors">
                        {movie.title}
                      </span>
                      <div className="flex items-center space-x-2 text-[10px] text-realm-moon-muted mt-1 truncate">
                        <span className="flex items-center space-x-1 shrink-0">
                          <Clock className="w-3 h-3 text-realm-lavender/70" />
                          <span>{movie.duration}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate">{movie.channelTitle || 'YouTube'}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1 shrink-0 text-realm-pink font-semibold">
                          <User className="w-3 h-3 text-realm-pink/70" />
                          <span className="truncate">Added by {movie.addedBy}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rearrange & Remove Queue Controls */}
                  {canEditQueue && (
                    <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleMoveUp(index, e)}
                        disabled={index === 0}
                        className="text-realm-moon-muted hover:text-realm-lavender p-1 rounded-lg hover:bg-realm-navy-light/60 transition-all disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleMoveDown(index, e)}
                        disabled={index === queue.length - 1}
                        className="text-realm-moon-muted hover:text-realm-lavender p-1 rounded-lg hover:bg-realm-navy-light/60 transition-all disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleRemove(index, e)}
                        className="text-realm-moon-muted hover:text-realm-pink p-1 rounded-lg hover:bg-realm-navy-light/60 transition-all cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* 3. Add Movies Search / Paste Utility Card */}
      <GlassCard hover={false} className="border-realm-lavender/5">
        
        {/* Tab options navigation */}
        <div className="flex space-x-2 border-b border-realm-lavender/5 pb-3 mb-5">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'link'
                ? 'bg-realm-lavender/10 border-realm-lavender/25 text-realm-lavender'
                : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Paste Link</span>
          </button>
          
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'search'
                ? 'bg-realm-lavender/10 border-realm-lavender/25 text-realm-lavender'
                : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search YouTube</span>
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'recent'
                ? 'bg-realm-lavender/10 border-realm-lavender/25 text-realm-lavender'
                : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Watch History</span>
          </button>
        </div>

        {/* Tab content rendering */}
        <div className="space-y-4">
          
          {/* TAB 1: PASTE LINK */}
          {activeTab === 'link' && (
            <div>
              <form onSubmit={handleAddMovie} className="space-y-3">
                <div className="flex flex-col text-left space-y-1">
                  <span className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider pl-1 select-none">
                    YouTube Stream URL
                  </span>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={searchLoading || !canEditQueue}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-realm-navy-dark/60 border border-realm-lavender/10 text-realm-moon text-xs font-medium placeholder-realm-moon-muted outline-none focus:border-realm-lavender/25 focus:bg-realm-navy-dark/95 transition-all disabled:opacity-50"
                    />
                    <Button 
                      type="submit" 
                      variant="primary" 
                      icon={Plus} 
                      disabled={searchLoading || !canEditQueue}
                      className="shrink-0"
                    >
                      {searchLoading ? 'Loading...' : 'Add'}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Alert Error Box */}
              {errorCard && (
                <div className="mt-3 flex items-start space-x-2.5 p-3 rounded-2xl bg-realm-pink/10 border border-realm-pink/15 text-realm-pink text-xs text-left animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorCard}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH YOUTUBE */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query music, trailers, or cinematic tracks..."
                  disabled={!canEditQueue}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-realm-navy-dark/60 border border-realm-lavender/10 text-realm-moon text-xs font-medium placeholder-realm-moon-muted outline-none focus:border-realm-lavender/25 transition-all disabled:opacity-50"
                />
                <Search className="w-4 h-4 text-realm-moon-muted absolute left-3.5 top-3.5" />
              </div>

              {searchLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-6 h-6 border-2 border-realm-lavender border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-realm-moon-muted">Retrieving YouTube indices...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar text-left">
                  {searchQuery.trim() && searchResults.map((video) => (
                    <div
                      key={video.videoId}
                      className="flex items-center justify-between p-2 rounded-2xl border border-realm-lavender/5 bg-realm-navy-light/10 hover:border-realm-lavender/15 transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-14 h-9 rounded-lg bg-black overflow-hidden relative shrink-0">
                          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-realm-moon leading-tight truncate">
                            {video.title}
                          </span>
                          <span className="text-[9px] text-realm-moon-muted mt-1 truncate">
                            {video.channelTitle} • {video.duration}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => setPreviewVideo(video)}
                          className="p-2 bg-realm-navy-light/50 hover:bg-realm-navy-light text-realm-moon rounded-xl border border-realm-lavender/10 transition-all cursor-pointer"
                          title="Preview Video"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => pushToQueue(video)}
                          disabled={!canEditQueue}
                          className="p-2 bg-realm-lavender/15 hover:bg-realm-lavender text-realm-lavender hover:text-realm-navy-dark rounded-xl border border-realm-lavender/10 transition-all cursor-pointer disabled:opacity-50"
                          title="Add to Queue"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {searchQuery.trim() && searchResults.length === 0 && (
                    <div className="text-center py-6 text-realm-moon-muted text-xs italic">
                      &ldquo;No matching video paths found.&rdquo;
                    </div>
                  )}

                  {!searchQuery.trim() && trendingVideos.length > 0 && (
                    <div className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider pl-1 pt-2 select-none flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-realm-pink animate-pulse" />
                      <span>Trending Sounds & Trailers</span>
                    </div>
                  )}

                  {!searchQuery.trim() && trendingVideos.map((video) => (
                    <div
                      key={video.videoId}
                      className="flex items-center justify-between p-2 rounded-2xl border border-realm-lavender/5 bg-realm-navy-light/10 hover:border-realm-lavender/15 transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-14 h-9 rounded-lg bg-black overflow-hidden relative shrink-0">
                          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-realm-moon leading-tight truncate">
                            {video.title}
                          </span>
                          <span className="text-[9px] text-realm-moon-muted mt-1 truncate">
                            {video.channelTitle} • {video.duration}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => setPreviewVideo(video)}
                          className="p-2 bg-realm-navy-light/50 hover:bg-realm-navy-light text-realm-moon rounded-xl border border-realm-lavender/10 transition-all cursor-pointer"
                          title="Preview"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => pushToQueue(video)}
                          disabled={!canEditQueue}
                          className="p-2 bg-realm-lavender/15 hover:bg-realm-lavender text-realm-lavender hover:text-realm-navy-dark rounded-xl border border-realm-lavender/10 transition-all cursor-pointer disabled:opacity-50"
                          title="Add to Queue"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WATCH HISTORY */}
          {activeTab === 'recent' && (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar text-left">
              {(!currentRealm?.history || currentRealm.history.length === 0) ? (
                <div className="text-center py-8 text-realm-moon-muted text-xs italic">
                  No recently watched videos logged.
                </div>
              ) : (
                currentRealm.history.map((item, idx) => (
                  <div
                    key={`${item.videoId}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-2xl border border-realm-lavender/5 bg-realm-navy-light/10 hover:border-realm-lavender/15 transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-14 h-9 rounded-lg bg-black overflow-hidden relative shrink-0">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-realm-navy-light flex items-center justify-center">
                            <Film className="w-4 h-4 text-realm-lavender/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-realm-moon leading-tight truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] text-realm-moon-muted mt-1 truncate">
                          {item.channelTitle || 'YouTube'} • {item.duration}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => handlePlayNow(item)}
                        className="p-2 bg-realm-navy-light/50 hover:bg-realm-navy-light text-realm-moon rounded-xl border border-realm-lavender/10 transition-all cursor-pointer"
                        title="Play Now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => pushToQueue(item)}
                        disabled={!canEditQueue}
                        className="p-2 bg-realm-lavender/15 hover:bg-realm-lavender text-realm-lavender hover:text-realm-navy-dark rounded-xl border border-realm-lavender/10 transition-all cursor-pointer disabled:opacity-50"
                        title="Add to Queue Again"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </GlassCard>
    </div>
  );
}
