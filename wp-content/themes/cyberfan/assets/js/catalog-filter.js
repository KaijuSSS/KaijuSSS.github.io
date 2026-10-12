/**
 * Фильтры каталога без плагинов: читают data-атрибуты карточек.
 *   data-title    — название (поиск по подстроке)
 *   data-cat      — слаги категорий через пробел (вместе с родительскими)
 *   data-tech / data-fixer / data-district / data-danger — то же для других списков
 *   data-rarity   — слаг редкости (чипы, можно выбрать несколько)
 *   data-rank / data-date — для сортировки
 * Состояние фильтров сохраняется в адресе (?cat=katanas&rarity=epic), чтобы ссылкой можно было поделиться.
 */
(function () {
	'use strict';

	function init(catalog) {
		var form = catalog.querySelector('[data-cp-filters]');
		var grid = catalog.querySelector('[data-cp-grid]');
		if (!form || !grid) { return; }

		var cards = Array.prototype.slice.call(grid.querySelectorAll('.cp-card'));
		var text = form.querySelector('[data-filter-text]');
		var selects = Array.prototype.slice.call(form.querySelectorAll('select[data-filter]'));
		var chips = Array.prototype.slice.call(form.querySelectorAll('[data-filter-chip]'));
		var sort = form.querySelector('[data-sort]');
		var count = catalog.querySelector('[data-filter-count]');
		var empty = catalog.querySelector('[data-filter-empty]');

		// Исходный порядок — для сортировки «по названию».
		cards.forEach(function (card, i) { card.dataset.index = i; });

		function hasToken(card, key, value) {
			var tokens = (card.dataset[key] || '').split(' ');
			return tokens.indexOf(String(value)) !== -1;
		}

		function apply() {
			var q = text ? text.value.trim().toLowerCase() : '';
			var rarities = chips.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
			var visible = 0;

			cards.forEach(function (card) {
				var show = true;
				if (q && (card.dataset.title || '').indexOf(q) === -1) { show = false; }
				selects.forEach(function (sel) {
					if (show && sel.value && !hasToken(card, sel.dataset.filter, sel.value)) { show = false; }
				});
				if (show && rarities.length && rarities.indexOf(card.dataset.rarity) === -1) { show = false; }
				card.hidden = !show;
				if (show) { visible++; }
			});

			if (sort) {
				var key = sort.value;
				var sorted = cards.slice().sort(function (a, b) {
					if (key === 'rank') { return (b.dataset.rank - a.dataset.rank) || (a.dataset.index - b.dataset.index); }
					if (key === 'danger') { return (b.dataset.danger - a.dataset.danger) || (a.dataset.index - b.dataset.index); }
					if (key === 'date') { return b.dataset.date - a.dataset.date; }
					return a.dataset.index - b.dataset.index;
				});
				sorted.forEach(function (card) { grid.appendChild(card); });
			}

			if (count) { count.textContent = 'НАЙДЕНО: ' + visible; }
			if (empty) { empty.hidden = visible !== 0; }
			grid.classList.remove('is-filtering');
			void grid.offsetWidth; // перезапуск анимации появления
			grid.classList.add('is-filtering');
			saveState();
		}

		/* ── Состояние в адресной строке ───────────────────── */
		function saveState() {
			if (!window.history || !window.URLSearchParams) { return; }
			var params = new URLSearchParams(window.location.search);
			selects.forEach(function (sel) {
				if (sel.value) { params.set(sel.dataset.filter, sel.value); } else { params.delete(sel.dataset.filter); }
			});
			var rar = chips.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
			if (rar.length) { params.set('rarity', rar.join(',')); } else { params.delete('rarity'); }
			if (text && text.value.trim()) { params.set('q', text.value.trim()); } else { params.delete('q'); }
			if (sort && sort.value !== 'title') { params.set('sort', sort.value); } else { params.delete('sort'); }
			var qs = params.toString();
			window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
		}

		function loadState() {
			if (!window.URLSearchParams) { return; }
			var params = new URLSearchParams(window.location.search);
			selects.forEach(function (sel) {
				var v = params.get(sel.dataset.filter);
				if (v && sel.querySelector('option[value="' + CSS.escape(v) + '"]')) { sel.value = v; }
			});
			var rar = (params.get('rarity') || '').split(',');
			chips.forEach(function (c) { c.checked = rar.indexOf(c.value) !== -1; });
			if (text && params.get('q')) { text.value = params.get('q'); }
			if (sort && params.get('sort') && sort.querySelector('option[value="' + CSS.escape(params.get('sort')) + '"]')) { sort.value = params.get('sort'); }
		}

		var timer;
		if (text) {
			text.addEventListener('input', function () {
				window.clearTimeout(timer);
				timer = window.setTimeout(apply, 120);
			});
		}
		form.addEventListener('change', apply);
		form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
		form.addEventListener('reset', function () { window.setTimeout(apply, 0); });

		loadState();
		apply();
	}

	Array.prototype.forEach.call(document.querySelectorAll('[data-cp-catalog]'), init);
})();
