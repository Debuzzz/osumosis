import { Map as MapIcon } from "lucide-react";

export function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof MapIcon;
}) {
  return (
    <div className="stat">
      <Icon size={17} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
