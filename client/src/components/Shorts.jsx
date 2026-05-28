import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  VolumeX,
  Volume2,
  ThumbsUp,
  MessageCircle,
  Share2,
} from "lucide-react";

const TOPICS = [
  "Business tips",
  "Finance education",
  "Stock Market analysis",
  "Investing guide",
  "Trading strategies",
  "Entrepreneurship advice",
];

const YouTubeShorts = () => {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeShortIndex, setActiveShortIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const [pageToken, setPageToken] = useState("");

  const playerRefs = useRef({});
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

  const loadYouTubeIFrameAPI = () => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsYouTubeAPIReady(true);
      };
    } else {
      setIsYouTubeAPIReady(true);
    }
  };

  const getRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * TOPICS.length);
    return TOPICS[randomIndex];
  };

  const fetchShorts = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const searchQuery = getRandomTopic();

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&` +
          `maxResults=10&` +
          `q=${encodeURIComponent(searchQuery + " #shorts")}&` +
          `type=video&` +
          `videoDuration=short&` +
          `order=date&` +
          `videoDefinition=high&` +
          `pageToken=${pageToken}&` +
          `key=${YOUTUBE_API_KEY}`
      );

      if (!response.ok) throw new Error("Failed to fetch shorts");

      const data = await response.json();
      setPageToken(data.nextPageToken || "");

      const videoIds = data.items.map((item) => item.id.videoId);
      const detailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?` +
          `part=statistics,contentDetails,snippet&` +
          `id=${videoIds.join(",")}&` +
          `key=${YOUTUBE_API_KEY}`
      );

      if (!detailsResponse.ok) throw new Error("Failed to fetch video details");

      const detailsData = await detailsResponse.json();

      const newShorts = detailsData.items
        .filter((video) => {
          const duration = video.contentDetails.duration;
          const match = duration.match(/PT(\d+)M?(\d+)?S?/);
          const minutes = parseInt(match[1]) || 0;
          const seconds = parseInt(match[2]) || 0;
          return minutes * 60 + seconds <= 60;
        })
        .map((video) => ({
          id: video.id,
          title: video.snippet.title,
          channelTitle: video.snippet.channelTitle,
          likes: video.statistics.likeCount || "0",
          comments: video.statistics.commentCount || "0",
          description: video.snippet.description,
        }));

      setShorts((prev) => [...prev, ...newShorts]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [pageToken, YOUTUBE_API_KEY, getRandomTopic, setPageToken, setShorts, setLoading, setError, loadingRef]);

  const initializePlayer = (videoId, index) => {
    if (!window.YT || !window.YT.Player) return;

    const player = new window.YT.Player(`player-${videoId}`, {
      videoId,
      playerVars: {
        autoplay: index === activeShortIndex ? 1 : 0,
        controls: 0,
        modestbranding: 1,
        showinfo: 0,
        rel: 0,
        loop: 1,
        playlist: videoId,
        mute: 0,
        playsinline: 1,
        enablejsapi: 1,
      },
      events: {
        onReady: (event) => {
          playerRefs.current[videoId] = event.target;
          if (index === activeShortIndex) {
            try {
              event.target.playVideo();
              event.target.unMute();
              event.target.setVolume(100);
              setIsPlaying(true);
            } catch (error) {
              console.error("Error playing video:", error);
            }
          }
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            try {
              playerRefs.current[videoId].seekTo(0);
              playerRefs.current[videoId].playVideo();
            } catch (error) {
              console.error("Error replaying video:", error);
            }
          }
        },
      },
    });

    return player;
  };

  const handleIntersection = useCallback(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !loading && pageToken) {
          fetchShorts();
        }
      });
    },
    [loading, pageToken]
  );

  useEffect(() => {
    loadYouTubeIFrameAPI();
  }, []);

  useEffect(() => {
    if (isYouTubeAPIReady) {
      fetchShorts();
    }
  }, [isYouTubeAPIReady]);

  useEffect(() => {
    const currentVideoId = shorts[activeShortIndex]?.id;
    if (currentVideoId && playerRefs.current[currentVideoId]) {
      const player = playerRefs.current[currentVideoId];
      if (isPlaying) {
        player.playVideo();
        player.unMute();
        player.setVolume(100);
      } else {
        player.pauseVideo();
      }
      if (isMuted) {
        player.mute();
      } else {
        player.unMute();
      }
    }
  }, [isPlaying, isMuted, activeShortIndex, shorts]);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  const handleVideoClick = () => {
    setIsPlaying(!isPlaying);
  };

  const formatCount = (count) => {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full">
      <div className="w-96 h-screen relative">
        {shorts.map((short, index) => (
          <div
            key={short.id}
            className="h-screen w-full absolute inset-0 bg-black"
            style={{
              transform: `translateY(${(index - activeShortIndex) * 100}%)`,
              transition: "transform 0.3s ease-out",
              zIndex: index === activeShortIndex ? 1 : 0,
            }}
          >
            <div
              id={`player-${short.id}`}
              className="w-full h-full"
              ref={(el) => {
                if (el && !playerRefs.current[short.id] && isYouTubeAPIReady) {
                  initializePlayer(short.id, index);
                }
                if (el && index === shorts.length - 1 && observerRef.current) {
                  observerRef.current.observe(el);
                }
              }}
            />

            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"
              onClick={handleVideoClick}
            >
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-16 h-16 text-white opacity-80" />
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="font-bold text-lg mb-2">{short.title}</h3>
              <p className="text-sm opacity-90">@{short.channelTitle}</p>
              <p className="text-sm opacity-75 mt-2 line-clamp-2">
                {short.description}
              </p>
            </div>

            <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-2 rounded-full bg-black/50 text-white"
              >
                {isMuted ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
              <button className="flex flex-col items-center text-white">
                <ThumbsUp className="w-8 h-8 mb-1" />
                <span className="text-sm">{formatCount(short.likes)}</span>
              </button>
              <button className="flex flex-col items-center text-white">
                <MessageCircle className="w-8 h-8 mb-1" />
                <span className="text-sm">{formatCount(short.comments)}</span>
              </button>
              <button className="flex flex-col items-center text-white">
                <Share2 className="w-8 h-8 mb-1" />
                <span className="text-sm">Share</span>
              </button>
            </div>
          </div>
        ))}

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            className="bg-white text-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
            onClick={() => {
              if (activeShortIndex < shorts.length - 1) {
                setActiveShortIndex(activeShortIndex + 1);
              }
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubeShorts;
