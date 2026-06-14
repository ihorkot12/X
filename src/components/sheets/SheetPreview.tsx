import React from "react";
import { GeneratedProgram, LanguageMode } from "../../types";
import { Table, Layout, Database } from "lucide-react";
import { Card, Button } from "../ui/Base";

export const SheetPreview = ({ program }: { program: GeneratedProgram }) => {
  const tabs = ["Profile", "Assessment", "Week 1", "Week 2", "Week 3", "Week 4", "Zones", "Log"];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
      {/* Header / Tabs */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-2 flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map((tab, i) => (
            <div 
              key={tab} 
              className={`px-4 py-1.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                i === 2 ? "bg-white text-black" : "text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {tab}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pr-2">
            <div className="w-6 h-6 bg-green-700 rounded-sm flex items-center justify-center">
                <Table className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">BBP_Program_Export.xlsx</span>
        </div>
      </div>

      {/* Spreadsheet Body */}
      <div className="flex-1 overflow-auto bg-[#fafafa] dark:bg-zinc-900 text-black dark:text-white font-mono text-[10px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
            <tr>
              <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 w-8 text-center text-zinc-400">#</th>
              <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 text-left uppercase">Block</th>
              <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 text-left uppercase">Exercise</th>
              <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 text-left uppercase">Sets</th>
              <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 text-left uppercase">Reps</th>
              <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 text-left uppercase">Intensity</th>
              <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 text-left uppercase">Notes</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
              <tr key={row} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 text-center">{row}</td>
                <td className="p-2 border-r border-zinc-200 dark:border-zinc-800">STRENGTH</td>
                <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold">Trap Bar Deadlift</td>
                <td className="p-2 border-r border-zinc-200 dark:border-zinc-800">3</td>
                <td className="p-2 border-r border-zinc-200 dark:border-zinc-800">5</td>
                <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400">RPE 8</td>
                <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-zinc-500">Controlled eccentric phase...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Info */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex justify-between items-center">
        <p className="text-xs text-zinc-500 italic">
          * This is a visual preview of the exported structure.
        </p>
        <div className="flex gap-4">
            <Button variant="secondary" className="text-xs py-1.5" disabled>
                Export integration connected soon
            </Button>
            <Button className="text-xs py-1.5 bg-green-600 hover:bg-green-700 text-white">
                Download CSV
            </Button>
        </div>
      </div>
    </div>
  );
};
