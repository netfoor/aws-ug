'use client';

import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';

// Configure PDF.js worker using the local file from public directory
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
}

interface PDFViewerProps {
  url: string;
  pageNumber: number;
  onLoadSuccess: (numPages: number) => void;
}

export default function PDFViewer({ url, pageNumber, onLoadSuccess }: PDFViewerProps) {
  const [containerWidth, setContainerWidth] = React.useState(800);

  React.useEffect(() => {
    // Update width based on window size
    const updateWidth = () => {
      setContainerWidth(Math.min(window.innerWidth - 100, 800));
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
      loading={
        <div className="flex items-center gap-2 text-text-primary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando PDF...</span>
        </div>
      }
      error={
        <div className="text-red-500 p-4 bg-surface rounded-lg">
          Error al cargar el PDF. Por favor, intenta descargarlo.
        </div>
      }
      className="flex justify-center"
    >
      <Page 
        pageNumber={pageNumber} 
        renderTextLayer={true}
        renderAnnotationLayer={true}
        className="shadow-lg"
        width={containerWidth}
      />
    </Document>
  );
}
