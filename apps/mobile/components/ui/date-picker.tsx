import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { CalendarDays } from 'lucide-react-native';
import * as React from 'react';

type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function DatePicker({ value, onChange, placeholder = 'Selecciona una fecha' }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Icon as={CalendarDays} className="text-muted-foreground size-4" />
          <Text className="capitalize">{value ? formatDate(value) : placeholder}</Text>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <Calendar
          value={value}
          onChange={(date) => {
            onChange(date);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
export type { DatePickerProps };
