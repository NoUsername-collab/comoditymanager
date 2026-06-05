# 100 clienți test — Casa Emil

Ghid pentru testare manuală: **pagina publică** (cerere rezervare) + **check-in** (identitate).

- Generat: 2026-06-05T20:44:50.133Z
- Români: **76** (76%) · Străini: **24** (24%, câte 3 per țară)
- Țări străine: MD, BG, HU, DE, FR, IT, UA, GB

## Cum testezi

1. **Pagina publică** (`/calendar`) — introdu câmpurile din secțiunea *Cerere publică*.
2. **Admin** — acceptă cererea, apoi la check-in completează *Check-in / Identitate*.
3. Clienții cu `check_in: null` — identitatea se introduce integral la check-in.
4. **Suprapuneri** — caută `CLUSTER-A` / `CLUSTER-B` pentru teste disponibilitate.
5. **Fraudă/dedup** — clienții **T061–T076** + filtru în HTML · vezi `test_catalog` în JSON.

---

## T001 — Român · CI + CNP · cuplu · 2026-06-20 → 2026-06-23 · suprapunere CLUSTER-A · suprapunere_aceeasi_perioada

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |
| Suprapunere | **CLUSTER-A** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-20` |
| Data check-out | `2026-06-23` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Popescu` |
| Prenume | `Ion` |
| Email | `ro.client.001@test.casaemil.local` |
| Telefon | `0720100000` |
| Mesaj | [TEST CLUSTER-A] Cerere suprapusă — suprapunere_aceeasi_perioada |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RX` |
| Nr. document | `100000` |
| Emis de | `SPCLEP Alba` |
| Data emitere | `2018-01-10` |
| Data expirare | `2028-01-09` |
| Tip ID național | `cnp` |
| ID național | `1650101010013` |
| Data nașterii | `1965-01-01` |
| Loc naștere | `Alba` |
| Naționalitate | `România` |
| Adresă | `Str. Alba nr. 1` |
| Localitate | `Alba` |
| Județ | `Alba` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T002 — Român · CI + CNP · single · 2026-06-20 → 2026-06-23 · suprapunere CLUSTER-A · suprapunere_aceeasi_perioada

| | |
|---|---|
| Cetățenie | România |
| Tip | single |
| Suprapunere | **CLUSTER-A** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-20` |
| Data check-out | `2026-06-23` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Ionescu` |
| Prenume | `Elena` |
| Email | `ro.client.002@test.casaemil.local` |
| Telefon | `0721100137` |
| Mesaj | [TEST CLUSTER-A] Cerere suprapusă — suprapunere_aceeasi_perioada |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RK` |
| Nr. document | `100001` |
| Emis de | `SPCLEP Arad` |
| Data emitere | `2018-02-10` |
| Data expirare | `2028-02-09` |
| Tip ID național | `cnp` |
| ID național | `2660202020025` |
| Data nașterii | `1966-02-02` |
| Loc naștere | `Arad` |
| Naționalitate | `România` |
| Adresă | `Str. Arad nr. 2` |
| Localitate | `Arad` |
| Județ | `Arad` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T003 — Român · CI + CNP · grup · 2026-06-20 → 2026-06-23 · suprapunere CLUSTER-A · suprapunere_aceeasi_perioada

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |
| Suprapunere | **CLUSTER-A** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-20` |
| Data check-out | `2026-06-23` |
| Adulți | 4 |
| Copii | 0 |
| Nume | `Popa` |
| Prenume | `Mihai` |
| Email | `ro.client.003@test.casaemil.local` |
| Telefon | `0722100274` |
| Mesaj | [TEST CLUSTER-A] Cerere suprapusă — suprapunere_aceeasi_perioada |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `SB` |
| Nr. document | `100002` |
| Emis de | `SPCLEP Argeș` |
| Data emitere | `2018-03-10` |
| Data expirare | `2028-03-09` |
| Tip ID național | `cnp` |
| ID național | `1670303030033` |
| Data nașterii | `1967-03-03` |
| Loc naștere | `Argeș` |
| Naționalitate | `România` |
| Adresă | `Str. Argeș nr. 3` |
| Localitate | `Argeș` |
| Județ | `Argeș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T004 — Român · CI + CNP · familie · 2026-06-20 → 2026-06-23 · suprapunere CLUSTER-A · suprapunere_aceeasi_perioada

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |
| Suprapunere | **CLUSTER-A** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-20` |
| Data check-out | `2026-06-23` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 7 |
| Nume | `Radu` |
| Prenume | `Ioana` |
| Email | `ro.client.004@test.casaemil.local` |
| Telefon | `0723100411` |
| Mesaj | [TEST CLUSTER-A] Cerere suprapusă — suprapunere_aceeasi_perioada |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `TM` |
| Nr. document | `100003` |
| Emis de | `SPCLEP Bacău` |
| Data emitere | `2018-04-10` |
| Data expirare | `2028-04-09` |
| Tip ID național | `cnp` |
| ID național | `2680404040045` |
| Data nașterii | `1968-04-04` |
| Loc naștere | `Bacău` |
| Naționalitate | `România` |
| Adresă | `Str. Bacău nr. 4` |
| Localitate | `Bacău` |
| Județ | `Bacău` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T005 — Român · CI + CNP · grup · 2026-06-20 → 2026-06-23 · suprapunere CLUSTER-A · suprapunere_aceeasi_perioada

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |
| Suprapunere | **CLUSTER-A** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-20` |
| Data check-out | `2026-06-23` |
| Adulți | 3 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 12 |
| Nume | `Stan` |
| Prenume | `Cristian` |
| Email | `ro.client.005@test.casaemil.local` |
| Telefon | `0724100548` |
| Mesaj | [TEST CLUSTER-A] Cerere suprapusă — suprapunere_aceeasi_perioada |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `IS` |
| Nr. document | `100004` |
| Emis de | `SPCLEP Bihor` |
| Data emitere | `2018-05-10` |
| Data expirare | `2028-05-09` |
| Tip ID național | `cnp` |
| ID național | `1690505050053` |
| Data nașterii | `1969-05-05` |
| Loc naștere | `Bihor` |
| Naționalitate | `România` |
| Adresă | `Str. Bihor nr. 5` |
| Localitate | `Bihor` |
| Județ | `Bihor` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T006 — Român · CI + CNP · cuplu · 2026-07-01 → 2026-07-06 · suprapunere CLUSTER-B · suprapunere_partiala

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |
| Suprapunere | **CLUSTER-B** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-01` |
| Data check-out | `2026-07-06` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Dumitru` |
| Prenume | `Gabriela` |
| Email | `ro.client.006@test.casaemil.local` |
| Telefon | `0725100685` |
| Mesaj | [TEST CLUSTER-B] Cerere suprapusă — suprapunere_partiala |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CT` |
| Nr. document | `100005` |
| Emis de | `SPCLEP Brașov` |
| Data emitere | `2018-06-10` |
| Data expirare | `2028-06-09` |
| Tip ID național | `cnp` |
| ID național | `2700606060061` |
| Data nașterii | `1970-06-06` |
| Loc naștere | `Brașov` |
| Naționalitate | `România` |
| Adresă | `Str. Brașov nr. 6` |
| Localitate | `Brașov` |
| Județ | `Brașov` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T007 — Român · CI + CNP · cuplu · 2026-07-03 → 2026-07-08 · suprapunere CLUSTER-B · suprapunere_partiala

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |
| Suprapunere | **CLUSTER-B** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-03` |
| Data check-out | `2026-07-08` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Munteanu` |
| Prenume | `Stefan` |
| Email | `ro.client.007@test.casaemil.local` |
| Telefon | `0726100822` |
| Mesaj | [TEST CLUSTER-B] Cerere suprapusă — suprapunere_partiala |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BV` |
| Nr. document | `100006` |
| Emis de | `SPCLEP București` |
| Data emitere | `2018-07-10` |
| Data expirare | `2028-07-09` |
| Tip ID național | `cnp` |
| ID național | `1710707070078` |
| Data nașterii | `1971-07-07` |
| Loc naștere | `București` |
| Naționalitate | `România` |
| Adresă | `Str. București nr. 7` |
| Localitate | `Sector 2` |
| Județ | `București` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T008 — Român · CI + CNP · single · 2026-07-04 → 2026-07-10 · suprapunere CLUSTER-B · suprapunere_partiala

| | |
|---|---|
| Cetățenie | România |
| Tip | single |
| Suprapunere | **CLUSTER-B** |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-04` |
| Data check-out | `2026-07-10` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Gheorghe` |
| Prenume | `Diana` |
| Email | `ro.client.008@test.casaemil.local` |
| Telefon | `0727100959` |
| Mesaj | [TEST CLUSTER-B] Cerere suprapusă — suprapunere_partiala |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CJ` |
| Nr. document | `100007` |
| Emis de | `SPCLEP Cluj` |
| Data emitere | `2018-08-10` |
| Data expirare | `2028-08-09` |
| Tip ID național | `cnp` |
| ID național | `2720808080081` |
| Data nașterii | `1972-08-08` |
| Loc naștere | `Cluj` |
| Naționalitate | `România` |
| Adresă | `Str. Cluj nr. 8` |
| Localitate | `Cluj` |
| Județ | `Cluj` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T009 — Român · CI + CNP · single · 2026-06-12 → 2026-06-13 · 1_noapte

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-12` |
| Data check-out | `2026-06-13` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Stoica` |
| Prenume | `Bogdan` |
| Email | `ro.client.009@test.casaemil.local` |
| Telefon | `0728101096` |
| Mesaj | [TEST] 1_noapte |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `MM` |
| Nr. document | `100008` |
| Emis de | `SPCLEP Constanța` |
| Data emitere | `2018-09-10` |
| Data expirare | `2028-09-09` |
| Tip ID național | `cnp` |
| ID național | `1730909090098` |
| Data nașterii | `1973-09-09` |
| Loc naștere | `Constanța` |
| Naționalitate | `România` |
| Adresă | `Str. Constanța nr. 9` |
| Localitate | `Constanța` |
| Județ | `Constanța` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T010 — Român · CI + CNP · cuplu · 2026-06-14 → 2026-06-15 · 1_noapte

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-14` |
| Data check-out | `2026-06-15` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Florea` |
| Prenume | `Geanina` |
| Email | `ro.client.010@test.casaemil.local` |
| Telefon | `0729101233` |
| Mesaj | [TEST] 1_noapte |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `DJ` |
| Nr. document | `100009` |
| Emis de | `SPCLEP Covasna` |
| Data emitere | `2018-10-10` |
| Data expirare | `2028-10-09` |
| Tip ID național | `cnp` |
| ID național | `2741010100109` |
| Data nașterii | `1974-10-10` |
| Loc naștere | `Covasna` |
| Naționalitate | `România` |
| Adresă | `Str. Covasna nr. 10` |
| Localitate | `Covasna` |
| Județ | `Covasna` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T011 — Român · CI + CNP · cuplu · 2026-06-19 → 2026-06-21 · weekend_vineri_duminica

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-19` |
| Data check-out | `2026-06-21` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Diaconu` |
| Prenume | `Adrian` |
| Email | `ro.client.011@test.casaemil.local` |
| Telefon | `0730101370` |
| Mesaj | [TEST] weekend_vineri_duminica |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BC` |
| Nr. document | `100010` |
| Emis de | `SPCLEP Dolj` |
| Data emitere | `2018-11-10` |
| Data expirare | `2028-11-09` |
| Tip ID național | `cnp` |
| ID național | `1751111110117` |
| Data nașterii | `1975-11-11` |
| Loc naștere | `Dolj` |
| Naționalitate | `România` |
| Adresă | `Str. Dolj nr. 11` |
| Localitate | `Dolj` |
| Județ | `Dolj` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T012 — Român · CI + CNP · familie · 2026-08-01 → 2026-08-08 · 7_nopti

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-08-01` |
| Data check-out | `2026-08-08` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 5 |
| Nume | `Marin` |
| Prenume | `Laura` |
| Email | `ro.client.012@test.casaemil.local` |
| Telefon | `0731101507` |
| Mesaj | [TEST] 7_nopti |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `GL` |
| Nr. document | `100011` |
| Emis de | `SPCLEP Galați` |
| Data emitere | `2018-12-10` |
| Data expirare | `2028-12-09` |
| Tip ID național | `cnp` |
| ID național | `2761212120129` |
| Data nașterii | `1976-12-12` |
| Loc naștere | `Galați` |
| Naționalitate | `România` |
| Adresă | `Str. Galați nr. 12` |
| Localitate | `Galați` |
| Județ | `Galați` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T013 — Român · CI + CNP · single · 2026-09-10 → 2026-09-24 · 14_nopti

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-09-10` |
| Data check-out | `2026-09-24` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Tudor` |
| Prenume | `Dan` |
| Email | `ro.client.013@test.casaemil.local` |
| Telefon | `0732101644` |
| Mesaj | [TEST] 14_nopti |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RX` |
| Nr. document | `100012` |
| Emis de | `SPCLEP Harghita` |
| Data emitere | `2018-01-10` |
| Data expirare | `2028-01-09` |
| Tip ID național | `cnp` |
| ID național | `1770113130139` |
| Data nașterii | `1977-01-13` |
| Loc naștere | `Harghita` |
| Naționalitate | `România` |
| Adresă | `Str. Harghita nr. 13` |
| Localitate | `Harghita` |
| Județ | `Harghita` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T014 — Român · CI + CNP · familie · 2026-06-25 → 2026-06-28 · minor_3_ani

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-25` |
| Data check-out | `2026-06-28` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 3 |
| Nume | `Barbu` |
| Prenume | `Nicoleta` |
| Email | `ro.client.014@test.casaemil.local` |
| Telefon | `0733101781` |
| Mesaj | [TEST] minor_3_ani |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RK` |
| Nr. document | `100013` |
| Emis de | `SPCLEP Iași` |
| Data emitere | `2018-02-10` |
| Data expirare | `2028-02-09` |
| Tip ID național | `cnp` |
| ID național | `2780214140140` |
| Data nașterii | `1978-02-14` |
| Loc naștere | `Iași` |
| Naționalitate | `România` |
| Adresă | `Str. Iași nr. 14` |
| Localitate | `Iași` |
| Județ | `Iași` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T015 — Român · CI + CNP · familie · 2026-06-25 → 2026-06-28 · minor_16_ani

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-25` |
| Data check-out | `2026-06-28` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 16 |
| Nume | `Moldovan` |
| Prenume | `Felix` |
| Email | `ro.client.015@test.casaemil.local` |
| Telefon | `0734101918` |
| Mesaj | [TEST] minor_16_ani |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `SB` |
| Nr. document | `100014` |
| Emis de | `SPCLEP Maramureș` |
| Data emitere | `2018-03-10` |
| Data expirare | `2028-03-09` |
| Tip ID național | `cnp` |
| ID național | `1790315150159` |
| Data nașterii | `1979-03-15` |
| Loc naștere | `Maramureș` |
| Naționalitate | `România` |
| Adresă | `Str. Maramureș nr. 15` |
| Localitate | `Maramureș` |
| Județ | `Maramureș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T016 — Român · CI + CNP · grup · 2026-07-15 → 2026-07-18 · grup_6_adulti

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-15` |
| Data check-out | `2026-07-18` |
| Adulți | 6 |
| Copii | 0 |
| Nume | `Neagu` |
| Prenume | `Paula` |
| Email | `ro.client.016@test.casaemil.local` |
| Telefon | `0735102055` |
| Mesaj | [TEST] grup_6_adulti |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `TM` |
| Nr. document | `100015` |
| Emis de | `SPCLEP Mureș` |
| Data emitere | `2018-04-10` |
| Data expirare | `2028-04-09` |
| Tip ID național | `cnp` |
| ID național | `2800416160165` |
| Data nașterii | `1980-04-16` |
| Loc naștere | `Mureș` |
| Naționalitate | `România` |
| Adresă | `Str. Mureș nr. 16` |
| Localitate | `Mureș` |
| Județ | `Mureș` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T017 — Român · CI + CNP · grup · 2026-07-15 → 2026-07-18 · grup_5_adulti_2_copii

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-15` |
| Data check-out | `2026-07-18` |
| Adulți | 5 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 9 |
| Nume | `Constantinescu` |
| Prenume | `Horia` |
| Email | `ro.client.017@test.casaemil.local` |
| Telefon | `0736102192` |
| Mesaj | [TEST] grup_5_adulti_2_copii |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `IS` |
| Nr. document | `100016` |
| Emis de | `SPCLEP Neamț` |
| Data emitere | `2018-05-10` |
| Data expirare | `2028-05-09` |
| Tip ID național | `cnp` |
| ID național | `1810517170173` |
| Data nașterii | `1981-05-17` |
| Loc naștere | `Neamț` |
| Naționalitate | `România` |
| Adresă | `Str. Neamț nr. 17` |
| Localitate | `Neamț` |
| Județ | `Neamț` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T018 — Român · CI + CNP · cuplu · 2026-06-10 → 2026-06-12 · back_to_back_A

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-10` |
| Data check-out | `2026-06-12` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Dobre` |
| Prenume | `Simona` |
| Email | `ro.client.018@test.casaemil.local` |
| Telefon | `0737102329` |
| Mesaj | [TEST] back_to_back_A |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CT` |
| Nr. document | `100017` |
| Emis de | `SPCLEP Prahova` |
| Data emitere | `2018-06-10` |
| Data expirare | `2028-06-09` |
| Tip ID național | `cnp` |
| ID național | `2820618180185` |
| Data nașterii | `1982-06-18` |
| Loc naștere | `Prahova` |
| Naționalitate | `România` |
| Adresă | `Str. Prahova nr. 18` |
| Localitate | `Prahova` |
| Județ | `Prahova` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T019 — Român · CI + CNP · cuplu · 2026-06-12 → 2026-06-14 · back_to_back_B_aceeasi_persoana

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-12` |
| Data check-out | `2026-06-14` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Cristea` |
| Prenume | `Lucian` |
| Email | `ro.client.019@test.casaemil.local` |
| Telefon | `0738102466` |
| Mesaj | [TEST] Aceeași persoană ca clientul anterior (back-to-back) |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BV` |
| Nr. document | `100018` |
| Emis de | `SPCLEP Sibiu` |
| Data emitere | `2018-07-10` |
| Data expirare | `2028-07-09` |
| Tip ID național | `cnp` |
| ID național | `1830719190193` |
| Data nașterii | `1983-07-19` |
| Loc naștere | `Sibiu` |
| Naționalitate | `România` |
| Adresă | `Str. Sibiu nr. 19` |
| Localitate | `Sibiu` |
| Județ | `Sibiu` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T020 — Român · CI + CNP · single · 2026-06-15 → 2026-06-17

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-15` |
| Data check-out | `2026-06-17` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Nistor` |
| Prenume | `Veronica` |
| Email | `ro.client.020@test.casaemil.local` |
| Telefon | `0739102603` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CJ` |
| Nr. document | `100019` |
| Emis de | `SPCLEP Suceava` |
| Data emitere | `2018-08-10` |
| Data expirare | `2028-08-09` |
| Tip ID național | `cnp` |
| ID național | `2840820200201` |
| Data nașterii | `1984-08-20` |
| Loc naștere | `Suceava` |
| Naționalitate | `România` |
| Adresă | `Str. Suceava nr. 20` |
| Localitate | `Suceava` |
| Județ | `Suceava` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T021 — Român · CI + CNP · cuplu · 2026-06-16 → 2026-06-19

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-16` |
| Data check-out | `2026-06-19` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Oprea` |
| Prenume | `Nicolae` |
| Email | `ro.client.021@test.casaemil.local` |
| Telefon | `0740102740` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `MM` |
| Nr. document | `100020` |
| Emis de | `SPCLEP Timiș` |
| Data emitere | `2018-09-10` |
| Data expirare | `2028-09-09` |
| Tip ID național | `cnp` |
| ID național | `1850921210218` |
| Data nașterii | `1985-09-21` |
| Loc naștere | `Timiș` |
| Naționalitate | `România` |
| Adresă | `Str. Timiș nr. 21` |
| Localitate | `Timiș` |
| Județ | `Timiș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T022 — Român · CI + CNP · familie · 2026-06-17 → 2026-06-21

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-17` |
| Data check-out | `2026-06-21` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 6 |
| Nume | `Pavel` |
| Prenume | `Bianca` |
| Email | `ro.client.022@test.casaemil.local` |
| Telefon | `0741102877` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `DJ` |
| Nr. document | `100021` |
| Emis de | `SPCLEP Vâlcea` |
| Data emitere | `2018-10-10` |
| Data expirare | `2028-10-09` |
| Tip ID național | `cnp` |
| ID național | `2861022220224` |
| Data nașterii | `1986-10-22` |
| Loc naștere | `Vâlcea` |
| Naționalitate | `România` |
| Adresă | `Str. Vâlcea nr. 22` |
| Localitate | `Vâlcea` |
| Județ | `Vâlcea` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T023 — Român · CI + CNP · familie · 2026-06-18 → 2026-06-23

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-18` |
| Data check-out | `2026-06-23` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 9 |
| Nume | `Roman` |
| Prenume | `Paul` |
| Email | `ro.client.023@test.casaemil.local` |
| Telefon | `0742103014` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BC` |
| Nr. document | `100022` |
| Emis de | `SPCLEP Vrancea` |
| Data emitere | `2018-11-10` |
| Data expirare | `2028-11-09` |
| Tip ID național | `cnp` |
| ID național | `1871123230232` |
| Data nașterii | `1987-11-23` |
| Loc naștere | `Vrancea` |
| Naționalitate | `România` |
| Adresă | `Str. Vrancea nr. 23` |
| Localitate | `Vrancea` |
| Județ | `Vrancea` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T024 — Român · CI + CNP · grup · 2026-06-19 → 2026-06-26

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-19` |
| Data check-out | `2026-06-26` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Sava` |
| Prenume | `Denisa` |
| Email | `ro.client.024@test.casaemil.local` |
| Telefon | `0743103151` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `GL` |
| Nr. document | `100023` |
| Emis de | `SPCLEP Ilfov` |
| Data emitere | `2018-12-10` |
| Data expirare | `2028-12-09` |
| Tip ID național | `cnp` |
| ID național | `2881224240244` |
| Data nașterii | `1988-12-24` |
| Loc naștere | `Ilfov` |
| Naționalitate | `România` |
| Adresă | `Str. Ilfov nr. 24` |
| Localitate | `Ilfov` |
| Județ | `Ilfov` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T025 — Român · CI + CNP · grup · 2026-06-20 → 2026-06-22

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-20` |
| Data check-out | `2026-06-22` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Toma` |
| Prenume | `Sorin` |
| Email | `ro.client.025@test.casaemil.local` |
| Telefon | `0744103288` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RX` |
| Nr. document | `100024` |
| Emis de | `SPCLEP Alba` |
| Data emitere | `2018-01-10` |
| Data expirare | `2028-01-09` |
| Tip ID național | `cnp` |
| ID național | `1890125250254` |
| Data nașterii | `1989-01-25` |
| Loc naștere | `Alba` |
| Naționalitate | `România` |
| Adresă | `Str. Alba nr. 25` |
| Localitate | `Alba` |
| Județ | `Alba` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T026 — Român · CI + CNP · single · 2026-06-21 → 2026-06-24

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-21` |
| Data check-out | `2026-06-24` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Ungureanu` |
| Prenume | `Felicia` |
| Email | `ro.client.026@test.casaemil.local` |
| Telefon | `0745103425` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RK` |
| Nr. document | `100025` |
| Emis de | `SPCLEP Arad` |
| Data emitere | `2018-02-10` |
| Data expirare | `2028-02-09` |
| Tip ID național | `cnp` |
| ID național | `2900226260260` |
| Data nașterii | `1990-02-26` |
| Loc naștere | `Arad` |
| Naționalitate | `România` |
| Adresă | `Str. Arad nr. 26` |
| Localitate | `Arad` |
| Județ | `Arad` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T027 — Român · CI + CNP · cuplu · 2026-06-22 → 2026-06-26

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-22` |
| Data check-out | `2026-06-26` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Vasile` |
| Prenume | `Valentin` |
| Email | `ro.client.027@test.casaemil.local` |
| Telefon | `0746103562` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `SB` |
| Nr. document | `100026` |
| Emis de | `SPCLEP Argeș` |
| Data emitere | `2018-03-10` |
| Data expirare | `2028-03-09` |
| Tip ID național | `cnp` |
| ID național | `1910327270279` |
| Data nașterii | `1991-03-27` |
| Loc naștere | `Argeș` |
| Naționalitate | `România` |
| Adresă | `Str. Argeș nr. 27` |
| Localitate | `Argeș` |
| Județ | `Argeș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T028 — Român · CI + CNP · familie · 2026-06-23 → 2026-06-28

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-23` |
| Data check-out | `2026-06-28` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 12 |
| Nume | `Zamfir` |
| Prenume | `Helena` |
| Email | `ro.client.028@test.casaemil.local` |
| Telefon | `0747103699` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `TM` |
| Nr. document | `100027` |
| Emis de | `SPCLEP Bacău` |
| Data emitere | `2018-04-10` |
| Data expirare | `2028-04-09` |
| Tip ID național | `cnp` |
| ID național | `2920401280280` |
| Data nașterii | `1992-04-01` |
| Loc naștere | `Bacău` |
| Naționalitate | `România` |
| Adresă | `Str. Bacău nr. 28` |
| Localitate | `Bacău` |
| Județ | `Bacău` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T029 — Român · CI + CNP · familie · 2026-06-24 → 2026-07-01

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-24` |
| Data check-out | `2026-07-01` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 7 |
| Nume | `Anghel` |
| Prenume | `Catalin` |
| Email | `ro.client.029@test.casaemil.local` |
| Telefon | `0748103836` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `IS` |
| Nr. document | `100028` |
| Emis de | `SPCLEP Bihor` |
| Data emitere | `2018-05-10` |
| Data expirare | `2028-05-09` |
| Tip ID național | `cnp` |
| ID național | `1930502290299` |
| Data nașterii | `1993-05-02` |
| Loc naștere | `Bihor` |
| Naționalitate | `România` |
| Adresă | `Str. Bihor nr. 29` |
| Localitate | `Bihor` |
| Județ | `Bihor` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T030 — Român · CI + CNP · grup · 2026-06-25 → 2026-06-27

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-25` |
| Data check-out | `2026-06-27` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Badea` |
| Prenume | `Jana` |
| Email | `ro.client.030@test.casaemil.local` |
| Telefon | `0749103973` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CT` |
| Nr. document | `100029` |
| Emis de | `SPCLEP Brașov` |
| Data emitere | `2018-06-10` |
| Data expirare | `2028-06-09` |
| Tip ID național | `cnp` |
| ID național | `2940603300307` |
| Data nașterii | `1994-06-03` |
| Loc naștere | `Brașov` |
| Naționalitate | `România` |
| Adresă | `Str. Brașov nr. 30` |
| Localitate | `Brașov` |
| Județ | `Brașov` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T031 — Român · CI + CNP · grup · 2026-06-26 → 2026-06-29

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-26` |
| Data check-out | `2026-06-29` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Ciobanu` |
| Prenume | `Emil` |
| Email | `ro.client.031@test.casaemil.local` |
| Telefon | `0750104110` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BV` |
| Nr. document | `100030` |
| Emis de | `SPCLEP București` |
| Data emitere | `2018-07-10` |
| Data expirare | `2028-07-09` |
| Tip ID național | `cnp` |
| ID național | `1950704310315` |
| Data nașterii | `1995-07-04` |
| Loc naștere | `București` |
| Naționalitate | `România` |
| Adresă | `Str. București nr. 31` |
| Localitate | `Sector 2` |
| Județ | `București` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T032 — Român · CI + CNP · single · 2026-06-27 → 2026-07-01

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-27` |
| Data check-out | `2026-07-01` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Dragomir` |
| Prenume | `Larisa` |
| Email | `ro.client.032@test.casaemil.local` |
| Telefon | `0751104247` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CJ` |
| Nr. document | `100031` |
| Emis de | `SPCLEP Cluj` |
| Data emitere | `2018-08-10` |
| Data expirare | `2028-08-09` |
| Tip ID național | `cnp` |
| ID național | `2960805320327` |
| Data nașterii | `1996-08-05` |
| Loc naștere | `Cluj` |
| Naționalitate | `România` |
| Adresă | `Str. Cluj nr. 32` |
| Localitate | `Cluj` |
| Județ | `Cluj` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T033 — Român · CI + CNP · cuplu · 2026-06-28 → 2026-07-03

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-28` |
| Data check-out | `2026-07-03` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Enache` |
| Prenume | `Gheorghe` |
| Email | `ro.client.033@test.casaemil.local` |
| Telefon | `0752104384` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `MM` |
| Nr. document | `100032` |
| Emis de | `SPCLEP Constanța` |
| Data emitere | `2018-09-10` |
| Data expirare | `2028-09-09` |
| Tip ID național | `cnp` |
| ID național | `1970906330335` |
| Data nașterii | `1997-09-06` |
| Loc naștere | `Constanța` |
| Naționalitate | `România` |
| Adresă | `Str. Constanța nr. 33` |
| Localitate | `Constanța` |
| Județ | `Constanța` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T034 — Român · CI + CNP · familie · 2026-06-29 → 2026-07-06

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-29` |
| Data check-out | `2026-07-06` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 8 |
| Nume | `Filip` |
| Prenume | `Natalia` |
| Email | `ro.client.034@test.casaemil.local` |
| Telefon | `0753104521` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `DJ` |
| Nr. document | `100033` |
| Emis de | `SPCLEP Covasna` |
| Data emitere | `2018-10-10` |
| Data expirare | `2028-10-09` |
| Tip ID național | `cnp` |
| ID național | `2981007340341` |
| Data nașterii | `1998-10-07` |
| Loc naștere | `Covasna` |
| Naționalitate | `România` |
| Adresă | `Str. Covasna nr. 34` |
| Localitate | `Covasna` |
| Județ | `Covasna` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T035 — Român · CI + CNP · familie · 2026-06-30 → 2026-07-02

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-30` |
| Data check-out | `2026-07-02` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 13 |
| Nume | `Georgescu` |
| Prenume | `Laurentiu` |
| Email | `ro.client.035@test.casaemil.local` |
| Telefon | `0754104658` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BC` |
| Nr. document | `100034` |
| Emis de | `SPCLEP Dolj` |
| Data emitere | `2018-11-10` |
| Data expirare | `2028-11-09` |
| Tip ID național | `cnp` |
| ID național | `1991108350351` |
| Data nașterii | `1999-11-08` |
| Loc naștere | `Dolj` |
| Naționalitate | `România` |
| Adresă | `Str. Dolj nr. 35` |
| Localitate | `Dolj` |
| Județ | `Dolj` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T036 — Român · CI + CNP · grup · 2026-07-01 → 2026-07-04

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-01` |
| Data check-out | `2026-07-04` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Hanganu` |
| Prenume | `Patricia` |
| Email | `ro.client.036@test.casaemil.local` |
| Telefon | `0755104795` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `GL` |
| Nr. document | `100035` |
| Emis de | `SPCLEP Galați` |
| Data emitere | `2018-12-10` |
| Data expirare | `2028-12-09` |
| Tip ID național | `cnp` |
| ID național | `6001209360361` |
| Data nașterii | `2000-12-09` |
| Loc naștere | `Galați` |
| Naționalitate | `România` |
| Adresă | `Str. Galați nr. 36` |
| Localitate | `Galați` |
| Județ | `Galați` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T037 — Român · CI + CNP · grup · 2026-07-02 → 2026-07-06

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-02` |
| Data check-out | `2026-07-06` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Iacob` |
| Prenume | `Petru` |
| Email | `ro.client.037@test.casaemil.local` |
| Telefon | `0756104932` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RX` |
| Nr. document | `100036` |
| Emis de | `SPCLEP Harghita` |
| Data emitere | `2018-01-10` |
| Data expirare | `2028-01-09` |
| Tip ID național | `cnp` |
| ID național | `5010110370378` |
| Data nașterii | `2001-01-10` |
| Loc naștere | `Harghita` |
| Naționalitate | `România` |
| Adresă | `Str. Harghita nr. 37` |
| Localitate | `Harghita` |
| Județ | `Harghita` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T038 — Român · CI + CNP · single · 2026-07-03 → 2026-07-08

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-03` |
| Data check-out | `2026-07-08` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Jianu` |
| Prenume | `Sabina` |
| Email | `ro.client.038@test.casaemil.local` |
| Telefon | `0757105069` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RK` |
| Nr. document | `100037` |
| Emis de | `SPCLEP Iași` |
| Data emitere | `2018-02-10` |
| Data expirare | `2028-02-09` |
| Tip ID național | `cnp` |
| ID național | `6020211380381` |
| Data nașterii | `2002-02-11` |
| Loc naștere | `Iași` |
| Naționalitate | `România` |
| Adresă | `Str. Iași nr. 38` |
| Localitate | `Iași` |
| Județ | `Iași` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T039 — Român · CI + CNP · cuplu · 2026-07-04 → 2026-07-11

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-04` |
| Data check-out | `2026-07-11` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Kovacs` |
| Prenume | `Sebastian` |
| Email | `ro.client.039@test.casaemil.local` |
| Telefon | `0758105206` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `SB` |
| Nr. document | `100038` |
| Emis de | `SPCLEP Maramureș` |
| Data emitere | `2018-03-10` |
| Data expirare | `2028-03-09` |
| Tip ID național | `cnp` |
| ID național | `5030312390398` |
| Data nașterii | `2003-03-12` |
| Loc naștere | `Maramureș` |
| Naționalitate | `România` |
| Adresă | `Str. Maramureș nr. 39` |
| Localitate | `Maramureș` |
| Județ | `Maramureș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T040 — Român · CI + CNP · familie · 2026-07-05 → 2026-07-07

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-05` |
| Data check-out | `2026-07-07` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 4 |
| Nume | `Lazar` |
| Prenume | `Ursula` |
| Email | `ro.client.040@test.casaemil.local` |
| Telefon | `0759105343` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `TM` |
| Nr. document | `100039` |
| Emis de | `SPCLEP Mureș` |
| Data emitere | `2018-04-10` |
| Data expirare | `2028-04-09` |
| Tip ID național | `cnp` |
| ID național | `6040413400406` |
| Data nașterii | `2004-04-13` |
| Loc naștere | `Mureș` |
| Naționalitate | `România` |
| Adresă | `Str. Mureș nr. 40` |
| Localitate | `Mureș` |
| Județ | `Mureș` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T041 — Român · CI + CNP · familie · 2026-07-06 → 2026-07-09

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-06` |
| Data check-out | `2026-07-09` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Mihai` |
| Prenume | `Vasile` |
| Email | `ro.client.041@test.casaemil.local` |
| Telefon | `0760105480` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `IS` |
| Nr. document | `100040` |
| Emis de | `SPCLEP Neamț` |
| Data emitere | `2018-05-10` |
| Data expirare | `2028-05-09` |
| Tip ID național | `cnp` |
| ID național | `1650514410415` |
| Data nașterii | `1965-05-14` |
| Loc naștere | `Neamț` |
| Naționalitate | `România` |
| Adresă | `Str. Neamț nr. 41` |
| Localitate | `Neamț` |
| Județ | `Neamț` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T042 — Român · CI + CNP · grup · 2026-07-07 → 2026-07-11

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-07` |
| Data check-out | `2026-07-11` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Nita` |
| Prenume | `Xenia` |
| Email | `ro.client.042@test.casaemil.local` |
| Telefon | `0761105617` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CT` |
| Nr. document | `100041` |
| Emis de | `SPCLEP Prahova` |
| Data emitere | `2018-06-10` |
| Data expirare | `2028-06-09` |
| Tip ID național | `cnp` |
| ID național | `2660615420427` |
| Data nașterii | `1966-06-15` |
| Loc naștere | `Prahova` |
| Naționalitate | `România` |
| Adresă | `Str. Prahova nr. 42` |
| Localitate | `Prahova` |
| Județ | `Prahova` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T043 — Român · CI + CNP · grup · 2026-07-08 → 2026-07-13

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-08` |
| Data check-out | `2026-07-13` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Olteanu` |
| Prenume | `Alin` |
| Email | `ro.client.043@test.casaemil.local` |
| Telefon | `0762105754` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BV` |
| Nr. document | `100042` |
| Emis de | `SPCLEP Sibiu` |
| Data emitere | `2018-07-10` |
| Data expirare | `2028-07-09` |
| Tip ID național | `cnp` |
| ID național | `1670716430435` |
| Data nașterii | `1967-07-16` |
| Loc naștere | `Sibiu` |
| Naționalitate | `România` |
| Adresă | `Str. Sibiu nr. 43` |
| Localitate | `Sibiu` |
| Județ | `Sibiu` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T044 — Român · CI + CNP · single · 2026-07-09 → 2026-07-16

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-09` |
| Data check-out | `2026-07-16` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Petrescu` |
| Prenume | `Zina` |
| Email | `ro.client.044@test.casaemil.local` |
| Telefon | `0763105891` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CJ` |
| Nr. document | `100043` |
| Emis de | `SPCLEP Suceava` |
| Data emitere | `2018-08-10` |
| Data expirare | `2028-08-09` |
| Tip ID național | `cnp` |
| ID național | `2680817440447` |
| Data nașterii | `1968-08-17` |
| Loc naștere | `Suceava` |
| Naționalitate | `România` |
| Adresă | `Str. Suceava nr. 44` |
| Localitate | `Suceava` |
| Județ | `Suceava` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T045 — Român · CI + CNP · cuplu · 2026-07-10 → 2026-07-12

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-10` |
| Data check-out | `2026-07-12` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Rusu` |
| Prenume | `Ciprian` |
| Email | `ro.client.045@test.casaemil.local` |
| Telefon | `0764106028` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `MM` |
| Nr. document | `100044` |
| Emis de | `SPCLEP Timiș` |
| Data emitere | `2018-09-10` |
| Data expirare | `2028-09-09` |
| Tip ID național | `cnp` |
| ID național | `1690918450455` |
| Data nașterii | `1969-09-18` |
| Loc naștere | `Timiș` |
| Naționalitate | `România` |
| Adresă | `Str. Timiș nr. 45` |
| Localitate | `Timiș` |
| Județ | `Timiș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T046 — Român · CI + CNP · familie · 2026-07-11 → 2026-07-14

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-11` |
| Data check-out | `2026-07-14` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 10 |
| Nume | `Serban` |
| Prenume | `Beatrice` |
| Email | `ro.client.046@test.casaemil.local` |
| Telefon | `0765106165` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `DJ` |
| Nr. document | `100045` |
| Emis de | `SPCLEP Vâlcea` |
| Data emitere | `2018-10-10` |
| Data expirare | `2028-10-09` |
| Tip ID național | `cnp` |
| ID național | `2701019460466` |
| Data nașterii | `1970-10-19` |
| Loc naștere | `Vâlcea` |
| Naționalitate | `România` |
| Adresă | `Str. Vâlcea nr. 46` |
| Localitate | `Vâlcea` |
| Județ | `Vâlcea` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T047 — Român · CI + CNP · familie · 2026-07-12 → 2026-07-16

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-12` |
| Data check-out | `2026-07-16` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 9 |
| Nume | `Tanase` |
| Prenume | `Eugen` |
| Email | `ro.client.047@test.casaemil.local` |
| Telefon | `0766106302` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BC` |
| Nr. document | `100046` |
| Emis de | `SPCLEP Vrancea` |
| Data emitere | `2018-11-10` |
| Data expirare | `2028-11-09` |
| Tip ID național | `cnp` |
| ID național | `1711120470472` |
| Data nașterii | `1971-11-20` |
| Loc naștere | `Vrancea` |
| Naționalitate | `România` |
| Adresă | `Str. Vrancea nr. 47` |
| Localitate | `Vrancea` |
| Județ | `Vrancea` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T048 — Român · CI + CNP · grup · 2026-07-13 → 2026-07-18

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-13` |
| Data check-out | `2026-07-18` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Ursu` |
| Prenume | `Doina` |
| Email | `ro.client.048@test.casaemil.local` |
| Telefon | `0767106439` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `GL` |
| Nr. document | `100047` |
| Emis de | `SPCLEP Ilfov` |
| Data emitere | `2018-12-10` |
| Data expirare | `2028-12-09` |
| Tip ID național | `cnp` |
| ID național | `2721221480484` |
| Data nașterii | `1972-12-21` |
| Loc naștere | `Ilfov` |
| Naționalitate | `România` |
| Adresă | `Str. Ilfov nr. 48` |
| Localitate | `Ilfov` |
| Județ | `Ilfov` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T049 — Român · CI + CNP · grup · 2026-07-14 → 2026-07-21

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-14` |
| Data check-out | `2026-07-21` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Voicu` |
| Prenume | `Grigore` |
| Email | `ro.client.049@test.casaemil.local` |
| Telefon | `0768106576` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RX` |
| Nr. document | `100048` |
| Emis de | `SPCLEP Alba` |
| Data emitere | `2018-01-10` |
| Data expirare | `2028-01-09` |
| Tip ID național | `cnp` |
| ID național | `1730122490494` |
| Data nașterii | `1973-01-22` |
| Loc naștere | `Alba` |
| Naționalitate | `România` |
| Adresă | `Str. Alba nr. 49` |
| Localitate | `Alba` |
| Județ | `Alba` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T050 — Român · CI + CNP · single · 2026-07-15 → 2026-07-17

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-15` |
| Data check-out | `2026-07-17` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Axente` |
| Prenume | `Florica` |
| Email | `ro.client.050@test.casaemil.local` |
| Telefon | `0769106713` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RK` |
| Nr. document | `100049` |
| Emis de | `SPCLEP Arad` |
| Data emitere | `2018-02-10` |
| Data expirare | `2028-02-09` |
| Tip ID național | `cnp` |
| ID național | `2740223500502` |
| Data nașterii | `1974-02-23` |
| Loc naștere | `Arad` |
| Naționalitate | `România` |
| Adresă | `Str. Arad nr. 50` |
| Localitate | `Arad` |
| Județ | `Arad` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T051 — Român · CI + CNP · cuplu · 2026-07-16 → 2026-07-19

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-16` |
| Data check-out | `2026-07-19` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Balan` |
| Prenume | `Ionel` |
| Email | `ro.client.051@test.casaemil.local` |
| Telefon | `0770106850` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `SB` |
| Nr. document | `100050` |
| Emis de | `SPCLEP Argeș` |
| Data emitere | `2018-03-10` |
| Data expirare | `2028-03-09` |
| Tip ID național | `cnp` |
| ID național | `1750324510510` |
| Data nașterii | `1975-03-24` |
| Loc naștere | `Argeș` |
| Naționalitate | `România` |
| Adresă | `Str. Argeș nr. 51` |
| Localitate | `Argeș` |
| Județ | `Argeș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T052 — Român · CI + CNP · familie · 2026-07-17 → 2026-07-21

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-17` |
| Data check-out | `2026-07-21` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 6 |
| Nume | `Cojocaru` |
| Prenume | `Hortensia` |
| Email | `ro.client.052@test.casaemil.local` |
| Telefon | `0771106987` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `TM` |
| Nr. document | `100051` |
| Emis de | `SPCLEP Bacău` |
| Data emitere | `2018-04-10` |
| Data expirare | `2028-04-09` |
| Tip ID național | `cnp` |
| ID național | `2760425520522` |
| Data nașterii | `1976-04-25` |
| Loc naștere | `Bacău` |
| Naționalitate | `România` |
| Adresă | `Str. Bacău nr. 52` |
| Localitate | `Bacău` |
| Județ | `Bacău` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T053 — Român · CI + CNP · familie · 2026-07-18 → 2026-07-23

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-18` |
| Data check-out | `2026-07-23` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 7 |
| Nume | `Dascalu` |
| Prenume | `Kevin` |
| Email | `ro.client.053@test.casaemil.local` |
| Telefon | `0772107124` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `IS` |
| Nr. document | `100052` |
| Emis de | `SPCLEP Bihor` |
| Data emitere | `2018-05-10` |
| Data expirare | `2028-05-09` |
| Tip ID național | `cnp` |
| ID național | `1770526010533` |
| Data nașterii | `1977-05-26` |
| Loc naștere | `Bihor` |
| Naționalitate | `România` |
| Adresă | `Str. Bihor nr. 53` |
| Localitate | `Bihor` |
| Județ | `Bihor` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T054 — Român · CI + CNP · grup · 2026-07-19 → 2026-07-26

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-19` |
| Data check-out | `2026-07-26` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Ene` |
| Prenume | `Julieta` |
| Email | `ro.client.054@test.casaemil.local` |
| Telefon | `0773107261` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CT` |
| Nr. document | `100053` |
| Emis de | `SPCLEP Brașov` |
| Data emitere | `2018-06-10` |
| Data expirare | `2028-06-09` |
| Tip ID național | `cnp` |
| ID național | `2780627020545` |
| Data nașterii | `1978-06-27` |
| Loc naștere | `Brașov` |
| Naționalitate | `România` |
| Adresă | `Str. Brașov nr. 54` |
| Localitate | `Brașov` |
| Județ | `Brașov` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T055 — Român · CI + CNP · grup · 2026-07-20 → 2026-07-22

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-20` |
| Data check-out | `2026-07-22` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Farcas` |
| Prenume | `Matei` |
| Email | `ro.client.055@test.casaemil.local` |
| Telefon | `0774107398` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BV` |
| Nr. document | `100054` |
| Emis de | `SPCLEP București` |
| Data emitere | `2018-07-10` |
| Data expirare | `2028-07-09` |
| Tip ID național | `cnp` |
| ID național | `1790701030553` |
| Data nașterii | `1979-07-01` |
| Loc naștere | `București` |
| Naționalitate | `România` |
| Adresă | `Str. București nr. 55` |
| Localitate | `Sector 2` |
| Județ | `București` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T056 — Român · CI + CNP · single · 2026-07-21 → 2026-07-24

| | |
|---|---|
| Cetățenie | România |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-21` |
| Data check-out | `2026-07-24` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Grigore` |
| Prenume | `Lidia` |
| Email | `ro.client.056@test.casaemil.local` |
| Telefon | `0775107535` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CJ` |
| Nr. document | `100055` |
| Emis de | `SPCLEP Cluj` |
| Data emitere | `2018-08-10` |
| Data expirare | `2028-08-09` |
| Tip ID național | `cnp` |
| ID național | `2800802040561` |
| Data nașterii | `1980-08-02` |
| Loc naștere | `Cluj` |
| Naționalitate | `România` |
| Adresă | `Str. Cluj nr. 56` |
| Localitate | `Cluj` |
| Județ | `Cluj` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T057 — Român · CI + CNP · cuplu · 2026-07-22 → 2026-07-26

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-22` |
| Data check-out | `2026-07-26` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Horvath` |
| Prenume | `Ovidiu` |
| Email | `ro.client.057@test.casaemil.local` |
| Telefon | `0776107672` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `MM` |
| Nr. document | `100056` |
| Emis de | `SPCLEP Constanța` |
| Data emitere | `2018-09-10` |
| Data expirare | `2028-09-09` |
| Tip ID național | `cnp` |
| ID național | `1810903050578` |
| Data nașterii | `1981-09-03` |
| Loc naștere | `Constanța` |
| Naționalitate | `România` |
| Adresă | `Str. Constanța nr. 57` |
| Localitate | `Constanța` |
| Județ | `Constanța` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T058 — Român · CI + CNP · familie · 2026-07-23 → 2026-07-28

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-23` |
| Data check-out | `2026-07-28` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 12 |
| Nume | `Iliescu` |
| Prenume | `Noemi` |
| Email | `ro.client.058@test.casaemil.local` |
| Telefon | `0777107809` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `DJ` |
| Nr. document | `100057` |
| Emis de | `SPCLEP Covasna` |
| Data emitere | `2018-10-10` |
| Data expirare | `2028-10-09` |
| Tip ID național | `cnp` |
| ID național | `2821004060584` |
| Data nașterii | `1982-10-04` |
| Loc naștere | `Covasna` |
| Naționalitate | `România` |
| Adresă | `Str. Covasna nr. 58` |
| Localitate | `Covasna` |
| Județ | `Covasna` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T059 — Român · CI parțial (completezi la check-in) · familie · 2026-07-24 → 2026-07-31

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-24` |
| Data check-out | `2026-07-31` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 13 |
| Nume | `Jipa` |
| Prenume | `Romeo` |
| Email | `ro.client.059@test.casaemil.local` |
| Telefon | `0778107946` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BC` |
| Nr. document | `100058` |
| Tip ID național | `cnp` |
| ID național | `1831105070592` |
| Data nașterii | `1983-11-05` |
| Naționalitate | `România` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | partial |

---

## T060 — Român · CI parțial (completezi la check-in) · grup · 2026-06-15 → 2026-06-17

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-15` |
| Data check-out | `2026-06-17` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Luca` |
| Prenume | `Petronela` |
| Email | `ro.client.060@test.casaemil.local` |
| Telefon | `0779108083` |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `GL` |
| Nr. document | `100059` |
| Tip ID național | `cnp` |
| ID național | `2841206080609` |
| Data nașterii | `1984-12-06` |
| Naționalitate | `România` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | partial |

---

## T061 — FRAUD · Ionescu Vasile #1 · același nume, telefon diferit față de #2

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |
| Test tags | `dedup_acelasi_nume`, `grup_dedup_vasile` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-16` |
| Data check-out | `2026-06-19` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Ionescu` |
| Prenume | `Vasile` |
| Email | `fraud.dedup.vasile.a@test.casaemil.local` |
| Telefon | `0725900101` |
| Mesaj | [FRAUD] Dedup: același nume ca T062, telefoane diferite — nu merge automat |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RK` |
| Nr. document | `100601` |
| Emis de | `SPCLEP Arad` |
| Data emitere | `2018-02-10` |
| Data expirare | `2028-02-09` |
| Tip ID național | `cnp` |
| ID național | `1830315300693` |
| Data nașterii | `1983-03-15` |
| Loc naștere | `Arad` |
| Naționalitate | `România` |
| Adresă | `Str. Arad nr. 602` |
| Localitate | `Arad` |
| Județ | `Arad` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T062 — FRAUD · Ionescu Vasile #2 · persoană diferită, același nume

| | |
|---|---|
| Cetățenie | România |
| Tip | single |
| Test tags | `dedup_acelasi_nume`, `grup_dedup_vasile` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-17` |
| Data check-out | `2026-06-21` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Ionescu` |
| Prenume | `Vasile` |
| Email | `fraud.dedup.vasile.b@test.casaemil.local` |
| Telefon | `0725900102` |
| Mesaj | [FRAUD] Dedup: verifică că NU se fuzionează greșit cu T061 |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `SB` |
| Nr. document | `100602` |
| Emis de | `SPCLEP Argeș` |
| Data emitere | `2018-03-10` |
| Data expirare | `2028-03-09` |
| Tip ID național | `cnp` |
| ID național | `1830315310703` |
| Data nașterii | `1983-03-15` |
| Loc naștere | `Argeș` |
| Naționalitate | `România` |
| Adresă | `Str. Argeș nr. 603` |
| Localitate | `Argeș` |
| Județ | `Argeș` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T063 — FRAUD · Popescu Maria #1 · același nume complet

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |
| Test tags | `dedup_acelasi_nume`, `grup_dedup_maria` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-18` |
| Data check-out | `2026-06-23` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Popescu` |
| Prenume | `Maria` |
| Email | `fraud.dedup.maria.a@test.casaemil.local` |
| Telefon | `0725900103` |
| Mesaj | [FRAUD] Pereche dedup nume — vezi și T064 |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `TM` |
| Nr. document | `100603` |
| Emis de | `SPCLEP Bacău` |
| Data emitere | `2018-04-10` |
| Data expirare | `2028-04-09` |
| Tip ID național | `cnp` |
| ID național | `2910722320712` |
| Data nașterii | `1991-07-22` |
| Loc naștere | `Bacău` |
| Naționalitate | `România` |
| Adresă | `Str. Bacău nr. 604` |
| Localitate | `Bacău` |
| Județ | `Bacău` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T064 — FRAUD · Popescu Maria #2 · același nume, alt CNP

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |
| Test tags | `dedup_acelasi_nume`, `grup_dedup_maria` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-19` |
| Data check-out | `2026-06-26` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 8 |
| Nume | `Popescu` |
| Prenume | `Maria` |
| Email | `fraud.dedup.maria.b@test.casaemil.local` |
| Telefon | `0725900104` |
| Mesaj | [FRAUD] Pereche dedup nume — vezi și T063 |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `IS` |
| Nr. document | `100604` |
| Emis de | `SPCLEP Bihor` |
| Data emitere | `2018-05-10` |
| Data expirare | `2028-05-09` |
| Tip ID național | `cnp` |
| ID național | `2881105330725` |
| Data nașterii | `1988-11-05` |
| Loc naștere | `Bihor` |
| Naționalitate | `România` |
| Adresă | `Str. Bihor nr. 605` |
| Localitate | `Bihor` |
| Județ | `Bihor` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T065 — FRAUD · Același email ca T061, telefon diferit — conflict dedup

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |
| Test tags | `dedup_email_conflict` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-20` |
| Data check-out | `2026-06-22` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Conflict` |
| Prenume | `Email` |
| Email | `fraud.dedup.vasile.a@test.casaemil.local` |
| Telefon | `0725900105` |
| Mesaj | [FRAUD] Email duplicat T061 · telefon nou — ce guest se leagă? |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CT` |
| Nr. document | `100605` |
| Emis de | `SPCLEP Brașov` |
| Data emitere | `2018-06-10` |
| Data expirare | `2028-06-09` |
| Tip ID național | `cnp` |
| ID național | `1750110340739` |
| Data nașterii | `1975-01-10` |
| Loc naștere | `Brașov` |
| Naționalitate | `România` |
| Adresă | `Str. Brașov nr. 606` |
| Localitate | `Brașov` |
| Județ | `Brașov` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "asteptat": "mergeConflict sau potrivire după telefon/email",
  "referinta": "T061"
}
```

---

## T066 — FRAUD · Același telefon ca T061, format +40 cu spații

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |
| Test tags | `dedup_telefon_format` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-21` |
| Data check-out | `2026-06-24` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `TelefonFormat` |
| Prenume | `Test` |
| Email | `fraud.phone.format@test.casaemil.local` |
| Telefon | `+40 725 900 101` |
| Mesaj | [FRAUD] Normalizare: același E.164 ca T061 (0725900101) |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BV` |
| Nr. document | `100606` |
| Emis de | `SPCLEP București` |
| Data emitere | `2018-07-10` |
| Data expirare | `2028-07-09` |
| Tip ID național | `cnp` |
| ID național | `1800606350749` |
| Data nașterii | `1980-06-06` |
| Loc naștere | `București` |
| Naționalitate | `România` |
| Adresă | `Str. București nr. 607` |
| Localitate | `Sector 2` |
| Județ | `București` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "telefon_raw_alternativ": "0725900101",
  "telefon_normalizat_asteptat": "+40725900101",
  "referinta": "T061"
}
```

---

## T067 — FRAUD · Document EXPIRAT (2020) — check-in cu act invalid

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |
| Test tags | `document_expirat` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-22` |
| Data check-out | `2026-06-26` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `DocExpirat` |
| Prenume | `Ion` |
| Email | `fraud.doc.expired@test.casaemil.local` |
| Telefon | `0725900107` |
| Mesaj | [FRAUD] doc_expiry_date în trecut — avertizare UI? |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `CJ` |
| Nr. document | `100607` |
| Emis de | `SPCLEP Cluj` |
| Data emitere | `2010-01-01` |
| Data expirare | `2020-01-01` |
| Tip ID național | `cnp` |
| ID național | `1780420360750` |
| Data nașterii | `1978-04-20` |
| Loc naștere | `Cluj` |
| Naționalitate | `România` |
| Adresă | `Str. Cluj nr. 608` |
| Localitate | `Cluj` |
| Județ | `Cluj` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "asteptat": "avertizare document expirat la check-in"
}
```

---

## T068 — FRAUD · Document expiră în ~5 zile (2026-06-10)

| | |
|---|---|
| Cetățenie | România |
| Tip | single |
| Test tags | `document_expira_curand` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-23` |
| Data check-out | `2026-06-28` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `DocExpiraCurand` |
| Prenume | `Elena` |
| Email | `fraud.doc.soon@test.casaemil.local` |
| Telefon | `0725900108` |
| Mesaj | [FRAUD] Expiră curând — test avertizare |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `MM` |
| Nr. document | `100608` |
| Emis de | `SPCLEP Constanța` |
| Data emitere | `2018-09-10` |
| Data expirare | `2026-06-10` |
| Tip ID național | `cnp` |
| ID național | `2920814370761` |
| Data nașterii | `1992-08-14` |
| Loc naștere | `Constanța` |
| Naționalitate | `România` |
| Adresă | `Str. Constanța nr. 609` |
| Localitate | `Constanța` |
| Județ | `Constanța` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "asteptat": "avertizare expirare apropiată"
}
```

---

## T069 — FRAUD · Document expirat ieri (2026-06-04)

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |
| Test tags | `document_expirat` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-24` |
| Data check-out | `2026-07-01` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `DocExpiratIeri` |
| Prenume | `Ana` |
| Email | `fraud.doc.yesterday@test.casaemil.local` |
| Telefon | `0725900109` |
| Mesaj | [FRAUD] Expirat recent |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `DJ` |
| Nr. document | `100609` |
| Emis de | `SPCLEP Covasna` |
| Data emitere | `2018-10-10` |
| Data expirare | `2026-06-04` |
| Tip ID național | `cnp` |
| ID național | `2860228380778` |
| Data nașterii | `1986-02-28` |
| Loc naștere | `Covasna` |
| Naționalitate | `România` |
| Adresă | `Str. Covasna nr. 610` |
| Localitate | `Covasna` |
| Județ | `Covasna` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

---

## T070 — FRAUD · CNP deja folosit (T001) — încearcă duplicat la check-in

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |
| Test tags | `cnp_duplicat`, `fraud_identitate` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-25` |
| Data check-out | `2026-06-27` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 4 |
| Nume | `CnpDuplicat` |
| Prenume | `Test` |
| Email | `fraud.cnp.dup@test.casaemil.local` |
| Telefon | `0725900110` |
| Mesaj | [FRAUD] CNP propriu valid; vezi test_negativ |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `BC` |
| Nr. document | `100610` |
| Emis de | `SPCLEP Dolj` |
| Data emitere | `2018-11-10` |
| Data expirare | `2028-11-09` |
| Tip ID național | `cnp` |
| ID național | `1900505390780` |
| Data nașterii | `1990-05-05` |
| Loc naștere | `Dolj` |
| Naționalitate | `România` |
| Adresă | `Str. Dolj nr. 611` |
| Localitate | `Dolj` |
| Județ | `Dolj` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "incearca_cnp": "1650101010013",
  "referinta_cnp_existent": "T001",
  "asteptat": "respinge CNP duplicat (findGuestByNationalId)"
}
```

---

## T071 — FRAUD · CNP cu check-digit greșit — date proaste la check-in

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |
| Test tags | `cnp_invalid`, `fraud_identitate` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-26` |
| Data check-out | `2026-06-29` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 9 |
| Nume | `CnpInvalid` |
| Prenume | `Ion` |
| Email | `fraud.cnp.bad@test.casaemil.local` |
| Telefon | `0725900111` |
| Mesaj | [FRAUD] Date rezervare OK; la check-in testează CNP invalid |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `GL` |
| Nr. document | `100611` |
| Emis de | `SPCLEP Galați` |
| Data emitere | `2018-12-10` |
| Data expirare | `2028-12-09` |
| Tip ID național | `cnp` |
| ID național | `1850101400797` |
| Data nașterii | `1985-01-01` |
| Loc naștere | `Galați` |
| Naționalitate | `România` |
| Adresă | `Str. Galați nr. 612` |
| Localitate | `Galați` |
| Județ | `Galați` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "incearca_cnp": "1850101410019",
  "asteptat": "respinge — check digit invalid",
  "incearca_cnp_2": "0000000000000"
}
```

---

## T072 — FRAUD · CNP valid dar data nașterii greșită

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |
| Test tags | `cnp_data_neconcordanta`, `fraud_identitate` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-27` |
| Data check-out | `2026-07-01` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `CnpMismatch` |
| Prenume | `Elena` |
| Email | `fraud.cnp.mismatch@test.casaemil.local` |
| Telefon | `0725900112` |
| Mesaj | [FRAUD] CNP corect în check_in; încearcă birth_date diferit |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RX` |
| Nr. document | `100612` |
| Emis de | `SPCLEP Harghita` |
| Data emitere | `2018-01-10` |
| Data expirare | `2028-01-09` |
| Tip ID național | `cnp` |
| ID național | `2900315410808` |
| Data nașterii | `1990-03-15` |
| Loc naștere | `Harghita` |
| Naționalitate | `România` |
| Adresă | `Str. Harghita nr. 613` |
| Localitate | `Harghita` |
| Județ | `Harghita` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "incearca_birth_date": "2000-01-01",
  "cnp_corect_din_fisier": "(vezi check_in)",
  "asteptat": "inconsistență CNP vs dată naștere"
}
```

---

## T073 — FRAUD · Același nr. CI ca T001 — document duplicat

| | |
|---|---|
| Cetățenie | România |
| Tip | grup |
| Test tags | `document_duplicat`, `fraud_identitate` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-28` |
| Data check-out | `2026-07-03` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `DocDuplicat` |
| Prenume | `Vasile` |
| Email | `fraud.doc.dup@test.casaemil.local` |
| Telefon | `0725900113` |
| Mesaj | [FRAUD] Alt CNP, același nr. document ca T001 |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `RX` |
| Nr. document | `100000` |
| Emis de | `SPCLEP Iași` |
| Data emitere | `2018-02-10` |
| Data expirare | `2028-02-09` |
| Tip ID național | `cnp` |
| ID național | `1770909420813` |
| Data nașterii | `1977-09-09` |
| Loc naștere | `Iași` |
| Naționalitate | `România` |
| Adresă | `Str. Iași nr. 614` |
| Localitate | `Iași` |
| Județ | `Iași` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "referinta_document": "T001",
  "asteptat": "dedup warning pe doc_type + doc_number"
}
```

---

## T074 — FRAUD · Zero identitate la rezervare — totul la check-in

| | |
|---|---|
| Cetățenie | România |
| Tip | single |
| Test tags | `identitate_la_checkin`, `fraud_identitate` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-29` |
| Data check-out | `2026-07-06` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `FaraIdentitate` |
| Prenume | `Rezervare` |
| Email | `fraud.no.identity@test.casaemil.local` |
| Telefon | `0725900114` |
| Mesaj | [FRAUD] Poți introduce date false la check-in — validare? |

### Check-in / Înregistrare client (admin)

*Completezi toate câmpurile identitate la check-in (client nou, fără date preexistente).*

### Test negativ (încearcă manual)

```json
{
  "incearca_cnp": "1234567890123",
  "asteptat": "respinge format/check digit"
}
```

---

## T075 — FRAUD · Identitate parțială — completezi restul la check-in

| | |
|---|---|
| Cetățenie | România |
| Tip | cuplu |
| Test tags | `identitate_partiala`, `fraud_identitate` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-30` |
| Data check-out | `2026-07-02` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `PartialCheckin` |
| Prenume | `Guest` |
| Email | `fraud.partial@test.casaemil.local` |
| Telefon | `0725900115` |
| Mesaj | [FRAUD] Doar CNP la profil; restul la check-in |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `TM` |
| Nr. document | `100615` |
| Tip ID național | `cnp` |
| ID național | `2931201440821` |
| Data nașterii | `1993-12-01` |
| Naționalitate | `România` |
| Țară | `România` |
| Sex | `F` |
| Status așteptat | partial |

### Test negativ (încearcă manual)

```json
{
  "asteptat": "identity_status partial până completezi adresă + doc"
}
```

---

## T076 — FRAUD · Telefon placeholder la rezervare — test validare

| | |
|---|---|
| Cetățenie | România |
| Tip | familie |
| Test tags | `telefon_invalid`, `fraud_rezervare` |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-01` |
| Data check-out | `2026-07-04` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 10 |
| Nume | `TelefonPlaceholder` |
| Prenume | `Test` |
| Email | `fraud.phone.bad@test.casaemil.local` |
| Telefon | `0725900116` |
| Mesaj | [FRAUD] Telefon valid în fișier; vezi test_negativ pentru ce NU merge |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `IS` |
| Nr. document | `100616` |
| Emis de | `SPCLEP Neamț` |
| Data emitere | `2018-05-10` |
| Data expirare | `2028-05-09` |
| Tip ID național | `cnp` |
| ID național | `1880707450833` |
| Data nașterii | `1988-07-07` |
| Loc naștere | `Neamț` |
| Naționalitate | `România` |
| Adresă | `Str. Neamț nr. 617` |
| Localitate | `Neamț` |
| Județ | `Neamț` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

### Test negativ (încearcă manual)

```json
{
  "incearca_telefon_la_rezervare": [
    "—",
    "n/a",
    "",
    "0725900116"
  ],
  "telefoane_respinse": [
    "—",
    "n/a",
    "",
    "."
  ],
  "asteptat": "guest.phone_required / normalizare respinsă"
}
```

---

## T077 — Străin (MD) · CI + CNP · familie · 2026-07-02 → 2026-07-06

| | |
|---|---|
| Cetățenie | Republica Moldova |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-02` |
| Data check-out | `2026-07-06` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 7 |
| Nume | `Rusu` |
| Prenume | `Vasile` |
| Email | `md.client.001@test.casaemil.local` |
| Telefon | `+37369000000` |
| Mesaj | Cetățean Republica Moldova |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `ci` |
| Serie CI | `A` |
| Nr. document | `300900` |
| Emis de | `ASP Chișinău` |
| Data emitere | `2021-05-01` |
| Data expirare | `2031-04-30` |
| Tip ID național | `idnp` |
| ID național | `3780101009003` |
| Data nașterii | `1978-01-01` |
| Loc naștere | `Republica Moldova` |
| Naționalitate | `Republica Moldova` |
| Adresă | `Str. Chișinău 900` |
| Localitate | `Chișinău` |
| Țară | `Republica Moldova` |
| Sex | `M` |
| Status așteptat | complete |

---

## T078 — Străin (MD) · Pașaport · grup · 2026-07-03 → 2026-07-08

| | |
|---|---|
| Cetățenie | Republica Moldova |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-03` |
| Data check-out | `2026-07-08` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Ceban` |
| Prenume | `Natalia` |
| Email | `md.client.002@test.casaemil.local` |
| Telefon | `+37369011111` |
| Mesaj | Cetățean Republica Moldova |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `MD600901` |
| Emis de | `Ministerul Afacerilor Externe Republica Moldova` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Tip ID național | `idnp` |
| ID național | `4790202009517` |
| Data nașterii | `1979-02-02` |
| Loc naștere | `Republica Moldova` |
| Naționalitate | `Republica Moldova` |
| Adresă | `Test Street 901` |
| Localitate | `Capital` |
| Țară | `Republica Moldova` |
| Sex | `F` |
| Status așteptat | complete |

---

## T079 — Străin (MD) · Act străin · grup · 2026-07-04 → 2026-07-11

| | |
|---|---|
| Cetățenie | Republica Moldova |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-04` |
| Data check-out | `2026-07-11` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Moraru` |
| Prenume | `Andrei` |
| Email | `md.client.003@test.casaemil.local` |
| Telefon | `+37369022222` |
| Mesaj | Cetățean Republica Moldova |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `MD-FID-700902` |
| Emis de | `Republica Moldova` |
| Data emitere | `2019-01-01` |
| Data expirare | `2029-01-01` |
| Data nașterii | `1980-03-03` |
| Loc naștere | `Republica Moldova` |
| Naționalitate | `Republica Moldova` |
| Adresă | `Residence 902` |
| Localitate | `Capital` |
| Țară | `Republica Moldova` |
| Sex | `M` |
| Status așteptat | complete |

---

## T080 — Străin (BG) · Act străin · single · 2026-07-05 → 2026-07-07

| | |
|---|---|
| Cetățenie | Bulgaria |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-05` |
| Data check-out | `2026-07-07` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Georgiev` |
| Prenume | `Maria` |
| Email | `bg.client.001@test.casaemil.local` |
| Telefon | `+35988037035` |
| Mesaj | Cetățean Bulgaria |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `BG-LK-400903` |
| Emis de | `MVR Sofia` |
| Data emitere | `2019-03-01` |
| Data expirare | `2029-02-28` |
| Tip ID național | `egn` |
| ID național | `8104040930` |
| Data nașterii | `1981-04-04` |
| Loc naștere | `Bulgaria` |
| Naționalitate | `Bulgaria` |
| Adresă | `ul. Vitosha 903` |
| Localitate | `Sofia` |
| Țară | `Bulgaria` |
| Sex | `F` |
| Status așteptat | complete |

---

## T081 — Străin (BG) · Pașaport · cuplu · 2026-07-06 → 2026-07-09

| | |
|---|---|
| Cetățenie | Bulgaria |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-06` |
| Data check-out | `2026-07-09` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Ivanov` |
| Prenume | `Georgi` |
| Email | `bg.client.002@test.casaemil.local` |
| Telefon | `+35988049380` |
| Mesaj | Cetățean Bulgaria |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `BG600904` |
| Emis de | `Ministerul Afacerilor Externe Bulgaria` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Tip ID național | `egn` |
| ID național | `8205055944` |
| Data nașterii | `1982-05-05` |
| Loc naștere | `Bulgaria` |
| Naționalitate | `Bulgaria` |
| Adresă | `Test Street 904` |
| Localitate | `Capital` |
| Țară | `Bulgaria` |
| Sex | `M` |
| Status așteptat | complete |

---

## T082 — Străin (BG) · Alt document · familie · 2026-07-07 → 2026-07-11

| | |
|---|---|
| Cetățenie | Bulgaria |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-07` |
| Data check-out | `2026-07-11` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 6 |
| Nume | `Dimitrov` |
| Prenume | `Violeta` |
| Email | `bg.client.003@test.casaemil.local` |
| Telefon | `+35988061725` |
| Mesaj | Cetățean Bulgaria |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `other` |
| Nr. document | `BG-ALT-800905` |
| Emis de | `Autoritate Bulgaria` |
| Data emitere | `2022-06-01` |
| Data expirare | `2027-06-01` |
| Data nașterii | `1983-06-06` |
| Loc naștere | `Bulgaria` |
| Naționalitate | `Bulgaria` |
| Adresă | `Document alternativ 905` |
| Localitate | `Capital` |
| Țară | `Bulgaria` |
| Sex | `F` |
| Status așteptat | complete |

---

## T083 — Străin (HU) · Act străin · familie · 2026-07-08 → 2026-07-13

| | |
|---|---|
| Cetățenie | Ungaria |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-08` |
| Data check-out | `2026-07-13` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 13 |
| Nume | `Nagy` |
| Prenume | `Laszlo` |
| Email | `hu.client.001@test.casaemil.local` |
| Telefon | `+36205140736` |
| Mesaj | Cetățean Ungaria |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `HU-ID-500906` |
| Emis de | `Közigazgatás` |
| Data emitere | `2018-08-01` |
| Data expirare | `2028-07-31` |
| Tip ID național | `szemelyi_szam` |
| ID național | `18407079063` |
| Data nașterii | `1984-07-07` |
| Loc naștere | `Ungaria` |
| Naționalitate | `Ungaria` |
| Adresă | `Utca 906` |
| Localitate | `Budapesta` |
| Țară | `Ungaria` |
| Sex | `M` |
| Status așteptat | complete |

---

## T084 — Străin (HU) · Pașaport · grup · 2026-07-09 → 2026-07-16

| | |
|---|---|
| Cetățenie | Ungaria |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-09` |
| Data check-out | `2026-07-16` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Kovacs` |
| Prenume | `Eva` |
| Email | `hu.client.002@test.casaemil.local` |
| Telefon | `+36205164192` |
| Mesaj | Cetățean Ungaria |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `HU600907` |
| Emis de | `Ministerul Afacerilor Externe Ungaria` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Tip ID național | `szemelyi_szam` |
| ID național | `28508089578` |
| Data nașterii | `1985-08-08` |
| Loc naștere | `Ungaria` |
| Naționalitate | `Ungaria` |
| Adresă | `Test Street 907` |
| Localitate | `Capital` |
| Țară | `Ungaria` |
| Sex | `F` |
| Status așteptat | complete |

---

## T085 — Străin (HU) · Alt document · grup · 2026-07-10 → 2026-07-12

| | |
|---|---|
| Cetățenie | Ungaria |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-10` |
| Data check-out | `2026-07-12` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Szabo` |
| Prenume | `Zoltan` |
| Email | `hu.client.003@test.casaemil.local` |
| Telefon | `+36205187648` |
| Mesaj | Cetățean Ungaria |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `other` |
| Nr. document | `HU-ALT-800908` |
| Emis de | `Autoritate Ungaria` |
| Data emitere | `2022-06-01` |
| Data expirare | `2027-06-01` |
| Data nașterii | `1986-09-09` |
| Loc naștere | `Ungaria` |
| Naționalitate | `Ungaria` |
| Adresă | `Document alternativ 908` |
| Localitate | `Capital` |
| Țară | `Ungaria` |
| Sex | `M` |
| Status așteptat | complete |

---

## T086 — Străin (DE) · Pașaport · single · 2026-07-11 → 2026-07-14

| | |
|---|---|
| Cetățenie | Germania |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-11` |
| Data check-out | `2026-07-14` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Muller` |
| Prenume | `Anna` |
| Email | `de.client.001@test.casaemil.local` |
| Telefon | `+491510999999` |
| Mesaj | Cetățean Germania |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `DE600909` |
| Emis de | `Ministerul Afacerilor Externe Germania` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Data nașterii | `1987-10-10` |
| Loc naștere | `Germania` |
| Naționalitate | `Germania` |
| Adresă | `Test Street 909` |
| Localitate | `Capital` |
| Țară | `Germania` |
| Sex | `F` |
| Status așteptat | complete |

---

## T087 — Străin (DE) · Act străin · cuplu · 2026-07-12 → 2026-07-16

| | |
|---|---|
| Cetățenie | Germania |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-12` |
| Data check-out | `2026-07-16` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Schmidt` |
| Prenume | `Klaus` |
| Email | `de.client.002@test.casaemil.local` |
| Telefon | `+491511111110` |
| Mesaj | Cetățean Germania |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `DE-FID-700910` |
| Emis de | `Germania` |
| Data emitere | `2019-01-01` |
| Data expirare | `2029-01-01` |
| Data nașterii | `1988-11-11` |
| Loc naștere | `Germania` |
| Naționalitate | `Germania` |
| Adresă | `Residence 910` |
| Localitate | `Capital` |
| Țară | `Germania` |
| Sex | `M` |
| Status așteptat | complete |

---

## T088 — Străin (DE) · Alt document · familie · 2026-07-13 → 2026-07-18

| | |
|---|---|
| Cetățenie | Germania |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-13` |
| Data check-out | `2026-07-18` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 12 |
| Nume | `Weber` |
| Prenume | `Sabine` |
| Email | `de.client.003@test.casaemil.local` |
| Telefon | `+491511222221` |
| Mesaj | Cetățean Germania |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `other` |
| Nr. document | `DE-ALT-800911` |
| Emis de | `Autoritate Germania` |
| Data emitere | `2022-06-01` |
| Data expirare | `2027-06-01` |
| Data nașterii | `1989-12-12` |
| Loc naștere | `Germania` |
| Naționalitate | `Germania` |
| Adresă | `Document alternativ 911` |
| Localitate | `Capital` |
| Țară | `Germania` |
| Sex | `F` |
| Status așteptat | complete |

---

## T089 — Străin (FR) · Pașaport · familie · 2026-07-14 → 2026-07-21

| | |
|---|---|
| Cetățenie | Franța |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-14` |
| Data check-out | `2026-07-21` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Dupont` |
| Prenume | `Pierre` |
| Email | `fr.client.001@test.casaemil.local` |
| Telefon | `+33611466664` |
| Mesaj | Cetățean Franța |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `FR600912` |
| Emis de | `Ministerul Afacerilor Externe Franța` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Data nașterii | `1990-01-13` |
| Loc naștere | `Franța` |
| Naționalitate | `Franța` |
| Adresă | `Test Street 912` |
| Localitate | `Capital` |
| Țară | `Franța` |
| Sex | `M` |
| Status așteptat | complete |

---

## T090 — Străin (FR) · Act străin · grup · 2026-07-15 → 2026-07-17

| | |
|---|---|
| Cetățenie | Franța |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-15` |
| Data check-out | `2026-07-17` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Martin` |
| Prenume | `Sophie` |
| Email | `fr.client.002@test.casaemil.local` |
| Telefon | `+33611588886` |
| Mesaj | Cetățean Franța |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `FR-FID-700913` |
| Emis de | `Franța` |
| Data emitere | `2019-01-01` |
| Data expirare | `2029-01-01` |
| Data nașterii | `1991-02-14` |
| Loc naștere | `Franța` |
| Naționalitate | `Franța` |
| Adresă | `Residence 913` |
| Localitate | `Capital` |
| Țară | `Franța` |
| Sex | `F` |
| Status așteptat | complete |

---

## T091 — Străin (FR) · Alt document · grup · 2026-07-16 → 2026-07-19

| | |
|---|---|
| Cetățenie | Franța |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-16` |
| Data check-out | `2026-07-19` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Bernard` |
| Prenume | `Luc` |
| Email | `fr.client.003@test.casaemil.local` |
| Telefon | `+33611711108` |
| Mesaj | Cetățean Franța |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `other` |
| Nr. document | `FR-ALT-800914` |
| Emis de | `Autoritate Franța` |
| Data emitere | `2022-06-01` |
| Data expirare | `2027-06-01` |
| Data nașterii | `1992-03-15` |
| Loc naștere | `Franța` |
| Naționalitate | `Franța` |
| Adresă | `Document alternativ 914` |
| Localitate | `Capital` |
| Țară | `Franța` |
| Sex | `M` |
| Status așteptat | complete |

---

## T092 — Străin (IT) · Pașaport · single · 2026-07-17 → 2026-07-21

| | |
|---|---|
| Cetățenie | Italia |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-17` |
| Data check-out | `2026-07-21` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Rossi` |
| Prenume | `Giulia` |
| Email | `it.client.001@test.casaemil.local` |
| Telefon | `+39332999995` |
| Mesaj | Cetățean Italia |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `IT600915` |
| Emis de | `Ministerul Afacerilor Externe Italia` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Data nașterii | `1993-04-16` |
| Loc naștere | `Italia` |
| Naționalitate | `Italia` |
| Adresă | `Test Street 915` |
| Localitate | `Capital` |
| Țară | `Italia` |
| Sex | `F` |
| Status așteptat | complete |

---

## T093 — Străin (IT) · Act străin · cuplu · 2026-07-18 → 2026-07-23

| | |
|---|---|
| Cetățenie | Italia |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-18` |
| Data check-out | `2026-07-23` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Russo` |
| Prenume | `Luca` |
| Email | `it.client.002@test.casaemil.local` |
| Telefon | `+39333133328` |
| Mesaj | Cetățean Italia |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `IT-FID-700916` |
| Emis de | `Italia` |
| Data emitere | `2019-01-01` |
| Data expirare | `2029-01-01` |
| Data nașterii | `1994-05-17` |
| Loc naștere | `Italia` |
| Naționalitate | `Italia` |
| Adresă | `Residence 916` |
| Localitate | `Capital` |
| Țară | `Italia` |
| Sex | `M` |
| Status așteptat | complete |

---

## T094 — Străin (IT) · Alt document · familie · 2026-07-19 → 2026-07-26

| | |
|---|---|
| Cetățenie | Italia |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-19` |
| Data check-out | `2026-07-26` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 8 |
| Nume | `Ferrari` |
| Prenume | `Chiara` |
| Email | `it.client.003@test.casaemil.local` |
| Telefon | `+39333266661` |
| Mesaj | Cetățean Italia |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `other` |
| Nr. document | `IT-ALT-800917` |
| Emis de | `Autoritate Italia` |
| Data emitere | `2022-06-01` |
| Data expirare | `2027-06-01` |
| Data nașterii | `1995-06-18` |
| Loc naștere | `Italia` |
| Naționalitate | `Italia` |
| Adresă | `Document alternativ 917` |
| Localitate | `Capital` |
| Țară | `Italia` |
| Sex | `F` |
| Status așteptat | complete |

---

## T095 — Străin (UA) · Pașaport · familie · 2026-07-20 → 2026-07-22

| | |
|---|---|
| Cetățenie | Ucraina |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-20` |
| Data check-out | `2026-07-22` |
| Adulți | 2 |
| Copii | 2 |
| Minor (bifat) | Da, vârsta: 9 |
| Nume | `Kovalenko` |
| Prenume | `Oleksandr` |
| Email | `ua.client.001@test.casaemil.local` |
| Telefon | `+380503599992` |
| Mesaj | Cetățean Ucraina |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `UA600918` |
| Emis de | `Ministerul Afacerilor Externe Ucraina` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Data nașterii | `1996-07-19` |
| Loc naștere | `Ucraina` |
| Naționalitate | `Ucraina` |
| Adresă | `Test Street 918` |
| Localitate | `Capital` |
| Țară | `Ucraina` |
| Sex | `M` |
| Status așteptat | complete |

---

## T096 — Străin (UA) · Act străin · grup · 2026-07-21 → 2026-07-24

| | |
|---|---|
| Cetățenie | Ucraina |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-21` |
| Data check-out | `2026-07-24` |
| Adulți | 3 |
| Copii | 0 |
| Nume | `Shevchenko` |
| Prenume | `Iryna` |
| Email | `ua.client.002@test.casaemil.local` |
| Telefon | `+380503744436` |
| Mesaj | Cetățean Ucraina |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `UA-FID-700919` |
| Emis de | `Ucraina` |
| Data emitere | `2019-01-01` |
| Data expirare | `2029-01-01` |
| Data nașterii | `1997-08-20` |
| Loc naștere | `Ucraina` |
| Naționalitate | `Ucraina` |
| Adresă | `Residence 919` |
| Localitate | `Capital` |
| Țară | `Ucraina` |
| Sex | `F` |
| Status așteptat | complete |

---

## T097 — Străin (UA) · Alt document · grup · 2026-07-22 → 2026-07-26

| | |
|---|---|
| Cetățenie | Ucraina |
| Tip | grup |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-22` |
| Data check-out | `2026-07-26` |
| Adulți | 4 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 11 |
| Nume | `Bondarenko` |
| Prenume | `Andriy` |
| Email | `ua.client.003@test.casaemil.local` |
| Telefon | `+380503888880` |
| Mesaj | Cetățean Ucraina |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `other` |
| Nr. document | `UA-TEMP-920` |
| Emis de | `Temporary protection RO` |
| Data emitere | `2024-03-01` |
| Data expirare | `2026-03-01` |
| Data nașterii | `1998-09-21` |
| Loc naștere | `Ucraina` |
| Naționalitate | `Ucraina` |
| Adresă | `Centru primire 920` |
| Localitate | `Suceava` |
| Județ | `Suceava` |
| Țară | `România` |
| Sex | `M` |
| Status așteptat | complete |

---

## T098 — Străin (GB) · Pașaport · single · 2026-07-23 → 2026-07-28

| | |
|---|---|
| Cetățenie | Regatul Unit |
| Tip | single |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-23` |
| Data check-out | `2026-07-28` |
| Adulți | 1 |
| Copii | 0 |
| Nume | `Smith` |
| Prenume | `Emily` |
| Email | `gb.client.001@test.casaemil.local` |
| Telefon | `+44774266655` |
| Mesaj | Cetățean Regatul Unit |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `passport` |
| Nr. document | `GB600921` |
| Emis de | `Ministerul Afacerilor Externe Regatul Unit` |
| Data emitere | `2017-06-01` |
| Data expirare | `2027-05-31` |
| Data nașterii | `1999-10-22` |
| Loc naștere | `Regatul Unit` |
| Naționalitate | `Regatul Unit` |
| Adresă | `Test Street 921` |
| Localitate | `Capital` |
| Țară | `Regatul Unit` |
| Sex | `F` |
| Status așteptat | complete |

---

## T099 — Străin (GB) · Act străin · cuplu · 2026-07-24 → 2026-07-31

| | |
|---|---|
| Cetățenie | Regatul Unit |
| Tip | cuplu |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-07-24` |
| Data check-out | `2026-07-31` |
| Adulți | 2 |
| Copii | 0 |
| Nume | `Jones` |
| Prenume | `Oliver` |
| Email | `gb.client.002@test.casaemil.local` |
| Telefon | `+44774422210` |
| Mesaj | Cetățean Regatul Unit |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `foreign_id` |
| Nr. document | `GB-FID-700922` |
| Emis de | `Regatul Unit` |
| Data emitere | `2019-01-01` |
| Data expirare | `2029-01-01` |
| Data nașterii | `2000-11-23` |
| Loc naștere | `Regatul Unit` |
| Naționalitate | `Regatul Unit` |
| Adresă | `Residence 922` |
| Localitate | `Capital` |
| Țară | `Regatul Unit` |
| Sex | `M` |
| Status așteptat | complete |

---

## T100 — Străin (GB) · Alt document · familie · 2026-06-15 → 2026-06-17

| | |
|---|---|
| Cetățenie | Regatul Unit |
| Tip | familie |

### Cerere publică (formular rezervare)

| Câmp | Valoare |
|------|---------|
| Data check-in | `2026-06-15` |
| Data check-out | `2026-06-17` |
| Adulți | 2 |
| Copii | 1 |
| Minor (bifat) | Da, vârsta: 4 |
| Nume | `Taylor` |
| Prenume | `Olivia` |
| Email | `gb.client.003@test.casaemil.local` |
| Telefon | `+44774577765` |
| Mesaj | Cetățean Regatul Unit |

### Check-in / Înregistrare client (admin)

| Câmp | Valoare |
|------|---------|
| Tip document | `other` |
| Nr. document | `GB-ALT-800923` |
| Emis de | `Autoritate Regatul Unit` |
| Data emitere | `2022-06-01` |
| Data expirare | `2027-06-01` |
| Data nașterii | `2001-12-24` |
| Loc naștere | `Regatul Unit` |
| Naționalitate | `Regatul Unit` |
| Adresă | `Document alternativ 923` |
| Localitate | `Capital` |
| Țară | `Regatul Unit` |
| Sex | `F` |
| Status așteptat | complete |

---
