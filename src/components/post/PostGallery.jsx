import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import PostModal from "./postmodal/PostModal";
import AddPostModal from "./AddPostModal";
import PostCard from "./PostCard";
import GallerySection from "./GallerySection";
import GalleryFilters, { FILTERS } from "./GalleryFilters";
import PostNotFound from "./PostNotFound";
import { SkeletonGallery } from "../common";
import { usePosts } from "../../context/PostContext";
import { useAuth } from "../../context/AuthContext";
import useRequireAuth from "../../hooks/useRequireAuth";
import { useBookmarks } from "../../hooks/useBookmarks";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./PostGallery.css";

import logger from "../../utils/logger";

const PostGallery = memo(function PostGallery({
  filterByUsername = null,
  showHeader = false,
  onPostDelete,
  initialFilter = "all",
  hideFilters = false,
}) {
  const {
    posts,
    userPosts,
    addPost,
    editPost,
    getReactions,
    toggleReaction,
    getUserReaction,
    loading,
    fetchPostById,
    loadMorePosts,
  } = usePosts();

  const { firebaseUser, userProfile } = useAuth();
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks();

  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [postNotFound, setPostNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [followingUids, setFollowingUids] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { requireAuth } = useRequireAuth();

  const scrollRef = useRef(null);
  const trendingScrollRef = useRef(null);
  const galleryRef = useRef(null);
  const sentinelRef = useRef(null);
  const isLoadingMoreRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true;
          setIsLoadingMore(true);
          loadMorePosts().finally(() => {
            isLoadingMoreRef.current = false;
            setIsLoadingMore(false);
          });
        }
      },
      { rootMargin: "500px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMorePosts]);

  // ── Callbacks ───────────────────────────────────────────────────────

  const guardedToggleReaction = useCallback(
    (postId, emoji) => {
      if (!requireAuth("react to a post")) return;
      toggleReaction(postId, emoji);
    },
    [requireAuth, toggleReaction],
  );

  const canEditPost = useCallback(
    (post) => {
      if (!firebaseUser || !post || post.isAnonymousPost) return false;
      return (
        post.uploadedBy === firebaseUser.uid ||
        post.author?.toLowerCase() === userProfile?.username?.toLowerCase()
      );
    },
    [firebaseUser, userProfile],
  );

  // ── Computed data ───────────────────────────────────────────────────

  const allPosts = useMemo(() => {
    const uniqueIds = new Set();
    const combined = [];
    userPosts.forEach((p) => {
      if (!uniqueIds.has(p.id)) { uniqueIds.add(p.id); combined.push(p); }
    });
    posts.forEach((p) => {
      if (!uniqueIds.has(p.id)) { uniqueIds.add(p.id); combined.push(p); }
    });
    return combined;
  }, [userPosts, posts]);

  const filteredPostsByUser = useMemo(() => {
    if (!filterByUsername) return null;
    // Exclude anonymous posts from profile views
    return allPosts.filter((p) => p.uploadedBy === filterByUsername && !p.isAnonymousPost);
  }, [allPosts, filterByUsername]);

  // Fetch following list once for "Following" filter (no real-time needed)
  useEffect(() => {
    if (!firebaseUser?.uid) { setFollowingUids(null); return; }
    let cancelled = false;
    getDocs(query(
      collection(db, "follows"),
      where("followerId", "==", firebaseUser.uid),
      limit(200),
    )).then((snap) => {
      if (!cancelled) setFollowingUids(snap.docs.map((d) => d.data().followingId));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [firebaseUser?.uid]);

  const filteredPosts = useMemo(() => {
    const base = filterByUsername ? filteredPostsByUser || [] : allPosts;

    let result = [];
    if (activeFilter === "all") {
      result = base;
    } else if (activeFilter === "recent") {
      result = [...base].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
    } else if (activeFilter === "saved") {
      result = base.filter((p) => bookmarkedIds.has(p.id));
    } else if (activeFilter === "following") {
      result = !followingUids?.length ? [] : base.filter((p) => followingUids.includes(p.uploadedBy));
    } else {
      result = base.filter((p) => p.type === activeFilter);
    }

    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s) ||
          p.author?.toLowerCase().includes(s) ||
          p.question?.toLowerCase().includes(s) ||
          p.status?.toLowerCase().includes(s),
      );
    }
    return result;
  }, [activeFilter, allPosts, filteredPostsByUser, filterByUsername, followingUids, bookmarkedIds, debouncedSearch]);

  const trendingPosts = useMemo(() => {
    if (filterByUsername) return [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return allPosts
      .filter((p) => (p.createdAt?.seconds * 1000 || 0) > oneDayAgo)
      .map((p) => {
        const reactions = Object.values(getReactions(p.id)).reduce((a, b) => a + b, 0);
        const comments = p.commentCount || 0;
        const ageMs = now - (p.createdAt?.seconds * 1000 || now);
        // Recency boost: decays from 1 → 0 over 24h
        const recencyBoost = Math.max(0, 1 - ageMs / (24 * 60 * 60 * 1000));
        const score = reactions * 2 + comments + recencyBoost * 10;
        return { ...p, trendingScore: score };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 8);
  }, [allPosts, filterByUsername, getReactions]);

  // ── Navigation handlers ─────────────────────────────────────────────

  const handlePostClick = useCallback(
    (post) => {
      const index = allPosts.findIndex((p) => p.id === post.id);
      setSelectedIndex(index);
      setSelectedPost(post);
      setIsOpen(true);
      navigate(`/image/${post.id}`, { state: { background: location } });
    },
    [allPosts, navigate, location],
  );

  const handleRandomPost = useCallback(() => {
    if (filteredPosts.length === 0) return;
    handlePostClick(filteredPosts[Math.floor(Math.random() * filteredPosts.length)]);
  }, [filteredPosts, handlePostClick]);

  const handleModalRandom = useCallback(() => {
    const available = filteredPosts.filter((p) => p.id !== selectedPost?.id);
    if (available.length === 0) return;
    const randomPost = available[Math.floor(Math.random() * available.length)];
    const index = allPosts.findIndex((p) => p.id === randomPost.id);
    setSelectedIndex(index);
    setSelectedPost(randomPost);
    navigate(`/image/${randomPost.id}`, { state: { background: location } });
  }, [filteredPosts, selectedPost, allPosts, navigate, location]);

  // Track posts/userPosts via refs so deep-link effect only re-runs on params.id/loading
  const postsRefLocal = useRef(posts);
  postsRefLocal.current = posts;
  const userPostsRefLocal = useRef(userPosts);
  userPostsRefLocal.current = userPosts;

  useEffect(() => {
    if (params.id) {
      const findAndSet = async () => {
        setIsLoading(true);
        setPostNotFound(false);

        if (loading) {
          logger.log("📦 Post data still loading, will attempt fetch anyway");
        }

        let all = [...userPostsRefLocal.current, ...postsRefLocal.current];
        let post = all.find((p) => p.id === params.id);

        if (!post) {
          logger.log(`🔍 Post ${params.id} not found in loaded data, fetching...`);
          post = await fetchPostById(params.id);
          if (post) all = [post, ...all];
        }

        if (post) {
          setSelectedPost(post);
          setSelectedIndex(all.findIndex((p) => p.id === post.id));
          setPostNotFound(false);
          setIsOpen(true);
        } else {
          setPostNotFound(true);
        }
        setIsLoading(false);
      };
      findAndSet();
    } else {
      setPostNotFound(false);
      setIsLoading(false);
    }
  }, [params.id, loading, fetchPostById]);

  const handleEditPost = useCallback(
    (post) => {
      if (!requireAuth("edit a post")) return;
      setEditingPost(post);
    },
    [requireAuth],
  );

  const handlePrev = useCallback(() => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : allPosts.length - 1;
    setSelectedIndex(newIndex);
    const p = allPosts[newIndex];
    setSelectedPost(p);
    setIsOpen(true);
    navigate(`/image/${p.id}`, { state: { background: location } });
  }, [selectedIndex, allPosts, navigate, location]);

  const handleNext = useCallback(() => {
    const newIndex = selectedIndex < allPosts.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    const p = allPosts[newIndex];
    setSelectedPost(p);
    setIsOpen(true);
    navigate(`/image/${p.id}`, { state: { background: location } });
  }, [selectedIndex, allPosts, navigate, location]);

  const handleCloseModal = useCallback(() => {
    setIsOpen(false);
    setPostNotFound(false);
    if (location.state?.background || filterByUsername) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate, filterByUsername, location]);

  const scrollSection = useCallback((ref, direction) => {
    if (ref.current) {
      const scrollAmount = 200 * 3;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const guardedToggleBookmark = useCallback(
    (postId) => {
      if (!requireAuth("bookmark a post")) return;
      toggleBookmark(postId);
    },
    [requireAuth, toggleBookmark],
  );

  // ── Render card ─────────────────────────────────────────────────────

  const renderPostCard = useCallback(
    (post, sectionType) => (
      <PostCard
        key={post.id}
        post={post}
        sectionType={sectionType}
        onClick={() => handlePostClick(post)}

        onComment={handlePostClick}
        onReactionClick={guardedToggleReaction}
        reactions={getReactions(post.id)}
        userReaction={getUserReaction(post.id)}
        isSelected={selectedPost && post.id === selectedPost.id}
        canEdit={canEditPost(post)}
        onEdit={handleEditPost}
        isBookmarked={isBookmarked(post.id)}
        onToggleBookmark={guardedToggleBookmark}
      />
    ),
    [handlePostClick, guardedToggleReaction, guardedToggleBookmark, getReactions, getUserReaction, selectedPost, canEditPost, handleEditPost, isBookmarked],
  );

  const currentFilter = FILTERS.find((f) => f.value === activeFilter) || FILTERS[0];

  const handleAddPost = (newPost) => {
    const toastId = toast.loading("Creating post...");
    setShowAddModal(false);
    addPost(newPost)
      .then(() => toast.success("Post created successfully! 🎉", { id: toastId }))
      .catch((err) => toast.error(err.message || "Failed to create post", { id: toastId }));
  };

  const handlePostDelete = useCallback(
    (error) => {
      if (onPostDelete) { onPostDelete(error); return; }
      setTimeout(() => {
        if (error) {
          toast.error("Failed to delete post. Please try again.");
        } else {
          toast.success("Post deleted successfully! 🗑️");
        }
      }, 200);
    },
    [onPostDelete],
  );

  // ── JSX ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="image-gallery" ref={galleryRef}>
        {showHeader && (
          <div className="profile-gallery-header">
            <h2>📸 Posts ({filteredPosts.length})</h2>
          </div>
        )}

        {!filterByUsername && !hideFilters && (
          <GalleryFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            search={search}
            onSearchChange={setSearch}
            onCreatePost={() => {
              if (!requireAuth("create a post")) return;
              logger.log("Create post clicked");
              setShowAddModal(true);
            }}
            onRandom={handleRandomPost}
            randomDisabled={filteredPosts.length === 0}
          />
        )}

        {!filterByUsername && !hideFilters && trendingPosts.length > 0 && !debouncedSearch.trim() && (
          <div className="trending-wrapper">
            <GallerySection
              title="Trending"
              emoji="🔥"
              posts={trendingPosts}
              scrollRef={trendingScrollRef}
              onScroll={scrollSection}
              renderCard={renderPostCard}
              sectionType="trending"
              layoutMode="horizontal"
              allowToggle={false}
            />
          </div>
        )}

        {loading && posts.length === 0 && <SkeletonGallery count={6} />}

        {filteredPosts.length > 0 && (
          <GallerySection
            title={filterByUsername || hideFilters ? "" : currentFilter.label}
            emoji={filterByUsername || hideFilters ? "" : currentFilter.emoji}
            posts={filteredPosts}
            scrollRef={scrollRef}
            onScroll={scrollSection}
            renderCard={renderPostCard}
            sectionType={activeFilter}
            layoutMode="vertical"
            allowToggle={!filterByUsername && !hideFilters}
            onRandomClick={!filterByUsername && !hideFilters ? handlePostClick : undefined}
          />
        )}

        {filteredPosts.length === 0 && !loading && (
          <div className="no-results">
            <span className="no-results-icon">🔍</span>
            <p>
              {debouncedSearch.trim()
                ? `No posts found for "${debouncedSearch}"`
                : filterByUsername
                  ? "No posts yet"
                  : `No ${activeFilter} posts yet`}
            </p>
          </div>
        )}

        {isLoadingMore && (
          <div className="load-more-indicator">
            <div className="loading-spinner-small"></div>
            <p>Loading more posts...</p>
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      </div>

      {isLoading && params.id && (
        <div className="image-modal-overlay">
          <div className="image-loading">
            <div className="loading-spinner"></div>
            <p>Loading post...</p>
          </div>
        </div>
      )}

      {postNotFound && params.id && <PostNotFound onClose={handleCloseModal} />}

      {isOpen && selectedPost && !isLoading && !postNotFound && (
        <PostModal
          post={selectedPost}
          onClose={handleCloseModal}
          onPrev={handlePrev}
          onNext={handleNext}
          onRandom={handleModalRandom}
          onDelete={handlePostDelete}
          onEdit={() => {
            const updated = posts.find((p) => p.id === selectedPost.id);
            if (updated) setSelectedPost(updated);
          }}
        />
      )}

      {showAddModal && (
        <AddPostModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPost}
        />
      )}

      {editingPost && (
        <AddPostModal
          onClose={() => setEditingPost(null)}
          onSubmit={handleAddPost}
          editMode
          editPostData={editingPost}
          editPost={(updateData) => {
            const toastId = toast.loading("Saving...");
            editPost(editingPost.id, updateData)
              .then(() => {
                toast.success("Post updated!", { id: toastId });
                setEditingPost(null);
              })
              .catch((err) => toast.error(err.message || "Failed to update", { id: toastId }));
          }}
        />
      )}

    </>
  );
});

export default PostGallery;
