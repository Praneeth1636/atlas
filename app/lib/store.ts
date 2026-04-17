import { create } from "zustand";

import { IngestionData } from "@/app/lib/types";

interface AtlasStore {
  ingestionData: IngestionData | null;
  setIngestionData: (data: IngestionData) => void;
  clearIngestionData: () => void;
}

export const useAtlasStore = create<AtlasStore>((set) => ({
  ingestionData: null,
  setIngestionData: (data) => set({ ingestionData: data }),
  clearIngestionData: () => set({ ingestionData: null }),
}));
