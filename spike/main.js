var logEl = document.getElementById('log');
var menuEl = document.getElementById('menu');
var items = [];
var focus = 0;

function log(msg) {
  logEl.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n' + logEl.textContent;
}

function err(prefix) {
  return function (e) { log('ERRO ' + prefix + ': ' + (e && (e.name + ' ' + e.message) || e)); };
}

function render() {
  menuEl.innerHTML = '';
  items.forEach(function (it, i) {
    var d = document.createElement('div');
    d.className = 'btn' + (i === focus ? ' focus' : '');
    d.textContent = it.label;
    menuEl.appendChild(d);
  });
  var f = menuEl.children[focus];
  if (f) f.scrollIntoView({ block: 'nearest' });
}

function setItems(list) { items = list; focus = 0; render(); }

function launchApp(id) {
  log('Abrindo ' + id);
  tizen.application.launch(id, function () { log('OK launch ' + id); }, err('launch ' + id));
}

function listApps() {
  tizen.application.getAppsInfo(function (apps) {
    log(apps.length + ' apps instalados');
    var list = apps.filter(function (a) { return a.show; }).map(function (a) {
      log(a.id + ' | ' + a.name);
      return { label: a.name, run: function () { launchApp(a.id); } };
    });
    list.unshift({ label: '← Voltar', run: mainMenu });
    setItems(list);
  }, err('getAppsInfo'));
}

function listSources() {
  tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (s) {
    var list = s.connected.map(function (src) {
      log('Fonte conectada: ' + src.type + ' ' + src.number);
      return { label: src.type + ' ' + src.number, run: function () { showSource(src); } };
    });
    s.disconnected.forEach(function (src) { log('Fonte desconectada: ' + src.type + ' ' + src.number); });
    list.unshift({ label: '← Voltar', run: mainMenu });
    setItems(list);
  }, err('VIDEOSOURCE'));
}

function showSource(src) {
  tizen.tvwindow.setSource(src, function () {
    log('setSource OK ' + src.type + src.number);
    document.getElementById('win').style.display = 'block';
    tizen.tvwindow.show(function () { log('tvwindow.show OK'); }, err('show'), ['1248px', '688px', '640px', '360px'], 'MAIN');
  }, err('setSource'), 'MAIN');
}

function wsRemote(key) {
  var name = btoa('PainelSpike');
  ['ws://127.0.0.1:8001', 'wss://127.0.0.1:8002'].forEach(function (base) {
    var url = base + '/api/v2/channels/samsung.remote.control?name=' + name;
    log('WS conectando ' + url);
    var ws = new WebSocket(url);
    ws.onmessage = function (m) {
      log('WS msg ' + base + ': ' + String(m.data).slice(0, 120));
      if (String(m.data).indexOf('ms.channel.connect') >= 0) {
        ws.send(JSON.stringify({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' } }));
        log('WS enviou ' + key);
      }
    };
    ws.onerror = function () { log('WS erro ' + base); };
    ws.onclose = function (e) { log('WS fechou ' + base + ' code=' + e.code); };
  });
}

function info() {
  try { log('Tizen ' + tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version')); } catch (e) { err('version')(e); }
  try { log('Modelo ' + webapis.productinfo.getRealModel() + ' FW ' + webapis.productinfo.getFirmware()); } catch (e) { err('productinfo')(e); }
  try { log('Teclas: ' + tizen.tvinputdevice.getSupportedKeys().map(function (k) { return k.name; }).join(', ')); } catch (e) { err('keys')(e); }
}

function mainMenu() {
  setItems([
    { label: '1. Info do sistema', run: info },
    { label: '2. Listar e abrir apps', run: listApps },
    { label: '3. Fontes (HDMI) via tvwindow', run: listSources },
    { label: '4. WS remoto: KEY_HDMI1', run: function () { wsRemote('KEY_HDMI1'); } },
    { label: '5. WS remoto: KEY_SOURCE', run: function () { wsRemote('KEY_SOURCE'); } },
    { label: '6. Esconder janela HDMI', run: function () { tizen.tvwindow.hide(function () { log('hide OK'); }, err('hide'), 'MAIN'); document.getElementById('win').style.display = 'none'; } }
  ]);
}

document.addEventListener('keydown', function (e) {
  if (e.keyCode === 38) focus = Math.max(0, focus - 1);
  else if (e.keyCode === 40) focus = Math.min(items.length - 1, focus + 1);
  else if (e.keyCode === 13 && items[focus]) items[focus].run();
  else if (e.keyCode === 10009) mainMenu();
  render();
});

mainMenu();
log('Spike pronto. Use setas + OK. Voltar = menu.');
