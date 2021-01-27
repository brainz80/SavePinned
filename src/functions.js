
var Sets = (function () {
  var windowId = null;
  browser.windows.getCurrent().then(function (win) {
    windowId = win.id;
  });
  
  var set_active = function (id, winid) {
    browser.storage.local.get(['activeTabs']).then(function(result) {
      var atabs = result.activeTabs || {};
      atabs[winid] = id;
      browser.storage.local.set({'activeTabs': atabs}).then(function() {
        console.log('Active tabset for window '+winid+' is set to '+id);
        window.location.href = "popup.html";
      });
    });
  }
  
  return {
    save: function (name, autoload) {
      let urilist = [];

      browser.tabs.query({
        pinned: true,
        currentWindow: true
      }).then(function (tabs) {
        for (let i = 0; i < tabs.length; i++) {
          urilist[i] = tabs[i].url;
        }

        if (urilist.length > 0) {
          let saveObj = {}, uid = window.btoa(name);

          saveObj[uid] = {
            set_name: name,
            autoload: autoload || 0,
            tabs: urilist
          };

          browser.storage.sync.set(saveObj).then(() => {
            set_active(uid, windowId);
          });
        } else {
          console.log('No pinned tabs found!');
        }
      });
    },
    load: function (id, winid) {
      browser.storage.sync.get(id).then(function (set) {
        const { tabs } = set[id];

        browser.tabs.query({
          pinned: true,
          windowId: winid
        }).then(cutabs => {
          let list = [];

          for (let index of cutabs) {
            list.push(index.id);
          }

          browser.tabs.remove(list);

          for (let index of tabs) {
            browser.tabs.create({
              windowId: winid,
              url: index,
              active: false,
              pinned: true
            });
          }

          console.log('Loaded tabs');

          set_active(id, winid);
        });
      });
    },
    delete: function (id) {
      swal({
        buttons: ['Cancel', 'Delete'],
        className: 'confirm-delete-dialog',
        text: "Do you really want to delete this tab set?",
      }).then(function (conf) {
        if (conf) browser.storage.sync.remove(id).then(function () {
          window.location.href = "popup.html";
        });
      });
    },
    get: function () {
      browser.storage.sync.get(null).then(function (sets) {
        let winid = windowId;

        browser.storage.local.get('activeTabs').then((result) => {
          let active = result.activeTabs ? result.activeTabs[winid] : null;

          for (let property in sets) {
            if (sets.hasOwnProperty(property)) {
              let row = sets[property];

              let template = '\
              <div class="load-row '+(active === property ? 'active' : '')+'" data-id="'+property+'" data-name="'+row.set_name+'" data-autoload="'+row.autoload+'">\
              <span>'+row.set_name+'</span>\
              <label><input type="checkbox" name="autoload" class="autoload-radio" value="'+property+'" '+(row.autoload ? 'checked' : '')+'> Autoload</label>\
              '+(active === property ? '<button class="set-save">Save</button>' : '')+'\
              <button class="set-load">Load</button>\
              <button class="set-delete">Del</button>\
              </div>';

              let area = document.getElementById('load-area');
              area.insertAdjacentHTML('beforeend', template);

              const elRow = area.querySelector(`[data-id="${property}"]`);

              const elAutoload = elRow.querySelector('.autoload-radio');
              const elSave = elRow.querySelector('.set-save');
              const elLoad = elRow.querySelector('.set-load');
              const elDelete = elRow.querySelector('.set-delete');

              if (elAutoload) elAutoload.addEventListener('click', ({ target: { checked, value } }) => {
                if (checked) Sets.setAutoload(value);
                else Sets.setAutoload(false);
              });

              if (elSave) elSave.addEventListener('click', () => {
                let { autoload, name } = elRow.dataset;
                Sets.save(name, autoload ? 1 : 0);
              });

              if (elLoad) elLoad.addEventListener('click', () => {
                Sets.load(elRow.dataset.id, winid);
              });

              if (elDelete) elDelete.addEventListener('click', () => {
                Sets.delete(elRow.dataset.id);
              });

              let plcelement = document.getElementById('placeholder')
              if (plcelement) plcelement.remove();
            }
          }
        });
      });
    },
    setAutoload: function (id) {
      browser.storage.sync.get(null).then(function (sets) {
        for (var property in sets) {
          if (sets.hasOwnProperty(property)) {
            if (id && property == id) sets[property].autoload = 1;
            else sets[property].autoload = 0;
          }
        }
        browser.storage.sync.set(sets).then(function () {
          window.location.href = "popup.html";
        });
      });
    },
    clearActive: function (winid) {
      set_active(null, winid);
    },
    autoLoad: function (winid) {
      browser.tabs.query({
        pinned: true,
        windowId: winid
      }).then(function (cutabs) {
        browser.storage.sync.get(null).then(function (sets) {
          var autoloaded = false;
          for (var property in sets) {
            if (sets.hasOwnProperty(property)) {
              var set = sets[property];
              if (set.autoload == 1) { // there is a tab set to be autoloaded
                console.log('Autoloading tabs');
                autoloaded = true;
                Sets.load(property, winid);
                break;
              }
            }
          }
          if (!autoloaded) Sets.clearActive(winid);
        });
      });
    },
    export: function () {
      var fileName = "SavePinnedTabs_export_" + new Date().toISOString().replaceAll(/[.:]/g, "-") + '.json';
      
      return browser.storage.sync.get(null).then(function (sets) {
        var fileText = JSON.stringify(sets);
        var fileBlob = new Blob([fileText], { type: "application/json;charset=utf-8" });
        saveAs(fileBlob, fileName);
      });
    },
    import: function (sets) {
      if (!validate20(sets)) {
        return Promise.reject();
      }
      
      return browser.storage.sync.set(sets);
    },
  }
})();

export default Sets;