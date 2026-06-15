export default function LoadingScreen({
  fullscreen = false,
}: {
  fullscreen?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullscreen ? "min-h-screen bg-base-200" : "min-h-[60vh]"
      }`}
    >
      <span className="loading loading-spinner loading-lg text-primary" />
      <span className="text-base-content/60">กำลังโหลด…</span>
    </div>
  );
}
