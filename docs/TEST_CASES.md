## Тест-кейсы

### HealthCheck — [health.spec.ts](../tests/api/health.spec.ts)
| ID | Тип | Сценарий | Ожидание |
|---|---|---|---|
| HC-1 | positive | GET /ping | 201 `Created` |

### Auth — [auth.spec.ts](../tests/api/auth.spec.ts)
| ID | Тип | Сценарий | Ожидание |
|---|---|---|---|
| AU-1 | positive | POST /auth с верными кредами | 200, JSON, `token` — непустая строка |
| AU-2 | negative | POST /auth с неверным паролем | 200 (особенность API), `reason = "Bad credentials"`, поля `token` нет |

### Create (POST /booking) — [create-booking.spec.ts](../tests/api/create-booking.spec.ts)
| ID | Тип | Сценарий | Ожидание |
|---|---|---|---|
| CR-1 | positive | валидное бронирование | 200, `bookingid > 0`, `booking` равно отправленному; GET по ID возвращает те же данные |
| CR-2 | positive | без `additionalneeds` (необязательное поле) | 200, бронь создана, в GET поля нет |
| CR-3a | boundary | `totalprice = 0` | 200, значение сохранено |
| CR-3b | boundary | однодневная бронь `checkin == checkout` | 200, даты сохранены |
| CR-4 | boundary | длинная строка (300 символов), кириллица, спецсимволы, emoji | 200, строки сохранены без искажений |
| CR-5 | validation (param.) | нет обязательного поля `firstname` / `totalprice` | текущее: 500, бронь не создана. `@known-bug` (для `firstname`): 400 и бронь не создана |
| CR-6 | validation | синтаксически невалидный JSON | 400 `Bad Request` |
| CR-7 | validation | отрицательная `totalprice` | текущее: 200, бронь создана. `@known-bug`: 400 и бронь не сохранена |

### Read (GET) — [get-booking.spec.ts](../tests/api/get-booking.spec.ts)
| ID | Тип | Сценарий | Ожидание |
|---|---|---|---|
| GT-1 | positive + contract | GET /booking/{id} своей брони | 200, ответ соответствует `schemas/booking.json` и отправленным данным |
| GT-2 | negative | нечисловой id (`abc`) | 404 `Not Found` |
| GT-3 | positive | фильтр `?firstname=&lastname=` с уникальными именами | ровно один элемент — ID своей брони |
| GT-4 | negative | GET с `Accept: text/plain` | 418 `I'm a Teapot` (особенность API) |

### Update (PUT / PATCH) — [update-booking.spec.ts](../tests/api/update-booking.spec.ts)
| ID | Тип | Сценарий | Ожидание |
|---|---|---|---|
| UP-1 | positive | PUT с токеном в Cookie, все поля новые | 200, ответ равен новым данным; GET подтверждает |
| UP-2 | positive | PATCH `firstname` и `totalprice` с Basic auth | 200, изменены только эти поля; GET подтверждает |
| UP-3 | negative | PUT без авторизации | 403 `Forbidden` (особенность API); данные не изменились |

### Delete — [delete-booking.spec.ts](../tests/api/delete-booking.spec.ts)
| ID | Тип | Сценарий | Ожидание |
|---|---|---|---|
| DL-1 | positive | DELETE с токеном → GET | 201 `Created`, затем 404 `Not Found` |
| DL-2 | negative | DELETE с невалидным токеном | 403 `Forbidden`; бронь существует |
| DL-3 | negative | DELETE уже удалённой брони с токеном | текущее: 405 `Method Not Allowed`. `@known-bug`: 404 |

## Известные дефекты API
| Дефект | Тест |
|---|---|
| Нет обязательного поля → 500 вместо 400 | CR-5 |
| Отрицательная `totalprice` принимается | CR-7 |
| DELETE несуществующего ресурса → 405 вместо 404 | DL-3 |

Особенности (не дефекты, тестируются как есть): 200 + `Bad credentials` вместо 401; 403 вместо 401 без авторизации; 418 на `Accept: text/plain`.
