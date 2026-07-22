import { useState } from 'react';
import { FileText, Download, Printer, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';

export function ReportsPage() {
  const [period, setPeriod] = useState('monthly');
  const [branch, setBranch] = useState('all');

  const reportTypes = [
    { id: 'task', label: 'Laporan Tugasan', desc: 'Penyiapan tugasan, status, overtime', icon: '📋', color: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' },
    { id: 'attendance', label: 'Laporan Kehadiran', desc: 'Kehadiran, jam kerja, lambat', icon: '⏰', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    { id: 'kpi', label: 'Laporan KPI', desc: 'Skor KPI, ranking, prestasi', icon: '🏆', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
    { id: 'performance', label: 'Laporan Prestasi', desc: 'Prestasi staf, anugerah, amaran', icon: '📊', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Laporan</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Jana dan eksport laporan operasi</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Tempoh" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </Select>
            <Select label="Cawangan" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">Semua Cawangan</option>
            </Select>
            <div className="flex items-end gap-2">
              <Button className="w-full"><Calendar className="h-4 w-4" /> Jana Laporan</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((r) => (
          <Card key={r.id} className="hover:shadow-md transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-2xl">{r.icon}</div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.label}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{r.desc}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> PDF</Button>
                    <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> Excel</Button>
                    <Button size="sm" variant="ghost"><Printer className="h-3.5 w-3.5" /> Cetak</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader><CardTitle>Laporan Terkini</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={<FileText className="h-7 w-7" />} title="Tiada laporan dijana" description="Laporan yang dijana akan dipaparkan di sini." />
        </CardContent>
      </Card>
    </div>
  );
}
