/**
 * Живой поиск с автодополнением через WP REST API (/wp-json/cp2077/v1/search).
 * Работает для всех форм с атрибутом data-cp-search.
 * Клавиатура: ↑/↓ — выбор, Enter — открыть, Esc — закрыть.
 * Без JS форма отправляется как обычный поиск WordPress.
 */
(function () {
	'use strict';

	if (!window.cpcSearch || !window.fetch) { return; }

	var TYPE_CODES = { weapon: 'WPN', vehicle: 'VEH', implant: 'IMP', quest: 'QST', district: 'DST', page: 'DIR' };

	function escapeHtml(str) {
		return String(str).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	function highlight(title, query) {
		var safe = escapeHtml(title);
		var q = query.trim();
		if (!q) { return safe; }
		var idx = title.toLowerCase().indexOf(q.toLowerCase());
		if (idx === -1) { return safe; }
		return escapeHtml(title.slice(0, idx)) + '<mark>' + escapeHtml(title.slice(idx, idx + q.length)) + '</mark>' + escapeHtml(title.slice(idx + q.length));
	}

	function init(form) {
		var input = form.querySelector('input[type="search"]');
		var list = form.querySelector('[role="listbox"]');
		var status = form.querySelector('[data-cp-search-status]');
		if (!input || !list) { return; }

		var timer = null;
		var controller = null;
		var items = [];
		var active = -1;
		var lastQuery = '';

		function close() {
			list.hidden = true;
			input.setAttribute('aria-expanded', 'false');
			input.removeAttribute('aria-activedescendant');
			active = -1;
		}

		function setActive(index) {
			var options = list.querySelectorAll('[role="option"]');
			if (!options.length) { return; }
			active = (index + options.length) % options.length;
			Array.prototype.forEach.call(options, function (o, i) {
				o.setAttribute('aria-selected', i === active ? 'true' : 'false');
			});
			input.setAttribute('aria-activedescendant', options[active].id);
			options[active].scrollIntoView({ block: 'nearest' });
		}

		function render(query) {
			list.innerHTML = '';
			active = -1;
			if (!items.length) {
				list.innerHTML = '<li class="cp-search__empty" role="presentation">// СОВПАДЕНИЙ НЕТ</li>';
			} else {
				items.forEach(function (item, i) {
					var li = document.createElement('li');
					li.id = list.id + '-opt-' + i;
					li.setAttribute('role', 'option');
					li.setAttribute('aria-selected', 'false');
					li.className = 'cp-search__item' + (item.rarity ? ' rarity-' + item.rarity : '');
					li.innerHTML =
						'<a href="' + escapeHtml(item.url) + '" tabindex="-1">' +
						(item.thumb ? '<img src="' + escapeHtml(item.thumb) + '" alt="" width="40" height="40" loading="lazy">' : '<span class="cp-search__ph" aria-hidden="true">' + (TYPE_CODES[item.type] || 'DAT') + '</span>') +
						'<span class="cp-search__title">' + highlight(item.title, query) + '</span>' +
						'<span class="cp-search__type">' + escapeHtml(item.label) + '</span>' +
						'</a>';
					list.appendChild(li);
				});
			}
			// Последний пункт — «все результаты».
			var all = document.createElement('li');
			all.setAttribute('role', 'option');
			all.id = list.id + '-opt-all';
			all.className = 'cp-search__all';
			all.innerHTML = '<a href="' + escapeHtml(window.cpcSearch.all + '?s=' + encodeURIComponent(query)) + '" tabindex="-1">Все результаты по запросу «' + escapeHtml(query) + '» ›</a>';
			list.appendChild(all);

			list.hidden = false;
			input.setAttribute('aria-expanded', 'true');
			if (status) {
				status.textContent = items.length ? 'Найдено: ' + items.length : 'Ничего не найдено';
			}
		}

		function search(query) {
			if (controller) { controller.abort(); }
			controller = window.AbortController ? new AbortController() : null;
			form.classList.add('is-loading');
			var url = window.cpcSearch.endpoint + (window.cpcSearch.endpoint.indexOf('?') === -1 ? '?' : '&') + 'q=' + encodeURIComponent(query);
			fetch(url, controller ? { signal: controller.signal } : {})
				.then(function (r) { return r.ok ? r.json() : []; })
				.then(function (data) {
					if (query !== input.value.trim()) { return; }
					items = Array.isArray(data) ? data : [];
					render(query);
				})
				.catch(function () { /* запрос отменён или нет сети */ })
				.then(function () { form.classList.remove('is-loading'); });
		}

		input.addEventListener('input', function () {
			var query = input.value.trim();
			window.clearTimeout(timer);
			if (query.length < 2) {
				close();
				lastQuery = '';
				return;
			}
			if (query === lastQuery) { return; }
			timer = window.setTimeout(function () {
				lastQuery = query;
				search(query);
			}, 220);
		});

		input.addEventListener('keydown', function (e) {
			if (list.hidden) { return; }
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setActive(active + 1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setActive(active - 1);
			} else if (e.key === 'Enter' && active > -1) {
				var link = list.querySelectorAll('[role="option"]')[active].querySelector('a');
				if (link) {
					e.preventDefault();
					window.location.href = link.href;
				}
			} else if (e.key === 'Escape') {
				close();
			}
		});

		input.addEventListener('focus', function () {
			if (list.children.length && input.value.trim().length >= 2) {
				list.hidden = false;
				input.setAttribute('aria-expanded', 'true');
			}
		});

		document.addEventListener('click', function (e) {
			if (!form.contains(e.target)) { close(); }
		});
	}

	Array.prototype.forEach.call(document.querySelectorAll('[data-cp-search]'), init);
})();
