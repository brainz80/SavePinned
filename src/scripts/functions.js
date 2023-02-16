
import browser from 'webextension-polyfill';

import popupPage from '../pages/popup.html';

const Sets = (function () {
	let windowId = null;

	browser.windows.getCurrent().then(win => {
		windowId = win.id;
	});

	function set_active (id, winid) {
		browser.storage.local.get(['activeTabs']).then(function (result) {
			var atabs = result.activeTabs || {};
			atabs[winid] = id;
			browser.storage.local.set({ 'activeTabs': atabs }).then(function () {
				console.log('Active tabset for window ' + winid + ' is set to ' + id);
				window.location.href = popupPage;
			});
		});
	}

	return {
		save (name, autoload) {
			browser.tabs.query({ pinned: true, currentWindow: true }).then(tabs => {
				if (tabs.length > 0) {
					const uid = window.btoa(name);

					browser.storage.sync.set({
						[uid]: {
							autoload: autoload || 0,
							tabs: tabs.map(t => t.url),
							set_name: name,
						}
					}).then(() => {
						set_active(uid, windowId);
					});
				} else {
					console.log('No pinned tabs found!');
				}
			});
		},
		load (id, winid) {
			browser.storage.sync.get(id).then(set => {
				const { tabs } = set[id];

				browser.tabs.query({ pinned: true, windowId: winid }).then(cutabs => {
					browser.tabs.remove(cutabs.map(t => t.id));

					tabs.forEach(index => {
						browser.tabs.create({
							windowId: winid,
							url: index,
							active: false,
							pinned: true
						});
					});

					console.log('Loaded tabs');

					set_active(id, winid);
				});
			});
		},
		delete (id) {
			swal({
				text: "Do you really want to delete this tab set?",
				className: 'confirm-delete-dialog',
				buttons: ['Cancel', 'Delete'],
			}).then(conf => {
				if (conf) {
					browser.storage.sync.remove(id).then(() => {
						window.location.href = popupPage;
					});
				}
			});
		},
		rename (id) {
			swal({
				text: 'Enter new name for tab set',
				content: {
					attributes: { maxLength: 30, type: 'text' },
					element: 'input',
				},
				buttons: ['Cancel', 'Rename'],
			}).then(set_name => {
				if (!set_name) {
					if (set_name !== null) Sets.rename(id);
					return true;
				}

				browser.storage.sync.get().then(sets => {
					browser.storage.sync.set({ ...sets, [id]: { ...sets[id], set_name } }).then(() => {
						window.location.href = popupPage;
					});
				});
			});
		},
		get () {
			browser.storage.sync.get().then(sets => {
				browser.storage.local.get('activeTabs').then((result) => {
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
							if (checked) Sets.setAutoload(value);
							else Sets.setAutoload(false);
						});

						elRow.querySelector('.set-delete')?.addEventListener('click', () => {
							Sets.delete(elRow.dataset.id);
						});

						elRow.querySelector('.set-load')?.addEventListener('click', () => {
							Sets.load(elRow.dataset.id, windowId);
						});

						elRow.querySelector('.set-rename')?.addEventListener('click', () => {
							Sets.rename(elRow.dataset.id);
						});

						elRow.querySelector('.set-save')?.addEventListener('click', () => {
							let { autoload, name } = elRow.dataset;
							Sets.save(name, autoload ? 1 : 0);
						});

						document.getElementById('placeholder')?.remove();
					}
				});
			});
		},
		setAutoload (id) {
			browser.storage.sync.get().then(sets => {
				for (let [property, row] of Object.entries(sets)) {
					row.autoload = (id && property == id) ? 1 : 0;
				}
				browser.storage.sync.set(sets).then(() => {
					window.location.href = popupPage;
				});
			});
		},
		clearActive (winid) {
			set_active(null, winid);
		},
		autoLoad (winid) {
			browser.tabs.query({ pinned: true, windowId: winid }).then(cutabs => {
				browser.storage.sync.get().then(sets => {
					let autoloaded = false;

					for (let [property, row] of Object.entries(sets)) {
						// there is a tab set to be autoloaded
						if (row.autoload == 1) {
							console.log('Autoloading tabs');
							Sets.load(property, winid);
							autoloaded = true;
							break;
						}
					}

					if (!autoloaded) Sets.clearActive(winid);
				});
			});
		},
		export () {
			const fileName = `SavePinnedTabs_export_${new Date().toISOString().replaceAll(/[.:]/g, "-")}.json`;

			return browser.storage.sync.get().then(sets => {
				const fileText = JSON.stringify(sets);
				const fileBlob = new Blob([fileText], { type: "application/json;charset=utf-8" });
				saveAs(fileBlob, fileName);
			});
		},
		import (sets) {
			if (!validate20(sets)) return Promise.reject();
			return browser.storage.sync.set(sets);
		},
	}
})();

export default Sets;