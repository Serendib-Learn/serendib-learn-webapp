import type { CourseStage } from "../../../shared/types.ts";

/**
 * The course stages' descriptions a fresh database starts with — the text on
 * each learning hub folder. Keyed by the stage name the chapters
 * (shared/curriculum.ts) use. Only read to fill an empty `courseStages`
 * collection; admins edit them in the portal's content editor.
 */
export const stageSeed: Omit<CourseStage, "updatedAt">[] = [
  {
    id: "foundation",
    name: "Foundation",
    description: "Say Hello, Who's Who, Calling Grandma, and the rest of the Foundation units.",
  },
  {
    id: "survival-sri-lanka",
    name: "Survival Sri Lanka",
    description:
      "Eight chapters that carry you from the airport gate to your grandmother's front room. Every phrase is one a Sri Lankan would actually say.",
  },
  {
    id: "building-fluency",
    name: "Building & fluency",
    description: "Materials for holding a conversation and telling your own story.",
  },
  {
    id: "worksheets-printables",
    name: "Worksheets & printables",
    description: "General printables, homework templates, and offline practice sheets.",
  },
];
