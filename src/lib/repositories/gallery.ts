import connectDB from "@/lib/db/connect";
import { isBlockedMediaUrl } from "@/lib/media/sanitize";
import { mapRepositoryDoc } from "./serialize";
import {
  GalleryCategory,
  GalleryImage,
  type IGalleryCategory,
  type IGalleryImage,
} from "@/models";
import { RepositoryError } from "./errors";
import { isDatabaseUnavailable } from "./readiness";

export async function getPublishedCategories(): Promise<IGalleryCategory[]> {
  if (isDatabaseUnavailable()) {
    return [];
  }
  try {
    await connectDB();
    const categories = await GalleryCategory.find({ published: true })
      .sort({ order: 1, name: 1 })
      .lean();
    return mapRepositoryDoc(categories) as IGalleryCategory[];
  } catch (error) {
    console.error(
      "[Repository] get published gallery categories — falling back to empty list:",
      error
    );
    return [];
  }
}

export async function getPublishedImages(): Promise<IGalleryImage[]> {
  if (isDatabaseUnavailable()) {
    return [];
  }
  try {
    await connectDB();
    const images = await GalleryImage.find({ published: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return (mapRepositoryDoc(images) as IGalleryImage[]).filter(
      (image) => !isBlockedMediaUrl(image.url)
    );
  } catch (error) {
    console.error(
      "[Repository] get published gallery images — falling back to empty list:",
      error
    );
    return [];
  }
}

export async function getImagesByCategory(
  categorySlug: string
): Promise<IGalleryImage[]> {
  if (isDatabaseUnavailable()) {
    return [];
  }
  try {
    await connectDB();
    const category = await GalleryCategory.findOne({
      slug: categorySlug,
      published: true,
    }).lean();

    if (!category) {
      throw new RepositoryError(
        `Gallery category not found: ${categorySlug}`,
        "NOT_FOUND"
      );
    }

    const images = await GalleryImage.find({
      categoryId: category._id,
      published: true,
    })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return (mapRepositoryDoc(images) as IGalleryImage[]).filter(
      (image) => !isBlockedMediaUrl(image.url)
    );
  } catch (error) {
    console.error(
      "[Repository] get gallery images by category — falling back to empty list:",
      error
    );
    return [];
  }
}
