(function () {
  'use strict';

  var startButton = document.getElementById('scan-start');
  var stopButton = document.getElementById('scan-stop');
  var statusBox = document.getElementById('scan-status');
  var statusText = document.getElementById('scan-status-text');
  var resultsBox = document.getElementById('scan-results');

  if (!startButton || !stopButton || !statusBox || !statusText || !resultsBox) return;

  var apiAvailable = 'NDEFReader' in window;
  var secureContext = Boolean(window.isSecureContext);
  var scanning = false;
  var controller = null;
  var reader = null;

  /* ---------- environment ---------- */

  function chip(id, text, state) {
    var element = document.getElementById(id);
    if (!element) return;
    element.textContent = text;
    element.className = 'support-state' + (state ? ' is-' + state : '');
  }

  function detectEnvironment() {
    var ua = navigator.userAgent || '';
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '未知平台';
    var browser = /Edg\//.test(ua) ? 'Edge'
      : /OPR\//.test(ua) ? 'Opera'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /CriOS\//.test(ua) ? 'Chrome (iOS)'
            : /Chrome\//.test(ua) ? 'Chrome'
              : /Safari\//.test(ua) ? 'Safari'
                : '其他浏览器';

    chip('support-secure', secureContext ? '是' : '否', secureContext ? 'ok' : 'bad');
    chip('support-api', apiAvailable ? '可用' : '不可用', apiAvailable ? 'ok' : 'bad');

    var browserText = document.getElementById('support-browser');
    if (browserText) browserText.textContent = platform + ' · ' + browser;

    var note = document.getElementById('support-note');
    if (note) {
      if (!secureContext) {
        note.textContent = '当前页面不是安全上下文。Web NFC 需要 HTTPS 或 localhost；file:// 打开时浏览器会拒绝。';
      } else if (!apiAvailable) {
        note.textContent = '当前浏览器没有 Web NFC。请换用 Chrome for Android；iOS Safari 不提供 Web NFC。';
      } else if (!/Android/i.test(ua)) {
        note.textContent = '检测到 NDEFReader，但 Web NFC 主要在 Android Chrome 上可用；桌面环境通常没有 NFC 硬件。';
      } else {
        note.textContent = '环境检测通过。实际扫描仍取决于系统 NFC 开关、标签类型与浏览器权限。';
      }
    }

    var blocked = !secureContext || !apiAvailable;
    startButton.disabled = blocked;
    if (blocked) {
      setStatus(!secureContext ? '当前页面需要 HTTPS 或 localhost' : '当前浏览器不支持 Web NFC', 'warn');
    }
  }

  function setStatus(text, state) {
    statusBox.className = 'scan-status' + (state ? ' is-' + state : '');
    statusText.textContent = text;
  }

  /* ---------- scan lifecycle ---------- */

  function setButtons(active) {
    startButton.disabled = active;
    stopButton.disabled = !active;
  }

  function stopScan(reason) {
    if (!scanning && !controller) {
      setButtons(false);
      return;
    }
    scanning = false;
    if (controller) {
      controller.abort();
      controller = null;
    }
    setButtons(false);
    setStatus(reason || '已停止扫描', '');
  }

  async function startScan() {
    if (scanning) return;
    if (!secureContext || !apiAvailable) {
      detectEnvironment();
      return;
    }

    resultsBox.replaceChildren();
    var waiting = element('p', 'scan-empty', '正在等待 NDEF 标签…把标签贴近手机背面。');
    resultsBox.append(waiting);

    scanning = true;
    setButtons(true);
    setStatus('正在等待 NDEF 标签…', 'scanning');
    controller = new AbortController();

    try {
      reader = new NDEFReader();
      reader.onreading = function (event) {
        if (!scanning) return;
        waiting.remove();
        appendMessage(event);
      };
      reader.onreadingerror = function () {
        if (!scanning) return;
        setStatus('读取失败：标签可能已移开，或不是可读的 NDEF 标签。可以再贴一次。', 'warn');
      };
      await reader.scan({ signal: controller.signal });
      if (scanning) setStatus('扫描中。请把 NDEF 标签贴近手机背面。', 'scanning');
    } catch (error) {
      var wasStopped = !scanning || (error && error.name === 'AbortError');
      scanning = false;
      controller = null;
      setButtons(false);
      if (wasStopped) {
        setStatus('已停止扫描', '');
      } else {
        setStatus(scanErrorMessage(error), 'error');
      }
    }
  }

  function scanErrorMessage(error) {
    var name = error && error.name ? error.name : '';
    if (name === 'NotAllowedError') return '未获得 NFC 权限，或系统 NFC 未开启。请在系统设置中开启 NFC 后重试。';
    if (name === 'NotSupportedError') return '这台设备或浏览器不支持 Web NFC。请使用带 NFC 的 Android 手机与 Chrome。';
    if (name === 'SecurityError') return '当前页面不是安全上下文。请通过 HTTPS 或 localhost 打开。';
    if (name === 'NotReadableError') return 'NFC 暂时不可用，可能被其他应用占用。请关闭其他读卡应用后重试。';
    var detail = error && error.message ? error.message : (name || '未知错误');
    return '无法开始扫描：' + detail;
  }

  startButton.addEventListener('click', startScan);
  stopButton.addEventListener('click', function () {
    stopScan('已停止扫描');
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && scanning) stopScan('页面进入后台，已停止扫描');
  });
  window.addEventListener('pagehide', function () {
    if (scanning) stopScan('页面已离开，扫描停止');
  });

  /* ---------- rendering ---------- */

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function appendMessage(event) {
    var message = event && event.message;
    var records = message && message.records ? Array.from(message.records) : [];
    var card = element('article', 'message-card');

    var head = element('div', 'message-head');
    var title = document.createElement('strong');
    title.textContent = 'NDEF 消息';
    var meta = element('span', '', new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    head.append(title, meta);
    card.append(head);

    if (event.serialNumber) {
      card.append(element('p', 'message-serial', '序列号 ' + event.serialNumber));
    }

    var list = element('div', 'record-list');
    if (records.length === 0) {
      list.append(element('p', 'record-value', '这条 NDEF 消息没有记录。'));
    } else {
      records.forEach(function (record) {
        list.append(renderRecord(record, 0));
      });
    }
    card.append(list);

    resultsBox.prepend(card);
    while (resultsBox.querySelectorAll('.message-card').length > 6) {
      resultsBox.lastElementChild.remove();
    }
    setStatus('已读取：' + records.length + ' 条记录。可以继续贴下一张标签。', 'ok');
  }

  function renderRecord(record, depth) {
    var card = element('div', 'record-card');
    var type = record && record.recordType ? String(record.recordType) : 'unknown';
    var label = type;
    if (type === 'text') label = '文本';
    else if (type === 'url') label = '网址';
    else if (type === 'absolute-url') label = '绝对网址';
    else if (type === 'mime') label = 'MIME' + (record.mediaType ? ' · ' + record.mediaType : '');
    else if (type === 'smart-poster') label = 'Smart Poster';
    else if (type === 'empty') label = '空记录';
    else if (type === 'unknown') label = '未知记录';

    card.append(element('div', 'record-type', label));
    var value = element('div', 'record-value');
    try {
      if (type === 'text') {
        value.textContent = decodeText(record) || '（空文本）';
      } else if (type === 'url' || type === 'absolute-url') {
        var url = decodeText(record);
        if (/^https?:\/\//i.test(url)) {
          var link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = url;
          value.append(link);
        } else {
          value.textContent = url || '（空网址）';
        }
      } else if (type === 'mime') {
        var media = String(record.mediaType || '').toLowerCase();
        if (/^(text\/|application\/(?:json|xml|.*\+json|.*\+xml))/i.test(media)) {
          value.textContent = decodeText(record) || '（空内容）';
        } else {
          value.append(bytesNode(record.data));
        }
      } else if (type === 'smart-poster') {
        var nested = [];
        try {
          nested = Array.from(record.toRecords());
        } catch (error) {
          nested = [];
        }
        if (nested.length === 0) {
          value.textContent = 'Smart Poster 中没有可显示的子记录。';
        } else {
          var nestedBox = element('div', 'record-nested');
          nested.forEach(function (child) {
            nestedBox.append(renderRecord(child, depth + 1));
          });
          value.append(nestedBox);
        }
      } else if (type === 'empty') {
        value.textContent = '空记录';
      } else {
        value.append(bytesNode(record.data));
      }
    } catch (error) {
      value.textContent = '无法解码这条记录（' + (error && error.message ? error.message : '未知错误') + '）';
    }
    card.append(value);
    return card;
  }

  function decodeText(record) {
    if (!record || !record.data || record.data.byteLength === 0) return '';
    var encoding = String(record.encoding || 'utf-8');
    try {
      return new TextDecoder(encoding).decode(record.data);
    } catch (error) {
      return new TextDecoder('utf-8').decode(record.data);
    }
  }

  function bytesNode(data) {
    var span = element('span', 'record-bytes', bytesText(data));
    return span;
  }

  function bytesText(data) {
    if (!data) return '（无数据）';
    var bytes;
    if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (data.buffer) {
      bytes = new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || 0);
    } else {
      return '（无法读取字节）';
    }
    if (bytes.length === 0) return '（无数据）';
    var shown = bytes.length > 48 ? bytes.subarray(0, 48) : bytes;
    var hex = Array.prototype.map.call(shown, function (byte) {
      return byte.toString(16).padStart(2, '0').toUpperCase();
    }).join(' ');
    return bytes.length + ' 字节 · ' + hex + (bytes.length > shown.length ? ' …' : '');
  }

  detectEnvironment();
  setButtons(false);
})();
