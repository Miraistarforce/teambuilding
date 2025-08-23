import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QRSettingsProps {
  store: { id: number; name: string };
  onBack: () => void;
}

export default function QRSettings({ store, onBack }: QRSettingsProps) {
  const [qrUrl, setQrUrl] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: qrSettings, refetch } = useQuery({
    queryKey: ['qr-settings', store.id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/qr-settings/${store.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
        },
      });
      return response.data;
    },
  });

  useEffect(() => {
    if (qrSettings?.qrToken) {
      const baseUrl = window.location.origin;
      setQrUrl(`${baseUrl}/daily-report/${qrSettings.qrToken}`);
    }
  }, [qrSettings]);

  const toggleEnabledMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await axios.put(
        `${API_BASE_URL}/qr-settings/${store.id}`,
        { qrEnabled: enabled },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE_URL}/qr-settings/${store.id}/regenerate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      refetch();
      alert('QRコードを再生成しました');
    },
  });

  const downloadPDF = async () => {
    if (!qrRef.current) return;

    try {
      const canvas = await html2canvas(qrRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Center the QR code
      const imgWidth = 150;
      const imgHeight = 150;
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2 - 20;

      // Add title
      pdf.setFontSize(20);
      pdf.text(`${store.name} - 日報提出QRコード`, pdfWidth / 2, 30, { align: 'center' });
      
      // Add QR code image
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      
      // Add URL
      pdf.setFontSize(10);
      pdf.text(qrUrl, pdfWidth / 2, y + imgHeight + 10, { align: 'center' });
      
      // Add instructions
      pdf.setFontSize(12);
      pdf.text('このQRコードをスキャンして日報を提出してください', pdfWidth / 2, y + imgHeight + 20, { align: 'center' });
      
      // Save PDF
      pdf.save(`${store.name}_日報QRコード.pdf`);
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDFの生成に失敗しました');
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
    alert('URLをコピーしました');
  };

  if (!qrSettings) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-main rounded-lg shadow-subtle p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">日報QR設定</h2>
          <button
            onClick={onBack}
            className="text-text-sub hover:text-text-main"
          >
            ← 戻る
          </button>
        </div>

        {/* QRコードの有効/無効設定 */}
        <div className="mb-8 p-4 bg-background-sub rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">QRコード状態</h3>
              <p className="text-sm text-text-sub mt-1">
                {qrSettings.qrEnabled ? 'QRコードは有効です' : 'QRコードは無効です'}
              </p>
            </div>
            <button
              onClick={() => toggleEnabledMutation.mutate(!qrSettings.qrEnabled)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                qrSettings.qrEnabled
                  ? 'bg-accent-danger text-white hover:bg-red-600'
                  : 'bg-accent-success text-white hover:bg-green-600'
              }`}
            >
              {qrSettings.qrEnabled ? '無効にする' : '有効にする'}
            </button>
          </div>
        </div>

        {/* QRコード表示 */}
        {qrSettings.qrEnabled && (
          <>
            <div className="mb-8">
              <h3 className="font-semibold mb-4">QRコード</h3>
              <div className="flex flex-col items-center">
                <div 
                  ref={qrRef}
                  className="bg-white p-8 rounded-lg shadow-lg"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <QRCode
                    value={qrUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                  <p className="text-center mt-4 text-sm font-semibold">{store.name}</p>
                  <p className="text-center text-xs text-gray-500">日報提出用</p>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={downloadPDF}
                    className="bg-accent-primary text-white px-6 py-2 rounded-lg hover:opacity-90 font-medium"
                  >
                    PDFでダウンロード
                  </button>
                  <button
                    onClick={copyUrl}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:opacity-90 font-medium"
                  >
                    URLをコピー
                  </button>
                </div>
              </div>
            </div>

            {/* URL表示 */}
            <div className="mb-8 p-4 bg-background-sub rounded-lg">
              <h3 className="font-semibold mb-2">日報提出URL</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={qrUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm"
                />
                <button
                  onClick={copyUrl}
                  className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 text-sm"
                >
                  コピー
                </button>
              </div>
            </div>

            {/* セキュリティ設定 */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">セキュリティ</h3>
              <p className="text-sm text-yellow-700 mb-3">
                このQRコードを持っている人は誰でも日報を送信できます。
                セキュリティ上の問題がある場合は、QRコードを再生成してください。
              </p>
              <button
                onClick={() => {
                  if (confirm('QRコードを再生成しますか？既存のQRコードは使用できなくなります。')) {
                    regenerateTokenMutation.mutate();
                  }
                }}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm font-medium"
              >
                QRコードを再生成
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}