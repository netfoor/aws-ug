'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, FileText, X, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUrl, downloadData } from 'aws-amplify/storage';
import dynamic from 'next/dynamic';

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewer = dynamic<{
  url: string;
  pageNumber: number;
  onLoadSuccess: (numPages: number) => void;
}>(() => import('./PDFViewer'), { ssr: false });

interface SpeakerMediaPreviewProps {
  photoKey?: string;
  cvKey?: string;
  speakerName?: string;
  size?: 'compact' | 'normal';
}

/**
 * 🖼️ SpeakerMediaPreview
 * 
 * Minimalist buttons to preview speaker's photo and CV
 * Opens modals with the same functionality as SpeakerApplicationDetail
 */
export function SpeakerMediaPreview({ photoKey, cvKey, speakerName = 'Speaker', size = 'compact' }: SpeakerMediaPreviewProps) {
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [downloadingCV, setDownloadingCV] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Handle view photo
  const handleViewPhoto = async () => {
    if (!photoKey) return;
    
    setPhotoLoading(true);
    try {
      const result = await getUrl({
        path: photoKey,
        options: { expiresIn: 3600 },
      });
      setPhotoPreviewUrl(result.url.toString());
      setShowPhotoModal(true);
    } catch (err) {
      console.error('Error loading photo:', err);
    } finally {
      setPhotoLoading(false);
    }
  };

  // Handle download photo
  const handleDownloadPhoto = async () => {
    if (!photoKey) return;
    
    setDownloadingPhoto(true);
    try {
      const { body } = await downloadData({
        path: photoKey,
      }).result;
      
      const blob = await body.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${speakerName.replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading photo:', err);
    } finally {
      setDownloadingPhoto(false);
    }
  };

  // Handle view PDF
  const handleViewPdf = async () => {
    if (!cvKey) return;
    
    setPdfLoading(true);
    try {
      const result = await getUrl({
        path: cvKey,
        options: { expiresIn: 3600 },
      });
      setPdfPreviewUrl(result.url.toString());
      setShowPdfModal(true);
      setPageNumber(1);
    } catch (err) {
      console.error('Error loading PDF:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  // Handle download CV
  const handleDownloadCV = async () => {
    if (!cvKey) return;
    
    setDownloadingCV(true);
    try {
      const { body } = await downloadData({
        path: cvKey,
      }).result;
      
      const blob = await body.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV-${speakerName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CV:', err);
    } finally {
      setDownloadingCV(false);
    }
  };

  // Navigate pages
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

  const isCompact = size === 'compact';

  if (!photoKey && !cvKey) return null;

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Photo Preview Button */}
        {photoKey && (
          <button
            onClick={handleViewPhoto}
            disabled={photoLoading}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
            title="Ver foto"
          >
            {photoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            {!isCompact && <span className="text-xs">Foto</span>}
          </button>
        )}

        {/* CV Preview Button */}
        {cvKey && (
          <button
            onClick={handleViewPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
            title="Ver CV"
          >
            {pdfLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {!isCompact && <span className="text-xs">CV</span>}
          </button>
        )}
      </div>

      {/* Photo Modal */}
      {showPhotoModal && photoPreviewUrl && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 bg-surface rounded-t-lg border-b border-border">
              <h3 className="text-text-primary font-semibold">Foto de {speakerName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPhoto}
                  disabled={downloadingPhoto}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {downloadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Descargando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Descargar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPhotoModal(false);
                    setPhotoPreviewUrl(null);
                  }}
                  className="p-2 hover:bg-background rounded-full transition-all"
                >
                  <X className="w-5 h-5 text-text-primary" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreviewUrl}
                alt={`Foto de ${speakerName}`}
                className="max-w-full max-h-[calc(90vh-80px)] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      {showPdfModal && pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 bg-surface rounded-t-lg border-b border-border">
              <h3 className="text-text-primary font-semibold">CV de {speakerName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCV}
                  disabled={downloadingCV}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {downloadingCV ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Descargando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Descargar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPdfModal(false);
                    setPdfPreviewUrl(null);
                    setNumPages(null);
                    setPageNumber(1);
                  }}
                  className="p-2 hover:bg-background rounded-full transition-all"
                >
                  <X className="w-5 h-5 text-text-primary" />
                </button>
              </div>
            </div>
            
            {numPages && numPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-3 bg-surface/95 border-b border-border">
                <button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="p-2 hover:bg-background rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-text-primary" />
                </button>
                <span className="text-text-primary font-medium">
                  Página {pageNumber} de {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="p-2 hover:bg-background rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-text-primary" />
                </button>
              </div>
            )}
            
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
              <PDFViewer
                url={pdfPreviewUrl}
                pageNumber={pageNumber}
                onLoadSuccess={(numPages: number) => setNumPages(numPages)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
