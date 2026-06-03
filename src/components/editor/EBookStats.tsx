import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BrochureMeta } from '../../lib/storage';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, Eye, FileText, CheckCircle2, Calendar } from 'lucide-react';

interface EBookStatsProps {
  brochures: BrochureMeta[];
}

interface EBookViewsData {
  id: string;
  title: string;
  views: number;
}

export function EBookStats({ brochures }: EBookStatsProps) {
  const [loading, setLoading] = useState(true);
  const [ebookData, setEbookData] = useState<EBookViewsData[]>([]);
  const [totalViews, setTotalViews] = useState(0);

  useEffect(() => {
    async function fetchEbookStats() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('ebooks')
          .select('id, title, data');

        if (!error && data) {
          const stats = data.map((item: any) => ({
            id: item.id,
            title: item.title || '未命名電子書',
            views: item.data?.views || 0
          }));
          // 按瀏覽量排行
          stats.sort((a, b) => b.views - a.views);
          setEbookData(stats);
          setTotalViews(stats.reduce((acc, curr) => acc + curr.views, 0));
        }
      } catch (err) {
        console.error('Failed to load ebook stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEbookStats();
  }, []);

  // 1. 手冊進度狀態分佈數據
  const statusCounts = brochures.reduce((acc: { [key: string]: number }, curr) => {
    const status = curr.status || '待製作';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#6b7280'];
  
  const statusChartData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));

  // 2. 熱門電子書 TOP 5
  const topEbooks = ebookData.slice(0, 5);

  // 3. 發佈月份趨勢數據 (過去6個月)
  const getMonthlyTrend = () => {
    const trendMap: { [key: string]: number } = {};
    const now = new Date();
    
    // 初始化過去六個月
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric' });
      trendMap[label] = 0;
    }

    brochures.forEach(b => {
      if (b.createdAt) {
        const date = new Date(b.createdAt);
        const label = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric' });
        if (label in trendMap) {
          trendMap[label] += 1;
        }
      }
    });

    return Object.keys(trendMap).map(key => ({
      month: key,
      '手冊發佈數': trendMap[key]
    }));
  };

  const monthlyTrendData = getMonthlyTrend();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500 font-medium">數據加載中，請稍後...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 數據概覽卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <Eye size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">電子書總瀏覽量</span>
            <span className="text-3xl font-extrabold text-gray-800 mt-1 block">{totalViews.toLocaleString()} <span className="text-sm font-medium text-gray-400">次</span></span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <FileText size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">系統手冊總數</span>
            <span className="text-3xl font-extrabold text-gray-800 mt-1 block">{brochures.length} <span className="text-sm font-medium text-gray-400">份</span></span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">已發佈上線比例</span>
            <span className="text-3xl font-extrabold text-gray-800 mt-1 block">
              {brochures.length > 0 
                ? `${Math.round((brochures.filter(b => b.isPublished).length / brochures.length) * 100)}%`
                : '0%'
              }
            </span>
          </div>
        </div>
      </div>

      {/* 圖表網格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 熱門電子書排行 */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-base">熱門電子書瀏覽排行 (TOP 5)</h3>
          </div>
          <div className="h-64 flex-1">
            {topEbooks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topEbooks}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                  <YAxis dataKey="title" type="category" width={80} stroke="#9ca3af" fontSize={10} tickFormatter={(value) => value.slice(0, 8) + '...'} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelClassName="font-bold text-gray-800 text-xs"
                    itemStyle={{ color: '#2563eb', fontSize: '12px' }}
                  />
                  <Bar dataKey="views" name="瀏覽量" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={16}>
                    {topEbooks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">目前尚無電子書瀏覽數據</div>
            )}
          </div>
        </div>

        {/* 手冊進度狀態分佈 */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-base">手冊製作進度狀態分佈</h3>
          </div>
          <div className="h-64 flex-1 flex flex-col md:flex-row items-center justify-center">
            {statusChartData.length > 0 ? (
              <>
                <div className="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f3f4f6' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 flex flex-col gap-2 mt-4 md:mt-0">
                  {statusChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs px-4">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {entry.name}
                      </div>
                      <span className="font-bold text-gray-800">{entry.value} 份</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400">目前尚無手冊狀態數據</div>
            )}
          </div>
        </div>

        {/* 發佈月份趨勢 */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-base">近 6 個月手冊發佈活躍趨勢</h3>
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f3f4f6' }} />
                <Area type="monotone" dataKey="手冊發佈數" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
