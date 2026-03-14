# 1.3 Bestimmung von Lagerreaktionen

## 🎯 Lernziel (KERN DES GANZEN!)

Nach diesem Kapitel kannst du:
- ✅ Freikörperdiagramme zeichnen
- ✅ Gleichgewichtsbedingungen aufstellen (ΣFx=0, ΣFy=0, ΣM=0)
- ✅ Lagerreaktionen systematisch berechnen
- ✅ Typische Fehler erkennen und vermeiden

**Wichtigkeit: ⭐⭐⭐** → Das ist ALLES! Statik = Gleichgewicht!

---

## 📖 Fundamentales Prinzip: Gleichgewicht

### Das Wesen der Statik

Ein Körper ist im **Gleichgewicht**, wenn:

1. **Die Summe aller Kräfte = 0**
2. **Die Summe aller Momente = 0**

**Mathematisch (2D):**

```
ΣFx = 0   (alle Kräfte in X-Richtung summieren sich zu Null)
ΣFy = 0   (alle Kräfte in Y-Richtung summieren sich zu Null)
ΣM = 0    (alle Drehmomente summieren sich zu Null)
```

**Warum?** Wenn ΣF ≠ 0 → Körper beschleunigt (nicht statisch!). Wenn ΣM ≠ 0 → Körper dreht sich.

---

## 🔷 SCHRITT-FÜR-SCHRITT METHODE

### Schritt 1: Freikörperdiagramm (FBD) zeichnen

**Was ist ein FBD?** Ein Diagramm, das den Körper isoliert zeigt mit ALLEN auf ihn wirkenden Kräften.

**Wichtig:** 
- ✅ Äußere Kräfte (Lasten) einzeichnen
- ✅ Lagerreaktionen einzeichnen (Richtung unbekannt? Erst vermuten!)
- ✅ Achsenkreuz und Maße

**Beispiel — Einfachbalken:**

```
Original:
        5 kN        3 kN
         ↓          ↓
    A ═════════════════════ B
    █                 5 m
    0 m
    
Freikörperdiagramm (FBD):
        5 kN        3 kN
         ↓          ↓
    ←Ax  ═════════════════════  →Bx
    ↑Ay                         ↑By
    ⌢M

(A ist Festlager mit Moment M!)
```

### Schritt 2: Koordinaten festlegen

**2D-Koordinatensystem:**
```
    ↑ Y (vertikal)
    │
    └─────→ X (horizontal)
    
Momente: → gegen Uhrzeigersinn = POSITIV (Rechte-Hand-Regel)
```

### Schritt 3: Gleichgewichtsbedingungen aufstellen

**3 Gleichungen für 2D-Probleme:**

```
(1) ΣFx = 0:  alle x-Kräfte = 0
(2) ΣFy = 0:  alle y-Kräfte = 0
(3) ΣM = 0:   alle Momente = 0 (um EINEN Punkt!)
```

### Schritt 4: Löse das Gleichungssystem

Typisch 3 Unbekannte (Ax, Ay, Bx oder ähnlich) → 3 Gleichungen → lösbar!

---

## ⚙️ WORKED EXAMPLE 1: Einfach unterstützter Balken

```
Gegeben:        F = 10 kN
                 ↓
            A ═══════════════ B
            ⊙               △
            0     4 m       8 m

Gesucht: Lagerreaktionen Ay, By (und ggf. Ax)
```

### SCHRITT 1: Freikörperdiagramm

```
            10 kN
             ↓
        Ax→←────────────────→Bx (=0, da keine horizontale Last)
        ↑Ay                   ↑By
        |_______4m____|___4m____|
```

Annahmen (Richtungen):
- Ay: nach **oben** (↑) — wenn negativ, zeigt es runter
- By: nach **oben** (↑) — wenn negativ, zeigt es runter
- Ax, Bx: wahrscheinlich **Null** (keine seitliche Last)

### SCHRITT 2: Gleichungssystem

**(1) ΣFx = 0:**
```
Ax = 0   ✓ (keine horizontalen Kräfte)
```

**(2) ΣFy = 0:**
```
Ay + By - 10 = 0
Ay + By = 10 kN  ... (Gleichung 2)
```

**(3) ΣM = 0** (Momente um Punkt A):
```
Drehrichtung nach oben = positiv (↻)

Mom. der 10 kN um A:     -10 × 4 = -40 kN·m (dreht gegen Uhrzeiger = negativ)
Mom. von By um A:        +By × 8 = +8·By    (dreht mit Uhrzeiger = positiv)
Mom. von Ay um A:        0                   (Kraft wirkt am Punkt A, Hebelarm=0)

ΣM = 0:
-40 + 8·By = 0
8·By = 40
By = 5 kN   ✓
```

### SCHRITT 3: Auflösen

Aus Gleichung (2):
```
Ay = 10 - By = 10 - 5 = 5 kN   ✓
```

### ERGEBNIS:

```
Ay = 5 kN (↑)
By = 5 kN (↑)
Ax = 0
```

**Check:** 5 + 5 = 10 kN ✅ (vertikale Summe stimmt)

---

## ⚙️ WORKED EXAMPLE 2: Balken mit Festlager + Moment

```
            20 kN
             ↓
            A ═══════════════════ B
            █                     ⊙
            0        4 m      6 m
            
            + auch: Moment M = 15 kN·m (nach oben)
```

### Freikörperdiagramm

```
                20 kN      15 kN·m (↻)
                 ↓
        ←Ax ═════════════════════→Bx
        ↑Ay                       ↑By
        ⌢M_A (Festlager-Moment!)
```

### Gleichungssystem

**(1) ΣFx = 0:**
```
Ax = 0
```

**(2) ΣFy = 0:**
```
Ay + By = 20 kN
```

**(3) ΣM um A = 0:**
```
M_A - 20×4 + By×10 + 15 = 0
M_A - 80 + 10·By + 15 = 0
M_A = 65 - 10·By  ... (Gleichung 3)
```

Moment um B statt A könnte einfacher sein:
```
M_A + Ay×10 - 20×6 + 15 = 0
M_A + 10·Ay - 120 + 15 = 0
M_A = 105 - 10·Ay
```

Mit Ay + By = 20 → Ay = 20 - By

```
M_A = 105 - 10·(20 - By) = 105 - 200 + 10·By = -95 + 10·By
```

Aus (3):
```
65 - 10·By = -95 + 10·By
160 = 20·By
By = 8 kN
```

Dann:
```
Ay = 20 - 8 = 12 kN
M_A = 65 - 10×8 = -15 kN·m
```

**Ergebnis:**
- Ay = 12 kN ↑
- By = 8 kN ↑
- Ax = 0
- M_A = -15 kN·m (negativ = entgegen Uhrzeiger, also ↺)

---

## 🎯 Aufgaben zum Selberlösen

### Aufgabe 1.3a: Einfachbalken

```
                15 kN
                 ↓
        A ════════════════════ B
        ⊙                     △
        0       3 m       2 m
```

**Berechne:** Ay, By

**Deine Lösung:**
```
Gleichung 1 (ΣFy = 0):  Ay + By = ___
Gleichung 2 (ΣM um A):  By × ___ = 15 × ___
                        By = ___
                        
Ay = ___
```

**Lösung:**
```
Ay + By = 15
By × 5 = 15 × 3
By = 9 kN
Ay = 6 kN
```

---

### Aufgabe 1.3b: Balken mit 2 Lasten

```
        8 kN       6 kN
         ↓         ↓
        A ════════════════════ B
        █                      △
        0    2 m    3 m    1 m
```

**Berechne:** Ay, By, Ax

**Hinweis:** Keine horizontale Last → Ax = ?

**Deine Lösung:** (Selbst zeichnen + rechnen)

---

## 📝 Spickzettel — 1.3 Lagerreaktionen

### Die 3 Gleichgewichtsbedingungen (2D)

```
ΣFx = 0   (Summe aller Kräfte in X = Null)
ΣFy = 0   (Summe aller Kräfte in Y = Null)
ΣM = 0    (Summe aller Momente um einen Punkt = Null)
```

### Systematische Vorgehensweise

1. **Freikörperdiagramm** zeichnen (Körper isolieren, alle Kräfte + Momente)
2. **Koordinatenachsen** festlegen (X, Y, Rotation)
3. **Gleichungen** aufstellen (3 pro 2D-Problem)
4. **Lösen** (Gleichungssystem)
5. **Kontrollieren** (Summen stimmen?)

### Moment-Berechnung (wichtig!)

```
Moment = Kraft × Hebelarm

M = F × d

Beispiel:
Eine 10 kN Kraft 4m vom Punkt A entfernt:
M = 10 × 4 = 40 kN·m (um Punkt A)

Vorzeichen:
↻ (mit Uhrzeiger) = positiv
↺ (gegen Uhrzeiger) = negativ
```

### Häufige Fehler

❌ Freikörperdiagramm falsch → alles falsch!
❌ Hebelarm vergessen → Moment falsch
❌ Vorzeichen nicht konsistent → Ergebnis falsch
❌ Nicht alle 3 Gleichungen nutzen → unlösbar

✅ Immer Freikörper zeichnen!
✅ Immer alle 3 Gleichungen verwenden!
✅ Immer Kontrollrechnung machen!

---

## ✅ Selbstkontrolle

1. Welche 3 Bedingungen muss ein starrer Körper erfüllen um im Gleichgewicht zu sein?
   - **→ ΣFx=0, ΣFy=0, ΣM=0**

2. Das Moment einer 5 kN Kraft in 3m Entfernung ist:
   - **→ 5 × 3 = 15 kN·m**

3. Bei einem einfach unterstützten Balken (Lager ⊙ und △) wie viele Unbekannte haben wir?
   - **→ 3 (Ay, By, evtl. Ax)**

---

## 🚀 Nach diesem Kapitel

Du kannst jetzt:
- ✅ **Jedes statische System analysieren** (mit Gleichgewicht)
- ✅ **Lagerreaktionen berechnen**
- ✅ **Basis für Schnittgrößen** (nächstes Kapitel: 1.4)

**Wichtig:** Diese Fähigkeit ist die GRUNDLAGE der GESAMTEN Statik!
