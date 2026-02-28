# Vergleich Legende

Diese Legende beschreibt die Farben und Stati im Vergleichsbereich von Doc Studio und Content Studio.

## Zeilenstatus

- `same` (neutral): Zeile ist links und rechts gleich.
- `removed` (rot): Zeile existiert nur in der Basis (links), wurde rechts entfernt oder ersetzt.
- `added` (gruen): Zeile existiert nur in der aktuellen Version (rechts), wurde neu eingefuegt oder ersetzt.
- `modified` (orange): Zeile wurde als inhaltlich aehnlich erkannt, aber geaendert.

## Interpretation

- Rot + Gruen direkt nacheinander bedeutet meistens: alte Zeile ersetzt durch neue Zeile.
- Orange bedeutet: kleine bis mittlere Aenderung in derselben Zeile (z. B. Wort/Zeichen geaendert).
- `Zeichen Delta` zeigt den Gesamtunterschied der Zeichenanzahl zwischen aktueller Version und Basis.

## Vergleichsbasis

Die Basis wird ueber das Dropdown `Basis` gewaehlt:

- `Letzte gespeicherte Version`
- `Tab: ...` (anderer geoeffneter Tab)

## Aktionen

- `Vergleich an/aus`: Schaltet den Diff-Bereich ein oder aus.
- `Aenderungen uebernehmen`: Setzt die aktuelle Version als neue gespeicherte Vergleichsbasis.
