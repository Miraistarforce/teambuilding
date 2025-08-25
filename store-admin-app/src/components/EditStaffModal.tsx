import { useState } from 'react';

interface EditStaffModalProps {
  staff: {
    id: number;
    name: string;
    hourlyWage: number;
    holidayAllowance?: number;
    overtimeRate?: number;
    otherAllowance?: number;
    transportationAllowance?: number;
    hasTransportation?: boolean;
    hireDate?: string;
    isActive: boolean;
  };
  onSubmit: (data: any) => void;
  onClose: () => void;
  isLoading?: boolean;
  onOpenEmployeeSettings?: () => void;
}

export default function EditStaffModal({ staff, onSubmit, onClose, isLoading, onOpenEmployeeSettings }: EditStaffModalProps) {
  const [name, setName] = useState(staff.name);
  const [hourlyWage, setHourlyWage] = useState(staff.hourlyWage.toString());
  const [holidayAllowance, setHolidayAllowance] = useState((staff.holidayAllowance || 0).toString());
  const [overtimeRate, setOvertimeRate] = useState((staff.overtimeRate || 1.25).toString());
  const [otherAllowance, setOtherAllowance] = useState((staff.otherAllowance || 0).toString());
  const [hasTransportation, setHasTransportation] = useState(staff.hasTransportation || false);
  const [transportationAllowance, setTransportationAllowance] = useState((staff.transportationAllowance || 0).toString());
  const [hireDate, setHireDate] = useState(
    staff.hireDate ? new Date(staff.hireDate).toISOString().split('T')[0] : ''
  );
  const [isActive, setIsActive] = useState(staff.isActive);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const wage = parseInt(hourlyWage);
    const holiday = parseInt(holidayAllowance);
    const overtime = parseFloat(overtimeRate);
    const other = parseInt(otherAllowance);
    const transportation = parseInt(transportationAllowance);

    if (isNaN(wage) || wage < 1) {
      setError('時給は1円以上の数値を入力してください');
      return;
    }

    if (isNaN(holiday) || holiday < 0) {
      setError('祝日手当は0円以上の数値を入力してください');
      return;
    }

    if (isNaN(overtime) || overtime < 1) {
      setError('残業代倍率は1以上の数値を入力してください');
      return;
    }

    if (isNaN(other) || other < 0) {
      setError('その他手当は0円以上の数値を入力してください');
      return;
    }

    if (isNaN(transportation) || transportation < 0) {
      setError('交通費は0円以上の数値を入力してください');
      return;
    }

    const updateData: any = { 
      isActive,
      holidayAllowance: holiday,
      overtimeRate: overtime,
      otherAllowance: other,
      hasTransportation,
      transportationAllowance: transportation
    };
    
    if (name !== staff.name) updateData.name = name;
    if (wage !== staff.hourlyWage) updateData.hourlyWage = wage;
    if (hireDate) updateData.hireDate = new Date(hireDate).toISOString();

    onSubmit(updateData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-background-main rounded-lg p-6 w-full max-w-md m-4">
        <h3 className="text-xl font-semibold mb-6">スタッフ情報編集</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-staff-name" className="block text-sm font-medium mb-2">
              スタッフ名
            </label>
            <input
              id="edit-staff-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-hourlyWage" className="block text-sm font-medium mb-2">
              時給（円）
            </label>
            <input
              id="edit-hourlyWage"
              type="number"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
              min="1"
            />
          </div>

          <div>
            <label htmlFor="edit-holidayAllowance" className="block text-sm font-medium mb-2">
              祝日手当
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-text-sub">時給 +</span>
              <input
                id="edit-holidayAllowance"
                type="number"
                value={holidayAllowance}
                onChange={(e) => setHolidayAllowance(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                min="0"
              />
              <span className="text-sm text-text-sub">円</span>
            </div>
          </div>

          <div>
            <label htmlFor="edit-overtimeRate" className="block text-sm font-medium mb-2">
              残業代倍率
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-text-sub">時給 ×</span>
              <input
                id="edit-overtimeRate"
                type="number"
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                min="1"
                step="0.01"
              />
              <span className="text-sm text-text-sub">倍</span>
            </div>
          </div>

          <div>
            <label htmlFor="edit-otherAllowance" className="block text-sm font-medium mb-2">
              その他手当（月額）
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="edit-otherAllowance"
                type="number"
                value={otherAllowance}
                onChange={(e) => setOtherAllowance(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                min="0"
              />
              <span className="text-sm text-text-sub">円/月</span>
            </div>
            <p className="text-xs text-text-sub mt-1">1ヶ月の総支給額に追加される金額</p>
          </div>

          <div>
            <label htmlFor="edit-hireDate" className="block text-sm font-medium mb-2">
              入社日
            </label>
            <input
              id="edit-hireDate"
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center mb-3">
              <input
                id="hasTransportation"
                type="checkbox"
                checked={hasTransportation}
                onChange={(e) => setHasTransportation(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="hasTransportation" className="text-sm font-medium">
                交通費を支給する
              </label>
            </div>
            
            {hasTransportation && (
              <div>
                <label htmlFor="edit-transportationAllowance" className="block text-sm font-medium mb-2">
                  交通費（1日あたり）
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="edit-transportationAllowance"
                    type="number"
                    value={transportationAllowance}
                    onChange={(e) => setTransportationAllowance(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    min="0"
                  />
                  <span className="text-sm text-text-sub">円/日</span>
                </div>
                <p className="text-xs text-text-sub mt-1">出勤日数分が支給されます</p>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="staff-isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="staff-isActive" className="text-sm">
              アクティブ状態
            </label>
          </div>

          {/* 正社員設定ボタン */}
          {onOpenEmployeeSettings && (
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={onOpenEmployeeSettings}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                正社員設定
              </button>
            </div>
          )}

          {error && (
            <div className="text-accent-error text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-sub hover:text-text-main transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-accent-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? '更新中...' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}