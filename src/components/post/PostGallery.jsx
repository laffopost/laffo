import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import PostModal from "./postmodal/PostModal";
import AddPostModal from "./AddPostModal";
import PostCard from "./PostCard";
import GallerySection from "./GallerySection";
import { ShareMenu } from "../features/utilities";
import { Notification, Loader } from "../common";
import CreatePostButton from "./CreatePostButton";
import { usePosts } from "../../context/PostContext";
import { useAuth } from "../../context/AuthContext";
import useRequireAuth from "../../hooks/useRequireAuth";
import "./PostGallery.css";

import logger from "../../utils/logger";
const FILTERS = [
  { value: "all", label: "All", emoji: "🖼️" },
  { value: "following", label: "Following", emoji: "👤" },
  { value: "sponsored", label: "Sponsored", emoji: "💎" },
  { value: "status", label: "Status", emoji: "👀" },
  { value: "poll", label: "Poll", emoji: "🎮" },
  { value: "media", label: "Media", emoji: "🎵" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "tech", label: "Tech", emoji: "💻" },
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "pov", label: "POV", emoji: "👀" },
  { value: "question", label: "Question", emoji: "❓" },
  { value: "news", label: "News", emoji: "📰" },
  { value: "crypto", label: "Crypto", emoji: "🪙" },
  { value: "memecoin", label: "Memecoin", emoji: "🐶" },
];

const MAIN_FILTERS = FILTERS;

const PostGallery = memo(function PostGallery({
  filterByUsername = null,
  showHeader = false,
  onPostDelete,
}) {
  const {
    images,
    userImages,
    addPost,
    getReactions,
    toggleReaction,
    getUserReaction,
    loading,
    fetchImageById,
    loadMorePosts,
  } = usePosts();

  const { firebaseUser, userProfile } = useAuth();

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [shareImage, setShareImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [imageNotFound, setImageNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  console.log("isLoadingMore", isLoadingMore);

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { requireAuth } = useRequireAuth();

  const scrollRef = useRef(null);
  const trendingScrollRef = useRef(null);
  const galleryRef = useRef(null);
  const sentinelRef = useRef(null);

  const isLoadingMoreRef = useRef(false);

  // Infinite scroll — IntersectionObserver on a sentinel div at the bottom
  // Much cheaper than a window scroll listener (fires ~60/sec)
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
      { rootMargin: "500px" }, // start loading 500px before sentinel is visible
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMorePosts]);

  // Guarded version of toggleReaction for cards
  const guardedToggleReaction = useCallback(
    (imageId, emoji) => {
      if (!requireAuth("react to a post")) return;
      toggleReaction(imageId, emoji);
    },
    [requireAuth, toggleReaction],
  );

  // Check if user can edit a post
  const canEditPost = useCallback(
    (image) => {
      if (!firebaseUser || !image) return false;
      return (
        image.uploadedBy === firebaseUser.uid ||
        image.author?.toLowerCase() === userProfile?.username?.toLowerCase()
      );
    },
    [firebaseUser, userProfile],
  );

  const allImagesWithUser = useMemo(() => {
    const uniqueIds = new Set();
    const combined = [];
    userImages.forEach((img) => {
      if (!uniqueIds.has(img.id)) {
        uniqueIds.add(img.id);
        combined.push(img);
      }
    });
    images.forEach((img) => {
      if (!uniqueIds.has(img.id)) {
        uniqueIds.add(img.id);
        combined.push(img);
      }
    });
    return combined;
  }, [userImages, images]);

  const filteredImagesByUser = useMemo(() => {
    if (!filterByUsername) return null;
    // Filter by user ID (uploadedBy) which is reliable even after username changes
    return allImagesWithUser.filter(
      (img) => img.uploadedBy === filterByUsername,
    );
  }, [allImagesWithUser, filterByUsername]);

  const filteredImages = useMemo(() => {
    const baseImages = filterByUsername
      ? filteredImagesByUser || []
      : allImagesWithUser;

    let imgs = [];
    if (activeFilter === "all") {
      imgs = baseImages;
    } else if (activeFilter === "recent") {
      imgs = [...baseImages].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
    } else {
      imgs = baseImages.filter((img) => img.type === activeFilter);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      imgs = imgs.filter(
        (img) =>
          img.title?.toLowerCase().includes(s) ||
          img.description?.toLowerCase().includes(s) ||
          img.author?.toLowerCase().includes(s) ||
          img.question?.toLowerCase().includes(s) ||
          img.status?.toLowerCase().includes(s),
      );
    }
    return imgs;
  }, [
    activeFilter,
    allImagesWithUser,
    filteredImagesByUser,
    filterByUsername,
    search,
  ]);

  const trendingPosts = useMemo(() => {
    if (filterByUsername) return [];

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return allImagesWithUser
      .filter((img) => {
        const createdTime = img.createdAt?.seconds * 1000 || 0;
        return createdTime > sevenDaysAgo;
      })
      .map((img) => ({
        ...img,
        totalReactions: Object.values(getReactions(img.id)).reduce(
          (a, b) => a + b,
          0,
        ),
      }))
      .sort((a, b) => b.totalReactions - a.totalReactions)
      .slice(0, 8);
  }, [allImagesWithUser, filterByUsername, getReactions]);

  // Define handleImageClick BEFORE it's used in other callbacks
  const handleImageClick = useCallback(
    (image) => {
      const index = allImagesWithUser.findIndex((img) => img.id === image.id);
      setSelectedIndex(index);
      setSelectedImage(image);
      setIsOpen(true);
      navigate(`/image/${image.id}`, { state: { background: location } });
    },
    [allImagesWithUser, navigate, location],
  );

  const handleRandomPost = useCallback(() => {
    if (filteredImages.length === 0) return;

    const randomIndex = Math.floor(Math.random() * filteredImages.length);
    const randomImage = filteredImages[randomIndex];

    handleImageClick(randomImage);
  }, [filteredImages, handleImageClick]);

  const handleModalRandom = useCallback(() => {
    if (filteredImages.length === 0) return;

    // Filter out current image to avoid showing same post
    const availableImages = filteredImages.filter(
      (img) => img.id !== selectedImage?.id,
    );
    if (availableImages.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const randomImage = availableImages[randomIndex];

    const index = allImagesWithUser.findIndex(
      (img) => img.id === randomImage.id,
    );
    setSelectedIndex(index);
    setSelectedImage(randomImage);
    navigate(`/image/${randomImage.id}`, { state: { background: location } });
  }, [filteredImages, selectedImage, allImagesWithUser, navigate, location]);

  useEffect(() => {
    if (params.id) {
      const findAndSetImage = async () => {
        setIsLoading(true);
        setImageNotFound(false);

        // If still loading initial data, wait for it but proceed to fetch if not found
        if (loading) {
          logger.log("📦 Post data still loading, will attempt fetch anyway");
        }

        let allImgs = [...userImages, ...images];
        let img = allImgs.find((i) => i.id === params.id);

        if (!img) {
          logger.log(
            `🔍 Post ${params.id} not found in loaded data, fetching...`,
          );
          img = await fetchImageById(params.id);
          if (img) allImgs = [img, ...allImgs];
        }

        if (img) {
          setSelectedImage(img);
          setSelectedIndex(allImgs.findIndex((i) => i.id === img.id));
          setImageNotFound(false);
          setIsOpen(true);
          logger.log(`✅ Post ${params.id} loaded successfully`);
        } else {
          logger.log(`❌ Post ${params.id} not found`);
          setImageNotFound(true);
        }
        setIsLoading(false);
      };
      findAndSetImage();
    } else {
      setImageNotFound(false);
      setIsLoading(false);
    }
  }, [params.id, userImages, images, loading, fetchImageById]);

  // Remove duplicate handleImageClick - already defined above
  // const handleImageClick = useCallback(...) // REMOVED - DUPLICATE

  // Handle edit post
  const handleEditPost = useCallback(
    (image) => {
      if (!requireAuth("edit a post")) return;
      // Open the post modal in edit mode
      handleImageClick(image);
    },
    [requireAuth, handleImageClick],
  );

  const handlePrevImage = useCallback(() => {
    const newIndex =
      selectedIndex > 0 ? selectedIndex - 1 : allImagesWithUser.length - 1;
    setSelectedIndex(newIndex);
    const newImage = allImagesWithUser[newIndex];
    setSelectedImage(newImage);
    setIsOpen(true);
    navigate(`/image/${newImage.id}`, { state: { background: location } });
  }, [selectedIndex, allImagesWithUser, navigate, location]);

  const handleNextImage = useCallback(() => {
    const newIndex =
      selectedIndex < allImagesWithUser.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    const newImage = allImagesWithUser[newIndex];
    setSelectedImage(newImage);
    setIsOpen(true);
    navigate(`/image/${newImage.id}`, { state: { background: location } });
  }, [selectedIndex, allImagesWithUser, navigate, location]);

  const handleCloseModal = useCallback(() => {
    setIsOpen(false);
    setImageNotFound(false);

    // Navigate back based on context
    if (filterByUsername) {
      // If we're on a profile page, go back to that profile
      navigate(`/profile/${filterByUsername}`, { replace: true });
    } else {
      // Otherwise go to home
      navigate("/", { replace: true });
    }
  }, [navigate, filterByUsername]);

  const scrollSection = useCallback((ref, direction) => {
    if (ref.current) {
      const cardWidth = 200;
      const gap = 0;
      const scrollAmount = (cardWidth + gap) * 3;

      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const renderImageCard = useCallback(
    (image, sectionType) => (
      <PostCard
        key={image.id}
        image={image}
        sectionType={sectionType}
        onClick={() => handleImageClick(image)}
        onShare={(img) => setShareImage(img)}
        onComment={handleImageClick}
        onReactionClick={guardedToggleReaction}
        reactions={getReactions(image.id)}
        userReaction={getUserReaction(image.id)}
        isSelected={selectedImage && image.id === selectedImage.id}
        canEdit={canEditPost(image)}
        onEdit={handleEditPost}
      />
    ),
    [
      handleImageClick,
      guardedToggleReaction,
      getReactions,
      getUserReaction,
      selectedImage,
      canEditPost,
      handleEditPost,
    ],
  );

  const currentFilter =
    FILTERS.find((f) => f.value === activeFilter) || FILTERS[0];

  const handleAddPost = (newPost) => {
    const toastId = toast.loading("Creating post...");
    setShowAddModal(false);
    addPost(newPost)
      .then(() => toast.success("Post created successfully! 🎉", { id: toastId }))
      .catch((err) => toast.error(err.message || "Failed to create post", { id: toastId }));
  };

  const handlePostDelete = useCallback(
    (error) => {
      if (onPostDelete) {
        onPostDelete(error);
        return;
      }

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

  return (
    <>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}

      <div className="image-gallery" ref={galleryRef}>
        {showHeader && (
          <div className="profile-gallery-header">
            <h2>📸 Posts ({filteredImages.length})</h2>
          </div>
        )}

        {!filterByUsername && (
          <div className="create-post-search-row">
            <CreatePostButton
              onClick={() => {
                if (!requireAuth("create a post")) return;
                logger.log("Create post clicked");
                setShowAddModal(true);
              }}
            />
            <input
              className="gallery-search-main"
              type="text"
              placeholder="Search by title, author, content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search posts by title, author, or content"
            />
            <button
              className="random-post-btn"
              onClick={handleRandomPost}
              disabled={filteredImages.length === 0}
              title="View random post"
            >
              🎲
            </button>
          </div>
        )}

        {!filterByUsername && trendingPosts.length > 0 && !search.trim() && (
          <div className="trending-wrapper">
            <GallerySection
              title="Trending"
              emoji="🔥"
              images={trendingPosts}
              scrollRef={trendingScrollRef}
              onScroll={scrollSection}
              renderCard={renderImageCard}
              sectionType="trending"
              layoutMode="horizontal"
              allowToggle={false}
            />
          </div>
        )}

        {!filterByUsername && (
          <div className="gallery-filters-row">
            <div className="gallery-filters">
              {MAIN_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  className={`gallery-filter-btn${
                    activeFilter === filter.value ? " active" : ""
                  }`}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && images.length === 0 && <Loader text="Loading posts..." />}

        {filteredImages.length > 0 && (
          <GallerySection
            title={filterByUsername ? "" : currentFilter.label}
            emoji={filterByUsername ? "" : currentFilter.emoji}
            images={filteredImages}
            scrollRef={scrollRef}
            onScroll={scrollSection}
            renderCard={renderImageCard}
            sectionType={activeFilter}
            layoutMode="vertical"
            allowToggle={true}
            onRandomClick={handleImageClick}
          />
        )}

        {filteredImages.length === 0 && !loading && (
          <div className="no-results">
            <span className="no-results-icon">🔍</span>
            <p>
              {search.trim()
                ? `No posts found for "${search}"`
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

        {/* Sentinel element — IntersectionObserver watches this to trigger pagination */}
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      </div>

      {isLoading && params.id && (
        <div className="image-modal-overlay">
          <div className="image-loading">
            <div className="loading-spinner"></div>
            <p>Loading image...</p>
          </div>
        </div>
      )}

      {imageNotFound && params.id && (
        <div className="image-modal-overlay" onClick={handleCloseModal}>
          <div className="image-not-found" onClick={(e) => e.stopPropagation()}>
            <div className="not-found-content">
              <span className="not-found-icon">🔍</span>
              <h2>Image Not Found</h2>
              <p>
                The image you're looking for doesn't exist or has been removed.
              </p>
              <button className="back-btn" onClick={handleCloseModal}>
                Back to Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && selectedImage && !isLoading && !imageNotFound && (
        <PostModal
          image={selectedImage}
          onClose={handleCloseModal}
          onPrev={handlePrevImage}
          onNext={handleNextImage}
          onRandom={handleModalRandom}
          onDelete={handlePostDelete}
          onEdit={() => {
            // Refresh the selected image after edit
            const updatedImage = images.find(
              (img) => img.id === selectedImage.id,
            );
            if (updatedImage) {
              setSelectedImage(updatedImage);
            }
          }}
        />
      )}

      {showAddModal && (
        <AddPostModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPost}
        />
      )}

      <ShareMenu shareImage={shareImage} onClose={() => setShareImage(null)} />
    </>
  );
});

export default PostGallery;
