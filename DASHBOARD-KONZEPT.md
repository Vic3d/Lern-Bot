# Dashboard-Konzept — TME102 Intelligentes Lernen

## 🧠 Theoretischer Hintergrund (Wissensvermittlung)

### Kernprinzipien für optimales Lernen:

1. **Cognitive Load Theory (Sweller)**
   - Überladen = Brain-Crash ❌
   - Chunking = Kleine Häppchen ✅
   - Dashboard: NICHT zu viele Infos auf einmal

2. **Spaced Repetition (Ebbinghaus)**
   - Wiederholen in **exponentiellen Abständen** (1d, 3d, 7d)
   - Dashboard: Zeige was du **wiederholen musst**

3. **Retrieval Practice (Roediger)**
   - Aktives Abrufen > Passives Lesen
   - Dashboard: **Fragen stellen**, nicht nur Info zeigen

4. **Metacognition (Self-Awareness)**
   - Wissen was du NICHT weißt
   - Dashboard: **Schwache Punkte sichtbar**

5. **Progress Visualization**
   - Sichtbarer Fortschritt = Motivation
   - Dashboard: **Clear metrics**

6. **Interleaving (Context Switching)**
   - Verschiedene Probleme **mischen** (nicht isoliert)
   - Dashboard: Vorschlag für **Mixed-Aufgaben**

---

## 🎨 Dashboard-Struktur (3 Ansichten)

### **ANSICHT 1: QUICK-START (Morgens 13:00)**

**Zweck:** "Was soll ich JETZT lernen?"

```
┌─────────────────────────────────────────┐
│ 🎯 TODAY'S FOCUS                        │
├─────────────────────────────────────────┤
│ 📍 Kapitel 1.3 — Lagerreaktionen        │
│                                         │
│ ⏱️  90 Min Lernzeit geplant              │
│ 🎯 3 Aufgaben zum Lösen                 │
│ 📚 Konzept + Worked Examples + Training │
│                                         │
│ [JETZT STARTEN] Button                  │
└─────────────────────────────────────────┘
```

**Was wird angezeigt:**
- ✅ **Aktuelles Kapitel** (von 3-Tage-Plan)
- ✅ **Zeitbudget** (wie lange heute noch Zeit?)
- ✅ **Was du heute machst** (Kurzübersicht)
- ✅ **1-Click Start** (direkt ins Lernmodul)

---

### **ANSICHT 2: PROGRESS TRACKER (Während des Lernens)**

**Zweck:** "Wie viel hab ich schon gelernt? Was kommt noch?"

```
┌─────────────────────────────────────────┐
│ 📊 KAPITEL-FORTSCHRITT                  │
├─────────────────────────────────────────┤
│ 1.1 Tragelemente        [████░░░░] 40% │
│     ⏱️ 35 min | 📝 2/2 Aufgaben         │
│                                         │
│ 1.2 Lager & Anschlüsse  [██████░░] 60% │
│     ⏱️ 45 min | 📝 1/3 Aufgaben         │
│                                         │
│ 1.3 Lagerreaktionen ⭐  [████████] 0% │
│     ⏱️ IN PROGRESS...  | 📝 0/2 Aufg.   │
│                                         │
│ 1.4 Stat. Bestimmtheit  [░░░░░░░░] 0% │
│     ⏱️ 0 min | 📝 0/2 Aufgaben          │
│                                         │
├─────────────────────────────────────────┤
│ 🔥 GESAMTPROGRESS: 25% (7/28 Aufgaben) │
│ ⚡ Kognitives Müdigkeitslevel: 3/10    │
└─────────────────────────────────────────┘
```

**Was wird angezeigt:**
- ✅ Jedes Kapitel mit **Progressbar**
- ✅ **Zeit investiert** pro Kapitel
- ✅ **Aufgaben gelöst / Gesamt**
- ✅ **Gesamtfortschritt** (motivierend!)
- ✅ **Cognitive Load Warning** (zu müde?)

---

### **ANSICHT 3: WEAK POINTS (Was ich wiederholen muss)**

**Zweck:** "Wo brauch ich noch Arbeit?"

```
┌─────────────────────────────────────────┐
│ ⚠️  SCHWACHE PUNKTE                      │
├─────────────────────────────────────────┤
│ 🔴 Freikörperdiagramme zeichnen        │
│    Accuracy: 50% (1/2 richtig)         │
│    Letzte Versuch: vor 30 min          │
│    [WIEDERHOLEN] [BEISPIEL ZEIGEN]     │
│                                         │
│ 🟡 Momentenberechnung                  │
│    Accuracy: 75% (3/4 richtig)         │
│    Letzte Versuch: vor 2 Stunden       │
│    [ÜBEN] [VIDEO ERKLÄRVIDEO?]         │
│                                         │
│ 🟢 Lagerreaktionen (Theorie)           │
│    Accuracy: 100% (2/2 richtig)        │
│    ✅ MASTERED                         │
│                                         │
├─────────────────────────────────────────┤
│ 💡 Nächste Spaced Repetition:           │
│    "Freikörperdiagramme" — in 2 Tagen  │
│    (Automatisch erinnern)               │
└─────────────────────────────────────────┘
```

**Was wird angezeigt:**
- ✅ **Rote/Gelbe/Grüne Flaggen** (Accuracy-basiert)
- ✅ **Wo du Fehler machst** (Spaced Repetition Trigger)
- ✅ **Automatische Erinnerungen** (wann wiederholen?)
- ✅ **Intervention-Buttons** (direkter Zugriff zu Hilfe)

---

## 🎯 Layout: Physisches Design

### **Responsive 3-Säulen-Layout**

```
┌─────────────────────────────────────────────────────────┐
│ 🎩 ALBERT'S LERNBOT — TME102                           │
│ Sa 14.03.2026 | 13:45 Uhr | Tag 1/3                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌────────────────────┐  ┌──────────────────────────┐   │
│ │  QUICK-START       │  │  PROGRESS TRACKER        │   │
│ │ (links/mobile top) │  │  (rechts/mobile middle)  │   │
│ │                    │  │                          │   │
│ │ 🎯 Heute:          │  │ 📊 Fortschritt:          │   │
│ │ Kapitel 1.3        │  │ ████░░░░░░░░░░ 25%      │   │
│ │ 90 Min geplant     │  │                          │   │
│ │ [START]            │  │ 7/28 Aufgaben gelöst    │   │
│ │                    │  │                          │   │
│ └────────────────────┘  └──────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ⚠️  SCHWACHE PUNKTE (unten, mobile bottom)          ││
│ │                                                     ││
│ │ 🔴 Freikörperdiagramme: 50% Accuracy              ││
│ │    [ÜBEN] [VIDEO]                                 ││
│ │                                                     ││
│ │ 🟡 Momente: 75% Accuracy                           ││
│ │    [ÜBEN] [TIPP]                                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 📈 INSIGHTS: Du lernst am besten morgens! (9-11:30)   │
│ 💡 TIP: Nächste Pause in 45 Min empfohlen             │
└─────────────────────────────────────────────────────────┘
```

---

## 🎮 Interaktive Elemente

### **1. "JETZT STARTEN" Button**
```
Klick → Öffnet das aktuelle Lernmodul (z.B. 1-3_lagerreaktionen.md)
     → Startet einen Timer
     → Markiert Kapitel als "in progress"
```

### **2. Aufgaben-Checker**
```
Nach jeder Aufgabe:
- [✅ Richtig] / [❌ Falsch]
- System lernt deine Fehler
- Automatisch zur Wiederholung eingeplant
```

### **3. "Pause!" Button**
```
Wenn Cognitive Load > 7/10:
- "Du scheinst müde zu sein"
- "Empfehlung: 15 Min Pause"
- "Danach: Frisches Kapitel oder Wiederholung?"
```

### **4. "Hilf mir!" Button**
```
Bei Fehler:
- [Erklärvideo zeigen]
- [Anderes Beispiel durchmachen]
- [Grundlagen nochmal]
- [Albert fragen (Chat)]
```

---

## 📊 Metriken (Was tracken wir?)

### **Pro Kapitel:**
- ⏱️ **Zeit investiert** (wie lange gelernt?)
- 📝 **Aufgaben-Accuracy** (wie viele richtig?)
- 🔄 **Wiederholungsgrad** (oft genug wiederholt?)
- 🧠 **Cognitive Load** (wie müde bist du?)

### **Global:**
- 📈 **Gesamtfortschritt** (% vom Plan)
- 🎯 **Auf Kurs?** (Hast du Zeitbudget eingehalten?)
- 🏆 **Lernstil-Effektivität** (Morgens vs. Nachmittags?)
- 🔴 **Rote Flaggen** (Schwache Punkte zum Trainieren)

---

## 🎨 Visuelles Design (Farben + Icons)

### **Farb-Schema:**

```
Primär:    #667eea (Lila/Blau) — Fokus, Lernen
Secondary: #764ba2 (Dunkelviolett) — Vertiefung
Success:   #10b981 (Grün) — Richtig, Mastered
Warning:   #f59e0b (Orange/Gelb) — Vorsicht, Wiederholen
Danger:    #ef4444 (Rot) — Fehler, Problematisch
Neutral:   #e5e7eb (Grau) — Hintergrund
```

### **Icon-System:**

```
📍 Aktueller Fortschritt
⭐ Wichtig/Kern
🔴 Problem
🟡 Vorsicht
🟢 Mastered
📊 Daten
⏱️ Zeit
🧠 Kognitiv
🎯 Ziel
```

---

## 📱 Responsive Breakpoints

### **Desktop (>1024px):**
```
3-Säulen-Layout
- Links: Quick-Start + Details
- Mitte: Hauptinhalt (Kapitel)
- Rechts: Progress + Weak Points
```

### **Tablet (768-1024px):**
```
2-Säulen-Layout
- Links: Quick-Start + Progress
- Rechts: Weak Points + Details
```

### **Mobile (<768px):**
```
Vertikal gestapelt:
1. Quick-Start (oben)
2. Progress (2.)
3. Weak Points (3.)
4. Hauptinhalt (unten)
```

---

## 🔄 User Flow

### **Morgens um 13:00:**

1. **Dashboard öffnen**
   - Sieht: "Heute: Kapitel 1.1 + 1.2 + Start 1.3"
   - Sieht: Kognitives Budget (5 Stunden)

2. **"JETZT STARTEN" klicken**
   - Lernmodul 1.1 öffnet
   - Timer startet (30 Min geplant)
   - Kapitel wird "in progress" markiert

3. **Kapitel durcharbeiten**
   - Liest Erklärung
   - Macht Aufgabe 1
   - System: "[✅ Richtig!]" → Dopamin! 🎉

4. **Aufgabe 2 falsch**
   - System: "[❌ Falsch — Schau dir das Worked Example nochmal an]"
   - Button: [BEISPIEL ZEIGEN]
   - Cognitive Load Meter: +2 (noch okay)

5. **Nach 35 Min: Kapitelabschluss**
   - Dashboard aktualisiert
   - "1.1 komplett! ✅"
   - Progress-Bar: 40% → 50%
   - Nächstes Kapitel wird hervorgehoben
   - **System schlägt vor:** "Jetzt 1.2 oder Pause?"

6. **Nach 2 Stunden:**
   - Cognitive Load Meter > 7
   - Dashboard: "⚠️ Du brauchst eine Pause!"
   - Empfehlung: "15 Min Spaziergang, dann frisch wieder!"

---

## 🏗️ Technische Architektur

### **Tech-Stack:**
```
Frontend:     HTML5 + CSS3 + Vanilla JavaScript (kein Framework, schnell!)
Data:         JSON-File (localStorage für schnelles Sync)
Backend:      Node.js REST API (optional später)
Database:     SQLite (progress tracking)
Deployment:   Lokal im Repo oder auf Vercel (später)
```

### **Key Files:**
```
lernbot-akad/
├── dashboard/
│   ├── index.html           (Haupt-Dashboard)
│   ├── css/
│   │   └── styles.css       (Responsive Design)
│   ├── js/
│   │   ├── app.js           (Hauptlogik)
│   │   ├── tracker.js       (Progress Tracking)
│   │   └── cognitive-load.js (Brain-Meter)
│   └── data/
│       └── progress.json    (User Progress)
└── README.md
```

---

## 📋 Phase-by-Phase Implementation

### **Phase 1 (JETZT — 13:00 Start):**
- ✅ Quick-Start View
- ✅ Simple Progress Bar
- ✅ Kapitel-Status (fertig / in progress / todo)
- ✅ [STARTEN] Button

### **Phase 2 (Nach Kapitel 1.3):**
- ✅ Weak Points Analyzer
- ✅ Cognitive Load Meter
- ✅ Aufgaben-Accuracy Tracker
- ✅ Automatische Erinnerungen (Spaced Repetition)

### **Phase 3 (Ende Tag 1):**
- ✅ Insights ("Du lernst am besten morgens")
- ✅ Fehler-Pattern-Analyse
- ✅ Smart Recommendations

---

## 🎯 Psychologische Elemente

### **Motivation:**
- ✅ **Progress Visibility** (Balken füllt sich = Dopamin!)
- ✅ **Achievments** ("🏆 Kapitel 1.1 gemeistert!")
- ✅ **Positive Feedback** ("✅ Richtig! Du verstehst das!")

### **Fokus:**
- ✅ **Minimalismus** (nicht überlasten, nur das Wichtigste)
- ✅ **Clear Next Step** ("Nächste: Kapitel 1.2")
- ✅ **Zeitbudget** (weiß, wie viel Zeit noch übrig)

### **Sicherheit:**
- ✅ **Fehler sind OK** ("Keine Sorge, das ist normal")
- ✅ **Hilf mir!-Button** (immer eine Rettung)
- ✅ **Pause-Warnung** (du musst dich nicht überfordern)

---

## 🚀 Fertig bauen?

**Sollen wir jetzt:**
1. **Phase 1 bauen** (Quick-Start + Simple Progress) — für 13:00?
2. **Komplettes MVP** (alle 3 Views)?
3. **Web-Version** oder **Desktop-App**?

Was ist deine Priorität? ⏰
