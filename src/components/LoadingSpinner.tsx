export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-4">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm font-medium">Generating your unseen exam…</p>
      <p className="text-xs text-gray-400">This usually takes 15–30 seconds</p>
    </div>
  );
}
