import Sets from './functions';

const saveButton = document.getElementById('save-button');
const saveName = document.getElementById('save-name');

saveButton.addEventListener('click', () => {
  if (saveName.value) Sets.save(saveName.value);
});

saveName.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (saveName.value) Sets.save(saveName.value);
  }
});

document.addEventListener('DOMContentLoaded', Sets.get);
saveName.focus();
