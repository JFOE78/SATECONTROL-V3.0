import React from "react";
import { ChevronRight } from "lucide-react";

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description?: string;
  compact?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, title, description, compact = false }) => {
  return (
    <button 
      onClick={onClick} 
      className={`flex ${compact ? "flex-col items-center text-center p-4" : "items-center p-6"} bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all w-full group`}
    >
      <div className={`bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl ${compact ? "mb-1" : "mr-4"}`}>{icon}</div>
      <div className="flex-1 text-left">
        <h3 className={`font-black uppercase tracking-tight ${compact ? "text-[10px]" : "text-lg text-slate-800 dark:text-white"}`}>{title}</h3>
        {!compact && description && <p className="text-slate-400 text-xs font-bold mt-1 uppercase leading-none">{description}</p>}
      </div>
      {!compact && <ChevronRight className="text-slate-300 group-active:translate-x-1 transition-transform" size={20} />}
    </button>
  );
};
