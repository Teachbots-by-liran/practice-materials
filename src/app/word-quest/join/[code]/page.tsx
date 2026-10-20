import { WordQuestApp } from "@/components/word-quest/WordQuestApp";

/** A class's own link: students only type their name and PIN. */
export default async function JoinClassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <WordQuestApp joinCode={decodeURIComponent(code)} />;
}
