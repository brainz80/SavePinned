import { actionExport, actionImport } from '../scripts/functions.js';
import sweetalert from 'sweetalert';

const importInput = document.getElementById("import-input");

async function notifyImportError() {
	await sweetalert({ text: "Failed to import tab sets. Please try again.", icon: "error" });
	importInput.value = "";
}

async function handleImport() {
	if (!importInput.files[0]) {
		await sweetalert({ text: "Please select a file to import", icon: "error" });
		return;
	}

	const reader = new FileReader();

	reader.addEventListener('error', notifyImportError);
	reader.addEventListener('load', async ({ target }) => {
		const importData = JSON.parse(target.result);

		try {
			await actionImport(importData);
			sweetalert(`Successfully Imported ${Object.keys(importData).length} Tab Sets`);
			importInput.value = "";
		} catch (e) {
			console.error(e);
			notifyImportError();
		}
	});

	reader.readAsText(importInput.files[0]);
}

async function handleExport() {
	await actionExport();
}

document.getElementById("import-button").addEventListener("click", handleImport);
document.getElementById("export-button").addEventListener("click", handleExport);
