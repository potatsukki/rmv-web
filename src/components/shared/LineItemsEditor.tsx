import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MeasurementUnit, MEASUREMENT_UNIT_LABELS } from '@/lib/constants';
import type { LineItem } from '@/lib/types';

interface LineItemsEditorProps {
  items: LineItem[];
  unit: string;
  onItemsChange: (items: LineItem[]) => void;
  onUnitChange: (unit: string) => void;
  disabled?: boolean;
}

const EMPTY_ITEM: LineItem = {
  label: '',
  quantity: 1,
};

export function LineItemsEditor({
  items,
  unit,
  onItemsChange,
  onUnitChange,
  disabled = false,
}: LineItemsEditorProps) {
  const addItem = () => {
    onItemsChange([...items, { ...EMPTY_ITEM }]);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: unknown) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    onItemsChange(updated);
  };

  const unitLabel = MEASUREMENT_UNIT_LABELS[unit] || unit;

  return (
    <div className="space-y-4">
      {/* Unit selector */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Label className="text-[13px] font-medium text-gray-700 whitespace-nowrap">
          Measurement Unit
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(MeasurementUnit).map((u) => (
            <button
              key={u}
              type="button"
              disabled={disabled}
              onClick={() => onUnitChange(u)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                unit === u
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {MEASUREMENT_UNIT_LABELS[u]}
            </button>
          ))}
        </div>
      </div>

      {/* Line items */}
      {items.map((item, index) => (
        <Card
          key={index}
          className="rounded-xl border-gray-100 shadow-sm overflow-hidden"
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 text-gray-300 mt-3 shrink-0" />
              <div className="flex-1 space-y-3">
                {/* Label + Quantity row */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Component / Section
                    </Label>
                    <Input
                      placeholder="e.g., Left panel, Counter top"
                      value={item.label}
                      onChange={(e) =>
                        updateItem(index, 'label', e.target.value)
                      }
                      disabled={disabled}
                      className="h-9 rounded-lg border-gray-200 text-sm"
                    />
                  </div>
                  <div className="w-full space-y-1 sm:w-20">
                    <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                      disabled={disabled}
                      className="h-9 rounded-lg border-gray-200 text-sm"
                    />
                  </div>
                </div>

                {/* Dimensions row */}
                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-5 gap-2">
                  {(['length', 'width', 'height', 'thickness', 'area'] as const).map(
                    (dim) => (
                      <div key={dim} className="space-y-1">
                        <Label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                          {dim} ({unitLabel})
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="—"
                          value={item[dim] ?? ''}
                          onChange={(e) =>
                            updateItem(
                              index,
                              dim,
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            )
                          }
                          disabled={disabled}
                          className="h-8 rounded-lg border-gray-200 text-xs"
                        />
                      </div>
                    ),
                  )}
                </div>

                {/* Notes */}
                <Textarea
                  placeholder="Notes for this component..."
                  value={item.notes || ''}
                  onChange={(e) =>
                    updateItem(index, 'notes', e.target.value || undefined)
                  }
                  disabled={disabled}
                  className="min-h-[40px] rounded-lg border-gray-200 text-xs resize-none"
                  rows={1}
                />
              </div>

              {/* Delete button */}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500 mt-6 shrink-0"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add button */}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed border-[#c8c8cd] text-[#6e6e73] hover:text-[#1d1d1f] hover:border-[#6e6e73] hover:bg-[#f0f0f5] rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Measurement
        </Button>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No measurements yet. Click "Add Measurement" to start.
        </p>
      )}
    </div>
  );
}
