import { Faker, base, en } from '@faker-js/faker';
import { config } from '../config/api-config.ts';
import type { Booking, RequiredField } from '../models/booking.ts';

/**
 * Валидные тестовые брони. Экземпляр создаётся на каждый тест со своим seed (см. fixtures.ts).
 * Все значения, включая суффиксы имён и даты, определяются тройкой seed + runId + baseDate
 * (config.reproduceEnv), поэтому данные теста повторяются точно.
 * В тесте через spread ({ ...data.valid(), totalprice: 0 }) меняются только важные для сценария поля.
 */
export class BookingBuilder {
  private readonly faker = new Faker({ locale: [en, base] });

  constructor(seed: number) {
    this.faker.seed(seed);
  }

  valid(): Booking {
    const checkin = this.faker.number.int({ min: 1, max: 59 });
    const nights = this.faker.number.int({ min: 1, max: 13 });
    return {
      firstname: this.uniqueName(this.faker.person.firstName()),
      lastname: this.uniqueName(this.faker.person.lastName()),
      totalprice: this.faker.number.int({ min: 50, max: 1999 }),
      depositpaid: this.faker.datatype.boolean(),
      bookingdates: { checkin: this.date(checkin), checkout: this.date(checkin + nights) },
      additionalneeds: this.faker.helpers.arrayElement(['Breakfast', 'Lunch', 'Dinner', 'Late checkout']),
    };
  }

  /**
   * Уникальная строка на общем стенде: читаемая основа + runId + суффикс из seed.
   * runId разводит запуски, суффикс — имена внутри теста.
   */
  uniqueName(base: string): string {
    return `${base}-${config.runId}-${this.faker.string.alphanumeric({ length: 6, casing: 'lower' })}`;
  }

  /** Дата (YYYY-MM-DD) через [days] дней от базовой (config.baseDate). */
  date(days: number): string {
    return addDays(config.baseDate, days);
  }
}

/** Дата + n дней. Считается в UTC, чтобы часовой пояс машины не сдвигал день. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Копия брони без указанного поля (поле не отправляется вовсе, а не null). */
export function withoutField(booking: Booking, field: RequiredField): Partial<Booking> {
  const copy: Partial<Booking> = { ...booking };
  delete copy[field];
  return copy;
}
