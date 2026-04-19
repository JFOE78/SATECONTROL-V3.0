import React from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  color: "blue" | "emerald" | "orange" | "slate";
  large?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, color, large = false }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400",
    orange: "bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400",
    slate: "bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
  };

  const className = colorClasses[color] || colorClasses.slate;

  return (
    <div className={`${className} p-6 rounded-[2rem] border shadow-sm ${large ? "col-span-2" : ""}`}>
      <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</label>
      <span className={`${large ? "text-3xl" : "text-xl"} font-black tracking-tight`}>
        {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
        {(label.toLowerCase().includes("beneficio") || label.toLowerCase().includes("ingresos") || label.toLowerCase().includes("coste") || label.toLowerCase().includes("total") || label.toLowerCase().includes("monto")) && !label.toLowerCase().includes("m2") ? "€" : ""}
      </span>
    </div>
  );
};
