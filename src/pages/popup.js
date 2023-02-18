import { actionGet, actionSave } from '../scripts/functions.js';

const saveButton = document.getElementById('save-button');
const saveName = document.getElementById('save-name');

saveButton.addEventListener('click', () => {
	if (saveName.value) {
		actionSave(saveName.value);
	}
});

saveName.addEventListener('keydown', (event) => {
	if (saveName.value && event.key === 'Enter') {
		actionSave(saveName.value);
	}
});

document.addEventListener('DOMContentLoaded', actionGet);
saveName.focus();