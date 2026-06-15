import PrintButton from "./PrintButton";

export default function PrintHeader({
  schoolName,
  logoBase64,
  title,
  subtitle,
}: {
  schoolName: string;
  logoBase64: string | null;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href="/admin/reports" className="text-sm text-blue-600 underline">
          ← กลับไปหน้ารายงาน
        </a>
        <PrintButton />
      </div>
      <div className="mb-6 flex items-center gap-4 border-b-2 border-black pb-4">
        {logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoBase64} alt="โลโก้" className="h-16 w-16 object-contain" />
        ) : null}
        <div>
          <div className="text-2xl font-bold">{schoolName}</div>
          <div className="text-lg">{title}</div>
          {subtitle && <div className="text-base">{subtitle}</div>}
        </div>
      </div>
    </>
  );
}
