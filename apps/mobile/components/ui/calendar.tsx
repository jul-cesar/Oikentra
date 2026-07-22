import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

type CalendarProps = {
  value?: Date;
  onChange: (date: Date) => void;
  className?: string;
};

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function Calendar({ value, onChange, className }: CalendarProps) {
  const [month, setMonth] = React.useState(() => {
    const date = value ?? new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const firstDay = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1)
  );

  function moveMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <View className={cn('w-72 gap-3', className)}>
      <View className="flex-row items-center justify-between">
        <Button size="icon" variant="ghost" onPress={() => moveMonth(-1)} accessibilityLabel="Mes anterior">
          <Icon as={ChevronLeft} className="size-4" />
        </Button>
        <Text className="font-semibold capitalize">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </Text>
        <Button size="icon" variant="ghost" onPress={() => moveMonth(1)} accessibilityLabel="Mes siguiente">
          <Icon as={ChevronRight} className="size-4" />
        </Button>
      </View>
      <View className="flex-row">
        {WEEKDAYS.map((day) => (
          <Text key={day} className="text-muted-foreground w-[14.2857%] text-center text-xs font-medium">
            {day}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((date, index) => (
          <View key={date?.toISOString() ?? `empty-${index}`} className="w-[14.2857%] items-center py-0.5">
            {date ? (
              <Button
                size="icon"
                variant={value && sameDay(value, date) ? 'default' : 'ghost'}
                className="h-9 w-9"
                onPress={() => onChange(date)}>
                <Text>{date.getDate()}</Text>
              </Button>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export { Calendar };
export type { CalendarProps };
