import { create } from "zustand";

export const useLibraryStore = create<{
    scanning: boolean;
    access: "unknown" | "granted" | "denied" | "unavailable";
    canAskAgain: boolean;
    error: string | null;
}>(() => ({ scanning: false, access: "unknown", canAskAgain: true, error: null }));
