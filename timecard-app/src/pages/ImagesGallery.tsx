import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { API_BASE_URL } from '../config/api';

interface ImagesGalleryProps {
  store: { id: number; name: string };
  role: 'manager' | 'owner';
}

interface ImageData {
  id: string;
  reportId: number;
  staffName: string;
  date: string;
  createdAt: string;
  imageUrl: string;
  imagePath: string;
  comment: string;
}

export default function ImagesGallery({ store }: ImagesGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const queryClient = useQueryClient();

  const { data: images, isLoading } = useQuery({
    queryKey: ['daily-report-images', store.id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/daily-reports/images`,
        {
          params: { storeId: store.id },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data as ImageData[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imagePath: string) => {
      const response = await axios.delete(
        `${API_BASE_URL}/daily-reports/images/${encodeURIComponent(imagePath)}`,
        {
          params: { storeId: store.id },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-images', store.id] });
      setSelectedImage(null);
      alert('画像を削除しました');
    },
    onError: () => {
      alert('画像の削除に失敗しました');
    },
  });

  const handleDelete = (image: ImageData) => {
    if (confirm(`${image.staffName}の画像を削除してもよろしいですか？`)) {
      deleteMutation.mutate(image.imagePath);
    }
  };

  const handleDownload = async (image: ImageData) => {
    try {
      // image.imageUrlは既にSupabaseの完全なURLなので、そのまま使用
      const imageUrl = image.imageUrl;
      
      console.log('Downloading from URL:', imageUrl);
      
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Content-Typeを確認
      const contentType = response.headers.get('content-type');
      console.log('Response Content-Type:', contentType);
      console.log('Response size (approx):', response.headers.get('content-length'), 'bytes');
      
      // 画像形式かチェック
      if (contentType && !contentType.startsWith('image/')) {
        console.error('Invalid content type:', contentType);
        // レスポンスのテキストを確認（デバッグ用）
        const text = await response.text();
        console.error('Response text (first 500 chars):', text.substring(0, 500));
        throw new Error(`期待される画像形式ではありません: ${contentType}`);
      }
      
      // Blobとして取得（Content-Typeを明示的に指定）
      const blob = await response.blob();
      console.log('Blob type:', blob.type, 'Blob size:', blob.size);
      
      // Blobが空でないか確認
      if (blob.size === 0) {
        throw new Error('画像データが空です');
      }
      
      // 画像タイプに基づいた適切なBlobを作成
      const imageBlob = new Blob([blob], { type: blob.type || 'image/jpeg' });
      const url = window.URL.createObjectURL(imageBlob);
      
      const a = document.createElement('a');
      a.href = url;
      
      // ファイル拡張子を元のURLから取得
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      a.download = `${image.staffName}_${format(new Date(image.date), 'yyyyMMdd')}_${image.id}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('Download completed successfully');
    } catch (error) {
      console.error('Download error:', error);
      alert(`画像のダウンロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-sub">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">画像一覧</h2>
        
        {images && images.length > 0 ? (
          <div>
            {/* 画像の合計数 */}
            <p className="text-sm text-text-sub mb-4">
              合計 {images.length} 枚の画像
            </p>

            {/* 画像グリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="bg-background-sub rounded-lg overflow-hidden shadow-subtle hover:shadow-md transition-shadow"
                >
                  {/* 画像 */}
                  <div
                    className="aspect-square bg-gray-100 cursor-pointer relative group"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.imageUrl}
                      alt={`${image.staffName}の画像`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* ホバー時のオーバーレイ */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        クリックして拡大
                      </span>
                    </div>
                  </div>
                  
                  {/* 画像情報 */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{image.staffName}</span>
                      <span className="text-xs text-text-sub">
                        {format(new Date(image.createdAt), 'M/d')}
                      </span>
                    </div>
                    {image.comment && (
                      <p className="text-xs text-text-sub line-clamp-2">
                        {image.comment}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                        className="text-xs text-accent-primary hover:underline"
                      >
                        ダウンロード
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(image);
                        }}
                        className="text-xs text-accent-error hover:underline"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-sub">画像がアップロードされていません</p>
          </div>
        )}
      </div>

      {/* 画像拡大モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-background-main rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedImage.staffName}</h3>
                  <p className="text-sm text-text-sub">
                    {formatDate(selectedImage.date)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-2xl text-text-sub hover:text-text-main"
                >
                  ✕
                </button>
              </div>
              
              <img
                src={selectedImage.imageUrl}
                alt={`${selectedImage.staffName}の画像`}
                className="w-full rounded-lg mb-4"
              />
              
              {selectedImage.comment && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">コメント</h4>
                  <p className="text-sm text-text-sub">{selectedImage.comment}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="flex-1 bg-accent-primary text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                  ダウンロード
                </button>
                <button
                  onClick={() => handleDelete(selectedImage)}
                  className="flex-1 bg-accent-error text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                  削除
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="flex-1 bg-background-sub text-text-main py-2 px-4 rounded-lg hover:bg-background-sub/80 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}