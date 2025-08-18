'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Send } from 'lucide-react';

interface Staff {
  id: number;
  displayName: string;
}

const moodEmojis = ['😔', '😕', '😐', '😊', '😄'];

export default function StaffReportPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [moodScore, setMoodScore] = useState('');
  const [didWell, setDidWell] = useState('');
  const [customerVoice, setCustomerVoice] = useState('');
  const [improvement, setImprovement] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [other, setOther] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (error) {
      console.error('Failed to fetch staff list:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStaffId || !moodScore) {
      toast.error('スタッフ名と今日の気分は必須です');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: parseInt(selectedStaffId),
          moodScore: parseInt(moodScore),
          didWell,
          customerVoice,
          improvement,
          competitor,
          other,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('日報を送信しました');
        // Reset form
        setMoodScore('');
        setDidWell('');
        setCustomerVoice('');
        setImprovement('');
        setCompetitor('');
        setOther('');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('日報送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader 
        title="日報作成" 
        description="今日の業務について報告してください"
      />
      
      <div className="px-8 py-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              スタッフ名 <span className="text-red-500">*</span>
            </Label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">選択してください</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id.toString()}>{s.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              今日の気分 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setMoodScore(score.toString())}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                    moodScore === score.toString()
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">{moodEmojis[score - 1]}</span>
                  <span className="text-xs text-gray-600">{score}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="didWell" className="text-sm font-medium text-gray-700 mb-2 block">
              頑張ったこと
            </Label>
            <Textarea
              id="didWell"
              value={didWell}
              onChange={(e) => setDidWell(e.target.value)}
              placeholder="今日特に頑張ったことを記入してください"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div>
            <Label htmlFor="customerVoice" className="text-sm font-medium text-gray-700 mb-2 block">
              お客様の声
            </Label>
            <Textarea
              id="customerVoice"
              value={customerVoice}
              onChange={(e) => setCustomerVoice(e.target.value)}
              placeholder="お客様からいただいた感想やフィードバック"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div>
            <Label htmlFor="improvement" className="text-sm font-medium text-gray-700 mb-2 block">
              改善提案
            </Label>
            <Textarea
              id="improvement"
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              placeholder="業務改善のアイデアがあれば記入してください"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div>
            <Label htmlFor="competitor" className="text-sm font-medium text-gray-700 mb-2 block">
              ライバル情報
            </Label>
            <Textarea
              id="competitor"
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder="競合他社の動向など"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div>
            <Label htmlFor="other" className="text-sm font-medium text-gray-700 mb-2 block">
              その他
            </Label>
            <Textarea
              id="other"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="その他の連絡事項"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              size="lg"
              disabled={loading}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {loading ? '送信中...' : '日報を送信'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}