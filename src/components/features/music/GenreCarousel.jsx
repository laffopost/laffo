import { useRef } from "react";
import { GENRES, GENRE_ICONS } from "./musicConstants";

export default function GenreCarousel({ selectedGenre, setSelectedGenre }) {
  const carouselRef = useRef(null);

  const scrollGenres = (dir) => {
    carouselRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  return (
    <div className="genre-carousel-container">
      <div className="genre-carousel-row">
        <button
          className="carousel-nav-btn left"
          onClick={() => scrollGenres("left")}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <div className="genre-carousel-wrapper">
          <div className="genre-carousel" ref={carouselRef}>
            {GENRES.map((genre) => (
              <button
                key={genre}
                className={`genre-pill ${selectedGenre === genre ? "active" : ""}`}
                onClick={() => setSelectedGenre(genre)}
              >
                <span className="genre-pill-icon">
                  {GENRE_ICONS[genre]}
                </span>
                {genre}
              </button>
            ))}
          </div>
        </div>
        <button
          className="carousel-nav-btn right"
          onClick={() => scrollGenres("right")}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </div>
  );
}
