import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Environment, ENVIRONMENT_LABELS } from '@/lib/constants';
import type { SiteConditions } from '@/lib/types';

interface SiteConditionsPanelProps {
  value: SiteConditions;
  onChange: (conditions: SiteConditions) => void;
  disabled?: boolean;
}

export function SiteConditionsPanel({
  value,
  onChange,
  disabled = false,
}: SiteConditionsPanelProps) {
  const update = (field: keyof SiteConditions, fieldValue: unknown) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      {/* Environment toggle */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium text-gray-700">
          Environment
        </Label>
        <div className="flex gap-2">
          {Object.values(Environment).map((env) => (
            <button
              key={env}
              type="button"
              disabled={disabled}
              onClick={() => update('environment', env)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                value.environment === env
                  ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              {ENVIRONMENT_LABELS[env]}
            </button>
          ))}
        </div>
      </div>

      {/* Floor & Wall */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Floor Type
          </Label>
          <Input
            placeholder="e.g., Tile, Concrete"
            value={value.floorType || ''}
            onChange={(e) => update('floorType', e.target.value || undefined)}
            disabled={disabled}
            className="h-9 rounded-lg border-gray-200 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Wall Material
          </Label>
          <Input
            placeholder="e.g., CHB, Wood"
            value={value.wallMaterial || ''}
            onChange={(e) => update('wallMaterial', e.target.value || undefined)}
            disabled={disabled}
            className="h-9 rounded-lg border-gray-200 text-sm"
          />
        </div>
      </div>

      {/* Utilities */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.hasElectrical ?? false}
            onChange={(e) => update('hasElectrical', e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-[#c8c8cd] text-[#1d1d1f] focus:ring-[#6e6e73]/20"
          />
          <span className="text-sm text-gray-700">Electrical nearby</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.hasPlumbing ?? false}
            onChange={(e) => update('hasPlumbing', e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-[#c8c8cd] text-[#1d1d1f] focus:ring-[#6e6e73]/20"
          />
          <span className="text-sm text-gray-700">Plumbing nearby</span>
        </label>
      </div>

      {/* Access notes */}
      <div className="space-y-1">
        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
          Access Notes
        </Label>
        <Input
          placeholder="e.g., Narrow staircase, no elevator"
          value={value.accessNotes || ''}
          onChange={(e) => update('accessNotes', e.target.value || undefined)}
          disabled={disabled}
          className="h-9 rounded-lg border-gray-200 text-sm"
        />
      </div>

      {/* Obstacles */}
      <div className="space-y-1">
        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
          Obstacles / Constraints
        </Label>
        <Textarea
          placeholder="Any obstructions, special conditions..."
          value={value.obstaclesOrConstraints || ''}
          onChange={(e) =>
            update('obstaclesOrConstraints', e.target.value || undefined)
          }
          disabled={disabled}
          className="min-h-[60px] rounded-lg border-gray-200 text-sm resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
