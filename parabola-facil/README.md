# Parábola Fácil

Aplicación educativa web para estudiar funciones cuadráticas paso a paso. Está pensada para estudiantes que necesitan explicaciones claras, una interfaz tranquila y controles de lectura personalizables.

## Qué resuelve

A partir de una función desarrollada como `-3x² + 5x - 8`, genera:

- identificación de `a`, `b` y `c`;
- apertura de la parábola;
- discriminante `Δ`;
- raíces reales cuando existen;
- vértice y eje de simetría;
- corte con el eje `y`;
- dominio e imagen;
- signo, crecimiento y decrecimiento;
- tabla de valores simétrica;
- bosquejo gráfico responsive con puntos clave;
- explicación completa y modo guiado de un paso por vez.

También incluye un modo para reconstruir una función cuando el ejercicio parte desde una gráfica, usando raíces + otro punto o vértice + otro punto.

## Accesibilidad y lectura

La interfaz ofrece:

- texto grande y ajustable;
- espaciado entre líneas ajustable;
- fondos crema, celeste, blanco u oscuro;
- regla de lectura opcional;
- lectura en voz alta mediante la API disponible en el navegador;
- botones grandes, frases breves y pasos separados;
- versión responsive para celular.

Las preferencias se guardan en `localStorage` dentro del dispositivo.

## Estructura

```text
parabola-facil/
├── index.html
├── styles.css
├── scripts.js
├── README.md
└── LICENSE
```

No requiere instalación, dependencias ni compilación. Se puede abrir directamente con doble clic en `index.html`.

## Publicar en GitHub Pages

1. Crear un repositorio nuevo en GitHub.
2. Subir los archivos de esta carpeta a la raíz del repositorio.
3. Ir a **Settings → Pages**.
4. En **Build and deployment**, elegir **Deploy from a branch**.
5. Seleccionar la rama `main` y la carpeta `/root`.
6. Guardar y esperar a que GitHub genere el enlace público.

## Entradas aceptadas

La primera versión trabaja con funciones cuadráticas desarrolladas. Ejemplos válidos:

```text
-3x² + 5x - 8
5x^2 + 7x - 18
x2 - 16
f(x) = -6x² + 24x
4x² + 5x = 0
```

## Referencias revisadas

El código de esta aplicación es original y no incorpora dependencias externas. Para diseñar una solución mantenible se revisaron proyectos y documentación open source:

- `mauriciopoppe/function-plot` — referencia para gráficos matemáticos interactivos. Licencia MIT.
- `josdejong/mathjs` — referencia para parseo y evaluación matemática. Licencia Apache 2.0.

La implementación actual usa un parser acotado a funciones cuadráticas y un gráfico SVG propio. Esto reduce peso, evita dependencias y permite abrir el proyecto sin conexión.

## Próximas mejoras posibles

- lectura automática de una foto de la consigna;
- exportación a PDF con portada;
- ejercicios con respuestas escritas por el estudiante;
- historial de práctica local;
- módulo de ecuaciones cuadráticas separado del estudio de funciones;
- más temas: lineales, sistemas, potencias y raíces.
