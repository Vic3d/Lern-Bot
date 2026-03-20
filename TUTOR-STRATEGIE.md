# Tutor-Strategie: Wie Victor lernt

## Victors Lerntyp
- **Visuell:** Sieht Dinge und versteht sie — Diagramme, Skizzen, Animationen
- **Auditiv:** Hört Erklärungen und versteht sie — gesprochene Erklärungen > Text lesen
- **Kinästhetisch:** Macht es selbst und versteht es — Nachzeichnen, Nachrechnen, Ausprobieren
- **NICHT:** Textblöcke lesen und auswendig lernen

## Pädagogische Prinzipien

### 1. Worked Examples → Fading
**Stufe 1:** Tutor löst komplett vor (Schritt für Schritt, visuell + auditiv)
**Stufe 2:** Tutor löst teilweise, Victor füllt Lücken
**Stufe 3:** Victor löst selbst, Tutor korrigiert
→ Das ist wissenschaftlich die effektivste Methode für Problemlösung (Sweller et al.)

### 2. Dual Coding (Paivio)
Jede Erklärung hat ZWEI Kanäle gleichzeitig:
- **Visuell:** Diagramm/Skizze/FKB auf dem Canvas
- **Verbal:** Gesprochene oder geschriebene Erklärung daneben
→ Doppelte Enkodierung = besseres Behalten

### 3. Scaffolding (Vygotsky)
- Anfang: Viel Hilfe, einfache Aufgaben
- Mitte: Weniger Hilfe, schwierigere Aufgaben
- Ende: Keine Hilfe, Klausurniveau
→ Zone of Proximal Development: Immer leicht über dem was er schon kann

### 4. Aktives Recall statt passives Lesen
- KEINE Zusammenfassung lesen → stattdessen: "Erkläre mir was ein Moment ist"
- Testen > Wiederholen (Roediger & Karpicke, 2006)

### 5. Fehler als Lernchance
- Wenn Victor was falsch macht → NICHT einfach die Lösung zeigen
- Stattdessen: "Schau mal auf dein FKB — welche Kraft fehlt?"
- Sokratische Methode: Durch Fragen zum richtigen Ergebnis führen

## UX-Design für Victors Lerntyp

### Was er sieht (visuell)
- Animierte Schritt-für-Schritt Lösungen (nicht alles auf einmal)
- Farbcodierte Kräfte (rot = gegeben, blau = gesucht, grün = Reaktionen)
- Fortschrittsbalken pro Kapitel (visuelles Feedback)
- Interaktive Diagramme wo er Kräfte verschieben kann

### Was er hört (auditiv)  
- TTS für Erklärungen (existiert schon im Lernbot!)
- "Erkläre mir das" → Audio-Erklärung parallel zum Diagramm
- Kurze Audio-Zusammenfassungen pro Kapitel (2-3 Minuten)

### Was er macht (kinästhetisch)
- FKB selbst zeichnen auf Canvas
- Werte in Gleichungen einsetzen (interaktive Felder)
- Drag & Drop: Richtige Lagersymbole zuordnen
- "Zeig mir wo die Kraft angreift" → auf Diagramm klicken

## Feature-Priorität (Was überzeugt Victor morgen)

### MUSS (Sprint 1 — heute Nacht):
1. **Split-Screen**: Links Canvas/Aufgabe, rechts Tutor-Chat
2. **Kapitel-Navigation**: Alle 3 Skripte, aufklappbar
3. **Tutor-Chat**: Direktanbindung an Claude — mit vollem Kapitelkontext
4. **"Erkläre mir das"**: Klick auf Kapitel → KI erklärt verständlich
5. **Aufgabe stellen**: KI generiert Klausur-Aufgabe zum aktuellen Kapitel
6. **Canvas**: Excalidraw embedded, zum Zeichnen
7. **TTS**: Erklärungen vorlesen lassen (Button)

### SOLLTE (Sprint 2):
- Canvas-Screenshot → KI-Feedback
- Fortschritts-Tracking
- Klausur-Simulation
- Schwächen-Erkennung

### KANN (Sprint 3+):
- Live-Collaboration
- KI zeichnet zurück
- Handschrift-Erkennung
- Spaced Repetition
