import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  comment: string;
}

export default function ImagesGallery({ store }: ImagesGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

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

  const handleDownload = async (image: ImageData) => {
    try {
      const response = await fetch(`${API_BASE_URL}${image.imageUrl}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.staffName}_${format(new Date(image.date), 'yyyyMMdd')}_${image.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('画像のダウンロードに失敗しました');
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
                      src={`${API_BASE_URL}${image.imageUrl}`}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image);
                      }}
                      className="mt-2 text-xs text-accent-primary hover:underline"
                    >
                      ダウンロード
                    </button>
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
                src={`${API_BASE_URL}${selectedImage.imageUrl}`}
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