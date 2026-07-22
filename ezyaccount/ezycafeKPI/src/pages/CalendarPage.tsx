import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { DAY_LABELS } from '@/lib/constants';

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const today = new Date();
  const isToday = (date: Date | null) => date && date.toDateString() === today.toDateString();

  const monthName = currentDate.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });

  // Mock events
  const events: Record<string, { type: string; label: string }[]> = {
    [today.toISOString().split('T')[0]]: [{ type: 'task', label: 'Tugasan Hari Ini' }],
  };

  const eventColors: Record<string, string> = {
    task: 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
    meeting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    leave: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Kalendar</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Paparan bulanan tugasan & acara</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>{monthName}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <ChevronLeft className="h-4 w-4 text-neutral-500" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
              Hari Ini
            </button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <ChevronRight className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-neutral-400 py-2">{day}</div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((date, i) => {
              const dateStr = date ? date.toISOString().split('T')[0] : '';
              const dayEvents = events[dateStr] || [];
              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[80px] sm:min-h-[100px] p-1.5 rounded-xl border transition-colors',
                    !date && 'border-transparent',
                    date && 'border-neutral-100 dark:border-neutral-800/50 hover:border-neutral-200 dark:hover:border-neutral-700',
                    isToday(date) && 'border-primary-300 bg-primary-50/50 dark:bg-primary-900/10'
                  )}
                >
                  {date && (
                    <>
                      <p className={cn(
                        'text-xs font-medium mb-1',
                        isToday(date) ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500'
                      )}>{date.getDate()}</p>
                      <div className="space-y-1">
                        {dayEvents.map((ev, j) => (
                          <div key={j} className={cn('text-[10px] px-1.5 py-0.5 rounded-md truncate', eventColors[ev.type])}>
                            {ev.label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">Tugasan</Badge>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">Meeting</Badge>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">Cuti</Badge>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">Penyelenggaraan</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
