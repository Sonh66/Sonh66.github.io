(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#58c7ff', '#76a9ff', '#ad8cff', '#ff91b8', '#83e5d1'];

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || reduceMotion.matches) return;

    const burst = document.createElement('span');
    burst.className = 'sonh-click-burst';
    burst.style.left = `${event.clientX}px`;
    burst.style.top = `${event.clientY}px`;

    const ripple = document.createElement('span');
    ripple.className = 'sonh-click-ripple';
    burst.appendChild(ripple);

    const sparkCount = 7;
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount + Math.random() * 0.22;
      const distance = 26 + Math.random() * 20;
      const spark = document.createElement('span');
      spark.className = 'sonh-click-spark';
      spark.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--spark-color', colors[index % colors.length]);
      spark.style.animationDelay = `${index * 12}ms`;
      burst.appendChild(spark);
    }

    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 900);
  }, { passive: true });
})();
