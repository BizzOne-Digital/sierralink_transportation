import connectDB from "@/lib/db/connect";
import { mapRepositoryDoc } from "./serialize";
import { FAQ, type IFAQ } from "@/models";
import { isDatabaseUnavailable } from "./readiness";

export async function getPublishedFaqs(): Promise<IFAQ[]> {
  if (isDatabaseUnavailable()) {
    return [];
  }
  try {
    await connectDB();
    const faqs = await FAQ.find({ published: true })
      .sort({ order: 1, question: 1 })
      .lean();
    return mapRepositoryDoc(faqs) as IFAQ[];
  } catch (error) {
    console.error(
      "[Repository] get published FAQs — falling back to empty list:",
      error
    );
    return [];
  }
}

export async function getFaqsByCategory(category: string): Promise<IFAQ[]> {
  if (isDatabaseUnavailable()) {
    return [];
  }
  try {
    await connectDB();
    const faqs = await FAQ.find({ published: true, category })
      .sort({ order: 1, question: 1 })
      .lean();
    return mapRepositoryDoc(faqs) as IFAQ[];
  } catch (error) {
    console.error(
      "[Repository] get FAQs by category — falling back to empty list:",
      error
    );
    return [];
  }
}
