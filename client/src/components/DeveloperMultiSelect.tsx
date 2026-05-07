import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Developer } from "@shared/schema";

interface DeveloperMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  testIdPrefix?: string;
}

export function DeveloperMultiSelect({
  selectedIds,
  onChange,
  testIdPrefix = "developers",
}: DeveloperMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: developers = [], isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const activeDevelopers = useMemo(
    () => developers.filter((d) => d.isActive),
    [developers],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedDevelopers = useMemo(
    () => developers.filter((d) => selectedSet.has(d.id)),
    [developers, selectedSet],
  );

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading}
            data-testid={`button-${testIdPrefix}-trigger`}
          >
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0" />
              {selectedDevelopers.length > 0
                ? `تم اختيار ${selectedDevelopers.length} مطور`
                : "اختر المطورين العقاريين"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput
              placeholder="بحث..."
              data-testid={`input-${testIdPrefix}-search`}
            />
            <CommandList>
              <CommandEmpty>لا توجد نتائج</CommandEmpty>
              <CommandGroup>
                {activeDevelopers.map((dev) => {
                  const checked = selectedSet.has(dev.id);
                  return (
                    <CommandItem
                      key={dev.id}
                      value={`${dev.nameAr} ${dev.nameEn ?? ""} ${dev.slug}`}
                      onSelect={() => toggle(dev.id)}
                      data-testid={`option-${testIdPrefix}-${dev.id}`}
                    >
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          checked ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1 truncate">{dev.nameAr}</span>
                      {dev.country && (
                        <span className="text-xs text-muted-foreground">
                          {dev.country}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedDevelopers.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`list-${testIdPrefix}-selected`}>
          {selectedDevelopers.map((dev) => (
            <Badge
              key={dev.id}
              variant="secondary"
              className="gap-1"
              data-testid={`badge-${testIdPrefix}-${dev.id}`}
            >
              {dev.nameAr}
              <button
                type="button"
                onClick={() => toggle(dev.id)}
                className="rounded-full hover:bg-background/40"
                aria-label={`إزالة ${dev.nameAr}`}
                data-testid={`button-${testIdPrefix}-remove-${dev.id}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default DeveloperMultiSelect;
