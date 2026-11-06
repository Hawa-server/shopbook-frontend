# Design: the look of the app

This is the design to build from. It turns the app plan's **Design guide** into exact values and screens. If this file and the Design guide ever disagree, stop and ask.

The visual reference is the design canvas I share separately (brand, logo, colours, and seven phone screens). This file is what Claude Code works from; the canvas is for looking. **Where the canvas and this file differ, this file wins** (the canvas was drawn first; section 10 lists what changed since).

---

## 1. Brand name

The final name isn't chosen yet (options: **Ledga**, Tallo, Stalla, Nkoso). Until it is:

- The app's own name appears in exactly **one** place: the dictionary key `app.name` (English and Twi), value `"Shop Book"`. The manifest's `name`/`short_name` and the `<title>` read the same value at build time.
- **Never type the name anywhere else.** Changing the brand later must be a one-line change plus new icons.
- The **business's** name (e.g. "Adwoa Fabrics") is a different thing: it comes from Business settings (`businessName`) and is never typed into code.

---

## 2. Colours (design tokens)

Defined once as CSS variables in `src/index.css` and used through Tailwind. **No hex values in components.**

```css
:root {
  /* brand */
  --color-primary: #0F6B4A;        /* market green: main buttons, links, active tab (6.5:1 on white) */
  --color-primary-pressed: #0A4F37;
  --color-primary-soft: #E6F3EC;   /* light green background */
  --color-gold: #F2B544;           /* decoration only (logo awning, small highlights). Never text in gold, never white text on gold;
                                      ink text on gold is fine (9.4:1) */

  /* text and surfaces */
  --color-ink: #1B1B18;            /* all body text (17:1) */
  --color-ink-2: #45433C;          /* secondary text */
  --color-muted: #5C5A52;          /* labels, hints (6.9:1) */
  --color-ground: #F4F2EC;         /* screen background */
  --color-paper: #FFFFFF;          /* cards, inputs, header, tabs */
  --color-line: #E2DFD6;           /* dividers, card borders */
  --color-input-line: #858174;     /* input and switch borders: 3.9:1 on white, 3.5:1 on ground
                                      (a field's edge must reach 3:1 to be seen in sunlight) */

  /* status: always with a word and an icon */
  --color-owes: #A0480B;        --color-owes-soft: #FDF0E4;
  --color-paid: #0F6B4A;        --color-paid-soft: #E6F3EC;
  --color-low: #7A5300;         --color-low-soft: #FFF4D6;
  --color-pending: #3D5A80;     --color-pending-soft: #E9EEF5;   /* "Not sent yet" */
  --color-danger: #B42318;      --color-danger-soft: #FDECEA;    /* "Needs attention", Remove */
}
```

Every text colour above passes 4.5:1 on its own soft background and on white. Colours that must be told apart also differ in lightness, not just hue.

---

## 3. Type

- **In the app:** the system font stack only (`system-ui, Roboto, "Segoe UI", sans-serif`), so nothing is downloaded and it works offline.
- **Minimum sizes:** **16px** for anything a person must read to act (titles, prices, amounts, buttons, inputs, errors, messages). **14px** is allowed only for **secondary lines** (subtitles, "6 yards · 14 left", receipt details, dates). Bottom tab labels are **13px**, always under their icon. Nothing smaller.
- **Logo and wordmark only:** Bricolage Grotesque ExtraBold (800). The logo is an SVG, so the app never loads this font.
- Money uses `font-variant-numeric: tabular-nums` so columns line up.

| Use | Size / weight |
|---|---|
| Big money (balance, day total) | 40–44px / 800 |
| Cart or receipt total | 26–30px / 800 |
| Screen title (header) | 18px / 700 |
| List item title | 16–17px / 600 |
| Body | 16px / 400 |
| Secondary line, labels | 14–15px / 400–600 (never below 14) |
| Section heading ("HISTORY") | 14px / 700, uppercase, letter-spacing 0.08em, muted |
| Bottom tab label | 13px / 600 (700 when active) |

The 13px tab label is the only text under 14px, and it always sits under an icon. At 130% text, tab labels may wrap to two lines; the bar grows rather than cutting them off.

---

## 4. Spacing, shape, size

- Screen side padding **16px**; gap between cards **8–10px**; inside cards **14–20px**.
- Corner radius: buttons and list cards **14px**, big summary cards **18px**, inputs **12px**, chips fully round.
- **Buttons:** main action **56px** tall, full width, at the bottom within thumb reach; secondary 52px; small inline buttons and switch segments (Remove, +, Retail / Wholesale) **48px**. Nothing tappable is smaller than 48px.
- **Inputs:** 52px tall, 1.5px border, visible label above, error in words below.
- Designed at **390px** wide, must work at **360px** and with the phone's text at **130%** (cards grow taller; nothing overlaps or is cut off). Wider screens centre the content at max **480px**.
- No shadows needed; cards are white on the cream ground with a 1px line only where it helps.

---

## 5. Icons

Simple **stroke icons** drawn inline as SVG (24px, stroke 2–2.4, round caps), no icon library and no emoji. Every icon has a text label next to it or under it; icon-only buttons (Back, +) have an `aria-label` from the dictionary.

Tab icons: **Sell** (shopping bag), **Customers** (two people), **Stock** (box), **Today** (calendar), **More** (three dots).

---

## 6. Components

All in `src/components/`.

| Component | What it looks like |
|---|---|
| `Header` | White bar, bottom line. Left: back arrow (48px target) or the small logo (`logo-mark-small.svg`); title 18/700 with a 14px muted second line (business name, date). Right: sync `StatusChip`. |
| `BottomTabs` | White, top line, 68px tall, five equal tabs: icon over label. Active = primary colour, bold; others muted. Tabs a role can't use are hidden (see "Who sees what"). |
| `Button` | `primary` (green fill, white text), `secondary` (white, 2px green border, green text), `danger` (white, red border and text), `quiet` (no border). 56px default; `size="sm"` 48px (the smallest allowed). Disabled = 40% opacity and not clickable. |
| `Field` | Label (15/600) above, 52px input, hint or error (14px) below. Errors in `--color-danger` with an icon and words. |
| `MoneyText` | Formats pesewas as `GH₵ 1,240.00` via `lib/money.js`, with a **non-breaking space** after `GH₵` (`\u00A0`) and the whole amount in `white-space: nowrap`, so an amount never splits across lines; sizes `xl`, `lg`, `md`; optional colour for owes/paid. A minus is written "−" with a non-breaking space: `− GH₵ 150.00`. |
| `StatusChip` | Rounded pill: soft background, coloured bold text, icon + word: **Owes** (wallet), **Paid** (tick), **Low stock** (bars), **Not sent yet** / "2 not sent" (**clock**, as in the app plan's sync states), **Sending…** (circular arrows, only while a sync is actually running), **Needs attention** (warning triangle), **All sent** (tick). |
| `ListCard` | White, radius 14, padding 12–16; title + secondary line on the left, amount on the right, optional chevron or action button. Whole card tappable when it opens something (a real link or button, never a tappable div). |
| `SummaryCard` | White, radius 18, padding 18–20: a small label, a big `MoneyText`, then a 3-column breakdown (Cash · Mobile money · On credit). The credit cell uses the owes colours. |
| `Sheet` | Bottom sheet for pickers and confirmations, white, radius 18 on top, its main button at the bottom. |
| `ConfirmDialog` | For anything permanent: says what can't be undone, in plain words, with the safe choice as the secondary button. |
| `EmptyState` | One line of what's missing and one button to fix it ("No customers yet · Add a customer"). |
| `Toast` | "Sale saved", "Sent": short, announced to screen readers (`role="status"`), never the only place important information appears. |

---

## 7. Screens

The canvas shows these; build to match them. Sample names and amounts on the canvas are examples only.

**Everyone**
1. **Sell** (the app plan's FE7 has the full flow):
   - Header ("Sell", business name, sync chip). Under it a **Retail / Wholesale** switch for the whole sale (two 48px segments; Retail by default).
   - "Find a product" search. With the search empty, a **"Most sold this week"** list shows first, then all products.
   - Product cards: name, how many left, price (the retail or wholesale price, following the switch), and a 48px green **+**. A product already in the sale gets a 2px green border and "2.5 yards in sale"; low stock shows its chip.
   - **Choosing a size:** tapping a product with more than one size opens a `Sheet` listing its sizes (each with its price and how many left); a product with one size goes straight to quantity.
   - **Quantity:** a sheet with − / number / + (whole units, or half yards for yard products) and **Add to sale**.
   - **Agreed price:** in the sale review, each line has **Change price**: a money field and quick notes ("Regular customer", "Bulk", "Damaged", "Other"), with a warning in words when the price is below wholesale.
   - Fixed at the bottom: item count and the total (30/800), then **Review and save sale**. The review screen then takes payment, customer and confirmation as the app plan describes.
2. **Sale saved / receipt:** green tick and "Sale saved", with "Saved on this phone · sends when online" when not yet sent. A receipt card: **business name** and shop phone (from Business settings), receipt number and time, the lines, total, how it was paid, any amount still owed, the **receipt note** from settings, "Served by <name>". Buttons: **Send receipt on WhatsApp** (main), **Send by SMS**, **New sale**.
   - **Every receipt line has one format:** first line the product and size ("Ankara print · 6 yards", "Lace"); second line **quantity × unit price** ("1 × GH₵ 120.00", "2.5 yards × GH₵ 35.00"); the line amount on the right. The unit appears only for yard products.
   - The receipt number's format comes from `api.md` (BE5); the canvas's "#A-0143" is only a placeholder.
3. **Customer:** header with back, name and phone. Summary card: Owes chip, balance (44/800), "Oldest unpaid: 3 weeks ago · Limit GH₵ 1,000.00". **Record a repayment** (main) and **Send reminder on WhatsApp**. "History": repayments (green, "− GH₵ 150.00"), credit sales ("+ GH₵ 600.00"), paid sales with the Paid chip.
   - **Owner and manager:** history heading "History", showing everything.
   - **Sales associate:** they only receive their own sales and repayments, so the heading is **"Your sales with this customer"**, with the line "Sales by others aren't shown here." Show the balance and limit only as `api.md` gives them to associates; never work them out from the partial history. No full statement and no "Remind today". The second button reads **"Send balance on WhatsApp"** (not "Send reminder"), because associates send balances, not reminders.

**Owner and manager** (what each sees follows the app plan's "Who sees what")
4. **Today (owner):** "Today", business name and date, sync chip. Summary card: sales today, count, Cash / Mobile money / On credit. **Profit today** with "Only you can see this" (owner only). **Owed to you** with how many to remind today. "To check": refunds to check, low stock, counts to check, Needs attention, each a tappable row. **Close the day** at the bottom.
5. **Team and phones (owner):** "Team · 3 people": each person with initial avatar, name, role and phone count; **Add staff**. Pending invites show "Waiting for them to accept". "Phones": each phone with whose it is and when it was last seen, and **Remove** (danger, with a confirmation); "This phone" has no Remove.
6. **Business settings (owner; others read-only):** "On every receipt": Business name, Shop phone number, Receipt note (optional). "How the shop works": language for customers (English / Twi switch), low-stock warning level, return period, new-customer credit limit.
   - Each of the last three rows is a **tappable row** (a real button): label on the left, the value and a **chevron** on the right; tapping opens a `Sheet` with a number field and Save.
   - The line "Every phone in the shop updates after its next sync. Your staff can see these, but only you can change them." sits **after** the last card.
   - **Save settings** is fixed at the bottom; the scrolling content has bottom padding equal to the button area (about 88px plus the safe area), so nothing is ever hidden behind it.
   - For managers and associates: the same screen with plain values, no chevrons and no Save button.

**Sales associate**
7. **My day:** "My day", their name, business, date, sync chip. Summary card of **their own** sales only (no profit), and "Cash in your hand should be GH₵ …". "My sales": each with receipt number and time, customer and "on credit" where relevant, and the Not sent yet chip until sent. **New sale** at the bottom.

Screens not drawn yet (Stock, products, expenses, returns, close the day, sign-in) follow the same components and patterns; ask before inventing a new pattern.

---

## 8. Logo and icons

The mark is a **gold market awning over an open book with a tick**, on a market-green rounded square. Save these as files; they don't depend on the brand name.

`public/icons/logo-mark.svg` (the full mark: sign-in screen and anywhere above 48px):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="28" fill="#0F6B4A"/>
  <path d="M22 28 H98 V40 a9.5 9.5 0 0 1 -19 0 a9.5 9.5 0 0 1 -19 0 a9.5 9.5 0 0 1 -19 0 a9.5 9.5 0 0 1 -19 0 Z" fill="#F2B544"/>
  <path d="M26 58 Q43 52 58 58 V94 Q43 88 26 94 Z" fill="#FFFFFF"/>
  <path d="M62 58 Q77 52 94 58 V94 Q77 88 62 94 Z" fill="#FFFFFF"/>
  <path d="M33 68 H51 M33 76 H51 M33 84 H45" stroke="#0F6B4A" stroke-width="3" stroke-linecap="round"/>
  <path d="M70 76 l6 6 l11 -13" stroke="#0F6B4A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- **Small sizes (48px and under):** `public/icons/logo-mark-small.svg`, the same mark without the lines and the tick (the awning and book only). Used in the header at 34px and for small icons and the favicon.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="28" fill="#0F6B4A"/>
  <path d="M22 28 H98 V40 a9.5 9.5 0 0 1 -19 0 a9.5 9.5 0 0 1 -19 0 a9.5 9.5 0 0 1 -19 0 a9.5 9.5 0 0 1 -19 0 Z" fill="#F2B544"/>
  <path d="M26 58 Q43 52 58 58 V94 Q43 88 26 94 Z" fill="#FFFFFF"/>
  <path d="M62 58 Q77 52 94 58 V94 Q77 88 62 94 Z" fill="#FFFFFF"/>
</svg>
```
- **Android maskable icon:** full-bleed green square (no rounded corners), the awning and book scaled to the middle 70% so Android's mask never cuts them.
- **PNG icons** for the manifest (192, 512, maskable-512, apple-touch-180) are generated from the SVG in FE1; they'll be replaced when the name is chosen only if the mark changes.
- Theme colour in the manifest: `#0F6B4A`; background colour: `#F4F2EC`.

---

## 9. Writing on screen

- Short, plain words; say what happened and what to do next ("Couldn't send. It will try again when you're online.").
- Money always as `GH₵ 120.00`; yard quantities as "2.5 yards"; dates as "Tue 3 Nov", times as "2:15 pm".
- Every word comes from the English and Twi dictionaries through `t()`.

---

## 10. Changes since the canvas was drawn

The canvas hasn't been redrawn for these; build to this file:

- Secondary text is at least 14px and tab labels 13px (the canvas has some 12–13px lines).
- "Not sent yet" uses a clock icon; "Owes" uses a wallet icon (the canvas uses circular arrows and a clock).
- Sell has the Retail / Wholesale switch, "Most sold this week", the size and quantity sheets, and Change price.
- The associate's Customer screen says "Your sales with this customer".
- Business settings: tappable rows with chevrons, and the note no longer hidden behind Save.
- Amounts never wrap ("Limit GH₵ / 1,000.00" on the canvas is a bug).
- One receipt-line format.
- Receipt and phone codes on the canvas ("A-0143", "phone · A") are placeholders; the real format comes from `api.md`.
- Every tappable control is at least 48px (the Retail / Wholesale switch, small buttons, `size="sm"`), as the app plan's Design guide requires.
- The header's second line is 14px (only tab labels are 13px).
- The header uses the small logo (no lines or tick).
- Input borders are darker (`#858174`, 3.9:1) so fields can be seen in sunlight.

## 11. Screens still to design

Not on the canvas yet. Each is designed **before the task that builds it**, from the components above, and agreed before coding:

| Screen | Needed by |
|---|---|
| Sign up, sign in, forgot password, PIN set and PIN lock | FE2 |
| Sync status screen and "Needs attention" | FE3 |
| Stock list, stock in, stock count | FE6 |
| Confirmation sheet for permanent records (sale, repayment, write-off) | FE7 |
| Empty states (no products, no customers, no sales today) | the task that first shows each list |
| Owner's Today: the **"incomplete"** marker on profit when cost prices are missing (in words, with a link to "Cost price needed") | FE11 |
| Manager's Today: the owner's layout without profit or anything cost-based | FE11 |
| Practice-shop bar ("You're in the practice shop") | FE14 |
| Every screen checked in **Twi** and at **130% text** | each task's checks |

For each one, Claude Code proposes the layout **in words** using the patterns here (or I add it to the canvas), and waits for my OK.

