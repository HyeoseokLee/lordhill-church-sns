import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: users } = await api.get('/admin/users');
        const total = users.length;
        const pending = users.filter((u) => u.status === 'PENDING').length;
        const approved = users.filter((u) => u.status === 'APPROVED').length;
        setStats({ total, pending, approved });
      } catch (err) {
        console.error(err);
      }
    }
    fetchStats();
  }, []);

  if (!stats) {
    return <div className="p-6 text-gray-400">불러오는 중...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">대시보드</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-500">총 회원</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-500">승인 대기</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-500">활성 회원</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{stats.approved}</p>
        </div>
      </div>
    </div>
  );
}
