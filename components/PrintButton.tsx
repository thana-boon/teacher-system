"use client";

export default function PrintButton() {
  return (
    <button className="btn btn-primary btn-sm print:hidden" onClick={() => window.print()}>
      🖨️ พิมพ์ / บันทึก PDF
    </button>
  );
}
