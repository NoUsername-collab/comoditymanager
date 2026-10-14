# Copii, paturi suplimentare și pătuțuri

Cum decide aplicația dacă o familie încape în camere, cum o împarte și cât costă.
Un singur calcul, `quoteStay` (`src/domain/availability/stay-quote.ts`), e folosit de
site-ul public, recepție, Gantt, confirmare, rebooking, editare și factură.
Serverul îl rulează din nou (`quoteStayForRooms`, `src/services/stay-quote.ts`) la orice salvare.

## Cine e cine

| Persoană | Vârstă (implicit) | Setare |
|---|---|---|
| Adult | 18+ | — |
| Bebeluș | 0–2 ani | `infant_max_age` (sau fără regulă) |
| Copil | până la 13 ani inclusiv | `child_max_age` |
| Adolescent | 14–17 ani | — |

Fiecare copil are vârsta salvată în `bookings.children_ages`. Rezervările vechi fără vârstă
își păstrează copiii ca „vârstă necunoscută” (pat propriu, ca înainte).

## Unde doarme fiecare

- **Adult, adolescent, vârstă necunoscută:** un loc de pat.
- **Bebeluș:** în patul părinților (câte unul de adult, dacă regula e pornită), altfel în pătuț,
  iar dacă nu e pătuț liber, pe un loc de pat.
- **Un copil pe cameră** poate dormi cu părinții. Dacă singurul minor e adolescent, poate și el.
- **Ceilalți copii** dorm câte doi într-un pat sau pe un pat suplimentar.
- **Niciun minor singur** într-o cameră. Excepție: părinții cer cameră separată și în ea e un adolescent.

## Limitele

| Limită | Unde se setează |
|---|---|
| Paturi în cameră + paturi suplimentare ale camerei | Cameră |
| Pătuțuri care încap în cameră (`rooms.max_cots`) | Cameră |
| Maxim persoane în cameră, bebeluși incluși (`rooms.max_occupancy`) | Cameră |
| Paturi suplimentare deținute de pensiune (`total_extra_beds_max`) | Setări → Locație |
| Pătuțuri deținute de pensiune (`total_cots_max`) | Setări → Locație |

Pătuțul **nu** e pat suplimentar: are cameră, stoc și taxă separate.

Ce folosește fiecare sejur din stoc nu se salvează: se recalculează din familie și camere
(`inventoryInUse`, `src/domain/availability/shared-inventory.ts`), pe cea mai aglomerată noapte.
Așa nu pot apărea diferențe între ce s-a salvat și ce e în realitate.

## Alegerea camerelor

1. O cameră pentru toată familia (cea mai ieftină întâi).
2. Două camere în aceeași clădire, apoi orice două camere. O familie care încape într-o cameră nu primește împărțire.
3. Grupuri mari: cele mai mari camere, apoi varianta cea mai ieftină.

În fiecare variantă se aleg cât mai puține paturi suplimentare și pătuțuri, ca stocul să ajungă pentru toți.

## Prețul

Prețul camerei (cu weekend și sezoane) plus, doar dacă pensiunea a setat taxe:
pat suplimentar × nopți × taxă și pătuț × nopți × taxă. Pe factură apar ca rânduri separate.
