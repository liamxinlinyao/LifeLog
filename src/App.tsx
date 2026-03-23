import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  History, 
  Plus, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight,
  Bell,
  X,
  MoreVertical,
  Trash2,
  CalendarDays,
  Sparkles,
  Coffee,
  Target,
  Moon,
  Sun,
  Settings
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO,
  isPast,
  isFuture,
  addMinutes,
  differenceInMinutes
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Solar } from 'lunar-typescript';
import { useSchedules } from './hooks/useSchedules';
import { Schedule, ViewType, CalendarViewMode, Priority } from './types';
import { cn } from './utils';

// --- Components ---

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colors = {
    low: 'bg-emerald-50/50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400',
    medium: 'bg-amber-50/50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400',
    high: 'bg-rose-50/50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400',
  };
  const icons = {
    low: "☕️",
    medium: "✨",
    high: "🎯",
  };
  return (
    <span className={cn(
      "text-[10px] px-2.5 py-1 rounded-[12px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5", 
      colors[priority]
    )}>
      <span className="text-[12px]">{icons[priority]}</span>
      {priority === 'low' ? '低' : priority === 'medium' ? '中' : '高'}
    </span>
  );
};

const ScheduleCard = ({ 
  schedule, 
  onToggle, 
  onDelete 
}: { 
  schedule: Schedule; 
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  key?: React.Key;
}) => {
  const startTime = parseISO(schedule.startTime);
  const endTime = parseISO(schedule.endTime);
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ["#ef4444", "#ffffff", "#10b981"]
  );
  const opacity = useTransform(x, [-100, -50, 0, 50, 100], [1, 0.5, 0, 0.5, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onToggle(schedule.id);
    } else if (info.offset.x < -100) {
      onDelete(schedule.id);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[32px] bg-card shadow-soft transition-all hover:translate-y-[-2px]">
      {/* Background Actions */}
      <motion.div 
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-between px-10 text-white font-black text-xs uppercase tracking-[0.2em]"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6" />
          完成
        </div>
        <div className="flex items-center gap-3">
          删除
          <Trash2 className="w-6 h-6" />
        </div>
      </motion.div>

      <motion.div 
        layout
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, backgroundColor: background }}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        className={cn(
          "relative p-7 flex items-start gap-6 transition-all cursor-grab active:cursor-grabbing",
          schedule.isCompleted ? "opacity-40 grayscale-[0.9]" : ""
        )}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggle(schedule.id);
          }}
          className="mt-1.5 text-primary hover:scale-110 transition-transform z-10 flex-shrink-0"
        >
          <AnimatePresence mode="wait">
            {schedule.isCompleted ? (
              <motion.div 
                key="completed"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
              </motion.div>
            ) : (
              <motion.div 
                key="pending"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="w-7 h-7 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-primary transition-colors" 
              />
            )}
          </AnimatePresence>
        </button>
        
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className={cn(
              "text-lg font-bold text-text-main truncate tracking-tight transition-all",
              schedule.isCompleted && "line-through text-text-muted"
            )}>
              {schedule.title}
            </h3>
            <PriorityBadge priority={schedule.priority} />
          </div>
          
          <div className="flex items-center gap-5 text-xs font-black text-text-muted uppercase tracking-[0.15em]">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4.5 h-4.5 opacity-40" />
              <span>{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</span>
            </div>
            {schedule.reminderTime && (
              <div className="flex items-center gap-2.5 text-primary/80">
                <Bell className="w-4.5 h-4.5" />
                <span>
                  {(() => {
                    const rTime = parseISO(schedule.reminderTime);
                    if (isSameDay(rTime, startTime)) {
                      return format(rTime, 'HH:mm');
                    }
                    return format(rTime, 'MM/dd HH:mm');
                  })()}
                </span>
              </div>
            )}
          </div>
          
          {schedule.description && (
            <p className="text-sm text-text-muted/80 line-clamp-2 leading-relaxed font-medium pt-1">
              {schedule.description}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const { schedules, addSchedule, updateSchedule, deleteSchedule, toggleComplete } = useSchedules();
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('defaultView');
    if (saved === 'schedule' || saved === 'calendar' || saved === 'history') return saved as ViewType;
    return 'schedule';
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaultView, setDefaultView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('defaultView');
    if (saved === 'schedule' || saved === 'calendar' || saved === 'history') return saved as ViewType;
    return 'schedule';
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [notifications, setNotifications] = useState<{ id: string; title: string; time: string }[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Update default view
  useEffect(() => {
    localStorage.setItem('defaultView', defaultView);
  }, [defaultView]);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Notification Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      schedules.forEach(s => {
        if (s.isCompleted || s.notified || !s.reminderTime) return;
        
        const reminderTime = parseISO(s.reminderTime);
        const startTime = parseISO(s.startTime);
        
        // Check if it's time to notify (within 1 minute window)
        const diff = differenceInMinutes(now, reminderTime);
        if (diff >= 0 && diff < 1) {
          // Trigger Notification
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`提醒: ${s.title}`, {
                body: `日程将在 ${format(startTime, 'HH:mm')} 开始`,
                icon: '/favicon.ico',
                tag: s.id, // Prevent duplicate notifications for same schedule
                requireInteraction: true
              });
            } catch (err) {
              console.error("Notification error:", err);
            }
          }
          
          // Trigger Vibration
          if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          
          // Add to in-app notification list
          setNotifications(prev => [...prev, { 
            id: s.id, 
            title: s.title, 
            time: format(startTime, 'HH:mm') 
          }]);
          
          // Mark as notified
          updateSchedule(s.id, { notified: true });
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [schedules, updateSchedule]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        new Notification("通知已开启", {
          body: "您现在可以接收日程提醒了",
          icon: '/favicon.ico'
        });
        if ("vibrate" in navigator) {
          navigator.vibrate(200);
        }
      }
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const date = parseISO(s.startTime);
    if (currentView === 'schedule') {
      return (isToday(date) || isFuture(date)) && !s.isCompleted;
    }
    if (currentView === 'calendar') {
      return isSameDay(date, selectedDate);
    }
    if (currentView === 'history') {
      return s.isCompleted || isPast(date);
    }
    return true;
  }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

  const groupedSchedules = filteredSchedules.reduce((groups: { [key: string]: Schedule[] }, schedule) => {
    const date = format(parseISO(schedule.startTime), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(schedule);
    return groups;
  }, {} as { [key: string]: Schedule[] });

  const handleGoToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const hasSchedules = schedules.some(s => isSameDay(parseISO(s.startTime), cloneDay));
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "relative h-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 rounded-[20px]",
              !isSameMonth(day, monthStart) ? "text-text-muted opacity-20" : "text-text-main",
              isSameDay(day, selectedDate) ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105 z-10" : "hover:bg-bg",
              isToday(day) && !isSameDay(day, selectedDate) && "text-primary font-black"
            )}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <span className="text-sm font-black tracking-tighter z-10">{formattedDate}</span>
            <div className={cn(
              "text-[9px] opacity-60 z-10 truncate max-w-full px-1 font-bold tracking-tight",
              isSameDay(day, selectedDate) ? "text-white/80" : "text-text-muted"
            )}>
              {(() => {
                const lunar = Solar.fromDate(day).getLunar();
                const solarTerm = lunar.getJieQi();
                return solarTerm || (lunar.getDayInChinese() === '初一' ? lunar.getMonthInChinese() + '月' : lunar.getDayInChinese());
              })()}
            </div>
            {hasSchedules && (
              <div className={cn(
                "absolute bottom-2.5 w-1.5 h-1.5 rounded-full transition-all duration-300",
                isSameDay(day, selectedDate) 
                  ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-110" 
                  : "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              )} />
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-1">{rows}</div>;
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(selectedDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i);
      const hasSchedules = schedules.some(s => isSameDay(parseISO(s.startTime), day));
      days.push(
        <div
          key={day.toString()}
          className={cn(
            "flex-1 flex flex-col items-center p-5 rounded-[28px] cursor-pointer transition-all duration-500",
            isSameDay(day, selectedDate) ? "bg-primary text-white shadow-xl shadow-primary/30 scale-110 z-10" : "hover:bg-bg",
            isToday(day) && !isSameDay(day, selectedDate) && "text-primary font-black"
          )}
          onClick={() => setSelectedDate(day)}
        >
          <span className={cn(
            "text-[10px] uppercase font-black tracking-widest mb-1.5 opacity-60",
            isSameDay(day, selectedDate) && "opacity-100"
          )}>
            {format(day, 'EEE', { locale: zhCN })}
          </span>
          <span className="text-xl font-black tracking-tighter">{format(day, 'd')}</span>
          {hasSchedules && (
            <div className={cn(
              "w-2 h-2 rounded-full mt-2.5 transition-all duration-300",
              isSameDay(day, selectedDate)
                ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-110"
                : "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.4)]"
            )} />
          )}
        </div>
      );
    }
    return <div className="flex gap-3 p-3 bg-card rounded-[40px] shadow-soft">{days}</div>;
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-bg flex flex-col pb-24">
      {/* Top Bar (Lunar/Solar) */}
      <div className="bg-card/30 backdrop-blur-md px-8 py-2.5 border-b border-white/5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest whitespace-nowrap">
            {format(new Date(), 'yyyy / MM / dd')}
          </span>
          <div className="w-1 h-1 rounded-full bg-text-muted/30 flex-shrink-0" />
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">
            {(() => {
              const lunar = Solar.fromDate(new Date()).getLunar();
              return `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} · ${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年`;
            })()}
          </span>
        </div>
        {(() => {
          const lunar = Solar.fromDate(new Date()).getLunar();
          const term = lunar.getJieQi();
          if (term) return (
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-full flex-shrink-0">
              {term}
            </span>
          );
          return null;
        })()}
      </div>

      {/* Header */}
      <header className="sticky top-[37px] z-30 glass px-8 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-text-main tracking-tighter flex items-center gap-3 whitespace-nowrap overflow-hidden">
            {currentView === 'schedule' ? <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-[18px] flex-shrink-0 flex items-center justify-center shadow-soft"><Sun className="w-6 h-6 text-amber-400 fill-amber-400" /></div> : 
             currentView === 'calendar' ? <div className="w-10 h-10 bg-primary/10 rounded-[18px] flex-shrink-0 flex items-center justify-center shadow-soft"><CalendarDays className="w-6 h-6 text-primary" /></div> : <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-[18px] flex-shrink-0 flex items-center justify-center shadow-soft"><Moon className="w-6 h-6 text-indigo-400 fill-indigo-400" /></div>}
            <span className="mt-0.5 truncate">{currentView === 'schedule' ? '今日日程' : 
             currentView === 'calendar' ? '日历视图' : '历史记录'}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-[18px] bg-bg text-text-muted transition-all active:scale-90 hover:text-text-main shadow-soft"
          >
            <Settings className="w-5 h-5" />
          </button>
          {notificationPermission !== 'granted' && "Notification" in window && (
            <button 
              onClick={requestNotificationPermission}
              className="w-10 h-10 flex items-center justify-center rounded-[18px] bg-rose-50 dark:bg-rose-500/10 text-rose-500 transition-all active:scale-90 shadow-soft animate-pulse"
              title="开启通知提醒"
            >
              <Bell className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-10 h-10 flex items-center justify-center rounded-[18px] bg-bg text-text-muted transition-all active:scale-90 hover:text-text-main shadow-soft"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
           <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-10 h-10 bg-primary text-white rounded-[18px] flex items-center justify-center shadow-xl shadow-primary/30 active:scale-90 transition-all hover:bg-primary-dark"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 space-y-8 no-scrollbar">
        {currentView === 'calendar' && (
          <section className="space-y-8">
            <div className="flex items-center justify-between bg-card p-2.5 rounded-[28px] shadow-soft">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2.5 hover:bg-bg rounded-2xl transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-text-muted" />
                </button>
                <span className="font-black text-text-main min-w-[110px] text-center text-sm tracking-tight">
                  {format(currentMonth, 'yyyy年 MM月', { locale: zhCN })}
                </span>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2.5 hover:bg-bg rounded-2xl transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              
              <div className="flex items-center gap-3 pr-1">
                <button 
                  onClick={handleGoToToday}
                  className="px-4 py-2 text-[11px] font-black text-primary bg-primary/10 rounded-2xl hover:bg-primary/20 transition-all active:scale-95 uppercase tracking-widest"
                >
                  今天
                </button>
                <div className="flex bg-bg p-1 rounded-[18px]">
                  <button 
                    onClick={() => setCalendarMode('month')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-[14px] transition-all",
                      calendarMode === 'month' ? "bg-card shadow-soft text-primary" : "text-text-muted"
                    )}
                  >
                    月
                  </button>
                  <button 
                    onClick={() => setCalendarMode('week')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-[14px] transition-all",
                      calendarMode === 'week' ? "bg-card shadow-soft text-primary" : "text-text-muted"
                    )}
                  >
                    周
                  </button>
                </div>
              </div>
            </div>

            {calendarMode === 'month' ? (
              <div className="bg-card p-6 rounded-[40px] shadow-soft">
                <div className="grid grid-cols-7 mb-6 text-center">
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <span key={d} className="text-[10px] font-black text-text-muted/40 uppercase tracking-widest">{d}</span>
                  ))}
                </div>
                {renderCalendar()}
              </div>
            ) : (
              renderWeekView()
            )}
            
            <div className="pt-6">
              <div className="bg-card p-6 rounded-[40px] shadow-soft mb-8 border border-white/5">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex flex-col items-center justify-center text-primary shadow-inner">
                    <span className="text-[13px] font-black opacity-60 uppercase tracking-tighter">{format(selectedDate, 'MMM')}</span>
                    <span className="text-4xl font-black tracking-tighter leading-none mt-1">{format(selectedDate, 'dd')}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black text-text-main tracking-tight">
                        {format(selectedDate, 'EEEE', { locale: zhCN })}
                      </h2>
                      {isToday(selectedDate) && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">Today</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <p className="text-xs font-bold text-text-muted tracking-wide">
                        {(() => {
                          const lunar = Solar.fromDate(selectedDate).getLunar();
                          return `${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年 · ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} · ${lunar.getJieQi() || '日常'}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <AnimatePresence mode="popLayout">
                  {filteredSchedules.length > 0 ? (
                    filteredSchedules.map(s => (
                      <ScheduleCard 
                        key={s.id} 
                        schedule={s} 
                        onToggle={toggleComplete} 
                        onDelete={deleteSchedule}
                      />
                    ))
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center py-20 bg-card rounded-[40px] border-2 border-dashed border-bg"
                    >
                      <div className="w-20 h-20 bg-bg rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-text-muted opacity-10" />
                      </div>
                      <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">这一天没有安排</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        {(currentView === 'schedule' || currentView === 'history') && (
          <section className="space-y-8">
            {Object.keys(groupedSchedules).length > 0 ? (
              (Object.entries(groupedSchedules) as [string, Schedule[]][]).map(([dateStr, items]) => {
                const date = parseISO(dateStr);
                const isTodayDate = isToday(date);
                return (
                  <div key={dateStr} className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isTodayDate ? "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-200 dark:bg-slate-700"
                      )} />
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                        {isTodayDate ? '今天 · TODAY' : format(date, 'MM月dd日 · EEEE', { locale: zhCN })}
                      </span>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {items.map(s => (
                          <ScheduleCard 
                            key={s.id} 
                            schedule={s} 
                            onToggle={toggleComplete} 
                            onDelete={deleteSchedule}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-24">
                <div className="w-24 h-24 bg-card rounded-[40px] shadow-soft flex items-center justify-center mx-auto mb-6">
                  {currentView === 'schedule' ? 
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" /> : 
                    <History className="w-10 h-10 text-indigo-300" />
                  }
                </div>
                <h3 className="text-xl font-black text-text-main tracking-tight">
                  {currentView === 'schedule' ? '开启精彩的一天' : '暂无历史'}
                </h3>
                <p className="text-sm font-medium text-text-muted mt-2 max-w-[200px] mx-auto">
                  {currentView === 'schedule' ? '点击右上角的 + 按钮，开始规划你的第一个日程吧！' : '完成的日程会出现在这里'}
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass px-10 py-6 pb-12">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <NavButton 
            active={currentView === 'schedule'} 
            onClick={() => setCurrentView('schedule')}
            icon={<Clock className="w-7 h-7" />}
            label="日程"
          />
          <NavButton 
            active={currentView === 'calendar'} 
            onClick={() => setCurrentView('calendar')}
            icon={<CalendarIcon className="w-7 h-7" />}
            label="日历"
          />
          <NavButton 
            active={currentView === 'history'} 
            onClick={() => setCurrentView('history')}
            icon={<History className="w-7 h-7" />}
            label="历史"
          />
        </div>
      </nav>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <AddScheduleModal 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={(s) => {
              addSchedule(s);
              setIsAddModalOpen(false);
            }}
            initialDate={currentView === 'calendar' ? selectedDate : new Date()}
          />
        )}
        {isSettingsOpen && (
          <SettingsModal 
            onClose={() => setIsSettingsOpen(false)}
            defaultView={defaultView}
            setDefaultView={setDefaultView}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </AnimatePresence>

      {/* Notification Popups */}
      <div className="fixed top-4 left-0 right-0 z-50 px-6 pointer-events-none flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card p-4 rounded-2xl shadow-2xl border border-primary/20 flex items-center gap-3 pointer-events-auto"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-text-main">日程提醒</h4>
                <p className="text-xs text-text-muted">{n.title} 将在 {n.time} 开始</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                className="p-1 hover:bg-bg rounded-full"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-2 transition-all relative",
      active ? "text-primary" : "text-text-muted hover:text-text-main"
    )}
  >
    <div className={cn(
      "p-3.5 rounded-[24px] transition-all duration-500",
      active ? "bg-primary/10 shadow-glow scale-110" : "hover:bg-slate-100 dark:hover:bg-slate-800"
    )}>
      {icon}
    </div>
    <span className={cn(
      "text-[10px] font-black uppercase tracking-[0.25em] transition-all",
      active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
    )}>
      {label}
    </span>
    {active && (
      <motion.div 
        layoutId="nav-dot"
        className="absolute -bottom-3 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
      />
    )}
  </button>
);

const AddScheduleModal = ({ 
  onClose, 
  onAdd,
  initialDate
}: { 
  onClose: () => void; 
  onAdd: (s: Omit<Schedule, 'id' | 'isCompleted' | 'notified'>) => void;
  initialDate: Date;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
  const [endTime, setEndTime] = useState(format(addMinutes(new Date(), 60), 'HH:mm'));
  const [priority, setPriority] = useState<Priority>('medium');
  const [reminderMode, setReminderMode] = useState<'preset' | 'custom'>('preset');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [customReminderDate, setCustomReminderDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [customReminderTime, setCustomReminderTime] = useState(format(addMinutes(new Date(), -15), 'HH:mm'));
  const [pickerMonth, setPickerMonth] = useState(initialDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const quickDates = [
    { label: '今天', date: new Date() },
    { label: '明天', date: addDays(new Date(), 1) },
    { label: '后天', date: addDays(new Date(), 2) },
  ];

  const renderPickerCalendar = () => {
    const monthStart = startOfMonth(pickerMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isSelected = isSameDay(day, parseISO(date));
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        days.push(
          <button
            key={day.toString()}
            type="button"
            onClick={() => {
              setDate(format(cloneDay, 'yyyy-MM-dd'));
              setIsCalendarOpen(false);
            }}
            className={cn(
              "h-10 w-full flex items-center justify-center rounded-xl text-xs font-bold transition-all",
              !isCurrentMonth ? "text-text-muted opacity-20" : "text-text-main",
              isSelected ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" : "hover:bg-bg",
              isToday(day) && !isSelected && "text-primary ring-1 ring-primary/30"
            )}
          >
            {format(day, 'd')}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const start = new Date(`${date}T${startTime}`);
    let reminder: string;

    if (reminderMode === 'preset') {
      if (reminderMinutes === 0) {
        reminder = '';
      } else {
        reminder = addMinutes(start, -reminderMinutes).toISOString();
      }
    } else {
      reminder = new Date(`${customReminderDate}T${customReminderTime}`).toISOString();
    }

    onAdd({
      title,
      description,
      startTime: start.toISOString(),
      endTime: new Date(`${date}T${endTime}`).toISOString(),
      priority,
      reminderTime: reminder,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-card w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden border-t border-white/10"
      >
        <div className="px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">添加日程</h2>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-bg hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-text-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">日程标题</label>
            <input 
              autoFocus
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="记录下你要做的事..."
              className="w-full px-5 py-4 bg-bg border-none rounded-[24px] focus:ring-2 focus:ring-primary/30 text-text-main placeholder:text-text-muted/50 text-lg font-medium transition-all"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">选择日期</label>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {quickDates.map(qd => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => {
                    setDate(format(qd.date, 'yyyy-MM-dd'));
                    setPickerMonth(qd.date);
                  }}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    isSameDay(qd.date, parseISO(date))
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-bg text-text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {qd.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  isCalendarOpen ? "bg-primary/10 text-primary" : "bg-bg text-text-muted"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                {isCalendarOpen ? '收起日历' : '更多日期'}
              </button>
            </div>

            <AnimatePresence>
              {isCalendarOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-bg rounded-[32px] p-4 space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <button 
                        type="button"
                        onClick={() => setPickerMonth(subMonths(pickerMonth, 1))}
                        className="p-1.5 hover:bg-card rounded-xl"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-black uppercase tracking-widest">
                        {format(pickerMonth, 'yyyy年 MM月', { locale: zhCN })}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setPickerMonth(addMonths(pickerMonth, 1))}
                        className="p-1.5 hover:bg-card rounded-xl"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 text-center mb-2">
                      {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                        <span key={d} className="text-[9px] font-black text-text-muted/40 uppercase">{d}</span>
                      ))}
                    </div>
                    {renderPickerCalendar()}
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-between px-5 py-4 bg-bg rounded-[24px]">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-primary opacity-60" />
                    <span className="text-sm font-bold text-text-main">
                      {format(parseISO(date), 'yyyy年MM月dd日')}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                    {format(parseISO(date), 'EEEE', { locale: zhCN })}
                  </span>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">开始时间</label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-5 py-4 bg-bg border-none rounded-[24px] focus:ring-2 focus:ring-primary/30 text-text-main font-medium transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">结束时间</label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-5 py-4 bg-bg border-none rounded-[24px] focus:ring-2 focus:ring-primary/30 text-text-main font-medium transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">优先级</label>
            <div className="flex gap-2.5">
              {(['low', 'medium', 'high'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 py-3.5 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all",
                    priority === p 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                      : "bg-bg text-text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {p === 'low' ? '☕️ 低' : p === 'medium' ? '✨ 中' : '🎯 高'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">提醒设置</label>
              <button 
                type="button"
                onClick={() => setReminderMode(reminderMode === 'preset' ? 'custom' : 'preset')}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
              >
                {reminderMode === 'preset' ? '自定义时间' : '返回预设'}
              </button>
            </div>

            {reminderMode === 'preset' ? (
              <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                {[0, 5, 15, 30, 60].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setReminderMinutes(m)}
                    className={cn(
                      "px-5 py-3 rounded-[20px] text-sm font-bold whitespace-nowrap transition-all",
                      reminderMinutes === m 
                        ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105" 
                        : "bg-bg text-text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {m === 0 ? '不提醒' : `${m} 分钟`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                <input 
                  type="date" 
                  value={customReminderDate}
                  onChange={e => setCustomReminderDate(e.target.value)}
                  className="w-full px-5 py-4 bg-bg border-none rounded-[24px] focus:ring-2 focus:ring-primary/30 text-text-main font-medium transition-all"
                />
                <input 
                  type="time" 
                  value={customReminderTime}
                  onChange={e => setCustomReminderTime(e.target.value)}
                  className="w-full px-5 py-4 bg-bg border-none rounded-[24px] focus:ring-2 focus:ring-primary/30 text-text-main font-medium transition-all"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">备注说明</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="添加一些补充信息..."
              rows={3}
              className="w-full px-5 py-4 bg-bg border-none rounded-[24px] focus:ring-2 focus:ring-primary/30 text-text-main placeholder:text-text-muted/50 resize-none font-medium transition-all"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-primary text-white text-lg font-bold rounded-[24px] shadow-xl shadow-primary/30 active:scale-[0.97] transition-all mt-4"
          >
            确认添加
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const SettingsModal = ({ 
  onClose, 
  defaultView, 
  setDefaultView,
  theme,
  setTheme
}: { 
  onClose: () => void;
  defaultView: ViewType;
  setDefaultView: (v: ViewType) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-card w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden border-t border-white/10"
      >
        <div className="px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">应用设置</h2>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-bg hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-text-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="px-8 pb-10 space-y-8">
          <div className="space-y-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">默认启动视图</label>
            <div className="grid grid-cols-3 gap-3">
              {(['schedule', 'calendar', 'history'] as ViewType[]).map(v => (
                <button
                  key={v}
                  onClick={() => setDefaultView(v)}
                  className={cn(
                    "py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all",
                    defaultView === v 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                      : "bg-bg text-text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {v === 'schedule' ? '日程' : v === 'calendar' ? '日历' : '历史'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">界面主题</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  theme === 'light' 
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105" 
                    : "bg-bg text-text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                <Sun className="w-4 h-4" />
                浅色模式
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  theme === 'dark' 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105" 
                    : "bg-bg text-text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                <Moon className="w-4 h-4" />
                深色模式
              </button>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-5 bg-primary text-white text-lg font-bold rounded-[24px] shadow-xl shadow-primary/30 active:scale-[0.97] transition-all mt-4"
          >
            保存并返回
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
