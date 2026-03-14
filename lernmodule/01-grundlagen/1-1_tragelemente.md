# 1.1 Tragelemente ebener Systeme

## 🎯 Lernziel

Nach diesem Kapitel kannst du:
- ✅ Unterscheide stabförmige von flächenartigen Tragelementen
- ✅ Erkenne Tragelemente in echten Konstruktionen
- ✅ Verstehe warum bestimmte Formen verwendet werden

---

## 📖 Konzept

### Was ist ein Tragelement?

Ein **Tragelement** ist ein Bauteil einer Konstruktion, das **Kräfte aufnimmt und überträgt**.

Denk an ein Gebäude:
- Balken (Decken) → tragen Lasten vertikal
- Säulen → tragen Gewicht nach unten
- Dachbinder → spreizen Kräfte zur Seite

Alle diese sind **Tragelemente**.

---

## 🔷 Stabförmige Tragelemente ← WICHTIG!

### Definition

Ein Bauteil ist **stabförmig**, wenn:
- **Länge >> Breite/Höhe** (Verhältnis ca. >10:1)
- Die Querschnittsmaße **vernachlässigt** werden können

### Beispiele

```
Stab:        ═══════════════════ (dünn, sehr lang)
             
Balken:      ╔═══════════════════╗ (rechteckig, aber lang > hoch)
             
Bogen:       ⌢ ⌢ ⌢ (gekrümmt, aber schmal)
             
Rahmen:      ╔════════╗
             ║        ║ (verbundene Stäbe/Balken)
             ╚════════╝
```

### Charakteristiken

| Typ | Belastung | Reaktion | Beispiel |
|-----|-----------|----------|---------|
| **Stab** | Zug/Druck längs | Längsdeformation | Fachwerk, Spannband |
| **Balken** | Querlast, Moment | Durchbiegung | Deckenbalken, Träger |
| **Bogen** | Lasten verteilt | Druckkurven | Gewölbe, Brückenbogen |

---

## 🔶 Flächenartige Tragelemente

### Definition

Ein Bauteil ist **flächenartig**, wenn:
- **2 Dimensionen dominant** (Länge & Breite)
- **Dicke klein** gegenüber den anderen Maßen

### Beispiele

```
Platte (horizontal):     ════════════════
                         horizontal, trägt Lasten von oben
                         z.B. Betondecke
                         
Scheibe (vertikal):      ║║║║║║║║║║
                         senkrecht, trägt horizontal Kräfte
                         z.B. Wand
```

### Charakteristiken

| Typ | Richtung | Belastung | Beispiel |
|-----|----------|-----------|---------|
| **Platte** | Horizontal | Gleichmäßig verteilt (z.B. Eigengewicht) | Deckenplatte |
| **Scheibe** | Vertikal | Horizontale Kräfte (z.B. Wind, Erdbeben) | Wand |

---

## ⚙️ WORKED EXAMPLE 1: Hausdach analysieren

### Aufgau

Du schaust auf ein einfaches Satteldach:

```
        /\
       /  \
      /____\
      |    |
      |    |
      |____|  Haus
```

**Aufgabe:** Identifiziere die Tragelemente und ihre Rollen.

### Lösung (Step-by-Step)

**1. Dachbinder (die schrägen Balken):**
- Form: Lang + schmal (stabförmig) ✅
- Funktion: Tragen Dachgewicht, verteilen es zu den Ständern
- Belastung: Querlast (Eigengewicht + Schnee)

**2. Ständer/Säulen (die vertikalen Stücke):**
- Form: Lang + dünn (stabförmig) ✅
- Funktion: Leiten Kräfte nach unten
- Belastung: Längskraft (Druck)

**3. Wand (das rechteckige Stück):**
- Form: 2D dominant (flächenartig) ✅
- Funktion: Trägt horizontal (Wind), verteilt Vertikallast
- Belastung: Schub + Biegung

**Fazit:** Das Dach nutzt **stabförmige Elemente** für große Spannweite, die **Wand** stabilisiert alles als **Scheibe**.

---

## 💡 WORKED EXAMPLE 2: Eisenbahnbrücke

```
    Rail
    ━━━━━━━━━━━━━
      ╱╲╱╲╱╲      ← Fachwerk (Stäbe)
     ╱  ╲╱  ╲
    ╱____╲____╲
    |   |   |     ← Pfeiler
    |___|___|
```

**Tragelemente:**
- **Schienen** (oben): Stabförmig, nehmen Zuglasten auf
- **Fachwerk-Gitter**: Stäbe, effiziente Kraftleitung
- **Pfeiler**: Stabförmig, Druck nach unten
- **Fundament**: Platte/Scheibe verteilt auf Boden

**Warum Fachwerk?** → Stabförmig = leicht + stabil mit wenig Material!

---

## 🎯 Aufgaben zum Selberlösen

### Aufgabe 1.1a: Sporthalle

Schau dir eine Sporthallenkonstruktion vor:
```
           ╱╲╱╲╱╲╱╲     ← Dachbinder
          ╱  ╲╱  ╲╱  ╲
         ╱____╲____╲____╲
         |            |
         |____________|   ← Wände
```

**Frage:** 
- Welche Tragelemente sind stabförmig?
- Welche sind flächenartig?
- Warum wurde diese Form gewählt?

**Deine Antwort:**
```
[Space zum Ausfüllen]
```

---

### Aufgabe 1.1b: Unterscheidung

Ordne zu: **Stabförmig** oder **Flächenartig**?

1. Betondecke eines Parkhauses
2. Stahlstütze (Quadratprofil 20x20cm, 4m lang)
3. Wand eines Hauses
4. Stahlseil (Diameter 10mm, 100m Spannweite)
5. Stahlbeton-Balkon (1m breit, 0,3m dick, 2m Tiefe)

**Lösungen:**
```
[Hier deine Antworten]
```

---

## 📝 Spickzettel — 1.1 Tragelemente

### Stabförmig
- **Definition:** Länge >> Breite/Höhe
- **Querschnitt:** Vernachlässigt
- **Typen:** Stab, Balken, Bogen, Rahmen
- **Beispiele:** Fachwerke, Träger, Säulen

### Flächenartig
- **Definition:** 2 Dimensionen dominant, Dicke klein
- **Typen:** Platte (horizontal), Scheibe (vertikal)
- **Platte:** Trägt senkrechte Lasten (Decke)
- **Scheibe:** Trägt horizontale Kräfte (Wand)

---

## ✅ Selbstkontrolle

Beantworte diese Fragen, ohne nachzuschlagen:

1. Welches Verhältnis muss Länge zu Breite mindestens haben, damit ein Bauteil stabförmig ist?
   - A: >5:1    B: >10:1    C: >20:1    **Lösung: B**

2. Wo werden Platten typischerweise verwendet?
   - A: Vertikal zur Lastabtragung
   - B: Horizontal zur Vertikallastabtragung
   - C: Überall gleich
   - **Lösung: B**

3. Ein Dachbinder in einer Halle ist...
   - A: Stabförmig
   - B: Flächenartig
   - C: Beides
   - **Lösung: A**

---

## 🚀 Nächstes Kapitel

→ **1.2 Lager und Anschlüsse**: Wie werden diese Tragelemente miteinander verbunden?
