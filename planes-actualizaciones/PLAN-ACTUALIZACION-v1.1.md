# DIFF — Plan de actualización v1.1

> **Alcance:** 4 fases, 1 PR cada una. Reset de contraseña y verificación de email quedan
> fuera de alcance por decisión propia.
> **Stack:** Next.js 14 App Router, TypeScript, Tailwind, Drizzle + Neon, auth propia
> (scrypt + sesiones hasheadas).

## Resumen de fases

| # | Fase | Origen | PR | Migración | Estado |
|---|------|--------|----|-----------|--------|
| 1 | [Leaderboards reales](#fase-1--leaderboards-reales-t0-1) | T0-1 | #1 | índice `game_sessions(created_at)` | ☐ |
| 2 | [Perfil real](#fase-2--perfil-real-t0-2) | T0-2 | #2 | ninguna | ☐ |
| 3 | [Rachas diarias](#fase-3--rachas-diarias-t1-2) | T1-2 | #3 | `0003_user_streaks.sql` | ☐ |
| 4 | [Connect 4 verificable](#fase-4--connect-4-verificable-t1-3) | T1-3 | #4 | `0004_game_stats_by_difficulty.sql` | ☐ |

## Decisiones tomadas

| # | Decisión | Motivo |
|---|----------|--------|
| D1 | 4 fases independientes, 1 PR cada una | Cada una es desplegable y revertible por separado |
| D2 | Rachas de **login y de juego**, separadas | Login reutiliza `users.lastLogin`; el juego engancha más. Se muestran por separado |
| D3 | Día en **UTC** para la racha | No hay columna de timezone; añadirla es una migración futura. Limitación documentada |
| D4 | `game_stats` para histórico, `game_sessions` agregado para semanal/mensual | `game_stats` no tiene dimensión temporal. El coste crece con el volumen |
| D5 | Quitar la columna "Trend" del leaderboard | `LeaderboardEntry.trend` existe y se pinta, pero **nadie lo rellena** (`mock-data.ts:42-56` pone valores inventados). Una flecha falsa es peor que ninguna |
| D6 | Connect 4 con PRNG con semilla + replay en servidor | El juego sigue en cliente (responsive) pero el score pasa a ser verificable |
| D7 | Logros: **mostrar** el catálogo, no añadir desbloqueo | `user_achievements` nunca se rellena (T0-3, fuera de alcance) |
| D8 | Métrica de leaderboard por juego en **código**, no en columna | Evita una migración en la fase 1; se promueve a columna si los juegos de comunidad lo piden |

## Orden y dependencias

```
Fase 1  Leaderboards reales        → crea src/lib/stats/service.ts (capa compartida)
   ↓
Fase 2  Perfil real                → reutiliza la capa de la Fase 1
   ↓
Fase 3  Rachas                     → añade tabla + hooks de escritura
   ↓
Fase 4  Connect 4 verificable      → reutiliza leaderboards para filtros por dificultad
```

---

## Fase 1 — Leaderboards reales (T0-1)

**Objetivo:** sustituir los datos mock por consultas reales y hacer que los filtros sirvan de algo.
**PR:** #1 · **Depende de:** nada · **Bloquea:** fases 2 y 4

### Estado actual

- `src/app/leaderboards/page.tsx:1` es `"use client"` y lee `MOCK_LEADERBOARD_SNAKE` / `MOCK_LEADERBOARD_CONNECT4` (línea 16)
- Los filtros `global|snake|connect4` y `all|monthly|weekly` (líneas 8-9) **no hacen nada**
- La lista de juegos está hardcodeada, así que los juegos de la comunidad nunca aparecen
- `src/components/Leaderboard.tsx:53-57` pinta una columna "Trend" que siempre sale `—`

### Tareas

- [ ] Crear `src/lib/stats/service.ts` con `getGameLeaderboard({ gameSlug, metric, period, difficulty?, limit })` y `getGlobalLeaderboard({ period, limit })`
- [ ] Seguir el patrón de `src/lib/games/catalog.ts`: **nunca lanzar**, devolver `{ data, usingFallback, dbError }` para que la página degrade a mocks si la BD no responde
- [ ] `src/lib/stats/metrics.ts`: mapa `snake → highScore`, `connect4 → wins` (allow-list, nunca `sql.raw()` con input de `searchParams`)
- [ ] Periodo `all` → `game_stats`. Periodos `weekly` / `monthly` → `count`/`sum` sobre `game_sessions` agrupado por `user_id` con `created_at >= now() - interval`
- [ ] Respetar `users.public_profile = true` en ambas rutas
- [ ] Convertir `src/app/leaderboards/page.tsx` en **Server Component**: leer `searchParams` (`?game=`, `?period=`, `?difficulty=`), `export const dynamic = "force-dynamic"`
- [ ] Nuevo `src/components/LeaderboardFilters.tsx` (client) que hace `router.replace` con los query params; la lista de juegos sale de `getCatalogGames()`, no de un array fijo
- [ ] `src/components/Leaderboard.tsx`: eliminar la columna Trend, añadir "partidas jugadas", resaltar la fila del usuario actual
- [ ] `src/types/index.ts`: añadir `LeaderboardPeriod` y `LeaderboardMetric`; hacer `trend` opcional
- [ ] i18n: claves nuevas en `src/lib/i18n/dictionaries/en.json` y `es.json`

### Migraciones

- [ ] Índice en `game_sessions(created_at)` — sin esto el agregado por periodo es un seq scan. Generar con `npm run db:generate` y aplicar con `npm run db:migrate`

### Criterios de aceptación

- [ ] `?period=weekly` devuelve datos distintos de `?period=all` con partidas reales
- [ ] Un juego nuevo de la comunidad aparece en los filtros sin tocar código
- [ ] Sin `DATABASE_URL` la página renderiza con mocks y un aviso, no un 500
- [ ] Un usuario con `public_profile = false` no aparece
- [ ] `npm run typecheck` y `npm run lint` pasan

### Riesgos

- El agregado sobre `game_sessions` degrada con volumen → mitigado por el índice; si crece, se pre-agregan snapshots diarios (fuera de alcance)
- Inyección vía `searchParams` → allow-list estricta de `metric`, `period`, `difficulty` antes de construir cualquier query

---

## Fase 2 — Perfil real (T0-2)

**Objetivo:** que `/profile/<username>` lea de la base de datos y escale a cualquier juego del catálogo.
**PR:** #2 · **Depende de:** Fase 1 · **Bloquea:** nada

### Estado actual

- `src/app/profile/[username]/page.tsx:1` es `"use client"`, usa `mockUser()` / `mockStats()` / `MOCK_ACHIEVEMENTS`, con un TODO explícito en las líneas 10-11
- `src/components/PlayerCard.tsx:7-8` busca `snake` y `connect4` por slug hardcodeado → no escala a juegos de comunidad
- `PlayerCard.tsx:6` tipa `t` como `any`
- `PlayerCard.tsx:38` pinta un `currentStreak` que en realidad es la racha de **partidas** de Connect 4, no una racha diaria (nombre engañoso, se corrige en la Fase 3)

### Tareas

- [ ] Añadir `getPublicProfile(username)` a `src/lib/users/service.ts` → `{ user, stats } | null`, con un solo `leftJoin`; saltar el filtro de privacidad si se consulta el propio perfil
- [ ] `src/lib/stats/service.ts`: `getStatsForUser(userId)` con `leftJoin(games)` para traer nombre y slug
- [ ] Convertir `src/app/profile/[username]/page.tsx` en **Server Component**: `notFound()` si no existe o es privado, `generateMetadata` para title/OG (`NEXT_PUBLIC_SITE_URL` ya está en el entorno)
- [ ] Refactorizar `PlayerCard.tsx`: quitar los `find` hardcodeados, iterar `stats` y pintar una mini-tarjeta por juego; tipar `t` con `Dictionary` en vez de `any`
- [ ] `GameStats` en `src/types/index.ts` gana `gameName: string`
- [ ] Logros: leer `achievements` + `user_achievements` y mostrar bloqueados/desbloqueados. **Sin añadir lógica de desbloqueo**
- [ ] Añadir "últimas partidas" leyendo `game_sessions` (limit 5) para que el perfil refleje actividad real
- [ ] i18n: claves de perfil nuevas en ambos diccionarios

### Migraciones

Ninguna.

### Criterios de aceptación

- [ ] `/profile/<username>` real muestra las stats de `game_stats` de ese usuario
- [ ] Un juego de la comunidad aparece en el perfil sin modificar `PlayerCard`
- [ ] Perfil inexistente o con `public_profile = false` → 404
- [ ] `npm run typecheck` pasa sin `any` en `PlayerCard`
- [ ] Con la BD caída la página degrada a mocks, no rompe

### Riesgos

- `generateMetadata` en un perfil con `public_profile = false` podría filtrar la existencia de la cuenta → devolver el mismo 404

---

## Fase 3 — Rachas: login y juego (T1-2)

**Objetivo:** dos rachas independientes, `login` y `play`, mostradas por separado (D2).
**PR:** #3 · **Depende de:** Fase 2

### Estado actual

- `users.lastLogin` existe (`src/lib/db/schema.ts:40`) pero no hay ninguna lógica de racha
- `game_stats.win_streak` es una racha de partidas consecutivas, no diaria. No es lo que pide esta fase

### Nueva tabla

```ts
export const userStreaks = pgTable("user_streaks", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  loginStreak: integer("login_streak").default(0).notNull(),
  loginBest:   integer("login_best").default(0).notNull(),
  loginLastDay: date("login_last_day", { mode: "string" }),   // "YYYY-MM-DD"
  playStreak:  integer("play_streak").default(0).notNull(),
  playBest:    integer("play_best").default(0).notNull(),
  playLastDay: date("play_last_day", { mode: "string" }),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});
```

### Tareas

- [ ] `npm run db:generate` → migración `0003_user_streaks.sql`; `npm run db:migrate`
- [ ] `src/lib/streaks/day.ts`: `utcDayKey(date)` → `"YYYY-MM-DD"`
- [ ] `src/lib/streaks/service.ts` con la lógica **pura y testeable**: `nextStreak(lastDay, today)` devuelve `{ streak, lastDay }` o `null` si ya se contó hoy
  - Reglas: `lastDay === today` → sin cambio · `lastDay === ayer` → +1 · cualquier otro caso → 1 · `best = max(best, streak)`
- [ ] Escritura **atómica e idempotente** con un único `UPDATE` y `CASE`, nunca leer-modificar-escribir (dos logins concurrentes duplicarían el incremento):

  ```sql
  login_streak = CASE
    WHEN login_last_day = :today    THEN login_streak
    WHEN login_last_day = :yesterday THEN login_streak + 1
    ELSE 1
  END,
  login_best = GREATEST(login_best, <lo mismo>),
  login_last_day = :today
  ```

- [ ] Hook de login: `src/lib/auth/service.ts` en `authenticate()` (junto al `lastLogin` de la línea 102) y en `registerAccount()`
- [ ] Hook de juego: `src/app/api/games/submit/route.ts`, **dentro de la transacción existente** (línea 50)
- [ ] `src/lib/auth/session.ts`: incluir las rachas en el `select` de `getSessionUser()` y en `SessionUser`, para que navbar y perfil no hagan un fetch extra
- [ ] `PlayerCard.tsx`: sustituir el `currentStreak` engañoso (línea 38) por dos stats — racha de login y racha de juego, cada una con actual y mejor
- [ ] Nueva pestaña en `/leaderboards`: "Racha", ordenada por `play_best` (reutiliza la capa de la Fase 1)
- [ ] i18n: `streak.login`, `streak.play`, `streak.current`, `streak.best`, `streak.days`, `streak.title`

### Migraciones

`0003_user_streaks.sql`

### Criterios de aceptación

- [ ] Dos logins el mismo día no incrementan la racha
- [ ] Login en días consecutivos incrementa; un día de salto la reinicia a 1
- [ ] Enviar un score incrementa la racha de juego y **no** la de login
- [ ] La racha aparece en el perfil sin recarga extra
- [ ] Dos requests concurrentes no incrementan dos veces

### Riesgos

- **Zona horaria:** con UTC, un usuario en UTC+13 puede ver su racha "un día antes". Aceptado y documentado (D3). Añadir `users.timezone` es la corrección futura
- `game_stats.win_streak` y la nueva racha de juego son conceptos distintos: renombrar la etiqueta de la UI para no inducir a confusión

---

## Fase 4 — Connect 4: dificultad verificable (T1-3)

**Objetivo:** hacer el score de Connect 4 verificable en servidor y añadir stats por dificultad.

> **Corrección de alcance importante:** la dificultad **ya está implementada**.
> `src/games/connect4/ai.ts:162-178` define profundidad 1/3/5 y
> `src/games/connect4/Connect4Game.tsx:16,104-114` tiene el selector, que además ya se
> envía al servidor (línea 88). Los huecos reales son otros cuatro.

**PR:** #4 · **Depende de:** Fases 1 y 2

### Problemas encontrados

1. `src/lib/services/validate-score.ts:33-42` recalcula el ganador del tablero final pero **ignora `difficulty`**, y no puede validarlo: la CPU usa `Math.random()` (`ai.ts:133` y `ai.ts:172`), así que la partida no es reproducible
2. El anti-trampas es evadible: basta mandar un tablero ganador fabricado
3. `getCpuMove` se llama **dentro de un `setState` updater** (`Connect4Game.tsx:52-58`). Con `reactStrictMode: true` (`next.config.js:2`) React lo invoca dos veces en dev → el minimax corre dos veces y con efectos secundarios
4. Minimax a profundidad 5 corre en el **main thread** → bloqueo de la interfaz

### Tareas

- [ ] `src/games/connect4/rng.ts`: PRNG determinista (`mulberry32` o `sfc32`). Sustituir los dos `Math.random()` de `ai.ts` por el PRNG pasado por parámetro
- [ ] La partida genera una semilla con `crypto.getRandomValues()` al empezar y la envía en `metadata.seed` y `metadata.difficulty`
- [ ] Extraer las reglas a `src/games/connect4/rules.ts` (módulo sin dependencias de `next/*`, importable por cliente y servidor). Esto **elimina la copia duplicada** de `checkWinner`: hoy `validate-score.ts:50` reimplementa lo que ya hace `ai.ts:28`
- [ ] `validate-score.ts`: `replayConnect4(moves, seed, difficulty)` que reconstruye la partida desde un tablero vacío y devuelve `{ winner, moveCount }`
- [ ] Validación en tres capas:
  1. `moves` es un array de enteros en `[0, COLS)`, longitud 7..42, e **impar** (el jugador abre)
  2. Replay: alternancia jugador/CPU, ninguna jugada desborda columna, el juego no continúa tras un ganador
  3. `replayedWinner === claimedWinner`
- [ ] Mantener `recomputeConnect4Winner` como segunda capa (defensa en profundidad), dejando `moves` como fuente de verdad
- [ ] **Mover el minimax a un Web Worker**: `src/games/connect4/ai.worker.ts` + un hook `useCpuMove()`. Resuelve de paso el punto 3 (el efecto sale del updater de estado) y el 4 (ya no bloquea el hilo)
- [ ] **Migración** `game_stats_by_difficulty` con PK `(user_id, game_id, difficulty)` y `games_played / wins / losses / draws`. Se rellena dentro de la transacción de `/api/games/submit`
- [ ] `src/lib/stats/service.ts`: `getGameLeaderboard` acepta `difficulty?`; cuando viene, lee de `game_stats_by_difficulty`
- [ ] UI: selector de dificultad en `/leaderboards?game=connect4`, y desglose por nivel en `PlayerCard`
- [ ] i18n: `connect4.verified`, `connect4.replayFailed`, `leaderboard.allDifficulties`

### Migraciones

`0004_game_stats_by_difficulty.sql`

### Criterios de aceptación

- [ ] Un POST con `moves` manipulados o tablero fabricado devuelve 422
- [ ] El mismo par (semilla, movimientos) produce siempre el mismo resultado
- [ ] La interfaz no se bloquea en dificultad `hard`
- [ ] `npm run dev` no muestra doble ejecución del minimax
- [ ] `?difficulty=hard` y `?difficulty=easy` devuelven datos distintos

### Riesgos

- **Partidas ya guardadas sin `seed`/`moves`.** La validación debe degradar a solo plausibilidad si faltan los campos, no a 422 duro. Periodo de gracia antes de hacerlo obligatorio
- Mover reglas a un módulo compartido es un cambio estructural: validar primero que el bundle de cliente no arrastra `validate-score.ts` (que importa `@/types` y es server-side)
- `game_stats_by_difficulty` duplica parte de `game_stats`. Aceptado: es la única forma de tener boards por nivel sin re-agregar en cada request

---

## Fuera de alcance

| Item | Por qué |
|------|---------|
| T0-3 desbloqueo de logros | Requiere cablear `user_achievements` en `/api/games/submit`. La Fase 2 solo muestra el catálogo |
| T0-4 rate limiting | Independiente; crítico antes de abrir al público |
| T0-5 tests | `package.json` no tiene script de test. La lógica de rachas y el replay de Connect 4 son los candidatos naturales a primer test |
| T0-7 `metadata` como `jsonb` | Requiere migrar datos existentes |
| Reset de contraseña / verificación de email | Descartado |
| Tendencias del leaderboard | Necesita tabla de snapshots históricos |
| Columna de timezone | Corrección futura para las rachas (ver D3) |
| Multiplayer, temporadas, cosméticos | Siguen en el roadmap del README |

## Comandos

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm run db:generate   # genera la migración en /drizzle
npm run db:migrate    # aplica a DATABASE_URL
npm run db:seed       # idempotente, reference tables
npm run dev
```

## Checklist de despliegue

- [ ] Cada fase es un PR independiente con su propio `npm run build`
- [ ] Migraciones aplicadas **antes** de desplegar el código que las usa (`db:migrate` es idempotente)
- [ ] `.env.local` y las variables de Vercel sincronizadas
- [ ] Comprobar el fallback sin `DATABASE_URL` en cada fase
- [ ] README raíz actualizado al final (la sección "What's stubbed for v1.0" deja de ser cierta en las fases 1-3)
