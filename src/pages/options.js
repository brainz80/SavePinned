import { actionExport, actionImport } from '../scripts/functions.js';

var importInput = document.getElementById("import-input");

function notifyImportError() {
	sweetalert({
		text: "Failed to import tab sets. Please try again.",
		icon: "error",
	});

	importInput.value = "";
}

function handleImport() {
	if (!importInput.files[0]) {
		sweetalert({
			text: "Please select a file to import",
			icon: "error",
		});

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

function handleExport() {
	actionExport();
}

document.getElementById("import-button").addEventListener("click", handleImport);
document.getElementById("export-button").addEventListener("click", handleExport);
