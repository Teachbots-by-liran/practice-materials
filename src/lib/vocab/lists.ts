import type { WordList } from "./types";
import band3Starter from "@/content/word-lists/band3-starter.json";
import band3Set2 from "@/content/word-lists/band3-set2.json";

// Word lists bundled with the app. New lists are generated with the
// /new-word-list command and registered here.
export const WORD_LISTS: WordList[] = [band3Starter as WordList, band3Set2 as WordList];

export function getList(id: string): WordList | undefined {
  return WORD_LISTS.find((l) => l.id === id);
}

export const DEFAULT_LIST_ID = WORD_LISTS[0].id;
