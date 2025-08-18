import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">チムビル</h1>
          <p className="text-gray-600">飲食/小規模店舗向けチームマネジメント</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>会社管理</CardTitle>
              <CardDescription>弊社専用の会社管理画面</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/company-admin">
                <Button className="w-full">会社管理画面へ</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>会社ログイン</CardTitle>
              <CardDescription>会社管理者の方はこちら</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/company/login">
                <Button className="w-full">管理者ログイン</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>店舗アクセス</CardTitle>
              <CardDescription>店長・スタッフの方はこちら</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/company/access">
                <Button className="w-full" size="lg">
                  店舗にアクセス
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>メールアドレス不要で素早く運用開始</p>
          <p className="mt-2">出退勤・給与計算・日報・面談記録を一元管理</p>
        </div>
      </div>
    </div>
  );
}