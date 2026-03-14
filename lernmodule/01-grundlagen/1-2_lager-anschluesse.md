# 1.2 Lager und Anschlüsse

## 🎯 Lernziel

Nach diesem Kapitel kannst du:
- ✅ Die Unterschiedliche Lagertypen kennen & unterscheiden
- ✅ Freiheitsgrade verstehen (2D)
- ✅ Wissen welche Kräfte in welchem Lager auftreten

---

## 📖 Das Freiheitsgrad-Konzept (fundamental!)

### Was ist ein Freiheitsgrad?

Ein **Freiheitsgrad** ist eine **mögliche Bewegung** eines Körpers.

In **2D (ebene Probleme)** hat jeder Körper **3 Freiheitsgrade:**

```
   y
   ↑
   │     1. Verschiebung in X-Richtung (→)
   │     2. Verschiebung in Y-Richtung (↑)
   └─────→ x
   3. Drehung (Rotation) um die Z-Achse (⤴)
```

### Wichtig für Lager:

Ein **Lager blockiert Freiheitsgrade**.

- Wenn ein Lager **1 FG blockiert** → 1 Kraft
- Wenn ein Lager **2 FG blockiert** → 2 Kräfte
- Wenn ein Lager **3 FG blockiert** → 2 Kräfte + 1 Moment

---

## 🔷 Die 3 wichtigsten Lagertypen

### 1️⃣ FESTLAGER (Einspannung / Fixed Support)

```
Balken:   ═════════════
Lager:    █ (blockiert alles)
```

**Was blockiert es:**
- ✅ Verschiebung X
- ✅ Verschiebung Y
- ✅ Rotation

**Reaktionen:**
- **Fx** (Kraft in X)
- **Fy** (Kraft in Y)
- **M** (Moment)

**Symbol:** `█` oder `╪`

**Beispiel:** Wand mit eingebauter Säule, Schilderhalter an der Wand

**Merksatz:** "Der Körper kann NICHT bewegen, NICHT drehen"

---

### 2️⃣ FESTES LAGER (Pinned Support / Bolzenlager)

```
Balken:   ═════════════
Lager:    ⊙ (mit Bolzen)
```

**Was blockiert es:**
- ✅ Verschiebung X
- ✅ Verschiebung Y
- ❌ Rotation (kann noch drehen!)

**Reaktionen:**
- **Fx** (Kraft in X)
- **Fy** (Kraft in Y)
- **KEIN Moment** ← wichtig!

**Symbol:** `⊙` (Kreis mit Bolzen)

**Beispiel:** Türscharnier, Brückenlager mit Bolzen, Kniegelenk eines Roboters

**Merksatz:** "Der Körper kann DREHEN, aber NICHT verschieben"

---

### 3️⃣ ROLLENLAGER (Roller Support)

```
Balken:   ═════════════
Lager:    ◯◯ (Walzen)
```

**Was blockiert es:**
- ❌ Verschiebung X
- ✅ Verschiebung Y (nur senkrecht!)
- ❌ Rotation

**Reaktionen:**
- **KEINE Kraft in X** ← wichtig!
- **Fy** (Kraft senkrecht zur Ebene)
- **KEIN Moment**

**Symbol:** `◯◯` (Walzen) oder `△` (Dreieck)

**Beispiel:** Zugbrücke (kann horizontal verschieben), Bahn auf Schienen (in Y blockiert, in X frei)

**Merksatz:** "Der Körper kann VERSCHIEBEN in X und DREHEN, nur Y ist blockiert"

---

## 🎨 Symbol-Übersicht (wichtig für die Klausur!)

```
Festlager:         Festes Lager:          Rollenlager:
    ═══              ═══                   ═══
     ║               ⊙                     △
     ║              ╱ ╲                   ╱ ╲
    ═╩═            ╱   ╲                 ╱   ╲
     
Reaktionen:    Reaktionen:           Reaktionen:
Fx, Fy, M     Fx, Fy               Fy nur!
```

---

## ⚙️ WORKED EXAMPLE 1: Balken mit Festlager

```
        5 kN
         ↓
    A ═══════════════════ B
    █                     ⊙
    │Festlager            Festes Lager
```

**Aufgabe:** Welche Reaktionen entstehen?

### Schritt 1: Identifiziere Lager

- **Lager A:** Festlager `█` → gibt **Fx, Fy, M**
- **Lager B:** Festes Lager `⊙` → gibt **Fx, Fy**

### Schritt 2: Zeichne Freikörperbild

```
        5 kN
         ↓
    Ax ←───────────→ Bx
    ↑                 ↑
    Ay                By
    M
```

### Schritt 3: Gleichgewicht (kommt in 1.3!)

Hier sehen wir einfach: Die 5 kN wird aufgeteilt zwischen **Ay** und **By**. Das Moment **M** muss die Rotation verhindern.

---

## ⚙️ WORKED EXAMPLE 2: Brücke mit Rollenlager

```
                8 kN
                 ↓
    ═════════════════════════
    ⊙                        △
    A                        B
    (Festes Lager)       (Roller)
```

**Aufgabe:** Welche Kräfte können in den Lagern auftreten?

### Analyse

- **Lager A `⊙`:** Kann **Ax** und **Ay** geben (Bolzen blockiert alles außer Rotation)
- **Lager B `△`:** Kann **NUR By** geben (Rollen erlauben Horizontalbewegung!)

**Warum Roller?** → Thermische Ausdehnung der Brücke! Bei Hitze dehnt sie sich aus, muss sich horizontal verschieben können. Roller erlauben das!

---

## 🎯 Aufgaben zum Selberlösen

### Aufgabe 1.2a: Lagertypen erkennen

Markiere welcher Lagertyp für folgende Situationen am besten passt:

1. **Türe am Scharnier:**
   - A: Festlager  B: Festes Lager  C: Roller
   - **Lösung:** B (Bolzenlager, kann drehen)

2. **Stahlbeton-Balken in der Wand eingebaut:**
   - A: Festlager  B: Festes Lager  C: Roller
   - **Lösung:** A (alles blockiert)

3. **Dach auf Wänden mit Bewegungsfugen:**
   - A: Festlager  B: Festes Lager  C: Roller
   - **Lösung:** C (Roller für thermische Ausdehnung)

---

### Aufgabe 1.2b: Reaktionen zuordnen

Welche Reaktionen entstehen in diesen Lagern?

| Lager | Fx? | Fy? | M? |
|-------|-----|-----|-----|
| Festlager | ? | ? | ? |
| Festes Lager | ? | ? | ? |
| Roller | ? | ? | ? |

**Lösungen:**
- Festlager: JA, JA, JA
- Festes Lager: JA, JA, NEIN
- Roller: NEIN, JA, NEIN

---

## 📝 Spickzettel — 1.2 Lager

### Lagertypen (Merktabelle)

| Typ | Symbol | Blockiert | Reaktionen | Beispiel |
|-----|--------|-----------|------------|----------|
| **Festlager** | `█` | X, Y, Drehung | Fx, Fy, M | Eingebaut in Wand |
| **Festes Lager** | `⊙` | X, Y | Fx, Fy | Bolzenlager, Tür |
| **Roller** | `△` | Nur Y | Fy | Brückenlager |

### Freiheitsgrade (2D)

```
3 Freiheitsgrade pro Körper:
1. Verschiebung X (horizontal)
2. Verschiebung Y (vertikal)
3. Rotation (um Z-Achse)

Lager blockieren diese Freiheitsgrade
→ Erzeugen Reaktionskräfte
```

### Schnellentscheider

- **Kann sich horizontal bewegen?** → Roller-Lager
- **Kann sich bewegen + drehen?** → Roller
- **Kann nur drehen?** → Festes Lager
- **Kann NICHTS?** → Festlager

---

## ✅ Selbstkontrolle

1. Ein Festlager blockiert wie viele Freiheitsgrade?
   - A: 1    B: 2    C: 3    **→ C**

2. Ein Rollenlager erzeugt welche Reaktion?
   - A: Fx, Fy, M    B: Nur Fy    C: Fy, M    **→ B**

3. Ein Türscharnier ist am besten beschrieben als:
   - A: Festlager    B: Festes Lager    C: Roller    **→ B**

---

## 🚀 Nächstes Kapitel

→ **1.3 Bestimmung von Lagerreaktionen**: Jetzt berechnen wir die Kräfte!
