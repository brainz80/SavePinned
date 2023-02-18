
import browser from 'webextension-polyfill';
import sweetalert from 'sweetalert';

import { saveAs } from 'file-saver';

import validate from  './validate_sets_schema.min.js';
import popupPage from '../pages/popup.html';

let windowId;

browser.windows.getCurrent().then(({ id }) => {
	windowId = id;
});

async function setActive (id, windowId) {
	const result = await browser.storage.local.get('activeTabs');

	await browser.storage.local.set({
		activeTabs: {
			...result.activeTabs,
			[windowId]: id,
		}
	});

	console.log(`Active tabset for window ${windowId} is set to ${id}`);

	window.location.href = popupPage;
}

export async function actionSave (name, autoload) {
	const tabs = await browser.tabs.query({ pinned: true, currentWindow: true });

	if (!tabs.length > 0) {
		await sweetalert({ text: "No pinned tabs found!", icon: "error" });
		return;
	}

	const uid = window.btoa(name);

	await browser.storage.sync.set({
		[uid]: {
			autoload: autoload || 0,
			tabs: tabs.map(t => t.url),
			set_name: name,
		}
	});

	await setActive(uid, windowId);
}

export async function actionLoad (id, windowId) {
	const [set, tabs] = await Promise.all([
		browser.storage.sync.get(id),
		browser.tabs.query({ windowId }),
	]);

	if (!tabs.some(t => !t.pinned)) {
		await sweetalert("Unfortunately how this app is setup you'll currently need at least one unpinned tab to be able load the pinned tabs.");
	} else {
		const pinned = tabs.filter(t => t.pinned);

		await browser.tabs.remove(pinned.map(t => t.id));

		await Promise.all(set[id].tabs.map(url => {
			return browser.tabs.create({ windowId, url, active: false, pinned: true });
		}));

		console.log('Loaded tabs');

		await setActive(id, windowId);
	}
}

export async function actionDelete (id) {
	const confirmed = await sweetalert({
		text: "Do you really want to delete this tab set?",
		className: 'confirm-delete-dialog',
		buttons: ['Cancel', 'Delete'],
	})

	if (!confirmed) return;

	await browser.storage.sync.remove(id);

	window.location.href = popupPage;
}

export async function actionRename (id) {
	const set_name = await sweetalert({
		text: 'Enter new name for tab set',
		content: {
			attributes: { maxLength: 30, type: 'text' },
			element: 'input',
		},
		buttons: ['Cancel', 'Rename'],
	});

	if (!set_name) {
		if (set_name !== null) await actionRename(id);
		return;
	}

	const sets = await browser.storage.sync.get();

	await browser.storage.sync.set({
		...sets,
		[id]: {
			...sets[id],
			set_name,
		},
	});

	window.location.href = popupPage;
}

export async function actionGet () {
	const [result, sets] = await Promise.all([
		browser.storage.local.get('activeTabs'),
		browser.storage.sync.get(),
	]);

	let active = result.activeTabs ? result.activeTabs[windowId] : null;

	for (let [property, row] of Object.entries(sets)) {
		const area = document.getElementById('load-area');

		area.insertAdjacentHTML('beforeend', `<div class="load-row ${active === property ? 'active' : ''}" data-id="${property}" data-name="${row.set_name}" data-autoload="${row.autoload}">
			<span>${row.set_name}</span>
			<label><input type="checkbox" name="autoload" class="autoload-radio" value="${property}" ${row.autoload ? 'checked' : ''}> Autoload</label>
			${active === property ? '<button class="set-save">Save</button>' : ''}
			<button class="set-load">Load</button>
			<button class="set-delete">Del</button>
			<button class="set-rename">Ren</button>
		</div>`);

		const elRow = area.querySelector(`[data-id="${property}"]`);

		elRow.querySelector('.autoload-radio')?.addEventListener('click', ({ target: { checked, value } }) => {
			if (checked) setAutoload(value);
			else setAutoload(false);
		});

		elRow.querySelector('.set-delete')?.addEventListener('click', () => {
			actionDelete(elRow.dataset.id);
		});

		elRow.querySelector('.set-load')?.addEventListener('click', () => {
			actionLoad(elRow.dataset.id, windowId);
		});

		elRow.querySelector('.set-rename')?.addEventListener('click', () => {
			actionRename(elRow.dataset.id);
		});

		elRow.querySelector('.set-save')?.addEventListener('click', () => {
			let { autoload, name } = elRow.dataset;
			actionSave(name, autoload ? 1 : 0);
		});

		document.getElementById('placeholder')?.remove();
	}
}

export async function setAutoload (id) {
	const sets = await browser.storage.sync.get();

	for (let [property, row] of Object.entries(sets)) {
		row.autoload = (id && property == id) ? 1 : 0;
	}

	await browser.storage.sync.set(sets);

	window.location.href = popupPage;
}

export async function clearActive (winid) {
	await setActive(null, winid);
}

export async function autoload (winid) {
	const [cutabs, sets] = await Promise.all([
		browser.tabs.query({ pinned: true, windowId: winid }),
		browser.storage.sync.get(),
	]);

	let autoloaded = false;

	for (let [property, row] of Object.entries(sets)) {
		// there is a tab set to be autoloaded
		if (row.autoload == 1) {
			console.log('Autoloading tabs');
			await actionLoad(property, winid);
			autoloaded = true;
			break;
		}
	}

	if (!autoloaded) {
		await clearActive(winid);
	}
}

export function actionExport () {
	const fileName = `SavePinnedTabs_export_${new Date().toISOString().replaceAll(/[.:]/g, "-")}.json`;

	return browser.storage.sync.get().then(sets => {
		const fileText = JSON.stringify(sets);
		const fileBlob = new Blob([fileText], { type: "application/json;charset=utf-8" });
		saveAs(fileBlob, fileName);
	});
}

export function actionImport (sets) {
	if (!validate(sets)) {
		return Promise.reject(validate.errors);
	}

	return browser.storage.sync.set(sets);
}