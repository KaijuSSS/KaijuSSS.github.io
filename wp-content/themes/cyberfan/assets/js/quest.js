/**
 * Страница квеста:
 *  - каждый блок «Шаг гайда» (.cp-step) получает чекбокс «Выполнено»;
 *    прогресс хранится в localStorage отдельно для каждого квеста;
 *  - кнопка «Показать спойлер» раскрывает прохождение скрытых квестов.
 */
(function () {
	'use strict';

	var quest = document.querySelector('[data-cp-quest]');
	if (!quest) { return; }

	var questId = quest.getAttribute('data-cp-quest');
	var KEY = 'cp-quest-progress-' + questId;
	var walk = quest.querySelector('[data-cp-walk]');
	var steps = walk ? Array.prototype.slice.call(walk.querySelectorAll('.cp-step')) : [];
	var progress = quest.querySelector('[data-cp-progress]');
	var progressText = quest.querySelector('[data-cp-progress-text]');
	var progressBar = quest.querySelector('[data-cp-progress-bar]');
	var resetBtn = quest.querySelector('[data-cp-progress-reset]');

	function load() {
		try {
			var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
			return Array.isArray(raw) ? raw : [];
		} catch (e) {
			return [];
		}
	}

	function save(done) {
		try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* без хранилища прогресс живёт до перезагрузки */ }
	}

	function update() {
		var done = [];
		steps.forEach(function (step, i) {
			var box = step.querySelector('.cp-step__check input');
			var checked = box && box.checked;
			step.classList.toggle('is-done', !!checked);
			if (checked) { done.push(i); }
		});
		save(done);
		if (progressText) { progressText.textContent = 'ПРОГРЕСС ' + done.length + '/' + steps.length; }
		if (progressBar) { progressBar.style.width = (steps.length ? done.length / steps.length * 100 : 0) + '%'; }
		quest.classList.toggle('is-complete', steps.length > 0 && done.length === steps.length);
	}

	if (steps.length) {
		var saved = load();
		steps.forEach(function (step, i) {
			var label = document.createElement('label');
			label.className = 'cp-step__check';
			var title = step.querySelector('h1,h2,h3,h4,h5,h6');
			var name = title ? title.textContent.trim() : 'Шаг ' + (i + 1);
			label.innerHTML = '<input type="checkbox"><span class="cp-step__box" aria-hidden="true"></span><span class="cp-step__num">ШАГ ' + String(i + 1).padStart(2, '0') + '</span><span class="screen-reader-text"></span>';
			label.querySelector('.screen-reader-text').textContent = 'Отметить выполненным: ' + name;
			var input = label.querySelector('input');
			input.checked = saved.indexOf(i) !== -1;
			input.addEventListener('change', update);
			step.insertBefore(label, step.firstChild);
		});
		if (progress) { progress.hidden = false; }
		if (resetBtn) {
			resetBtn.addEventListener('click', function () {
				steps.forEach(function (step) {
					var box = step.querySelector('.cp-step__check input');
					if (box) { box.checked = false; }
				});
				update();
			});
		}
		update();
	}

	/* ── Спойлер ─────────────────────────────────────────── */
	var gate = quest.querySelector('[data-cp-spoiler-gate]');
	var toggle = quest.querySelector('[data-cp-spoiler-toggle]');
	if (gate && toggle && walk) {
		toggle.addEventListener('click', function () {
			var open = walk.hidden;
			walk.hidden = !open;
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			toggle.textContent = open ? 'Скрыть спойлер' : 'Показать спойлер';
			gate.classList.toggle('is-open', open);
		});
	}
})();
