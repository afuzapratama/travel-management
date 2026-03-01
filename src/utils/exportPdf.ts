// ============================================
// PDF EXPORT - html2canvas + jsPDF
// Menghasilkan PDF bersih & tajam identik preview
// ============================================

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportToPDF(
  element: HTMLElement,
  filename?: string
): Promise<void> {
  // Save original styles
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  const originalMargin = element.style.margin;
  const originalBoxShadow = element.style.boxShadow;
  const originalOverflow = element.style.overflow;

  // Add pdf-export class to hide all edit affordances
  element.classList.add('pdf-export');

  // Set fixed width for consistent A4 rendering
  const A4_PX = 794; // 210mm ≈ 794px at 96dpi
  element.style.width = `${A4_PX}px`;
  element.style.maxWidth = `${A4_PX}px`;
  element.style.margin = '0';
  element.style.boxShadow = 'none';
  element.style.overflow = 'visible';

  // Wait for fonts + reflow so styles apply cleanly
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise(r => setTimeout(r, 100));

  try {
    const canvas = await html2canvas(element, {
      scale: 3,              // High-res for sharp text
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: A4_PX,
      windowWidth: A4_PX,
      imageTimeout: 5000,
      onclone: (doc) => {
        // Ensure cloned element has exact same width
        const cloned = doc.getElementById('invoicePage');
        if (cloned) {
          cloned.style.width = `${A4_PX}px`;
          cloned.style.maxWidth = `${A4_PX}px`;
          cloned.style.boxShadow = 'none';
          cloned.style.overflow = 'visible';
        }
      },
    });

    const pdfWidth = 210; // mm (A4 width)
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

    // Use PNG for lossless text rendering (no JPEG blur)
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // Generate filename
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const safeName = filename || `Invoice_TiketPesawat_${dateStr}`;
    pdf.save(`${safeName}.pdf`);
  } finally {
    // Restore original styles + remove cleanup class
    element.classList.remove('pdf-export');
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.margin = originalMargin;
    element.style.boxShadow = originalBoxShadow;
    element.style.overflow = originalOverflow;
  }
}
