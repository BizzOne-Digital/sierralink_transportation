import connectDB from "@/lib/db/connect";
import {
  sanitizeMediaItem,
  sanitizePageSections,
  sanitizeSeoFields,
} from "@/lib/media/sanitize";
import { mapRepositoryDoc } from "./serialize";
import { ServiceArea, type IServiceArea } from "@/models";
import { isDatabaseUnavailable } from "./readiness";

function sanitizePublicServiceArea(area: IServiceArea): IServiceArea {
  return {
    ...area,
    image: sanitizeMediaItem(area.image),
    sections: sanitizePageSections(area.sections ?? []),
    seo: sanitizeSeoFields(area.seo),
  } as IServiceArea;
}

export async function getPublishedServiceAreas(): Promise<IServiceArea[]> {
  if (isDatabaseUnavailable()) {
    return [];
  }
  try {
    await connectDB();
    const areas = await ServiceArea.find({ published: true })
      .sort({ order: 1, city: 1 })
      .lean();
    return (mapRepositoryDoc(areas) as IServiceArea[]).map(sanitizePublicServiceArea);
  } catch (error) {
    console.error(
      "[Repository] get published service areas — falling back to empty list:",
      error
    );
    return [];
  }
}

export async function getServiceAreaBySlug(
  slug: string
): Promise<IServiceArea | null> {
  if (isDatabaseUnavailable()) {
    return null;
  }
  try {
    await connectDB();
    const area = await ServiceArea.findOne({ slug, published: true }).lean();
    return area
      ? sanitizePublicServiceArea(mapRepositoryDoc(area) as IServiceArea)
      : null;
  } catch (error) {
    console.error(
      "[Repository] get service area by slug — falling back to null:",
      error
    );
    return null;
  }
}
