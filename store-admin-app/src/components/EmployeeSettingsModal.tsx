import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface EmployeeSettingsModalProps {
  staffId: number;
  staffName: string;
  onClose: () => void;
}

interface EmployeeSettings {
  employeeType: 'hourly' | 'monthly';
  monthlyBaseSalary: number;
  scheduledStartTime: string;
  scheduledEndTime: string;
  includeEarlyArrivalAsOvertime: boolean;
  currentHourlyWage: number;
  overtimeRate: number;
}

export default function EmployeeSettingsModal({ staffId, staffName, onClose }: EmployeeSettingsModalProps) {
  const [settings, setSettings] = useState<EmployeeSettings>({
    employeeType: 'hourly',
    monthlyBaseSalary: 0,
    scheduledStartTime: '09:00',
    scheduledEndTime: '18:00',
    includeEarlyArrivalAsOvertime: false,
    currentHourlyWage: 0,
    overtimeRate: 1.25
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  console.log('EmployeeSettingsModal rendered for staff:', staffId, staffName);

  useEffect(() => {
    fetchEmployeeSettings();
  }, [staffId]);

  const fetchEmployeeSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/staff/${staffId}/employee-settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch employee settings:', error);
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/staff/${staffId}/employee-settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClose();
    } catch (error) {
      console.error('Failed to save employee settings:', error);
      setError('保存に失敗しました');
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          {staffName}さんの正社員設定
        </h3>

        <div className="space-y-4">
          {/* 雇用形態 */}
          <div>
            <label className="block text-sm font-medium mb-2">雇用形態</label>
            <select
              value={settings.employeeType}
              onChange={(e) => setSettings({
                ...settings,
                employeeType: e.target.value as 'hourly' | 'monthly'
              })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hourly">時給制</option>
              <option value="monthly">月給制</option>
            </select>
          </div>

          {settings.employeeType === 'monthly' && (
            <>
              {/* 月給 */}
              <div>
                <label className="block text-sm font-medium mb-2">月給</label>
                <input
                  type="number"
                  value={settings.monthlyBaseSalary}
                  onChange={(e) => setSettings({
                    ...settings,
                    monthlyBaseSalary: parseInt(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 250000"
                />
              </div>

              {/* 勤務時間設定 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">出勤時間</label>
                  <input
                    type="time"
                    value={settings.scheduledStartTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      scheduledStartTime: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">退勤時間</label>
                  <input
                    type="time"
                    value={settings.scheduledEndTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      scheduledEndTime: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 残業計算オプション */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.includeEarlyArrivalAsOvertime}
                    onChange={(e) => setSettings({
                      ...settings,
                      includeEarlyArrivalAsOvertime: e.target.checked
                    })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">出勤時間前を残業代にする</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  チェックなしの場合、退勤時間後のみを残業として計算します
                </p>
              </div>

              {/* 残業倍率 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  残業倍率（現在: {settings.overtimeRate}倍）
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={settings.overtimeRate}
                  onChange={(e) => setSettings({
                    ...settings,
                    overtimeRate: parseFloat(e.target.value) || 1.25
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 1.25"
                />
              </div>

              {/* 参考情報 */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>計算方法：</strong><br/>
                  時給換算: {formatCurrency(Math.round(settings.monthlyBaseSalary / 160))}/時間<br/>
                  （月160時間で計算）
                </p>
              </div>
            </>
          )}

          {settings.employeeType === 'hourly' && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                現在の時給: {formatCurrency(settings.currentHourlyWage)}
              </p>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}