import connectDB from "@/lib/db/connect";
import { sanitizeMediaItem } from "@/lib/media/sanitize";
import { mapRepositoryDoc } from "./serialize";
import { Testimonial, type ITestimonial } from "@/models";
import { isDatabaseUnavailable } from "./readiness";

function sanitizePublicTestimonial(testimonial: ITestimonial): ITestimonial {
  return {
    ...testimonial,
    image: sanitizeMediaItem(testimonial.image),
  } as ITestimonial;
}

export async function getPublishedTestimonials(): Promise<ITestimonial[]> {
  if (isDatabaseUnavailable()) {
    return [];
  }
  try {
    await connectDB();
    const testimonials = await Testimonial.find({ published: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return (mapRepositoryDoc(testimonials) as ITestimonial[]).map(
      sanitizePublicTestimonial
    );
  } catch (error) {
    console.error(
      "[Repository] get published testimonials — falling back to empty list:",
      error
    );
    return [];
  }
}
