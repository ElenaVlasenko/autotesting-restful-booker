export interface BookingDates {
  checkin: string;
  checkout: string;
}

/** Бронь. additionalneeds — единственное необязательное поле. */
export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
}

/** Обязательные поля брони — для сценариев «нет обязательного поля». */
export const requiredFields = ['firstname', 'lastname', 'totalprice', 'depositpaid', 'bookingdates'] as const;
export type RequiredField = (typeof requiredFields)[number];

export interface CreateBookingResponse {
  bookingid: number;
  booking: Booking;
}

export interface AuthResponse {
  token?: string;
  reason?: string;
}

/** Способ авторизации для изменяющих запросов. */
export type Auth =
  | { kind: 'none' }
  | { kind: 'token'; token: string }
  | { kind: 'basic'; username: string; password: string };

/** Способ авторизации для параметризованных тестов, где токена ещё нет. */
export const AuthKind = {
  NONE: 'без авторизации',
  TOKEN: 'токен в Cookie',
  BASIC: 'Basic auth',
  INVALID_TOKEN: 'невалидный токен',
} as const;
export type AuthKind = keyof typeof AuthKind;
