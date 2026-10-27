# POCKET · мобильный покерный клуб

Бесплатная PWA для игры в Texas Hold’em против ботов и персонального изучения покера. Только условные фишки, без ставок на реальные деньги и без аккаунта.

## POCKET 0.4 — Mobile Redesign

- Новый мобильный интерфейс без длинных текстовых панелей: одна основная кнопка на главной, компактная библиотека тем.
- Игровой стол на высоту экрана, 1–5 ботов, игроки вокруг овального стола, действия закреплены внизу.
- История и настройки игры — в отдельных выдвижных панелях. Рейз вводится по запросу.
- Анкета интересов в два шага, короткие списки материалов, теория → игровые ситуации → разбор.
- Текущий раздел и этап учебной ситуации сохраняются в localStorage; старые игровые данные 0.2 продолжают использоваться.
- Тёмное оформление, адаптация под узкие экраны, поддержка safe area iPhone и уменьшения анимаций.

## Запуск

```bash
npm install
npm run dev
```

Тесты и сборка:

```bash
npm test
npm run build
```

## Публикация

Репозиторий: https://github.com/Coldqh/pocket-poker

При коммите в `main` GitHub Actions запускает тесты, сборку Vite и публикацию каталога `dist` в GitHub Pages. В настройках репозитория в **Settings → Pages → Source** должно быть выбрано **GitHub Actions**.

Сайт: https://coldqh.github.io/pocket-poker/

## Ограничения

Боты пока простые, результаты одного матча не показывают реальную силу игрока. Учебные решения рассчитаны для конкретного контекста задачи, а не являются универсальными GTO-ответами. Статистика хранится только в браузере текущего устройства.


## Обновление 0.4

- Анимация раздачи закрытых карт, открытия флопа / тёрна / ривера, ставок и результатов.
- Реакции соперников и подсветка активного игрока; переходы, панели и ответы в академии.
- Скорость ботов «Обычная / Быстрая» в настройках стола, сохраняется локально.
- Уважение `prefers-reduced-motion` для пользователей, отключивших анимацию в ОС.
- Корректные пресеты ставок на ½ банка и банк, точный числовой ввод рейза.
- Разъясняемый выигрыш на вскрытии, включая частичный банк.
- Сохранения 0.3 читаются без сброса; все фишки виртуальные.

Примечание: анимация фишек — визуальная подсказка, а не отдельная игровая операция; логика ставок и банка управляется движком.


## Обновление 0.5 — Casino table & chip inventory

- Рейз открывается в отдельном диалоге с точным вводом, пресетами и подтверждением.
- Стол использует фактурное сукно, отдельный рисунок текстуры и фиксированное соотношение сторон (не растягивается по ширине/высоте).
- Номиналы 1 (белая), 5 (красная), 25 (зелёная), 100 (чёрная), 500 (фиолетовая). Каждая стопка показывает точное количество каждого номинала. Нажатие на стек игрока открывает полный размен.
- Ставки текущей улицы расположены перед местами игроков. Центральная стопка содержит собранные с предыдущих улиц фишки. Верхний счётчик банка включает обе части. Фишки не учитываются дважды.
- Анимация движения: из стека игрока к ставке, со ставок в банк, из банка к выигравшим игрокам.
- Тесты номиналов и инварианта банка, включая все значения от 0 до 6000.
- Условные фишки, без игровых денежных выплат. Размен номиналов — визуальная проекция целочисленных стеков, а не сохраняемые физические жетоны.


## 0.6 — настройка стола и обучение

Перед первым столом выбираются номиналы и количество фишек, затем число соперников. Наборы номиналов хранятся за игроками, а банк автоматически разменивает фишки без изменения общей стоимости. Начальные стеки одинаковы. Старые сохранения мигрируют в новую модель. Окно рейза не включает клавиатуру автоматически. Академия выдаёт теорию короткими экранами, подсвечивает слабые темы и предлагает повторение.


## 0.7 — physical chips and gameplay polish

Player chips, current street wagers and collected pots retain exact denominations. Only an explicit exchange rearranges the human player's chips; bots and the dealer make change when needed to post blinds or divide the pot. Betting actions never silently recompose the player's stack. Academy felt has a compact aspect ratio, folded cards animate toward the muck and all card backs use a neutral POCKET monogram. The home screen is streamlined to one play action.


## 0.8 — Poker Club

Blinds (2/4, 5/10, 10/20, 25/50), 3 selectable bot difficulty levels, five consistent player personalities, and a persistent hand-history viewer with street-by-street snapshots. Open the clock/history icon at the table; inspect cards, board, stacks and pot at each decision. Up to 25 completed hands are kept locally. Existing tables stay playable with default 10/20 blinds.


## 0.9 — Sit & Go и карьера

В меню создания стола доступны свободная игра с фиксированными блайндами и Sit & Go с повышением блайндов каждые четыре раздачи, выбыванием участников и итоговым местом. Турниры начисляют **виртуальные учебные очки** (не деньги, не реальные призы); результаты, победы и первые испытания хранятся локально в профиле. Сохранения предыдущих версий автоматически дополняются новыми полями.


## POCKET 1.0 — Poker Lab

Создание стола стало коротким мобильным экраном с закреплённой кнопкой начала игры; состав начальных фишек настраивается в отдельной панели. В академии появилась лаборатория: интерактивный калькулятор шансов банка, упражнения по коллу и фолду, конструктор карт для определения комбинаций и просмотр записанных раздач. Оценки EV и шансов основаны на явных упрощениях (чистые ауты, отсутствие будущих ставок); это не GTO-солвер. Старые сохранения и профили остаются доступны.


## 1.0.1 — Quality Pass

Исправлены и проверены выплаты основного и побочного банков, включая нечётную фишку, уточнено ранжирование одновременных выбываний. Сумма банка сохраняется при вскрытии. Возврат из настройки нового стола больше не делает предыдущую партию недоступной; ошибки сохранения отображаются явно. Уточнены границы математических моделей и исправлены неизвестные карты в учебном примере; все 16 заданий получили более осмысленные альтернативы. Скорректирована оценка сильных общих комбинаций ботами. Офлайн-режим не подменяет отсутствующие скрипты HTML. Прямые версии зависимостей закреплены; lock-файл пока не добавлен.


## POCKET GLOW 2.0 — интерфейс

Новый визуальный язык: графитовые поверхности, лаймовый основной акцент, сиреневый для рейза и обучения, контрастная типографика Manrope / Unbounded. Одна крупная карточка входа в игру, мобильная навигация «Клуб / Споты / Я», оформленный игровой стол и более короткие экранные тексты академии. Условия учебных раздач доступны по раскрытию, а объяснения и сами условия сохранены без сокращения математической сути. Отдельный слой `src/glow.css` подключается после исходных стилей, чтобы редизайн можно было постепенно стабилизировать без размножения старых правил. Сохранения продолжают использовать прежние ключи; это визуальный, а не экономический релиз. Поддерживается `prefers-reduced-motion`.


## POCKET 2.1 — After Hours, structural redesign

Instead of the neon Glow recolor, POCKET now uses a soft graphite/sage/slate editorial palette. Navigation and screen composition were rebuilt: the lounge opens an actual saved game or launches a quick playable scenario; the academy starts with an interactive spot and hides its full catalog in an expandable section; the player profile is a concise card with expandable records. The table setup keeps blind/difficulty settings in an advanced disclosure, and the game has a street-progress ribbon. Existing games, chip accounting, tests and persisted profile keys remain intact. No fabricated streaks, artificial XP or manipulative prompts.


## POCKET 2.2 — учиться проще

Академия теперь начинает с игровых решений, а не длинных блоков теории: контекст раздачи показан сразу, подсказка и подробные объяснения открываются по желанию. Добавлены три коротких начальных упражнения с базовыми картами и действиями, без обязательной анкеты. Экран лаборатории больше не встречает пользователя формулами: сначала выбор из трёх понятных экспериментов («Кто выиграл?», «Ответить или сбросить?», «Повторить раздачу»), затем одно действие и короткое объяснение. Калькулятор, ручное редактирование карт и детали статистики остались под раскрываемыми настройками. Предыдущие сохранения и существующие учебные темы продолжают работать; это не солвер покерной стратегии.


## POCKET 2.3 — Story Mode

Академия полностью перестроена в формат визуальных уроков-историй без обязательных вопросов. Девять глав включают 48 детерминированных учебных сцен. Первая история «Твоя первая раздача» показывает восемь последовательных этапов: стол, две личные карты, блайнды, колл и чек, флоп, тёрн, ривер, вскрытие. Карты и фишки анимированы, каждая сцена доступна для повторного просмотра и имеет короткую реплику; подробности — по желанию.

Новый прогресс хранится отдельно в localStorage \`pocket-v23-stories\`, с проверкой корректности и сохранением текущей сцены. Старые результаты упражнений доступны в профиле как архив и не смешиваются с фактом просмотра визуального урока. Игровые партии и история раздач сохраняют старые ключи.

Лаборатория теперь показывает готовые комбинации и выигрышные пять карт, а изменение ставки сразу обновляет визуальные шансы и примерный математический результат; нет обязательного выбора правильного ответа. Редактор карт и продвинутые настройки остались. Поддерживается Reduce Motion.

Важно: математический пример лаборатории использует сильные допущения и не является GTO-солвером. Полноценное визуальное тестирование на реальных мобильных устройствах требуется отдельно.


## POCKET 2.3.1 — непрерывная визуальная история

Анимируются только изменения между соседними сценами. Сохранённые карты героя и соперника больше не вылетают заново при изменении ставки: на переходе с блайндов 5/10 (банк 15) к коллу/чеку (банк 20) обновляются банк и движение фишек. На флопе появляются только три новые карты, на тёрне и ривере — по одной; при вскрытии переворачиваются только скрытые карты соперника и подсвечивается комбинация. Повтор текущей сцены по явной команде заново запускает всю её анимацию. При движении назад используется фактически предыдущая показанная сцена, а не соседняя по номеру. Вход в урок, прогресс и механика игры не изменены.


## POCKET 2.4 — подсказка комбинации и памятка

В Story Mode анимация входящих фишек запускается только при первом формировании банка; дальнейшие изменения ставки обновляют только сумму и не вызывают новые полёты фишек. При явном повторе сцены анимация остаётся доступной. Во время реальной игры кнопка «? » в верхней панели открывает краткую памятку из десяти комбинаций. Переключатель «Подсказка» в нижней панели показывает текущую комбинацию героя и подсвечивает только карты, которые составляют её (без кикеров для пары/двух пар/сета). На префлопе обозначает пару или старшую карту без выдуманной пятёрки; на флопе и позже использует оценку движка для лучших пяти карт. Общая комбинация на борде помечается как общедоступная, без прогноза победы. Переключатель сохраняет состояние локально и по умолчанию выключен. Памятка также открывается в академии.


## POCKET 2.5 — Mobile & Copy Quality Pass

Mobile table: compact player stacks and bets, denomination details on tap, hand explanation in a sheet, restored classic green felt with brown rail and warm action buttons. Combination guide is on the home screen. Home distinguishes resuming a saved game from starting a new table; first-time games still open table configuration. Interests questionnaire and promotional tutorial descriptions removed. New `src/mobile-refine.css` is loaded after prior styles for isolated iPhone fixes.


## 2.5.1

Fix finished-game entry: Home's primary Start action always opens table configuration unless an active unfinished game exists. Trim remaining promotional copy in home, academy, lab and lesson UI. Restore a descriptive training title and remove misleading automatic-start wording.


## 2.5.2 — Mobile & Stability

The game stage uses actual measured dimensions for seat/bet positions (ResizeObserver + pure `table-layout.ts`). Small phone tables hide decorative seat avatars instead of clipping the betting controls. `save-state.ts` validates old game saves before hydration; malformed saved JSON is backed up under `pocket-v252-recovered-game` if storage permits, with a visible warning. Source-level tests validate multiple layouts and saved-game migrations; Playwright browser QA verifies mobile game controls and overlap on narrow viewports before deploy. No strategy grades are shown; decision-event logging starts in 2.6.0.


Playwright CI runs 14 mobile scenarios against both Chromium and WebKit (the engine behind Safari), checking overlap and game restoration. Results from Linux WebKit are not a substitute for hands-on testing on physical iOS Safari.


## POCKET 2.6.0 — Decision History Engine

Every *accepted betting decision* (fold, check, call, raise) by any player now creates one versioned factual `DecisionEvent`. The event contains player and hand identifiers, sequence, chosen action and actual contribution, rule-side legal options with exact-chip call constraints, and detached table views **before** the decision and **after** its effects and any dealer transition. The views contain public board, pot, stacks, positions, recent public action descriptions and the hero's own cards; they never contain future deck order or unrevealed opponents' hole cards. The event is appended before completion so the final fold/call is included in the replay archive. Up to 25 completed hands share the existing replay archive retention. Older saves and older replays receive empty decision arrays without losing chips or frames.

This is factual logging, **not** GTO analysis: no EV, strategy grades or invented confidence percentages are created. Blind posting and manual chip exchange remain in the replay/history but are not player *betting decisions*. The user-facing per-decision review interface is planned for 2.7.0 after replay infrastructure 2.6.1.
