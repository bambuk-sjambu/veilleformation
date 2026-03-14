import { ClipboardList } from "lucide-react";

export default function PlanActionPage() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        Plan d&apos;action
      </h1>
      <p className="text-gray-500">Bientôt disponible</p>
    </div>
  );
}
