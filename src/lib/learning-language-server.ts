import { cookies } from "next/headers";
import { LEARNING_COOKIE, parseLearningLanguage, type LearningLanguage } from "./learning-language";

/** The visitor's learning-language choice, for server components. */
export async function learningLanguage(): Promise<LearningLanguage> {
  return parseLearningLanguage((await cookies()).get(LEARNING_COOKIE)?.value);
}
