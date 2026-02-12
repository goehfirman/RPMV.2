import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  required?: boolean;
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, required }) => {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Inisialisasi tanggal tampilan berdasarkan value atau hari ini
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(
    !isNaN(initialDate.getTime()) ? initialDate : new Date()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update viewDate jika value berubah dari luar (misal reset form)
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setViewDate(date);
      }
    }
  }, [value]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    // Buat tanggal baru dengan zona waktu lokal yang aman
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    
    // Format YYYY-MM-DD manual untuk menghindari pergeseran timezone
    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    
    onChange(`${year}-${month}-${d}`);
    setShow(false);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8"></div>);
  }
  
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const checkDate = new Date(value);
    const isSelected = value && 
      checkDate.getDate() === i && 
      checkDate.getMonth() === currentMonth && 
      checkDate.getFullYear() === currentYear;
      
    const isToday = 
      new Date().getDate() === i && 
      new Date().getMonth() === currentMonth && 
      new Date().getFullYear() === currentYear;

    days.push(
      <button
        key={i}
        type="button"
        onClick={() => handleDateClick(i)}
        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200
          ${isSelected 
            ? 'bg-purple-600 text-white shadow-md shadow-purple-300 transform scale-105' 
            : isToday 
              ? 'bg-purple-50 text-purple-600 font-bold border border-purple-200'
              : 'text-slate-700 hover:bg-purple-50 hover:text-purple-600'
          }`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
        {label} {required && "*"}
      </label>
      
      <div 
        onClick={() => setShow(!show)}
        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium cursor-pointer transition-all shadow-sm flex items-center justify-between group
          ${show ? 'border-purple-400 ring-4 ring-purple-100' : 'hover:border-purple-300'}
        `}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value ? formatDateDisplay(value) : "Pilih Tanggal"}
        </span>
        <Calendar size={18} className={`text-purple-500 transition-colors ${show ? 'text-purple-700' : 'group-hover:text-purple-600'}`} />
      </div>

      {show && (
        <div className="absolute z-[60] mt-2 p-4 bg-white border border-purple-100 rounded-xl shadow-2xl animate-fade-in-up w-[320px] left-0 md:left-auto">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-purple-50 rounded-full text-slate-500 hover:text-purple-600 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-slate-800 text-sm tracking-wide">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-purple-50 rounded-full text-slate-500 hover:text-purple-600 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;