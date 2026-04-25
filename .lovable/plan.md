
## Plan: Corregir el cálculo del % de Red LN

### Problema identificado

La API externa devuelve los campos `direct_descendants_count` y `total_descendants_count` como **strings** (ej: `"5"`) en lugar de números. Esto causa que las operaciones matemáticas fallen:

```
"5" + 1 = "51"  (concatenación de strings)
```

En lugar de:
```
5 + 1 = 6  (suma numérica correcta)
```

### Solución

Convertir los valores a números antes de usarlos en los cálculos.

### Cambios requeridos

**Archivo: `src/pages/NetworkView.tsx`**

Actualizar las líneas 68-70 para parsear los valores como enteros:

```typescript
// Antes (incorrecto)
const directCount = tree.you.direct_descendants_count || 0;
const indirectCount = (tree.you.total_descendants_count || 0) - directCount;
const totalNetwork = (tree.you.total_descendants_count || 0) + 1;

// Después (correcto)
const directCount = parseInt(String(tree.you.direct_descendants_count || 0), 10);
const totalDescendants = parseInt(String(tree.you.total_descendants_count || 0), 10);
const indirectCount = totalDescendants - directCount;
const totalNetwork = totalDescendants + 1;
```

---

### Detalles Tecnicos

El problema ocurre porque JavaScript permite operaciones entre strings y números, pero:
- El operador `+` concatena cuando hay un string involucrado
- El operador `-` convierte implícitamente a número

Por eso `indirectCount` funcionaba (resta), pero `totalNetwork` no (suma).

La solución usa `parseInt()` con `String()` para manejar tanto valores string como number de forma segura.
