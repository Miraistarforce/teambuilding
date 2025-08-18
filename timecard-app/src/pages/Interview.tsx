import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { staffApi } from '../lib/api';
import axios from 'axios';

interface InterviewProps {
  store: { id: number; name: string };
  role: 'manager' | 'owner';
}

export default function Interview({ store, role }: InterviewProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [summary, setSummary] = useState<string[]>([]);
  const [advice, setAdvice] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: staffList } = useQuery({
    queryKey: ['staff', store.id],
    queryFn: () => staffApi.getByStore(store.id),
  });

  // 面談記録を処理
  const processMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('staffId', String(selectedStaffId));
      formData.append('storeId', String(store.id));
      formData.append('text', textInput);
      if (audioFile) {
        formData.append('audio', audioFile);
      }

      const response = await axios.post('http://localhost:3001/api/interviews/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      setSummary(data.summary || []);
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('処理エラー:', error);
      setIsProcessing(false);
      alert('処理中にエラーが発生しました');
    },
  });

  // 次回のアドバイスを取得
  const adviceMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const response = await axios.post(
        'http://localhost:3001/api/interviews/advice',
        {
          staffId: selectedStaffId,
          storeId: store.id,
          currentSummary: summary,
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );

      return response.data;
    },
    onSuccess: (data) => {
      setAdvice(data.advice || []);
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('アドバイス取得エラー:', error);
      setIsProcessing(false);
      alert('アドバイス取得中にエラーが発生しました');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 音声ファイルのみ許可
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
      } else {
        alert('音声ファイルを選択してください');
      }
    }
  };

  const handleProcess = () => {
    if (!selectedStaffId) {
      alert('スタッフを選択してください');
      return;
    }
    if (!textInput && !audioFile) {
      alert('テキストを入力するか、音声ファイルをアップロードしてください');
      return;
    }
    processMutation.mutate();
  };

  const handleGetAdvice = () => {
    if (!selectedStaffId) {
      alert('スタッフを選択してください');
      return;
    }
    if (summary.length === 0) {
      alert('先に面談内容を記録してください');
      return;
    }
    adviceMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* スタッフ選択 */}
      <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">面談記録</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">スタッフ選択</label>
          <select
            value={selectedStaffId || ''}
            onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="">スタッフを選択してください</option>
            {staffList?.map((staff: any) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>

        {/* 音声ファイルアップロード */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">音声ファイルアップロード（オプション）</label>
          <div className="border-2 border-dashed border-border-default rounded-lg p-4">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="w-full"
              id="audio-upload"
            />
            {audioFile && (
              <p className="mt-2 text-sm text-text-sub">
                選択済み: {audioFile.name}
              </p>
            )}
          </div>
        </div>

        {/* テキスト入力 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">面談内容テキスト</label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="面談の内容を入力してください..."
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
            rows={8}
          />
        </div>

        {/* 処理ボタン */}
        <button
          onClick={handleProcess}
          disabled={isProcessing || processMutation.isPending}
          className="w-full bg-accent-primary text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
        >
          {isProcessing || processMutation.isPending ? '処理中...' : '面談を記録する'}
        </button>
      </div>

      {/* 要約結果 */}
      {summary.length > 0 && (
        <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">面談内容の要約</h3>
          <ul className="space-y-2">
            {summary.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="text-accent-primary mr-2">•</span>
                <span className="text-text-main">{item}</span>
              </li>
            ))}
          </ul>
          
          {/* 次回アドバイスボタン */}
          <button
            onClick={handleGetAdvice}
            disabled={isProcessing || adviceMutation.isPending}
            className="mt-4 w-full bg-accent-success text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
          >
            {isProcessing || adviceMutation.isPending ? '生成中...' : '次回の面談のアドバイス'}
          </button>
        </div>
      )}

      {/* アドバイス結果 */}
      {advice.length > 0 && (
        <div className="bg-background-main rounded-lg shadow-subtle p-6">
          <h3 className="text-lg font-semibold mb-4">次回の面談で確認すべきポイント</h3>
          <ul className="space-y-2">
            {advice.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="text-accent-warning mr-2">✓</span>
                <span className="text-text-main">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}