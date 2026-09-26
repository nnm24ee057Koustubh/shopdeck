// Adds average-rating info to products that included their reviews.
export type RatingInfo = {
  avgRating: number | null;
  reviewCount: number;
};

type WithReviews = { reviews?: { rating: number }[] };

export function withRatings<T extends WithReviews>(products: T[]): (T & RatingInfo)[] {
  return products.map((p) => {
    const rs = p.reviews ?? [];
    const reviewCount = rs.length;
    const avgRating = reviewCount
      ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : null;
    return { ...p, avgRating, reviewCount };
  });
}

export function starsFor(avgRating: number | null): string {
  if (avgRating === null) return "";
  const full = Math.round(avgRating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}
