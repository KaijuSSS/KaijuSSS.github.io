/**
 * Исчезающая мини-панель (HUD).
 *
 *  - При открытии раздела выезжает, через ~4 с или при прокрутке исчезает (glitch-растворение).
 *  - Тап/клик по ПУСТОЙ области экрана показывает её снова, повторный — скрывает.
 *    Клики по ссылкам, кнопкам, карточкам, полям ввода и т.п. панель не трогают.
 *  - Свайп по панели скрывает её.
 *  - Кнопка-индикатор в углу; на десктопе — «булавка» (закрепление запоминается).
 *  - Вкладки переключаются мышью и стрелками клавиатуры.
 *  - Esc скрывает панель.
 */
(function () {
	'use strict';

	var root = document.querySelector('[data-cp-hud]');
	if (!root) { return; }

	var panel = root.querySelector('[data-hud-panel]');
	var indicator = root.querySelector('[data-hud-indicator]');
	var pinBtn = root.querySelector('[data-hud-pin]');
	var closeBtn = root.querySelector('[data-hud-close]');
	var codeEl = root.querySelector('[data-hud-code]');
	var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));

	var AUTO_HIDE = 4000;
	var PIN_KEY = 'cp-hud-pinned';
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var desktop = window.matchMedia('(min-width: 1024px) and (hover: hover)');

	// Всё, по чему клик НЕ должен переключать панель.
	var INTERACTIVE = [
		'a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'details', 'option',
		'video', 'audio', 'iframe', 'img', 'svg', '[role="button"]', '[role="tab"]', '[role="option"]', '[role="listbox"]',
		'[contenteditable]', '[tabindex]:not([tabindex="-1"])',
		'.cp-card', '.cp-tile', '.cp-step', '.cp-filters', '.cp-search', '.cp-chain', '.main-navigation',
		'.wp-block-button', '.cp-spoiler-gate', '.cp-totop', '#wpadminbar'
	].join(',');

	var isOpen = false;
	var pinned = false;
	var hideTimer = null;
	var leaveTimer = null;
	var hovering = false;
	var openedAtScroll = 0;

	try { pinned = desktop.matches && localStorage.getItem(PIN_KEY) === '1'; } catch (e) { pinned = false; }

	function setPinned(value) {
		pinned = value;
		root.classList.toggle('is-pinned', pinned);
		if (pinBtn) {
			pinBtn.setAttribute('aria-pressed', pinned ? 'true' : 'false');
			pinBtn.title = pinned ? 'Открепить панель' : 'Закрепить панель';
		}
		try { localStorage.setItem(PIN_KEY, pinned ? '1' : '0'); } catch (e) { /* без хранилища */ }
		if (pinned) {
			window.clearTimeout(hideTimer);
			show(false);
		} else {
			scheduleHide(2500);
		}
	}

	function scheduleHide(delay) {
		window.clearTimeout(hideTimer);
		if (pinned) { return; }
		hideTimer = window.setTimeout(function () {
			if (!hovering && !panel.contains(document.activeElement)) {
				hide();
			} else {
				scheduleHide(1500);
			}
		}, delay || AUTO_HIDE);
	}

	function show(autoHide) {
		window.clearTimeout(leaveTimer);
		panel.classList.remove('is-leaving');
		if (!isOpen) {
			isOpen = true;
			root.classList.add('is-open');
			panel.removeAttribute('inert');
			panel.setAttribute('aria-hidden', 'false');
			indicator.setAttribute('aria-expanded', 'true');
		}
		openedAtScroll = window.scrollY;
		if (autoHide !== false) { scheduleHide(); }
	}

	function hide() {
		if (!isOpen || pinned) { return; }
		window.clearTimeout(hideTimer);
		isOpen = false;
		indicator.setAttribute('aria-expanded', 'false');
		if (panel.contains(document.activeElement)) { indicator.focus(); }
		panel.classList.add('is-leaving');
		leaveTimer = window.setTimeout(function () {
			root.classList.remove('is-open');
			panel.classList.remove('is-leaving');
			panel.setAttribute('inert', '');
			panel.setAttribute('aria-hidden', 'true');
		}, reduceMotion ? 0 : 480);
	}

	function toggle() {
		if (isOpen) { hide(); } else { show(); }
	}

	/* ── Вкладки ─────────────────────────────────────────── */
	function selectTab(tab, focus) {
		tabs.forEach(function (t) {
			var selected = t === tab;
			t.setAttribute('aria-selected', selected ? 'true' : 'false');
			t.tabIndex = selected ? 0 : -1;
			var tp = document.getElementById(t.getAttribute('aria-controls'));
			if (tp) { tp.hidden = !selected; }
		});
		if (codeEl && tab.dataset.code) { codeEl.textContent = '[SYS://' + tab.dataset.code + ']'; }
		if (focus) { tab.focus(); }
		panel.classList.remove('is-switching');
		void panel.offsetWidth;
		panel.classList.add('is-switching');
	}

	tabs.forEach(function (tab, i) {
		tab.addEventListener('click', function () { selectTab(tab); });
		tab.addEventListener('keydown', function (e) {
			var next = null;
			if (e.key === 'ArrowRight') { next = tabs[(i + 1) % tabs.length]; }
			if (e.key === 'ArrowLeft') { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
			if (e.key === 'Home') { next = tabs[0]; }
			if (e.key === 'End') { next = tabs[tabs.length - 1]; }
			if (next) {
				e.preventDefault();
				selectTab(next, true);
			}
		});
	});

	/* ── Переключатель района во вкладке «Участки района» ── */
	Array.prototype.forEach.call(root.querySelectorAll('[data-cp-district-switch]'), function (select) {
		select.addEventListener('change', function () {
			Array.prototype.forEach.call(root.querySelectorAll('[data-district-list]'), function (list) {
				list.hidden = list.getAttribute('data-district-list') !== select.value;
			});
		});
	});

	/* ── Кнопки ──────────────────────────────────────────── */
	indicator.addEventListener('click', function (e) {
		e.stopPropagation();
		if (isOpen && pinned) { setPinned(false); }
		toggle();
	});
	if (closeBtn) {
		closeBtn.addEventListener('click', function () {
			if (pinned) { setPinned(false); }
			hide();
		});
	}
	if (pinBtn) {
		pinBtn.addEventListener('click', function () { setPinned(!pinned); });
	}

	/* ── Наведение и фокус ставят таймер на паузу ─────────── */
	panel.addEventListener('mouseenter', function () { hovering = true; });
	panel.addEventListener('mouseleave', function () {
		hovering = false;
		if (isOpen) { scheduleHide(2500); }
	});
	panel.addEventListener('focusin', function () { window.clearTimeout(hideTimer); });
	panel.addEventListener('focusout', function () {
		window.setTimeout(function () {
			if (isOpen && !panel.contains(document.activeElement)) { scheduleHide(2500); }
		}, 0);
	});

	/* ── Клик/тап по пустому месту ────────────────────────── */
	document.addEventListener('click', function (e) {
		if (e.defaultPrevented || e.button !== 0) { return; }
		var target = e.target;
		if (!(target instanceof Element)) { return; }
		if (root.contains(target) || target.closest(INTERACTIVE)) { return; }
		// Выделение текста — это не клик по пустому месту.
		var sel = window.getSelection && window.getSelection();
		if (sel && String(sel).length > 0) { return; }
		if (pinned) { return; }
		toggle();
	});

	/* ── Прокрутка скрывает ──────────────────────────────── */
	window.addEventListener('scroll', function () {
		if (isOpen && !pinned && !hovering && Math.abs(window.scrollY - openedAtScroll) > 80) {
			hide();
		}
	}, { passive: true });

	/* ── Свайп по панели скрывает ────────────────────────── */
	var touchX = 0;
	var touchY = 0;
	panel.addEventListener('touchstart', function (e) {
		touchX = e.touches[0].clientX;
		touchY = e.touches[0].clientY;
	}, { passive: true });
	panel.addEventListener('touchend', function (e) {
		var t = e.changedTouches[0];
		var dx = t.clientX - touchX;
		var dy = t.clientY - touchY;
		if (Math.abs(dx) > 50 || dy > 50) {
			if (pinned) { setPinned(false); }
			hide();
		}
	});

	/* ── Esc ─────────────────────────────────────────────── */
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && isOpen) {
			if (pinned) { setPinned(false); }
			hide();
		}
	});

	/* ── Булавка только на десктопе ──────────────────────── */
	var onMedia = function () {
		if (!desktop.matches && pinned) {
			pinned = false;
			root.classList.remove('is-pinned');
		}
	};
	if (desktop.addEventListener) { desktop.addEventListener('change', onMedia); }

	/* ── Старт ───────────────────────────────────────────── */
	panel.setAttribute('inert', '');
	panel.setAttribute('aria-hidden', 'true');
	root.classList.add('is-ready');
	if (pinned) {
		root.classList.add('is-pinned');
		if (pinBtn) { pinBtn.setAttribute('aria-pressed', 'true'); }
	}

	// Ждём окончания экрана дешифровки, затем выезжаем.
	var delay = document.documentElement.classList.contains('cp-decrypting') ? 1200 : 450;
	window.setTimeout(function () { show(!pinned); }, delay);
})();
