import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  defaultLibraryPreferences,
  LibraryPreferences,
} from "../libraryControls";

export const useLibraryPreferences = create<
  LibraryPreferences & {
    update: (preferences: Partial<LibraryPreferences>) => void;
    reset: () => void;
  }
>()(
  persist(
    (set) => ({
      ...defaultLibraryPreferences,
      update: (preferences) => set(preferences),
      reset: () => set(defaultLibraryPreferences),
    }),
    {
      name: "muzalo-library-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        sort,
        descending,
        folder,
        excludedFolders,
        hideShort,
        hideNonMusic,
      }) => ({
        sort,
        descending,
        folder,
        excludedFolders,
        hideShort,
        hideNonMusic,
      }),
    },
  ),
);
