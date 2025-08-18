'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Trash2, MessageCircle, Sparkles, Gift } from 'lucide-react';
import { formatJST } from '@/lib/utils/date';
import { commentTemplates, faceStamps } from '@/lib/utils';

export default function OwnerReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('この日報を削除しますか？')) return;

    try {
      const res = await fetch(`/api/reports?id=${reportId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('日報を削除しました');
        fetchReports();
      } else {
        toast.error('削除に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const handleAddComment = async (reportId: number, type: 'stamp' | 'template', value: string) => {
    try {
      const res = await fetch('/api/reports/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          stamp: type === 'stamp' ? value : undefined,
          text: type === 'template' ? value : undefined,
          templateKey: type === 'template' ? value : undefined,
        }),
      });

      if (res.ok) {
        toast.success('コメントを追加しました');
        fetchReports();
        setSelectedReport(null);
      } else {
        toast.error('コメント追加に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const handleAddReward = async (reportId: number) => {
    try {
      const res = await fetch('/api/reports/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          message: 'オーナーから賞与が贈られました！',
        }),
      });

      if (res.ok) {
        toast.success('賞与を贈りました');
        
        // Add sparkle animation
        const reportElement = document.getElementById(`report-${reportId}`);
        if (reportElement) {
          reportElement.classList.add('animate-pulse');
          setTimeout(() => {
            reportElement.classList.remove('animate-pulse');
          }, 2000);
        }
        
        fetchReports();
      } else {
        toast.error('賞与追加に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const getMoodEmoji = (score: number) => {
    const emojis = ['😔', '😕', '😐', '😊', '😄'];
    return emojis[score - 1] || '😐';
  };

  return (
    <>
      <PageHeader 
        title="日報一覧" 
        description="スタッフの日報を確認・管理"
        action={
          <Button variant="secondary" size="sm" className="bg-yellow-50 hover:bg-yellow-100">
            <Gift className="mr-2 h-4 w-4" />
            賞与プレゼント
          </Button>
        }
      />
      
      <div className="px-8 py-6">
        <div className="max-w-4xl">
          <div className="space-y-4">
            {reports.map((report) => (
              <Card 
                key={report.id} 
                id={`report-${report.id}`}
                className="p-6 hover:shadow-md transition-all relative overflow-hidden"
              >
                {report.rewards && report.rewards.length > 0 && (
                  <div className="absolute top-0 right-0 p-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-gray-900">{report.staffName}</h3>
                      <span className="text-2xl">{getMoodEmoji(report.moodScore)}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatJST(report.createdAt, 'yyyy年MM月dd日 HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddReward(report.id)}
                      className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {report.didWell && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">頑張ったこと</p>
                    <p className="text-sm text-gray-700">{report.didWell}</p>
                  </div>
                )}

                {report.customerVoice && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">お客様の声</p>
                    <p className="text-sm text-gray-700">{report.customerVoice}</p>
                  </div>
                )}

                {report.improvement && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">改善提案</p>
                    <p className="text-sm text-gray-700">{report.improvement}</p>
                  </div>
                )}

                {report.rewards && report.rewards.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">
                      {report.rewards[0].message}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  {selectedReport === report.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        {faceStamps.map((stamp) => (
                          <Button
                            key={stamp}
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddComment(report.id, 'stamp', stamp)}
                            className="hover:scale-110 transition-transform"
                          >
                            {stamp}
                          </Button>
                        ))}
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        {commentTemplates.map((template) => (
                          <Button
                            key={template}
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAddComment(report.id, 'template', template)}
                            className="text-xs"
                          >
                            {template}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedReport(null)}
                        className="w-full"
                      >
                        キャンセル
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedReport(report.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      コメントする
                    </Button>
                  )}
                </div>

                {report.comments && report.comments.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex gap-2">
                      {report.comments.map((comment: any, idx: number) => (
                        <span key={idx} className="text-lg">
                          {comment.stamp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {reports.length === 0 && (
            <Card className="p-12">
              <p className="text-center text-gray-500">日報がまだありません</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}