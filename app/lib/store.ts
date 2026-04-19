import { create } from "zustand";

import type {
  Depth,
  IngestionData,
  LearningPath,
  Lesson,
} from "@/app/lib/types";

interface AtlasStore {
  ingestionData: IngestionData | null;
  learningPath: LearningPath | null;
  depth: Depth;
  lessonCache: Record<string, Lesson>;
  setIngestionData: (data: IngestionData | null) => void;
  setLearningPath: (path: LearningPath | null) => void;
  setDepth: (depth: Depth) => void;
  cacheLesson: (lessonId: string, lesson: Lesson) => void;
  invalidateLessons: () => void;
  reset: () => void;
}

export const useAtlasStore = create<AtlasStore>((set) => ({
  ingestionData: null,
  learningPath: null,
  depth: "solid",
  lessonCache: {},
  setIngestionData: (data) => set({ ingestionData: data }),
  setLearningPath: (path) => set({ learningPath: path }),
  setDepth: (depth) => set({ depth }),
  cacheLesson: (lessonId, lesson) =>
    set((state) => ({
      lessonCache: {
        ...state.lessonCache,
        [lessonId]: lesson,
      },
    })),
  invalidateLessons: () => set({ lessonCache: {} }),
  reset: () =>
    set({
      ingestionData: null,
      learningPath: null,
      depth: "solid",
      lessonCache: {},
    }),
}));
