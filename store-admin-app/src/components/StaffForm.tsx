import { useState } from 'react';

interface StaffFormProps {
  storeId: number;
  onSubmit: (data: { 
    name: string; 
    hourlyWage: number;
    holidayAllowance?: number;
    overtimeRate?: number;
    otherAllowance?: number;
    transportationAllowance?: number;
    hasTransportation?: boolean;
    hireDate?: string;
  }, showEmployeeSettings: boolean) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function StaffForm({ onSubmit, onClose, isLoading }: StaffFormProps) {
  const [name, setName] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [holidayAllowance, setHolidayAllowance] = useState('0');
  const [overtimeRate, setOvertimeRate] = useState('1.25');
  const [otherAllowance, setOtherAllowance] = useState('0');
  const [hasTransportation, setHasTransportation] = useState(false);
  const [transportationAllowance, setTransportationAllowance] = useState('0');
  const [hireDate, setHireDate] = useState('');
  const [showEmployeeSettings, setShowEmployeeSettings] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const wage = parseInt(hourlyWage);
    if (isNaN(wage) || wage < 1) {
      setError('時給は1円以上の数値を入力してください');
      return;
    }

    const holiday = parseInt(holidayAllowance) || 0;
    const overtime = parseFloat(overtimeRate) || 1.25;
    const other = parseInt(otherAllowance) || 0;
    const transportation = parseInt(transportationAllowance) || 0;

    onSubmit({ 
      name, 
      hourlyWage: wage,
      holidayAllowance: holiday,
      overtimeRate: overtime,
      otherAllowance: other,
      transportationAllowance: transportation,
      hasTransportation,
      hireDate: hireDate || undefined
    }, showEmployeeSettings);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-background-main rounded-lg p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-6">新規スタッフ登録</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-name" className="block text-sm font-medium mb-2">
              スタッフ名
            </label>
            <input
              id="staff-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="hourlyWage" className="block text-sm font-medium mb-2">
              時給（円）
            </label>
            <input
              id="hourlyWage"
              type="number"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
              min="1"
              placeholder="1000"
            />
          </div>

          <div>
            <label htmlFor="holidayAllowance" className="block text-sm font-medium mb-2">
              祝日手当
            </label>
            <input
              id="holidayAllowance"
              type="number"
              value={holidayAllowance}
              onChange={(e) => setHolidayAllowance(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              min="0"
              placeholder="0"
            />
            <p className="text-xs text-text-sub mt-1">祝日出勤時に時給に加算される金額</p>
          </div>

          <div>
            <label htmlFor="overtimeRate" className="block text-sm font-medium mb-2">
              残業代倍率
            </label>
            <input
              id="overtimeRate"
              type="number"
              step="0.01"
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              min="1"
              placeholder="1.25"
            />
            <p className="text-xs text-text-sub mt-1">8時間を超えた分の時給倍率</p>
          </div>

          <div>
            <label htmlFor="otherAllowance" className="block text-sm font-medium mb-2">
              その他手当（月額）
            </label>
            <input
              id="otherAllowance"
              type="number"
              value={otherAllowance}
              onChange={(e) => setOtherAllowance(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              min="0"
              placeholder="0"
            />
            <p className="text-xs text-text-sub mt-1">月の総支給額に加算される固定手当</p>
          </div>

          <div>
            <label htmlFor="hireDate" className="block text-sm font-medium mb-2">
              入社日
            </label>
            <input
              id="hireDate"
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
                <label htmlFor="transportationAllowance" className="block text-sm font-medium mb-2">
                  交通費（1日あたり）
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="transportationAllowance"
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

          <div className="border-t pt-4">
            <div className="flex items-center">
              <input
                id="showEmployeeSettings"
                type="checkbox"
                checked={showEmployeeSettings}
                onChange={(e) => setShowEmployeeSettings(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="showEmployeeSettings" className="text-sm font-medium">
                登録後に正社員設定を行う
              </label>
            </div>
            <p className="text-xs text-text-sub mt-1">月給制や残業代の詳細設定を行います</p>
          </div>

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
              {isLoading ? '登録中...' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}