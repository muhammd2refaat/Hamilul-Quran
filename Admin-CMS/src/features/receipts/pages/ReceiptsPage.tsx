/**
 * Receipts page — admin view of student-uploaded payment screenshots.
 * The file endpoint requires a bearer token, so images are fetched as an
 * authenticated blob and shown via an object URL rather than a plain <img src>.
 */

import { useEffect, useState } from 'react';
import { Receipt as ReceiptIcon, Eye, Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Card, Modal } from '@/shared/components';
import { useReceiptsStore, type Receipt } from '../store/receiptsStore';
import { format } from 'date-fns';

export function ReceiptsPage() {
  const { t } = useTranslation();
  const { receipts, isLoading, fetchReceipts, fetchReceiptBlob, markAllRead } = useReceiptsStore();
  const [viewing, setViewing] = useState<Receipt | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    markAllRead();
    fetchReceipts();
  }, [fetchReceipts, markAllRead]);

  // Revoke the previous object URL whenever it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const openViewer = async (receipt: Receipt) => {
    setViewing(receipt);
    setIsLoadingBlob(true);
    try {
      const blob = await fetchReceiptBlob(receipt.id);
      setBlobUrl(URL.createObjectURL(blob));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load receipt');
      setViewing(null);
    } finally {
      setIsLoadingBlob(false);
    }
  };

  const closeViewer = () => {
    setViewing(null);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  };

  // Saves the file to disk under its original filename. Not just "open the
  // blob URL" — the file endpoint needs a bearer token, and a bare <a href>
  // to it would 401; this fetches the authenticated blob first, then drives
  // a real download via a temporary anchor with the `download` attribute.
  const downloadReceipt = async (receipt: Receipt) => {
    setDownloadingId(receipt.id);
    try {
      const blob = await fetchReceiptBlob(receipt.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = receipt.originalFilename || 'receipt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('receipts.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('receipts.subtitle')}</p>
      </div>

      {isLoading ? (
        <Card className="p-10 text-center text-gray-400">{t('common.loading')}</Card>
      ) : receipts.length === 0 ? (
        <Card className="p-10 text-center text-gray-400">{t('receipts.noneFound')}</Card>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <ReceiptIcon className="h-5 w-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{r.studentName}</p>
                  <p className="text-xs text-gray-500 truncate">{r.originalFilename}</p>
                </div>
              </div>

              <div className="text-sm text-gray-700 sm:w-32">{r.amount || '—'}</div>

              <div className="text-xs text-gray-500 sm:w-36">
                {t('receipts.uploaded')}: {format(new Date(r.createdAt), 'MMM d, yyyy')}
              </div>

              <div className="text-xs text-gray-400 sm:w-36">
                {t('receipts.expires')}: {format(new Date(r.expiresAt), 'MMM d, yyyy')}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openViewer(r)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Eye className="h-4 w-4" /> {t('receipts.view')}
                </button>
                <button
                  onClick={() => downloadReceipt(r)}
                  disabled={downloadingId === r.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> {t('receipts.download')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!viewing} onClose={closeViewer} title={viewing?.studentName || ''} size="lg">
        <div className="flex flex-col items-center gap-3">
          {isLoadingBlob ? (
            <p className="text-sm text-gray-400 py-10">{t('common.loading')}</p>
          ) : blobUrl ? (
            <img
              src={blobUrl}
              alt={viewing?.originalFilename || 'receipt'}
              className="max-w-full max-h-[70vh] rounded-lg border border-gray-200"
            />
          ) : null}
          {viewing?.note && (
            <p className="text-sm text-gray-600 italic self-start">"{viewing.note}"</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => viewing && downloadReceipt(viewing)}
              disabled={!viewing || downloadingId === viewing.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {t('receipts.download')}
            </button>
            <button
              onClick={closeViewer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" /> {t('common.close')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ReceiptsPage;
