/**
 * Общие эффекты интерфейса:
 *  - экран «ДЕШИФРОВКА…» (один раз за сессию);
 *  - «расшифровка» glitch-заголовков при загрузке;
 *  - кнопка «Наверх»;
 *  - выпадающий поиск в шапке.
 * Всё уважает prefers-reduced-motion.
 */
(function () {
	'use strict';

	var root = document.documentElement;
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var GLYPHS = 'ABCDEF0123456789#$%&*+=<>/\\|АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';

	/** Посимвольная «расшифровка» текста элемента. */
	function scramble(el, duration, done) {
		var target = el.textContent;
		var start = null;
		function frame(ts) {
			if (!start) { start = ts; }
			var progress = Math.min(1, (ts - start) / duration);
			var revealed = Math.floor(progress * target.length);
			var out = '';
			for (var i = 0; i < target.length; i++) {
				var ch = target.charAt(i);
				out += (i < revealed || ch === ' ') ? ch : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
			}
			el.textContent = out;
			if (progress < 1) {
				window.requestAnimationFrame(frame);
			} else {
				el.textContent = target;
				if (done) { done(); }
			}
		}
		window.requestAnimationFrame(frame);
	}

	/* ── Экран дешифровки ───────────────────────────────────── */
	function finishDecrypt() {
		root.classList.add('cp-decrypt-done');
		window.setTimeout(function () {
			root.classList.remove('cp-decrypting', 'cp-decrypt-done');
		}, 380);
		try { sessionStorage.setItem('cp-decrypted', '1'); } catch (e) { /* приватный режим */ }
	}

	if (root.classList.contains('cp-decrypting')) {
		var code = document.querySelector('[data-cp-scramble]');
		if (code && !reduceMotion) {
			scramble(code, 650, finishDecrypt);
		} else {
			finishDecrypt();
		}
	}

	/* ── Расшифровка заголовков ─────────────────────────────── */
	if (!reduceMotion) {
		var titles = document.querySelectorAll('[data-cp-decode]');
		Array.prototype.forEach.call(titles, function (el) {
			// Только простые текстовые заголовки, чтобы не ломать разметку внутри.
			if (el.children.length === 0 && el.textContent.length < 60) {
				el.setAttribute('aria-label', el.textContent);
				scramble(el, 520);
			}
		});
	}

	/* ── Кнопка «Наверх» ────────────────────────────────────── */
	var toTop = document.querySelector('[data-cp-totop]');
	if (toTop) {
		var ticking = false;
		var update = function () {
			toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
			ticking = false;
		};
		window.addEventListener('scroll', function () {
			if (!ticking) {
				window.requestAnimationFrame(update);
				ticking = true;
			}
		}, { passive: true });
		update();
		toTop.addEventListener('click', function (e) {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
			var skip = document.querySelector('.site-header a, a');
			if (skip) { skip.focus({ preventScroll: true }); }
		});
	}

	/* ── Поиск в шапке ──────────────────────────────────────── */
	var panel = document.getElementById('cp-header-search');
	var toggles = document.querySelectorAll('[data-cp-search-toggle]');
	if (panel && toggles.length) {
		var setOpen = function (open) {
			panel.hidden = !open;
			Array.prototype.forEach.call(toggles, function (t) { t.setAttribute('aria-expanded', open ? 'true' : 'false'); });
			if (open) {
				var input = panel.querySelector('input[type="search"]');
				if (input) { input.focus(); }
			}
		};
		Array.prototype.forEach.call(toggles, function (t) {
			t.addEventListener('click', function () { setOpen(panel.hidden); });
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !panel.hidden && panel.contains(document.activeElement)) {
				setOpen(false);
				toggles[0].focus();
			}
		});
	}
})();
