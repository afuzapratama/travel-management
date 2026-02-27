// ============================================
// PDF EXPORT - html2canvas + jsPDF
// Menghasilkan PDF yang 100% identik dengan tampilan
// ============================================

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportToPDF(
  element: HTMLElement,
  filename?: string
): Promise<void> {
  // Save original styles
  const originalWidth = element.style.width;
  const originalMargin = element.style.margin;
  const originalBoxShadow = element.style.boxShadow;

  // Set fixed width for consistent rendering
  element.style.width = '794px'; // 210mm ≈ 794px
  element.style.margin = '0';
  element.style.boxShadow = 'none';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    const pdfWidth = 210; // mm (A4 width)
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Generate filename
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const safeName = filename || `Invoice_TiketPesawat_${dateStr}`;
    pdf.save(`${safeName}.pdf`);
  } finally {
    // Restore original styles
    element.style.width = originalWidth;
    element.style.margin = originalMargin;
    element.style.boxShadow = originalBoxShadow;
  }
}
